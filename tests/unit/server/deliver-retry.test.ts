import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { listPending, storeBackup } from '../../../src/server/lead/backup';
import { deliver } from '../../../src/server/lead/deliver';
import { retryPending } from '../../../src/server/lead/retry';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';
import { FAKE_SECRET, recordingLogger, tempDir } from './fixtures';

const noWait = { sleep: async () => {} };

describe('deliver and retry', () => {
  let mock: MockN8n;
  let url: string;
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    mock = await startMockN8n();
    url = `${mock.url}/webhook/lead`;
  });
  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
  });
  afterEach(async () => {
    mock.received.length = 0;
    await cleanup();
  });
  afterAll(() => mock.close());

  const input = (overrides: Partial<Parameters<typeof deliver>[0]> = {}) => ({
    dir,
    id: 'lead-1',
    kind: 'lead' as const,
    payload: { lead_id: 'lead-1' },
    url,
    secret: FAKE_SECRET,
    log: recordingLogger(),
    forward: noWait,
    ...overrides,
  });

  describe('deliver', () => {
    it('backs up, forwards and marks the record forwarded', async () => {
      expect(await deliver(input())).toEqual({
        backup: 'stored',
        forward: 'forwarded',
        saved: true,
      });
      expect(mock.received).toHaveLength(1);
      expect(await listPending(dir)).toEqual([]);
    });

    it('leaves the record pending_forward when n8n is down, and still counts it saved', async () => {
      mock.respond({ status: 500 }, { status: 500 }, { status: 500 });
      const log = recordingLogger();
      expect(await deliver(input({ log }))).toEqual({
        backup: 'stored',
        forward: 'failed',
        saved: true,
      });
      expect((await listPending(dir)).map(({ record }) => record.id)).toEqual(['lead-1']);
      expect(log.entries).toEqual([
        {
          level: 'warn',
          event: 'lead_forward_failed',
          fields: { id: 'lead-1', reason: 'http_500', attempts: 3 },
        },
      ]);
    });

    it('does nothing for a duplicate', async () => {
      await deliver(input());
      expect(await deliver(input())).toEqual({
        backup: 'duplicate',
        forward: 'skipped',
        saved: true,
      });
      expect(mock.received).toHaveLength(1);
    });

    it('only backs up without a webhook (backup_only, never retried)', async () => {
      expect(await deliver(input({ url: undefined }))).toEqual({
        backup: 'stored',
        forward: 'skipped',
        saved: true,
      });
      expect(await listPending(dir)).toEqual([]);
    });

    it('still forwards when the backup fails; unsaved only when both fail', async () => {
      // A file where the directory should be: the backup can't be written.
      await mkdir(join(dir, '..'), { recursive: true });
      await writeFile(dir, 'not a directory');
      const log = recordingLogger();
      expect(await deliver(input({ log }))).toEqual({
        backup: 'failed',
        forward: 'forwarded',
        saved: true,
      });
      expect(log.entries[0]).toMatchObject({ level: 'error', event: 'lead_backup_failed' });

      mock.respond({ status: 400 });
      expect(await deliver(input({ log }))).toEqual({
        backup: 'failed',
        forward: 'failed',
        saved: false,
      });
      expect(await deliver(input({ log, url: undefined }))).toEqual({
        backup: 'failed',
        forward: 'skipped',
        saved: false,
      });
    });

    it('logs when marking forwarded fails (the retry job resends it)', async () => {
      const log = recordingLogger();
      // A lock that is never released: storing works (first), marking times out.
      const result = await deliver(
        input({
          log,
          url: `${mock.url}/webhook/lock-trap`,
          forward: {
            ...noWait,
            fetch: async (target, init) => {
              await mkdir(dir, { recursive: true });
              await writeFile(join(dir, '.lock'), 'held');
              return fetch(target, init);
            },
          },
          backup: { lockTimeoutMs: 30 },
        }),
      );
      expect(result).toEqual({ backup: 'stored', forward: 'forwarded', saved: true });
      expect(log.entries.map((entry) => entry.event)).toEqual(['lead_mark_forwarded_failed']);
    });
  });

  describe('retryPending', () => {
    const minutesAgo = (minutes: number) => () => new Date(Date.now() - minutes * 60_000);
    const store = (id: string, minutes: number, kind: 'lead' | 'newsletter' = 'lead') =>
      storeBackup(
        dir,
        { id, kind, status: 'pending_forward', payload: { id } },
        { now: minutesAgo(minutes) },
      );
    const run = (overrides: Partial<Parameters<typeof retryPending>[0]> = {}) =>
      retryPending({
        dir,
        urls: { lead: url, newsletter: `${mock.url}/webhook/newsletter` },
        secret: FAKE_SECRET,
        log: recordingLogger(),
        ...overrides,
      });

    it('resends pending records, oldest first, and marks them forwarded', async () => {
      await store('b', 10);
      await store('a', 40);
      await store('n', 5, 'newsletter');
      expect(await run()).toEqual({ pending: 3, forwarded: 3, failed: 0, skipped: 0, overdue: 0 });
      expect(
        mock.received.map((request) => [request.path, (request.body as { id: string }).id]),
      ).toEqual([
        ['/webhook/lead', 'a'],
        ['/webhook/lead', 'b'],
        ['/webhook/newsletter', 'n'],
      ]);
      expect(mock.received[0]!.headers['x-vv-secret']).toBe(FAKE_SECRET);
      expect(await listPending(dir)).toEqual([]);
      // Nothing left to do.
      expect(await run()).toEqual({ pending: 0, forwarded: 0, failed: 0, skipped: 0, overdue: 0 });
    });

    it('leaves young records to the request that is still forwarding them', async () => {
      await store('young', 0);
      expect(await run()).toMatchObject({ pending: 1, forwarded: 0, skipped: 1 });
      expect(mock.received).toHaveLength(0);
    });

    it('skips kinds without a webhook', async () => {
      await store('n', 10, 'newsletter');
      expect(await run({ urls: { lead: url, newsletter: undefined } })).toMatchObject({
        skipped: 1,
        forwarded: 0,
      });
    });

    it('stops after three failures in a row and reports overdue records', async () => {
      for (const [id, minutes] of [
        ['a', 50],
        ['b', 45],
        ['c', 40],
        ['d', 35],
        ['e', 10],
      ] as const) {
        await store(id, minutes);
      }
      mock.respond({ status: 500 }, { status: 503 }, { status: 502 });
      const log = recordingLogger();
      expect(await run({ log })).toEqual({
        pending: 5,
        forwarded: 0,
        failed: 3,
        skipped: 2,
        overdue: 4,
      });
      // One attempt per record per run.
      expect(mock.received).toHaveLength(3);
      expect(log.entries.map((entry) => entry.fields.reason)).toEqual([
        'http_500',
        'http_503',
        'http_502',
      ]);
    });

    it('keeps going after a single failure', async () => {
      await store('a', 20);
      await store('b', 10);
      mock.respond({ status: 500 });
      expect(await run()).toMatchObject({ forwarded: 1, failed: 1 });
      expect((await listPending(dir)).map(({ record }) => record.id)).toEqual(['a']);
    });

    it('counts a record it forwarded but could not mark as failed', async () => {
      await store('a', 20);
      const log = recordingLogger();
      const result = await run({
        log,
        backup: { lockTimeoutMs: 30 },
        forward: {
          fetch: async (target, init) => {
            await writeFile(join(dir, '.lock'), 'held');
            return fetch(target, init);
          },
        },
      });
      expect(result).toMatchObject({ forwarded: 0, failed: 1 });
      expect(log.entries.map((entry) => entry.event)).toEqual(['retry_mark_failed']);
    });
  });
});
