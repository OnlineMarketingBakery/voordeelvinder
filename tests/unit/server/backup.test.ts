import {
  appendFile,
  chmod,
  mkdir,
  open,
  readdir,
  readFile,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  acquireBackupLock,
  BackupLockError,
  type BackupStatus,
  findBackup,
  foldLines,
  listPending,
  markAttemptFailed,
  markForwarded,
  monthFile,
  parseLines,
  pruneBackups,
  rewriteFile,
  storeBackup,
  withBackupLock,
} from '../../../src/server/lead/backup';
import { tempDir } from './fixtures';

const at = (iso: string) => () => new Date(iso);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const NO_PRUNE = { removed: 0, removedPending: 0, malformed: 0, filesDeleted: 0 };

/** A lock directory as another process leaves it: `.lock/owner` with its token. */
async function lockDir(dir: string, token = 'other-process', mtime?: Date): Promise<string> {
  const lock = join(dir, '.lock');
  await mkdir(lock, { recursive: true });
  await writeFile(join(lock, 'owner'), token);
  if (mtime) await utimes(lock, mtime, mtime);
  return lock;
}

/** FileHandle.prototype, to watch fsync calls. */
async function fileHandlePrototype(dir: string): Promise<{ sync: () => Promise<void> }> {
  await mkdir(dir, { recursive: true });
  const handle = await open(join(dir, 'probe'), 'w');
  const prototype = Object.getPrototypeOf(handle) as { sync: () => Promise<void> };
  await handle.close();
  const { unlink } = await import('node:fs/promises');
  await unlink(join(dir, 'probe'));
  return prototype;
}
const mode = async (path: string) => (await stat(path)).mode & 0o777;
const lines = async (path: string) =>
  (await readFile(path, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe('lead backups', () => {
  let dir: string;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
  });
  afterEach(() => cleanup());

  it('names month files by UTC date', () => {
    expect(monthFile(new Date('2026-10-01T00:30:00+02:00'))).toBe('2026-09.jsonl');
    expect(monthFile(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12.jsonl');
  });

  it('appends a record to this month’s file, dir 700 and file 600', async () => {
    const now = at('2026-10-05T10:00:00.000Z');
    const result = await storeBackup(
      dir,
      { id: 'lead-1', kind: 'lead', status: 'pending_forward', payload: { a: 1 } },
      { now },
    );
    expect(result).toEqual({ result: 'stored', file: '2026-10.jsonl' });
    const file = join(dir, '2026-10.jsonl');
    expect(await lines(file)).toEqual([
      {
        v: 1,
        id: 'lead-1',
        kind: 'lead',
        status: 'pending_forward',
        payload: { a: 1 },
        stored_at: '2026-10-05T10:00:00.000Z',
      },
    ]);
    expect(await mode(dir)).toBe(0o700);
    expect(await mode(file)).toBe(0o600);
    // The lock file is gone again.
    expect(await readdir(dir)).toEqual(['2026-10.jsonl']);
  });

  it('is idempotent by id, also across the month boundary', async () => {
    const input = { id: 'lead-1', kind: 'lead', status: 'pending_forward', payload: {} } as const;
    await storeBackup(dir, input, { now: at('2026-09-30T23:59:00Z') });
    expect(await storeBackup(dir, input, { now: at('2026-10-01T00:01:00Z') })).toEqual({
      result: 'duplicate',
      file: '2026-09.jsonl',
      status: 'pending_forward',
    });
    expect(await storeBackup(dir, input, { now: at('2026-09-30T23:59:30Z') })).toMatchObject({
      result: 'duplicate',
    });
    expect(await readdir(dir)).toEqual(['2026-09.jsonl']);
    expect(await lines(join(dir, '2026-09.jsonl'))).toHaveLength(1);
  });

  it('stores concurrent submits of the same lead once', async () => {
    const input = { id: 'same', kind: 'lead', status: 'pending_forward', payload: {} } as const;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => storeBackup(dir, input, { now: at('2026-10-05T10:00:00Z') })),
    );
    expect(results.filter((r) => r.result === 'stored')).toHaveLength(1);
    expect(await lines(join(dir, '2026-10.jsonl'))).toHaveLength(1);
  });

  it('marks records forwarded with an appended update, and lists what is pending', async () => {
    const now = at('2026-10-05T10:00:00.000Z');
    for (const id of ['a', 'b', 'c']) {
      await storeBackup(
        dir,
        { id, kind: 'lead', status: 'pending_forward', payload: { id } },
        { now },
      );
    }
    await storeBackup(dir, { id: 'd', kind: 'lead', status: 'backup_only', payload: {} }, { now });
    await markForwarded(dir, [{ id: 'b', file: '2026-10.jsonl' }], {
      now: at('2026-10-05T10:01:00Z'),
    });
    await markForwarded(dir, []);

    const file = join(dir, '2026-10.jsonl');
    expect((await lines(file)).at(-1)).toEqual({
      v: 1,
      id: 'b',
      status: 'forwarded',
      at: '2026-10-05T10:01:00.000Z',
    });
    const pending = await listPending(dir);
    expect(pending.map(({ record }) => record.id)).toEqual(['a', 'c']);
    expect(pending[0]).toMatchObject({ status: 'pending_forward', file: '2026-10.jsonl' });
  });

  it('refuses to mark in a file that is not a month file', async () => {
    await expect(markForwarded(dir, [{ id: 'a', file: '../evil.jsonl' }])).rejects.toThrow(
      /not a backup month file/,
    );
  });

  it('lists pending records oldest first across month files, and nothing without a dir', async () => {
    expect(await listPending(dir)).toEqual([]);
    await storeBackup(
      dir,
      { id: 'new', kind: 'lead', status: 'pending_forward', payload: {} },
      {
        now: at('2026-10-02T00:00:00Z'),
      },
    );
    await storeBackup(
      dir,
      { id: 'old', kind: 'newsletter', status: 'pending_forward', payload: {} },
      {
        now: at('2026-08-02T00:00:00Z'),
      },
    );
    await writeFile(join(dir, 'notes.txt'), 'ignored');
    expect((await listPending(dir)).map(({ record }) => record.id)).toEqual(['old', 'new']);
  });

  it('survives a torn last line: the next append starts on a new line', async () => {
    const now = at('2026-10-05T10:00:00Z');
    await storeBackup(
      dir,
      { id: 'a', kind: 'lead', status: 'pending_forward', payload: {} },
      { now },
    );
    await appendFile(join(dir, '2026-10.jsonl'), '{"v":1,"id":"torn","kin');
    await storeBackup(
      dir,
      { id: 'b', kind: 'lead', status: 'pending_forward', payload: {} },
      { now },
    );
    const { lines: parsed, malformed } = parseLines(
      await readFile(join(dir, '2026-10.jsonl'), 'utf8'),
    );
    expect(parsed.map((line) => line.id)).toEqual(['a', 'b']);
    expect(malformed).toBe(1);
  });

  it('passes on read errors other than a missing file or directory', async () => {
    await mkdir(join(dir, '2026-10.jsonl'), { recursive: true });
    await expect(listPending(dir)).rejects.toThrow(/EISDIR/);
    const file = join(dir, '..', 'plain-file');
    await writeFile(file, 'x');
    await expect(listPending(file)).rejects.toThrow(/ENOTDIR/);
  });

  describe('parseLines / foldLines', () => {
    it('keeps only valid records and updates', () => {
      const text = [
        '{"v":1,"id":"a","kind":"lead","status":"pending_forward","stored_at":"2026-10-01T00:00:00Z","payload":{}}',
        '{"v":1,"id":"a","status":"forwarded","at":"2026-10-01T00:01:00Z"}',
        '{"v":2,"id":"x","kind":"lead","status":"pending_forward","stored_at":"2026-10-01T00:00:00Z","payload":{}}',
        '{"v":1,"id":"","kind":"lead","status":"pending_forward","stored_at":"2026-10-01T00:00:00Z","payload":{}}',
        '{"v":1,"id":"y","kind":"other","status":"pending_forward","stored_at":"2026-10-01T00:00:00Z","payload":{}}',
        '{"v":1,"id":"y","kind":"lead","status":"lost","stored_at":"2026-10-01T00:00:00Z","payload":{}}',
        '{"v":1,"id":"y","kind":"lead","status":"pending_forward","stored_at":"yesterday","payload":{}}',
        '{"v":1,"id":"z","status":"pending_forward","at":"2026-10-01T00:00:00Z"}',
        '[1]',
        'null',
        'not json',
        '',
      ].join('\n');
      const { lines: parsed, malformed } = parseLines(text);
      expect(parsed).toHaveLength(2);
      expect(malformed).toBe(9);
      const folded = foldLines(parsed);
      expect(folded.get('a')).toMatchObject({
        status: 'forwarded',
        forwardedAt: '2026-10-01T00:01:00Z',
      });
    });

    it('ignores an update without a record and a second record for an id', () => {
      const record = (id: string, status: BackupStatus) =>
        ({
          v: 1,
          id,
          kind: 'lead',
          status,
          stored_at: '2026-10-01T00:00:00Z',
          payload: {},
        }) as const;
      const folded = foldLines([
        { v: 1, id: 'orphan', status: 'forwarded', at: '2026-10-01T00:00:00Z' },
        record('a', 'pending_forward'),
        record('a', 'backup_only'),
      ]);
      expect([...folded.keys()]).toEqual(['a']);
      expect(folded.get('a')!.status).toBe('pending_forward');
    });
  });

  describe('pruneBackups', () => {
    it('deletes records older than 30 days, compacts, and removes empty files', async () => {
      const store = (
        id: string,
        iso: string,
        status: 'pending_forward' | 'backup_only' = 'pending_forward',
      ) => storeBackup(dir, { id, kind: 'lead', status, payload: { id } }, { now: at(iso) });
      await store('aug', '2026-08-20T00:00:00Z');
      await store('sep-old', '2026-09-01T00:00:00Z');
      await store('sep-new', '2026-09-20T00:00:00Z');
      await store('oct', '2026-10-01T00:00:00Z', 'backup_only');
      await markForwarded(dir, [{ id: 'sep-new', file: '2026-09.jsonl' }], {
        now: at('2026-09-20T00:05:00Z'),
      });
      await markForwarded(dir, [{ id: 'aug', file: '2026-08.jsonl' }], {
        now: at('2026-08-20T00:05:00Z'),
      });
      await appendFile(join(dir, '2026-10.jsonl'), 'garbage\n');
      const octBefore = await readFile(join(dir, '2026-10.jsonl'), 'utf8');

      const result = await pruneBackups(dir, { now: at('2026-10-05T00:00:00Z') });
      expect(result).toEqual({
        removed: 2,
        removedPending: 1,
        malformed: 1,
        filesDeleted: 1,
        tempFilesDeleted: 0,
      });
      expect((await readdir(dir)).sort()).toEqual(['2026-09.jsonl', '2026-10.jsonl']);
      expect(await lines(join(dir, '2026-09.jsonl'))).toEqual([
        expect.objectContaining({
          id: 'sep-new',
          status: 'forwarded',
          forwarded_at: '2026-09-20T00:05:00.000Z',
        }),
      ]);
      expect(await mode(join(dir, '2026-09.jsonl'))).toBe(0o600);
      // The malformed line is dropped; the record itself is unchanged.
      expect(await readFile(join(dir, '2026-10.jsonl'), 'utf8')).toBe(
        octBefore.replace('garbage\n', ''),
      );

      // A second run changes nothing.
      const mtime = (await stat(join(dir, '2026-09.jsonl'))).mtimeMs;
      expect(await pruneBackups(dir, { now: at('2026-10-05T00:00:00Z') })).toEqual({
        ...NO_PRUNE,
        tempFilesDeleted: 0,
      });
      expect((await stat(join(dir, '2026-09.jsonl'))).mtimeMs).toBe(mtime);
    });

    it('works on a directory that does not exist yet', async () => {
      expect(await pruneBackups(dir)).toEqual({ ...NO_PRUNE, tempFilesDeleted: 0 });
    });

    it('keeps failed attempts in the compacted record', async () => {
      const now = at('2026-10-05T10:00:00.000Z');
      await storeBackup(
        dir,
        { id: 'a', kind: 'lead', status: 'pending_forward', payload: {} },
        { now },
      );
      await markAttemptFailed(dir, [{ id: 'a', file: '2026-10.jsonl', reason: 'http_500' }], {
        now: at('2026-10-05T10:05:00.000Z'),
      });
      await markAttemptFailed(dir, [{ id: 'a', file: '2026-10.jsonl', reason: 'timeout' }], {
        now: at('2026-10-05T10:15:00.000Z'),
      });
      await pruneBackups(dir, { now: at('2026-10-06T00:00:00Z') });
      expect(await lines(join(dir, '2026-10.jsonl'))).toEqual([
        expect.objectContaining({
          id: 'a',
          status: 'pending_forward',
          attempts: 2,
          last_attempt_at: '2026-10-05T10:15:00.000Z',
        }),
      ]);
      // And counts on from there.
      await markAttemptFailed(dir, [{ id: 'a', file: '2026-10.jsonl', reason: 'network' }], {
        now: at('2026-10-06T01:00:00.000Z'),
      });
      expect(await listPending(dir)).toMatchObject([
        { attempts: 3, lastAttemptAt: '2026-10-06T01:00:00.000Z' },
      ]);
    });

    it('deletes temp files and lock leftovers older than an hour, and keeps young ones', async () => {
      await mkdir(dir, { recursive: true });
      const old = hoursAgo(2);
      const orphan = join(dir, '2026-10.jsonl.123.0b6f6a1e-7f5a-4c1e-9a53-3f1f3c2d8e01.tmp');
      await writeFile(orphan, '{"personal":"data"}\n');
      await utimes(orphan, old, old);
      const young = join(dir, '2026-10.jsonl.456.9d1c2b3a-4e5f-4a6b-8c7d-0e1f2a3b4c5d.tmp');
      await writeFile(young, 'still being written');
      const tombstone = join(dir, '.lock.12345.stale');
      await mkdir(tombstone);
      await writeFile(join(tombstone, 'owner'), 'crashed');
      await utimes(tombstone, old, old);
      const freshTombstone = join(dir, '.lock.67890.stale');
      await mkdir(freshTombstone);
      // A directory that only looks like a temp file, and an unrelated file: left alone.
      await mkdir(join(dir, 'odd.tmp'));
      await utimes(join(dir, 'odd.tmp'), old, old);
      await writeFile(join(dir, 'notes.txt'), 'x');

      expect(await pruneBackups(dir)).toEqual({ ...NO_PRUNE, tempFilesDeleted: 1 });
      expect((await readdir(dir)).sort()).toEqual(
        [
          '.lock.67890.stale',
          '2026-10.jsonl.456.9d1c2b3a-4e5f-4a6b-8c7d-0e1f2a3b4c5d.tmp',
          'notes.txt',
          'odd.tmp',
        ].sort(),
      );
    });
  });

  describe('rewriteFile', () => {
    it('replaces the content through a temp file with mode 600', async () => {
      await mkdir(dir, { recursive: true });
      const path = join(dir, '2026-10.jsonl');
      await writeFile(path, 'old\n');
      await rewriteFile(path, 'new\n');
      expect(await readFile(path, 'utf8')).toBe('new\n');
      expect(await mode(path)).toBe(0o600);
      expect(await readdir(dir)).toEqual(['2026-10.jsonl']);
    });

    it('cleans up its temp file when the rename fails', async () => {
      await mkdir(join(dir, 'target.jsonl'), { recursive: true });
      await writeFile(join(dir, 'target.jsonl', 'child'), 'x');
      await expect(rewriteFile(join(dir, 'target.jsonl'), 'new')).rejects.toThrow();
      expect(await readdir(dir)).toEqual(['target.jsonl']);
    });

    it('cleans up its temp file when writing it fails', async () => {
      await mkdir(dir, { recursive: true });
      const path = join(dir, '2026-10.jsonl');
      await writeFile(path, 'old\n');
      // Not a string: writeFile throws after the temp file was created.
      await expect(rewriteFile(path, 42 as unknown as string)).rejects.toThrow();
      expect(await readdir(dir)).toEqual(['2026-10.jsonl']);
      expect(await readFile(path, 'utf8')).toBe('old\n');
    });

    it('fsyncs the temp file and then the directory', async () => {
      const prototype = await fileHandlePrototype(dir);
      const sync = vi.spyOn(prototype, 'sync');
      try {
        await rewriteFile(join(dir, '2026-10.jsonl'), 'new\n');
        expect(sync).toHaveBeenCalledTimes(2);
      } finally {
        sync.mockRestore();
      }
    });
  });

  describe('durability', () => {
    it('fsyncs an append before storeBackup returns', async () => {
      const prototype = await fileHandlePrototype(dir);
      const sync = vi.spyOn(prototype, 'sync');
      try {
        const now = at('2026-10-05T10:00:00Z');
        await storeBackup(
          dir,
          { id: 'a', kind: 'lead', status: 'pending_forward', payload: {} },
          { now },
        );
        // The file, and the directory for the new file.
        expect(sync).toHaveBeenCalledTimes(2);
        sync.mockClear();
        await storeBackup(
          dir,
          { id: 'b', kind: 'lead', status: 'pending_forward', payload: {} },
          { now },
        );
        await markForwarded(dir, [{ id: 'a', file: '2026-10.jsonl' }]);
        expect(sync).toHaveBeenCalledTimes(2);
      } finally {
        sync.mockRestore();
      }
    });
  });

  describe('duplicate check (index)', () => {
    const now = at('2026-10-05T10:00:00Z');
    const store = (id: string) =>
      storeBackup(dir, { id, kind: 'lead', status: 'pending_forward', payload: { id } }, { now });

    it('finds a backed-up id and where it is, and nothing for an unknown one', async () => {
      await store('a');
      expect(await findBackup(dir, 'a', { now })).toEqual({
        file: '2026-10.jsonl',
        status: 'pending_forward',
      });
      expect(await findBackup(dir, 'b', { now })).toBeUndefined();
      // Last month's file counts too.
      expect(await findBackup(dir, 'a', { now: at('2026-11-02T00:00:00Z') })).toMatchObject({
        file: '2026-10.jsonl',
      });
      expect(await findBackup(dir, 'a', { now: at('2026-12-02T00:00:00Z') })).toBeUndefined();
    });

    it('sees what other processes appended (records and status updates)', async () => {
      await store('a');
      const file = join(dir, '2026-10.jsonl');
      await appendFile(
        file,
        [
          '{"v":1,"id":"other","kind":"lead","status":"pending_forward","stored_at":"2026-10-05T10:00:00Z","payload":{}}',
          '{"v":1,"id":"a","status":"forwarded","at":"2026-10-05T10:01:00Z"}',
          '{"v":1,"id":"a","failed_at":"2026-10-05T10:01:00Z","reason":"http_500"}',
          '',
        ].join('\n'),
      );
      expect(await store('other')).toMatchObject({ result: 'duplicate' });
      expect(await store('a')).toEqual({
        result: 'duplicate',
        file: '2026-10.jsonl',
        status: 'forwarded',
      });
    });

    it('indexes a file again after prune replaced it', async () => {
      await store('a');
      await store('b');
      await rewriteFile(
        join(dir, '2026-10.jsonl'),
        '{"v":1,"id":"b","kind":"lead","status":"pending_forward","stored_at":"2026-10-05T10:00:00Z","payload":{}}\n',
      );
      expect(await store('a')).toMatchObject({ result: 'stored' });
      expect(await store('b')).toMatchObject({ result: 'duplicate' });
    });

    it('indexes a file again after it shrank or was deleted', async () => {
      await store('a');
      await writeFile(join(dir, '2026-10.jsonl'), '');
      expect(await store('a')).toMatchObject({ result: 'stored' });
      const { unlink } = await import('node:fs/promises');
      await unlink(join(dir, '2026-10.jsonl'));
      expect(await store('a')).toMatchObject({ result: 'stored' });
    });

    it('does not read an unchanged file again', async () => {
      await store('a');
      const file = join(dir, '2026-10.jsonl');
      // Same size, same inode, content no longer parseable: only a re-read would notice.
      const { size } = await stat(file);
      const handle = await open(file, 'r+');
      await handle.write(' '.repeat(size - 1), 0);
      await handle.close();
      expect(await store('a')).toMatchObject({ result: 'duplicate' });
    });

    it('handles a torn last line written by a crashed process', async () => {
      await store('a');
      await appendFile(join(dir, '2026-10.jsonl'), '{"v":1,"id":"torn"');
      expect(await store('b')).toMatchObject({ result: 'stored' });
      expect(await store('b')).toMatchObject({ result: 'duplicate' });
      expect(await store('torn')).toMatchObject({ result: 'stored' });
    });
  });

  describe('withBackupLock', () => {
    it('runs tasks one at a time, also after a failing one', async () => {
      const order: string[] = [];
      const task = (name: string, ms: number) => async () => {
        order.push(`start ${name}`);
        await new Promise((resolve) => setTimeout(resolve, ms));
        order.push(`end ${name}`);
        return name;
      };
      const failing = withBackupLock(dir, async () => {
        throw new Error('boom');
      });
      const results = await Promise.all([
        withBackupLock(dir, task('a', 20)),
        withBackupLock(dir, task('b', 1)),
        failing.catch((error: Error) => error.message),
      ]);
      expect(results).toEqual(['a', 'b', 'boom']);
      expect(order).toEqual(['start a', 'end a', 'start b', 'end b']);
    });

    it('holds the lock as a directory with its owner token, and leaves nothing behind', async () => {
      const seen = await withBackupLock(dir, async () => ({
        entries: await readdir(dir),
        owner: await readFile(join(dir, '.lock', 'owner'), 'utf8'),
      }));
      expect(seen.entries).toEqual(['.lock']);
      expect(seen.owner).toMatch(new RegExp(`^${process.pid}\\.[0-9a-f-]{36}$`));
      expect(await readdir(dir)).toEqual([]);
    });

    it('waits for a lock held by another process, then times out', async () => {
      const lock = await lockDir(dir);
      await expect(
        withBackupLock(dir, async () => 'ran', { lockTimeoutMs: 50 }),
      ).rejects.toBeInstanceOf(BackupLockError);
      // Still theirs, and no candidate left behind.
      expect(await readFile(join(lock, 'owner'), 'utf8')).toBe('other-process');
      expect(await readdir(dir)).toEqual(['.lock']);
    });

    it('takes over a stale lock left by a crashed process, through a tombstone', async () => {
      const lock = await lockDir(dir, 'crashed', new Date(Date.now() - 120_000));
      const { ino } = await stat(lock);
      expect(await withBackupLock(dir, async () => 'ran')).toBe('ran');
      expect(await readdir(dir)).toEqual([`.lock.${ino}.stale`]);
      // The tombstone is dated now: it stays until prune finds it older than an hour.
      expect(Date.now() - (await stat(join(dir, `.lock.${ino}.stale`))).mtimeMs).toBeLessThan(
        60_000,
      );
    });

    it('takes over a stale lock file left by the previous version', async () => {
      await mkdir(dir, { recursive: true });
      const lock = join(dir, '.lock');
      await writeFile(lock, 'crashed');
      const old = new Date(Date.now() - 120_000);
      await utimes(lock, old, old);
      expect(await withBackupLock(dir, async () => 'ran')).toBe('ran');
      expect(await readdir(dir)).toEqual([]);
    });

    it('waits for a fresh lock file of the previous version', async () => {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, '.lock'), 'old version');
      await expect(
        withBackupLock(dir, async () => 'ran', { lockTimeoutMs: 50 }),
      ).rejects.toBeInstanceOf(BackupLockError);
    });

    it('gets the lock once another process releases it', async () => {
      const lock = await lockDir(dir);
      setTimeout(
        () => void import('node:fs/promises').then(({ rm }) => rm(lock, { recursive: true })),
        40,
      );
      expect(await withBackupLock(dir, async () => 'ran', { lockTimeoutMs: 2000 })).toBe('ran');
    });

    it('gives a stale lock to exactly one of many waiting processes', async () => {
      // acquireBackupLock directly: no in-process queue, so these race like separate processes.
      for (let trial = 0; trial < 5; trial++) {
        await lockDir(dir, 'crashed', new Date(Date.now() - 120_000));
        let inside = 0;
        let most = 0;
        await Promise.all(
          Array.from({ length: 8 }, async () => {
            const release = await acquireBackupLock(dir, { lockTimeoutMs: 5000 });
            inside++;
            most = Math.max(most, inside);
            await new Promise((resolve) => setTimeout(resolve, 5));
            inside--;
            await release();
          }),
        );
        expect(most).toBe(1);
        expect((await readdir(dir)).filter((name) => !name.endsWith('.stale'))).toEqual([]);
      }
    });

    it('never takes over the lock of a holder that is still working', async () => {
      const options = { staleLockMs: 80, lockTimeoutMs: 5000 };
      await mkdir(dir, { recursive: true });
      const release = await acquireBackupLock(dir, options);
      let second = false;
      const waiting = acquireBackupLock(dir, options).then((next) => {
        second = true;
        return next;
      });
      // Four times the stale age: the holder's heartbeat keeps its lock fresh.
      await new Promise((resolve) => setTimeout(resolve, 320));
      expect(second).toBe(false);
      await release();
      await (
        await waiting
      )();
      expect(second).toBe(true);
    });

    it("doesn't remove a lock that was taken over from it", async () => {
      await mkdir(dir, { recursive: true });
      const release = await acquireBackupLock(dir);
      const { rm } = await import('node:fs/promises');
      await rm(join(dir, '.lock'), { recursive: true });
      const lock = await lockDir(dir, 'new-owner');
      await release();
      expect(await readFile(join(lock, 'owner'), 'utf8')).toBe('new-owner');
    });

    it('leaves nothing behind when it cannot create its candidate', async () => {
      await mkdir(dir, { recursive: true });
      await chmod(dir, 0o500);
      try {
        await expect(acquireBackupLock(dir)).rejects.toThrow(/EACCES/);
      } finally {
        await chmod(dir, 0o700);
      }
      expect(await readdir(dir)).toEqual([]);
    });
  });
});
