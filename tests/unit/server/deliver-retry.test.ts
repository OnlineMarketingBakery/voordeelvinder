import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { listPending, markAttemptFailed, storeBackup } from '../../../src/server/lead/backup';
import { deliver } from '../../../src/server/lead/deliver';
import { retryDelayMs, retryPending } from '../../../src/server/lead/retry';
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

    it('leaves the record pending_forward after a redirect, without retrying it', async () => {
      mock.respond({ status: 302, location: `${mock.url}/webhook/login` });
      const log = recordingLogger();
      expect(await deliver(input({ log }))).toEqual({
        backup: 'stored',
        forward: 'failed',
        saved: true,
      });
      expect(mock.received.map((request) => request.path)).toEqual(['/webhook/lead']);
      expect((await listPending(dir)).map(({ record }) => record.id)).toEqual(['lead-1']);
      expect(log.entries[0]!.fields).toEqual({ id: 'lead-1', reason: 'http_3xx', attempts: 1 });
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
    const store = async (id: string, minutes: number, kind: 'lead' | 'newsletter' = 'lead') => {
      const stored = await storeBackup(
        dir,
        { id, kind, status: 'pending_forward', payload: { id } },
        { now: minutesAgo(minutes) },
      );
      return stored.file;
    };
    /** Records `count` failed attempts for a record, the last one `minutes` ago. */
    const failedBefore = async (id: string, file: string, count: number, minutes: number) => {
      for (let n = 0; n < count; n++) {
        await markAttemptFailed(dir, [{ id, file, reason: 'http_500' }], {
          now: minutesAgo(minutes),
        });
      }
    };
    const sentIds = () => mock.received.map((request) => (request.body as { id: string }).id);
    const NONE = { pending: 0, forwarded: 0, failed: 0, skipped: 0, deferred: 0, overdue: 0 };
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
      expect(await run()).toEqual({ ...NONE, pending: 3, forwarded: 3 });
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
      expect(await run()).toEqual(NONE);
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

    it('leaves a webhook alone after three failures in a row, and reports overdue records', async () => {
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
        ...NONE,
        pending: 5,
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
      // Each failed record counts its attempt.
      expect((await listPending(dir)).map(({ record, attempts }) => [record.id, attempts])).toEqual(
        [
          ['a', 1],
          ['b', 1],
          ['c', 1],
          ['d', 0],
          ['e', 0],
        ],
      );
    });

    it('never lets failing records of one webhook hold back another webhook', async () => {
      // A deactivated newsletter workflow (404) and one that is down (500): leads still go.
      for (const id of ['n1', 'n2', 'n3', 'n4']) await store(id, 60, 'newsletter');
      await store('lead', 20);
      const newsletter = `${mock.url}/webhook/newsletter`;
      const answers: Record<string, number> = { n1: 404, n2: 404, n3: 404, n4: 404 };
      const fakeFetch: typeof fetch = async (target, init) => {
        const { id } = JSON.parse(String(init?.body)) as { id: string };
        if (String(target) === newsletter) return new Response(null, { status: answers[id]! });
        return fetch(target, init);
      };
      const result = await run({ forward: { fetch: fakeFetch } });
      // A refusal (4xx) only concerns its own record: all four were tried, the lead went.
      expect(result).toMatchObject({ forwarded: 1, failed: 4, skipped: 0 });
      expect(sentIds()).toEqual(['lead']);

      // n8n down for the newsletter webhook only: it is left alone, the lead webhook isn't.
      await store('lead-2', 20);
      const down: typeof fetch = async (target, init) =>
        String(target) === newsletter
          ? new Response(null, { status: 500 })
          : fakeFetch(target, init);
      const later = await run({
        forward: { fetch: down },
        now: () => new Date(Date.now() + 60 * 60_000),
      });
      expect(later).toMatchObject({ forwarded: 1, failed: 3, skipped: 1 });
      expect(sentIds()).toEqual(['lead', 'lead-2']);
    });

    it('tries records with fewer failed attempts first, so failing ones never block new ones', async () => {
      const old1 = await store('old-1', 120);
      const old2 = await store('old-2', 110);
      const old3 = await store('old-3', 100);
      await failedBefore('old-1', old1, 2, 30);
      await failedBefore('old-2', old2, 2, 30);
      await failedBefore('old-3', old3, 2, 30);
      await store('new', 10);
      // n8n fails the three old ones (a payload it can't take) and would take the new one.
      mock.respond({ status: 200 }, { status: 500 }, { status: 500 }, { status: 500 });
      const result = await run();
      expect(sentIds()).toEqual(['new', 'old-1', 'old-2', 'old-3']);
      expect(result).toMatchObject({ forwarded: 1, failed: 3, overdue: 3 });
    });

    it('waits longer after each failed attempt of a record', async () => {
      const file = await store('a', 120);
      await failedBefore('a', file, 1, 3);
      // One failure 3 minutes ago: it waits 5 minutes.
      expect(await run()).toMatchObject({ deferred: 1, failed: 0, forwarded: 0, overdue: 1 });
      expect(mock.received).toHaveLength(0);
      // Due again 5 minutes after it (a run a few seconds early still counts).
      const inFiveMinutes = () => new Date(Date.now() + 2 * 60_000 - 10_000);
      expect(await run({ now: inFiveMinutes })).toMatchObject({ deferred: 0, forwarded: 1 });
    });

    it('spaces the attempts out: 5, 10, 20, 40, then every 60 minutes', () => {
      expect([0, 1, 2, 3, 4, 5, 6, 20].map((n) => retryDelayMs(n) / 60_000)).toEqual([
        0, 5, 10, 20, 40, 60, 60, 60,
      ]);
    });

    it('logs when it cannot record a failed attempt, and carries on', async () => {
      await store('a', 20);
      await store('b', 10);
      mock.respond({ status: 500 });
      const log = recordingLogger();
      const result = await run({
        log,
        backup: { lockTimeoutMs: 30 },
        forward: {
          fetch: async (target, init) => {
            const response = await fetch(target, init);
            if (response.status === 500) await writeFile(join(dir, '.lock'), 'held');
            else await import('node:fs/promises').then(({ rm }) => rm(join(dir, '.lock')));
            return response;
          },
        },
      });
      expect(result).toMatchObject({ failed: 1, forwarded: 1 });
      expect(log.entries.map((entry) => entry.event)).toEqual([
        'retry_forward_failed',
        'retry_attempt_mark_failed',
        'retry_forwarded',
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
