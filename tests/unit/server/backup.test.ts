import { appendFile, mkdir, readdir, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  BackupLockError,
  type BackupStatus,
  foldLines,
  listPending,
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
      expect(result).toEqual({ removed: 2, removedPending: 1, malformed: 1, filesDeleted: 1 });
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
        removed: 0,
        removedPending: 0,
        malformed: 0,
        filesDeleted: 0,
      });
      expect((await stat(join(dir, '2026-09.jsonl'))).mtimeMs).toBe(mtime);
    });

    it('works on a directory that does not exist yet', async () => {
      expect(await pruneBackups(dir)).toEqual({
        removed: 0,
        removedPending: 0,
        malformed: 0,
        filesDeleted: 0,
      });
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

    it('waits for a lock held by another process, then times out', async () => {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, '.lock'), 'other process');
      await expect(
        withBackupLock(dir, async () => 'ran', { lockTimeoutMs: 50 }),
      ).rejects.toBeInstanceOf(BackupLockError);
      // Still theirs.
      expect(await readFile(join(dir, '.lock'), 'utf8')).toBe('other process');
    });

    it('takes over a stale lock left by a crashed process', async () => {
      await mkdir(dir, { recursive: true });
      const lock = join(dir, '.lock');
      await writeFile(lock, 'crashed');
      const old = new Date(Date.now() - 120_000);
      await utimes(lock, old, old);
      expect(await withBackupLock(dir, async () => 'ran')).toBe('ran');
      expect(await readdir(dir)).toEqual([]);
    });

    it('gets the lock once another process releases it', async () => {
      await mkdir(dir, { recursive: true });
      const lock = join(dir, '.lock');
      await writeFile(lock, 'other process');
      setTimeout(() => void import('node:fs/promises').then(({ unlink }) => unlink(lock)), 40);
      expect(await withBackupLock(dir, async () => 'ran', { lockTimeoutMs: 2000 })).toBe('ran');
    });
  });
});
