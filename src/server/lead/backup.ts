// Lead backups (brief §9.1 steps 7, 8 and 10): every lead (and newsletter sign-up) is written to
// LEAD_BACKUP_DIR/YYYY-MM.jsonl before it is forwarded, so an n8n outage never loses one.
// The directory is mode 700 and the files 600; LEAD_BACKUP_DIR is outside the web root (env.ts).
//
// Format: one JSON object per line, of three kinds.
// - A record, written once:
//   {"v":1,"id":"<lead_id>","kind":"lead","status":"pending_forward","stored_at":"…","payload":{…}}
//   `status` is `pending_forward` (to be forwarded), `backup_only` (no webhook configured, so
//   never forwarded) or, after pruning compacted the file, `forwarded` (with `forwarded_at`).
//   A compacted record also carries `attempts` and `last_attempt_at` (failed retries so far).
// - A status update, appended when a forward succeeds:
//   {"v":1,"id":"<lead_id>","status":"forwarded","at":"…"}
// - A failed attempt, appended by leads:retry (it spaces out the next attempts):
//   {"v":1,"id":"<lead_id>","failed_at":"…","reason":"http_500"}
// A record's status is the last one given for its id in its file. Appending updates (instead of
// rewriting the record) keeps the request path append-only. Appends are fsynced before the
// request is answered; a rewrite (prune) is temp file + fsync + rename + fsync of the directory.
//
// Writers (the endpoint, leads:retry, backups:prune) are separate processes, so every write
// runs under a lock: an in-process queue plus a lock directory `.lock` in the backup directory
// (see acquireBackupLock). That keeps an append from landing in a month file that prune is
// replacing. Readers need no lock: rename is atomic, and a half-written last line is skipped.
//
// The duplicate check (storeBackup, findBackup) uses an in-memory index of the ids in this and
// last month's file, filled once and then read incrementally as the file grows, instead of
// parsing the whole file on every request. A file that was replaced (prune) or shrank is
// indexed again from scratch.
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  chmod,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

export type BackupKind = 'lead' | 'newsletter';
export type BackupStatus = 'pending_forward' | 'forwarded' | 'backup_only';

export type BackupRecord = {
  v: 1;
  id: string;
  kind: BackupKind;
  status: BackupStatus;
  stored_at: string;
  forwarded_at?: string;
  /** Failed retry attempts so far (compacted records only; see AttemptUpdate). */
  attempts?: number;
  last_attempt_at?: string;
  payload: unknown;
};

export type StatusUpdate = { v: 1; id: string; status: 'forwarded'; at: string };

/** A failed forward by leads:retry: it doesn't change the status, it spaces out the retries. */
export type AttemptUpdate = { v: 1; id: string; failed_at: string; reason: string };

export type BackupLine = BackupRecord | StatusUpdate | AttemptUpdate;

/** A record with its current status and the month file it lives in. */
export type BackupEntry = {
  record: BackupRecord;
  status: BackupStatus;
  file: string;
  /** Failed retry attempts so far. */
  attempts: number;
  lastAttemptAt?: string;
};

export type BackupOptions = {
  now?: () => Date;
  /** How long to wait for the lock before giving up. */
  lockTimeoutMs?: number;
  /** A lock older than this was left by a crashed process (the holder refreshes its lock). */
  staleLockMs?: number;
};

export class BackupLockError extends Error {
  override name = 'BackupLockError';
}

const MONTH_FILE = /^\d{4}-\d{2}\.jsonl$/;
const LOCK_DIR = '.lock';
const LOCK_OWNER = 'owner';
/** What the lock leaves behind: candidates, released locks and stale-lock tombstones. */
const LOCK_LEFTOVER = /^\.lock\.[\w-]+\.(?:new|released|stale)$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Temp files and lock leftovers older than this belong to a process that died (prune). */
const LEFTOVER_AGE_MS = 60 * 60 * 1000;

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

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

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
      isDate(storedAt);
    return valid ? (value as BackupRecord) : undefined;
  }
  if ('failed_at' in value) {
    return isDate(value.failed_at) && typeof value.reason === 'string'
      ? (value as AttemptUpdate)
      : undefined;
  }
  return value.status === 'forwarded' && typeof value.at === 'string'
    ? (value as StatusUpdate)
    : undefined;
}

function parseLine(raw: string): BackupLine | undefined {
  try {
    return asLine(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** The lines of a month file; lines that aren't valid (a torn write) are counted, not returned. */
export function parseLines(text: string): { lines: BackupLine[]; malformed: number } {
  const lines: BackupLine[] = [];
  let malformed = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) lines.push(line);
    else malformed++;
  }
  return { lines, malformed };
}

function isRecord(line: BackupLine): line is BackupRecord {
  return 'payload' in line;
}

function isAttempt(line: BackupLine): line is AttemptUpdate {
  return 'failed_at' in line;
}

export type FoldedEntry = {
  record: BackupRecord;
  status: BackupStatus;
  forwardedAt?: string;
  attempts: number;
  lastAttemptAt?: string;
};

function recordAttempts(record: BackupRecord): number {
  const { attempts } = record;
  return typeof attempts === 'number' && Number.isInteger(attempts) && attempts > 0 ? attempts : 0;
}

/** Records by id with their current status (the first record per id wins; updates follow). */
export function foldLines(lines: readonly BackupLine[]): Map<string, FoldedEntry> {
  const entries = new Map<string, FoldedEntry>();
  for (const line of lines) {
    const entry = entries.get(line.id);
    if (isRecord(line)) {
      if (!entry) {
        entries.set(line.id, {
          record: line,
          status: line.status,
          forwardedAt: line.forwarded_at,
          attempts: recordAttempts(line),
          lastAttemptAt: isDate(line.last_attempt_at) ? line.last_attempt_at : undefined,
        });
      }
    } else if (!entry) {
      continue;
    } else if (isAttempt(line)) {
      entry.attempts++;
      entry.lastAttemptAt = line.failed_at;
    } else {
      entry.status = line.status;
      entry.forwardedAt = line.at;
    }
  }
  return entries;
}

const code = (error: unknown) => (error as NodeJS.ErrnoException | null)?.code;

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (code(error) === 'ENOENT') return '';
    throw error;
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (error) {
    if (code(error) === 'ENOENT') return [];
    throw error;
  }
}

async function monthFiles(dir: string): Promise<string[]> {
  return (await listDir(dir)).filter((name) => MONTH_FILE.test(name)).sort();
}

/** fsyncs a directory, so a created or renamed entry survives a crash (where supported). */
async function syncDir(dir: string): Promise<void> {
  const handle = await open(dir, 'r');
  try {
    await handle.sync();
  } catch (error) {
    // Some platforms and file systems can't fsync a directory; nothing more can be done there.
    if (!['EINVAL', 'ENOTSUP', 'EISDIR', 'EPERM', 'EBADF'].includes(code(error) ?? '')) throw error;
  } finally {
    await handle.close();
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The lock is held by someone else: rename can't replace a non-empty lock directory. */
const HELD = new Set(['EEXIST', 'ENOTEMPTY', 'ENOTDIR']);

/**
 * Moves a stale lock out of the way; true when the lock is gone (try again at once).
 *
 * The stale lock is renamed to a tombstone named after its inode, `.lock.<ino>.stale`. Two
 * processes that both saw the same stale lock race for that one name: rename can't replace the
 * winner's non-empty tombstone, so the loser fails and keeps waiting, and can never move the
 * fresh lock the winner takes next. The tombstone stays for an hour (prune removes it), longer
 * than any process takes between looking at the lock and renaming it.
 */
async function removeStaleLock(dir: string, lock: string, staleLockMs: number): Promise<boolean> {
  let seen;
  try {
    seen = await stat(lock);
  } catch (error) {
    if (code(error) === 'ENOENT') return true; // Released meanwhile.
    throw error;
  }
  // The real clock, like the lock's mtime (options.now only dates records).
  if (Date.now() - seen.mtimeMs <= staleLockMs) return false;
  if (!seen.isDirectory()) {
    // A lock file from before lock directories (one deploy at most): remove it.
    await unlink(lock).catch(() => {});
    return true;
  }
  const tombstone = join(dir, `.lock.${seen.ino}.stale`);
  try {
    await rename(lock, tombstone);
  } catch (error) {
    // ENOENT: released meanwhile. Otherwise another process took this stale lock over first.
    return code(error) === 'ENOENT';
  }
  const moved = await stat(tombstone);
  if (moved.ino !== seen.ino) {
    // The stale lock was released by a holder that was alive after all, and this is a new
    // lock: put it back (the holder refreshes its lock, so this needs a process frozen for
    // longer than staleLockMs).
    await rename(tombstone, lock).catch(() => {});
    return false;
  }
  const now = new Date();
  await utimes(tombstone, now, now).catch(() => {});
  return true;
}

/**
 * Takes the backup directory's lock across processes and returns its release function.
 *
 * The lock is a directory, `.lock`, holding an `owner` file with a token. It is created as a
 * unique candidate directory (with the owner file already inside) and renamed to `.lock`:
 * rename can't replace a non-empty directory, so exactly one process wins and the lock never
 * exists without its owner. Nothing is written after the rename, so no write error can leave a
 * lock behind. The holder refreshes the lock's mtime while it holds it; a lock older than
 * `staleLockMs` belongs to a crashed process and is taken over (removeStaleLock). Release
 * renames the lock away (only when the owner token is still ours) and deletes it.
 */
export async function acquireBackupLock(
  dir: string,
  { lockTimeoutMs = 10_000, staleLockMs = 60_000 }: BackupOptions = {},
): Promise<() => Promise<void>> {
  const lock = join(dir, LOCK_DIR);
  const token = `${process.pid}.${randomUUID()}`;
  const candidate = join(dir, `.lock.${randomUUID()}.new`);
  await mkdir(candidate, { mode: 0o700 });
  try {
    await writeFile(join(candidate, LOCK_OWNER), token, { mode: 0o600 });
    const started = Date.now();
    for (;;) {
      try {
        await rename(candidate, lock);
        return holdLock(dir, lock, token, staleLockMs);
      } catch (error) {
        if (!HELD.has(code(error) ?? '')) throw error;
      }
      if (await removeStaleLock(dir, lock, staleLockMs)) continue;
      if (Date.now() - started > lockTimeoutMs) {
        throw new BackupLockError('timed out waiting for the backup lock');
      }
      await sleep(15);
    }
  } finally {
    // Gone already when it became the lock.
    await rm(candidate, { recursive: true, force: true });
  }
}

function holdLock(
  dir: string,
  lock: string,
  token: string,
  staleLockMs: number,
): () => Promise<void> {
  const heartbeat = setInterval(
    () => {
      const now = new Date();
      utimes(lock, now, now).catch(() => {});
    },
    Math.max(10, Math.floor(staleLockMs / 4)),
  );
  heartbeat.unref();
  return async () => {
    clearInterval(heartbeat);
    // Only remove our own lock (a stale-lock takeover may have replaced it).
    if ((await readText(join(lock, LOCK_OWNER)).catch(() => '')) !== token) return;
    const released = join(dir, `.lock.${randomUUID()}.released`);
    try {
      await rename(lock, released);
    } catch {
      return;
    }
    await rm(released, { recursive: true, force: true });
  };
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
    const release = await acquireBackupLock(dir, options);
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

type FileState = { ino: number; size: number };

/**
 * Appends lines (call under the lock) and fsyncs the file before returning, so a stored lead
 * survives a crash. A torn last line gets its newline first. Returns the file's new state.
 */
async function appendLines(path: string, lines: readonly BackupLine[]): Promise<FileState> {
  const handle = await open(path, 'a+', 0o600);
  try {
    const { size } = await handle.stat();
    const created = size === 0;
    let prefix = '';
    if (size > 0) {
      const { buffer } = await handle.read(Buffer.alloc(1), 0, 1, size - 1);
      if (buffer[0] !== 0x0a) prefix = '\n';
    }
    await handle.writeFile(prefix + lines.map(serialise).join(''));
    await handle.sync();
    if (created) await handle.chmod(0o600);
    const after = await handle.stat();
    if (created) await syncDir(dirname(path));
    return { ino: after.ino, size: after.size };
  } finally {
    await handle.close();
  }
}

/**
 * Replaces a file's content safely: a temp file (mode 600) in the same directory, flushed to
 * disk, renamed over the original, then the directory flushed. The temp file is removed on any
 * failure. Call under the lock (withBackupLock).
 */
export async function rewriteFile(path: string, content: string): Promise<void> {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(temp).catch(() => {});
    throw error;
  }
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
  await syncDir(dirname(path));
}

// The duplicate-check index, per backup directory and month file (see the top of this file).
type MonthIndex = FileState & { ids: Map<string, BackupStatus> };
const indexes = new Map<string, Map<string, MonthIndex>>();

/** Reads the lines of `path` from byte `start` into `ids`, as foldLines would. */
async function indexLines(
  path: string,
  start: number,
  end: number,
  ids: Map<string, BackupStatus>,
): Promise<void> {
  if (end <= start) return;
  const lines = createInterface({
    input: createReadStream(path, { encoding: 'utf8', start, end: end - 1 }),
    crlfDelay: Infinity,
  });
  for await (const raw of lines) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line || isAttempt(line)) continue;
    if (isRecord(line)) {
      if (!ids.has(line.id)) ids.set(line.id, line.status);
    } else if (ids.has(line.id)) {
      ids.set(line.id, line.status);
    }
  }
}

/** The ids (with their status) in a month file, from the index. Call under the lock. */
async function monthIds(dir: string, file: string): Promise<Map<string, BackupStatus>> {
  const byFile = indexes.get(dir) ?? new Map<string, MonthIndex>();
  indexes.set(dir, byFile);
  const path = join(dir, file);
  let current;
  try {
    current = await stat(path);
  } catch (error) {
    if (code(error) !== 'ENOENT') throw error;
    byFile.delete(file);
    return new Map();
  }
  let index = byFile.get(file);
  if (index && index.ino === current.ino && index.size === current.size) return index.ids;
  if (index && index.ino === current.ino && current.size > index.size) {
    // Appended to since (status lines from leads:retry): read only the new part.
    await indexLines(path, index.size, current.size, index.ids);
  } else {
    // New to this process, or replaced (prune) or shrunk since: index it from scratch.
    index = { ino: current.ino, size: 0, ids: new Map() };
    await indexLines(path, 0, current.size, index.ids);
  }
  index.ino = current.ino;
  index.size = current.size;
  byFile.set(file, index);
  return index.ids;
}

/** Keeps the index to the month files the duplicate check reads. */
function trimIndex(dir: string, keep: readonly string[]): void {
  const byFile = indexes.get(dir);
  for (const file of byFile?.keys() ?? []) if (!keep.includes(file)) byFile!.delete(file);
}

/** Records the lines this process just appended in the index. */
function indexAppended(dir: string, file: string, state: FileState, record: BackupRecord): void {
  const byFile = indexes.get(dir) ?? new Map<string, MonthIndex>();
  indexes.set(dir, byFile);
  const index = byFile.get(file) ?? { ...state, ids: new Map() };
  index.ino = state.ino;
  index.size = state.size;
  index.ids.set(record.id, record.status);
  byFile.set(file, index);
}

export type StoreInput = {
  id: string;
  kind: BackupKind;
  status: Exclude<BackupStatus, 'forwarded'>;
  payload: unknown;
};

export type StoreResult =
  { result: 'stored'; file: string } | { result: 'duplicate'; file: string; status: BackupStatus };

/** Where an id is in this or last month's file (call under the lock). */
async function lookup(
  dir: string,
  id: string,
  now: Date,
): Promise<{ file: string; status: BackupStatus } | undefined> {
  const files = [monthFile(now), previousMonthFile(now)];
  trimIndex(dir, files);
  for (const file of files) {
    const status = (await monthIds(dir, file)).get(id);
    if (status) return { file, status };
  }
  return undefined;
}

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
      const existing = await lookup(dir, input.id, now);
      if (existing) return { result: 'duplicate', ...existing };
      const file = monthFile(now);
      const record: BackupRecord = { v: 1, ...input, stored_at: now.toISOString() };
      indexAppended(dir, file, await appendLines(join(dir, file), [record]), record);
      return { result: 'stored', file };
    },
    options,
  );
}

/** Whether an id is already backed up, in this or last month's file (and where). */
export async function findBackup(
  dir: string,
  id: string,
  options: BackupOptions = {},
): Promise<{ file: string; status: BackupStatus } | undefined> {
  const now = (options.now ?? (() => new Date()))();
  return withBackupLock(dir, () => lookup(dir, id, now), options);
}

function assertMonthFile(file: string): void {
  if (!MONTH_FILE.test(file)) throw new Error(`not a backup month file: ${file}`);
}

/** Appends update lines, grouped by the month file of their record. */
async function appendUpdates<T extends { file: string }>(
  dir: string,
  items: readonly T[],
  toLine: (item: T) => BackupLine,
  options: BackupOptions,
): Promise<void> {
  if (items.length === 0) return;
  const byFile = Map.groupBy(items, (item) => item.file);
  await withBackupLock(
    dir,
    async () => {
      for (const [file, group] of byFile) {
        assertMonthFile(file);
        await appendLines(join(dir, file), group.map(toLine));
      }
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
  const at = (options.now ?? (() => new Date()))().toISOString();
  await appendUpdates(
    dir,
    items,
    ({ id }): StatusUpdate => ({ v: 1, id, status: 'forwarded', at }),
    options,
  );
}

/** Records failed forward attempts of records (leads:retry spaces out the next ones). */
export async function markAttemptFailed(
  dir: string,
  items: readonly { id: string; file: string; reason: string }[],
  options: BackupOptions = {},
): Promise<void> {
  const at = (options.now ?? (() => new Date()))().toISOString();
  await appendUpdates(
    dir,
    items,
    ({ id, reason }): AttemptUpdate => ({ v: 1, id, failed_at: at, reason }),
    options,
  );
}

/** Every record whose current status is `pending_forward`, oldest first. */
export async function listPending(dir: string): Promise<BackupEntry[]> {
  const pending: BackupEntry[] = [];
  for (const file of await monthFiles(dir)) {
    const entries = foldLines(parseLines(await readText(join(dir, file))).lines);
    for (const { record, status, attempts, lastAttemptAt } of entries.values()) {
      if (status === 'pending_forward') {
        pending.push({ record, status, file, attempts, lastAttemptAt });
      }
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
  /** Temp files (`*.tmp`) left by a rewrite that never finished, deleted after an hour. */
  tempFilesDeleted: number;
};

/**
 * Deletes what a process that died left behind (call under the lock): temp files of a rewrite
 * (a full copy of a month's personal data, brief §11) and lock leftovers, older than an hour.
 */
async function removeLeftovers(dir: string): Promise<number> {
  let tempFiles = 0;
  for (const name of await listDir(dir)) {
    const temp = name.endsWith('.tmp');
    if (!temp && !LOCK_LEFTOVER.test(name)) continue;
    const path = join(dir, name);
    const info = await stat(path).catch(() => undefined);
    if (!info || Date.now() - info.mtimeMs <= LEFTOVER_AGE_MS) continue;
    if (temp && info.isFile()) {
      await unlink(path);
      tempFiles++;
    } else if (!temp && info.isDirectory()) {
      await rm(path, { recursive: true, force: true });
    }
  }
  return tempFiles;
}

/**
 * Deletes records older than `maxAgeDays` (brief §9.1 step 10: 30 days) and compacts each month
 * file: a record's status updates and failed attempts are merged into it, invalid lines
 * dropped. Files that end up empty are deleted; unchanged files are left alone. Also deletes
 * stale temp files and lock leftovers (removeLeftovers).
 */
export async function pruneBackups(
  dir: string,
  { maxAgeDays = 30, ...options }: BackupOptions & { maxAgeDays?: number } = {},
): Promise<PruneResult> {
  const cutoff = (options.now ?? (() => new Date()))().getTime() - maxAgeDays * DAY_MS;
  const result: PruneResult = {
    removed: 0,
    removedPending: 0,
    malformed: 0,
    filesDeleted: 0,
    tempFilesDeleted: 0,
  };
  await withBackupLock(
    dir,
    async () => {
      result.tempFilesDeleted = await removeLeftovers(dir);
      for (const file of await monthFiles(dir)) {
        const path = join(dir, file);
        const { lines, malformed } = parseLines(await readText(path));
        const kept: BackupRecord[] = [];
        for (const entry of foldLines(lines).values()) {
          const { record, status, forwardedAt, attempts, lastAttemptAt } = entry;
          if (Date.parse(record.stored_at) < cutoff) {
            result.removed++;
            if (status === 'pending_forward') result.removedPending++;
            continue;
          }
          const compacted: BackupRecord = { ...record, status };
          if (forwardedAt) compacted.forwarded_at = forwardedAt;
          if (attempts > 0) compacted.attempts = attempts;
          if (lastAttemptAt) compacted.last_attempt_at = lastAttemptAt;
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
