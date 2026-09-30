// Lead backups (brief §9.1 steps 7, 8 and 10): every lead (and newsletter sign-up) is written to
// LEAD_BACKUP_DIR/YYYY-MM.jsonl before it is forwarded, so an n8n outage never loses one.
// The directory is mode 700 and the files 600; LEAD_BACKUP_DIR is outside the web root (env.ts).
//
// Format: one JSON object per line, of two kinds.
// - A record, written once:
//   {"v":1,"id":"<lead_id>","kind":"lead","status":"pending_forward","stored_at":"…","payload":{…}}
//   `status` is `pending_forward` (to be forwarded), `backup_only` (no webhook configured, so
//   never forwarded) or, after pruning compacted the file, `forwarded` (with `forwarded_at`).
// - A status update, appended when a forward succeeds:
//   {"v":1,"id":"<lead_id>","status":"forwarded","at":"…"}
// A record's status is the last one given for its id in its file. Appending updates (instead of
// rewriting the record) keeps the request path append-only.
//
// Writers (the endpoint, leads:retry, backups:prune) are separate processes, so every write
// runs under a lock: an in-process queue plus a lock file (`.lock`, created exclusively) in the
// directory. That keeps an append from landing in a month file that prune is replacing (write
// temp + rename). A lock file left by a crashed process is taken over after `staleLockMs`.
// Readers need no lock: rename is atomic, and a half-written last line is skipped.
import { randomUUID } from 'node:crypto';
import {
  appendFile,
  chmod,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
} from 'node:fs/promises';
import { join } from 'node:path';

export type BackupKind = 'lead' | 'newsletter';
export type BackupStatus = 'pending_forward' | 'forwarded' | 'backup_only';

export type BackupRecord = {
  v: 1;
  id: string;
  kind: BackupKind;
  status: BackupStatus;
  stored_at: string;
  forwarded_at?: string;
  payload: unknown;
};

export type StatusUpdate = { v: 1; id: string; status: 'forwarded'; at: string };

export type BackupLine = BackupRecord | StatusUpdate;

/** A record with its current status and the month file it lives in. */
export type BackupEntry = { record: BackupRecord; status: BackupStatus; file: string };

export type BackupOptions = {
  now?: () => Date;
  /** How long to wait for the lock before giving up. */
  lockTimeoutMs?: number;
  /** A lock file older than this was left by a crashed process. */
  staleLockMs?: number;
};

export class BackupLockError extends Error {
  override name = 'BackupLockError';
}

const MONTH_FILE = /^\d{4}-\d{2}\.jsonl$/;
const LOCK_FILE = '.lock';
const DAY_MS = 24 * 60 * 60 * 1000;

/** The month file for a moment, by UTC date: 2026-10.jsonl. */
export function monthFile(date: Date): string {
  return `${date.toISOString().slice(0, 7)}.jsonl`;
}

function previousMonthFile(date: Date): string {
  return monthFile(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const STATUSES: readonly string[] = ['pending_forward', 'forwarded', 'backup_only'];
const KINDS: readonly string[] = ['lead', 'newsletter'];

function asLine(value: unknown): BackupLine | undefined {
  if (!isObject(value) || value.v !== 1 || typeof value.id !== 'string' || value.id === '') {
    return undefined;
  }
  if ('payload' in value) {
    const { kind, status, stored_at: storedAt } = value;
    const valid =
      typeof kind === 'string' &&
      KINDS.includes(kind) &&
      typeof status === 'string' &&
      STATUSES.includes(status) &&
      typeof storedAt === 'string' &&
      !Number.isNaN(Date.parse(storedAt));
    return valid ? (value as BackupRecord) : undefined;
  }
  return value.status === 'forwarded' && typeof value.at === 'string'
    ? (value as StatusUpdate)
    : undefined;
}

/** The lines of a month file; lines that aren't valid (a torn write) are counted, not returned. */
export function parseLines(text: string): { lines: BackupLine[]; malformed: number } {
  const lines: BackupLine[] = [];
  let malformed = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    let line: BackupLine | undefined;
    try {
      line = asLine(JSON.parse(raw));
    } catch {
      line = undefined;
    }
    if (line) lines.push(line);
    else malformed++;
  }
  return { lines, malformed };
}

function isRecord(line: BackupLine): line is BackupRecord {
  return 'payload' in line;
}

/** Records by id with their current status (the first record per id wins; updates follow). */
export function foldLines(
  lines: readonly BackupLine[],
): Map<string, { record: BackupRecord; status: BackupStatus; forwardedAt?: string }> {
  const entries = new Map<
    string,
    { record: BackupRecord; status: BackupStatus; forwardedAt?: string }
  >();
  for (const line of lines) {
    const entry = entries.get(line.id);
    if (isRecord(line)) {
      if (!entry) {
        entries.set(line.id, {
          record: line,
          status: line.status,
          forwardedAt: line.forwarded_at,
        });
      }
    } else if (entry) {
      entry.status = line.status;
      entry.forwardedAt = line.at;
    }
  }
  return entries;
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
}

async function monthFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((name) => MONTH_FILE.test(name)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function acquireFileLock(
  dir: string,
  { lockTimeoutMs = 10_000, staleLockMs = 60_000 }: BackupOptions,
): Promise<() => Promise<void>> {
  const path = join(dir, LOCK_FILE);
  const token = `${process.pid} ${randomUUID()}`;
  const started = Date.now();
  for (;;) {
    try {
      const handle = await open(path, 'wx', 0o600);
      await handle.writeFile(token);
      await handle.close();
      return async () => {
        // Only remove our own lock (a stale-lock takeover may have replaced it).
        if ((await readText(path)) === token) await unlink(path).catch(() => {});
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    try {
      const { mtimeMs } = await stat(path);
      // The real clock, like the file's mtime (options.now only dates records).
      if (Date.now() - mtimeMs > staleLockMs) {
        await unlink(path).catch(() => {});
        continue;
      }
    } catch {
      continue; // Released between our open and stat: try again at once.
    }
    if (Date.now() - started > lockTimeoutMs) {
      throw new BackupLockError('timed out waiting for the backup lock');
    }
    await sleep(15);
  }
}

const queues = new Map<string, Promise<unknown>>();

/** Runs `task` while holding the backup directory's lock (in this process and across them). */
export async function withBackupLock<T>(
  dir: string,
  task: () => Promise<T>,
  options: BackupOptions = {},
): Promise<T> {
  const run = (queues.get(dir) ?? Promise.resolve()).then(async () => {
    await ensureDir(dir);
    const release = await acquireFileLock(dir, options);
    try {
      return await task();
    } finally {
      await release();
    }
  });
  queues.set(
    dir,
    run.catch(() => {}),
  );
  return run;
}

function serialise(line: BackupLine): string {
  return `${JSON.stringify(line)}\n`;
}

/** Appends lines (call under the lock). A torn last line gets its newline first. */
async function appendLines(path: string, lines: readonly BackupLine[]): Promise<void> {
  let prefix = '';
  let created = false;
  try {
    const { size } = await stat(path);
    if (size > 0) {
      const handle = await open(path, 'r');
      try {
        const { buffer } = await handle.read(Buffer.alloc(1), 0, 1, size - 1);
        if (buffer[0] !== 0x0a) prefix = '\n';
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    created = true;
  }
  await appendFile(path, prefix + lines.map(serialise).join(''), { mode: 0o600 });
  if (created) await chmod(path, 0o600);
}

/**
 * Replaces a file's content safely: a temp file (mode 600) in the same directory, flushed to
 * disk, then renamed over the original. Call under the lock (withBackupLock).
 */
export async function rewriteFile(path: string, content: string): Promise<void> {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}

export type StoreInput = {
  id: string;
  kind: BackupKind;
  status: Exclude<BackupStatus, 'forwarded'>;
  payload: unknown;
};

export type StoreResult =
  { result: 'stored'; file: string } | { result: 'duplicate'; file: string; status: BackupStatus };

/**
 * Appends a record to this month's file, unless its id is already in this or last month's
 * file (idempotency, brief §9.1 step 7: a double submit is stored and forwarded once).
 */
export async function storeBackup(
  dir: string,
  input: StoreInput,
  options: BackupOptions = {},
): Promise<StoreResult> {
  const now = (options.now ?? (() => new Date()))();
  return withBackupLock(
    dir,
    async () => {
      for (const file of [monthFile(now), previousMonthFile(now)]) {
        const existing = foldLines(parseLines(await readText(join(dir, file))).lines).get(input.id);
        if (existing) return { result: 'duplicate', file, status: existing.status };
      }
      const file = monthFile(now);
      const record: BackupRecord = { v: 1, ...input, stored_at: now.toISOString() };
      await appendLines(join(dir, file), [record]);
      return { result: 'stored', file };
    },
    options,
  );
}

/** Records the successful forward of records (id + the file they're in). */
export async function markForwarded(
  dir: string,
  items: readonly { id: string; file: string }[],
  options: BackupOptions = {},
): Promise<void> {
  if (items.length === 0) return;
  const at = (options.now ?? (() => new Date()))().toISOString();
  const byFile = Map.groupBy(items, (item) => item.file);
  await withBackupLock(
    dir,
    async () => {
      for (const [file, group] of byFile) {
        if (!MONTH_FILE.test(file)) throw new Error(`not a backup month file: ${file}`);
        const updates = group.map(({ id }): StatusUpdate => ({
          v: 1,
          id,
          status: 'forwarded',
          at,
        }));
        await appendLines(join(dir, file), updates);
      }
    },
    options,
  );
}

/** Every record whose current status is `pending_forward`, oldest first. */
export async function listPending(dir: string): Promise<BackupEntry[]> {
  const pending: BackupEntry[] = [];
  for (const file of await monthFiles(dir)) {
    const entries = foldLines(parseLines(await readText(join(dir, file))).lines);
    for (const { record, status } of entries.values()) {
      if (status === 'pending_forward') pending.push({ record, status, file });
    }
  }
  return pending.sort((a, b) => Date.parse(a.record.stored_at) - Date.parse(b.record.stored_at));
}

export type PruneResult = {
  /** Records deleted because they were older than the cut-off. */
  removed: number;
  /** Of those, records that were never forwarded. */
  removedPending: number;
  /** Lines that weren't valid and were dropped. */
  malformed: number;
  /** Month files deleted because nothing was left in them. */
  filesDeleted: number;
};

/**
 * Deletes records older than `maxAgeDays` (brief §9.1 step 10: 30 days) and compacts each month
 * file: a record's status updates are merged into it, invalid lines dropped. Files that end up
 * empty are deleted; unchanged files are left alone.
 */
export async function pruneBackups(
  dir: string,
  { maxAgeDays = 30, ...options }: BackupOptions & { maxAgeDays?: number } = {},
): Promise<PruneResult> {
  const cutoff = (options.now ?? (() => new Date()))().getTime() - maxAgeDays * DAY_MS;
  const result: PruneResult = { removed: 0, removedPending: 0, malformed: 0, filesDeleted: 0 };
  await withBackupLock(
    dir,
    async () => {
      for (const file of await monthFiles(dir)) {
        const path = join(dir, file);
        const { lines, malformed } = parseLines(await readText(path));
        const kept: BackupRecord[] = [];
        for (const { record, status, forwardedAt } of foldLines(lines).values()) {
          if (Date.parse(record.stored_at) < cutoff) {
            result.removed++;
            if (status === 'pending_forward') result.removedPending++;
            continue;
          }
          const compacted: BackupRecord = { ...record, status };
          if (forwardedAt) compacted.forwarded_at = forwardedAt;
          kept.push(compacted);
        }
        result.malformed += malformed;
        if (kept.length === 0) {
          await unlink(path);
          result.filesDeleted++;
        } else if (kept.length !== lines.length || malformed > 0) {
          await rewriteFile(path, kept.map(serialise).join(''));
        }
      }
    },
    options,
  );
  return result;
}
