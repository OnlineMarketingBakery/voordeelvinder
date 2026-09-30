import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Flow } from '../../../src/lib/flow/schema';
import type { Product } from '../../../src/lib/flow/types';
import { listPending, monthFile } from '../../../src/server/lead/backup';
import { createLeadHandler, type LeadHandlerDeps } from '../../../src/server/lead/handler';
import { toPayload } from '../../../src/server/lead/payload';
import { createRateLimiter } from '../../../src/server/lead/rate-limit';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';
import {
  FAKE_SECRET,
  jsonRequest,
  recordingLogger,
  sampleSubmission,
  tempDir,
  testEnv,
} from './fixtures';

const IP = '203.0.113.7';
const flows = async () => ({}) as Record<Product, Flow>;

describe('POST /api/lead (handler)', () => {
  let mock: MockN8n;
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    mock = await startMockN8n();
  });
  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
  });
  afterEach(async () => {
    mock.received.length = 0;
    await cleanup();
  });
  afterAll(() => mock.close());

  function setup(overrides: Partial<LeadHandlerDeps> = {}, env: Record<string, string> = {}) {
    const log = recordingLogger();
    const parse = vi.fn<NonNullable<LeadHandlerDeps['parse']>>((body) => {
      const {
        honeypot = false,
        submission = sampleSubmission(),
        turnstile_token: turnstileToken = '',
      } = body as {
        honeypot?: boolean;
        submission?: ReturnType<typeof sampleSubmission>;
        turnstile_token?: string;
      };
      return { ok: true, submission, honeypot, turnstileToken };
    });
    const handler = createLeadHandler({
      env: testEnv({
        LEAD_BACKUP_DIR: dir,
        N8N_LEAD_WEBHOOK_URL: `${mock.url}/webhook/lead`,
        N8N_WEBHOOK_SECRET: FAKE_SECRET,
        TURNSTILE_VERIFY_URL: `${mock.url}/turnstile/siteverify`,
        ...env,
      }),
      flows,
      limiter: createRateLimiter({ limit: 5 }),
      log,
      parse,
      toPayload,
      forward: { sleep: async () => {} },
      ...overrides,
    });
    const post = (body: unknown, headers?: Record<string, string>, ip = IP) =>
      handler({ request: jsonRequest(body, headers), clientAddress: ip });
    return { handler, post, log, parse };
  }

  const body = (extra: Record<string, unknown> = {}) => ({ turnstile_token: 'ok-token', ...extra });

  it('backs up, forwards and redirects to the thank-you page, without qualifying', async () => {
    const { post, log } = setup();
    const response = await post(body());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });

    expect(mock.received).toHaveLength(1);
    const payload = mock.received[0]!.body as Record<string, unknown>;
    expect(mock.received[0]!.headers['x-vv-secret']).toBe(FAKE_SECRET);
    expect(payload).toMatchObject({
      brand: 'voordeelvinder',
      lead_id: sampleSubmission().lead_id,
      is_test: true,
      meta: { page: '/vergelijken/energie', user_agent: 'vitest', ip: IP, site_env: 'ci' },
    });

    const file = join(dir, monthFile(new Date()));
    const [record] = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(record).toMatchObject({ id: sampleSubmission().lead_id, kind: 'lead', payload });
    expect(await listPending(dir)).toEqual([]);

    // The site never qualifies a lead (ADR 0009): n8n does.
    expect(payload).not.toHaveProperty('outcome');
    expect(payload).not.toHaveProperty('outcome_reasons');

    // Logs: the lead id and delivery status, nothing personal.
    expect(log.entries).toEqual([
      {
        level: 'info',
        event: 'lead',
        fields: {
          lead_id: sampleSubmission().lead_id,
          product: 'energie',
          is_test: true,
          backup: 'stored',
          forward: 'forwarded',
        },
      },
    ]);
    const logged = JSON.stringify(log.entries);
    for (const personal of ['test@example.be', '+32475000000', 'Persoon', IP, '9000']) {
      expect(logged).not.toContain(personal);
    }
  });

  it('redirects per product', async () => {
    const { post } = setup();
    const submission = sampleSubmission({ product: 'thuisbatterij', lead_id: 'battery-1' });
    expect(await (await post(body({ submission }))).json()).toEqual({
      ok: true,
      redirect: '/bedankt/thuisbatterij',
    });
  });

  it('decides is_test on the server: production is real unless the visit was ?test=1', async () => {
    const production = {
      SITE_ENV: 'production',
      PUBLIC_SITE_URL: 'https://voordeelvinder.be',
      LEAD_BACKUP_DIR: dir,
      N8N_LEAD_WEBHOOK_URL: 'https://n8n.example.test/webhook/lead',
      TURNSTILE_SECRET_KEY: 'fake-production-secret',
      TURNSTILE_VERIFY_URL: '',
    };
    const seen: unknown[] = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      if (String(url).includes('siteverify')) return Response.json({ success: true });
      seen.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 200 });
    };
    const { post } = setup({ fetch: fakeFetch }, production);
    await post(body());
    await post(
      body({
        submission: sampleSubmission({ lead_id: 'test-visit', meta: { page: '/', test: true } }),
      }),
    );
    expect(seen).toMatchObject([
      { is_test: false, meta: { site_env: 'production' } },
      { is_test: true },
    ]);
  });

  it('pretends success for a filled honeypot and stores nothing', async () => {
    const build = vi.fn(toPayload);
    const { post, log } = setup({ toPayload: build });
    const response = await post(body({ honeypot: true }));
    expect(await response.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });
    expect(build).not.toHaveBeenCalled();
    expect(mock.received).toHaveLength(0);
    expect(await listPending(dir)).toEqual([]);
    expect(log.entries.map((entry) => entry.event)).toEqual(['lead_honeypot']);
  });

  it('answers 403 when Turnstile fails, and lets the lead through when Cloudflare is down', async () => {
    const { post, log } = setup();
    const failed = await post(body({ turnstile_token: 'fail' }));
    expect(failed.status).toBe(403);
    expect(await failed.json()).toEqual({ ok: false, error: 'verification_failed' });
    expect((await post(body({ turnstile_token: undefined }))).status).toBe(403);
    expect(mock.received).toHaveLength(0);

    const { post: postDown } = setup({}, { TURNSTILE_VERIFY_URL: 'http://127.0.0.1:1/siteverify' });
    expect((await postDown(body())).status).toBe(200);
    expect(log.entries.map((entry) => entry.event)).toEqual([
      'lead_verification_failed',
      'lead_verification_failed',
    ]);
  });

  it('verifies the token parseLeadRequest read, and refuses an empty one', async () => {
    const { post } = setup({
      parse: () => ({
        ok: true,
        submission: sampleSubmission(),
        honeypot: false,
        turnstileToken: '',
      }),
    });
    expect((await post(body())).status).toBe(403);
    expect(mock.received).toHaveLength(0);
  });

  it('still answers success when n8n is down: the backup holds the lead', async () => {
    mock.respond({ status: 500 }, { status: 500 }, { status: 500 });
    const { post, log } = setup();
    const response = await post(body());
    expect(await response.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });
    expect((await listPending(dir)).map(({ record }) => record.id)).toEqual([
      sampleSubmission().lead_id,
    ]);
    expect(log.entries.at(-1)).toMatchObject({ level: 'info', fields: { forward: 'failed' } });
  });

  it('answers 503 when the lead is neither backed up nor forwarded', async () => {
    const { post, log } = setup({}, { LEAD_BACKUP_DIR: '/dev/null/cannot-exist' });
    mock.respond({ status: 400 });
    const response = await post(body());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'unavailable' });
    expect(log.entries.at(-1)).toMatchObject({ level: 'error', event: 'lead' });
  });

  it('answers a resend of a stored lead with success, without a new Turnstile check', async () => {
    const siteverify = vi.fn<typeof fetch>((target, init) => fetch(target, init));
    const { post, log } = setup({ fetch: siteverify });
    expect((await post(body())).status).toBe(200);
    const verified = siteverify.mock.calls.filter(([target]) =>
      String(target).includes('siteverify'),
    ).length;
    expect(verified).toBe(1);

    // The same lead_id with the spent token (Cloudflare would now say "timeout-or-duplicate").
    const resend = await post(body({ turnstile_token: 'fail' }));
    expect(resend.status).toBe(200);
    expect(await resend.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });
    expect(
      siteverify.mock.calls.filter(([target]) => String(target).includes('siteverify')),
    ).toHaveLength(1);
    expect(mock.received).toHaveLength(1);
    expect(log.entries.at(-1)).toEqual({
      level: 'info',
      event: 'lead_duplicate',
      fields: { lead_id: sampleSubmission().lead_id },
    });
    // A new lead still needs a valid token.
    const other = sampleSubmission({ lead_id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f' });
    expect((await post(body({ submission: other, turnstile_token: 'fail' }))).status).toBe(403);
  });

  it('checks Turnstile as usual when the backup lookup fails', async () => {
    const { post, log } = setup({}, { LEAD_BACKUP_DIR: '/dev/null/cannot-exist' });
    expect((await post(body({ turnstile_token: 'fail' }))).status).toBe(403);
    expect(log.entries.map((entry) => entry.event)).toEqual([
      'lead_lookup_failed',
      'lead_verification_failed',
    ]);
  });

  it('dates the lead with the server clock, not the browser’s', async () => {
    const { post } = setup({ now: () => new Date('2026-10-02T08:00:00.000Z') });
    const submission = sampleSubmission({ submitted_at: '2020-01-01T00:00:00.000Z' });
    await post(body({ submission }));
    expect(mock.received[0]!.body).toMatchObject({ submitted_at: '2026-10-02T08:00:00.000Z' });
  });

  it('stores and forwards a double submit once', async () => {
    const { post } = setup();
    const [first, second] = await Promise.all([post(body()), post(body())]);
    expect(first!.status).toBe(200);
    expect(second!.status).toBe(200);
    expect(mock.received).toHaveLength(1);
  });

  it('only backs up without a webhook', async () => {
    const { post, log } = setup({}, { N8N_LEAD_WEBHOOK_URL: '' });
    expect((await post(body())).status).toBe(200);
    expect(mock.received).toHaveLength(0);
    expect(log.entries.at(-1)).toMatchObject({ fields: { backup: 'stored', forward: 'skipped' } });
  });

  it('answers 400 for a body the parser rejects, without details', async () => {
    const { post, log } = setup({
      parse: () => ({ ok: false, status: 400, issues: ['answers.supplier: unknown code'] }),
    });
    const response = await post(body());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'invalid_request' });
    expect(log.entries).toEqual([{ level: 'warn', event: 'lead_invalid', fields: { issues: 1 } }]);
  });

  it('rejects an empty body with the real parser', async () => {
    const { post } = setup({ parse: undefined });
    expect((await post({})).status).toBe(400);
  });

  it('answers 415 for non-JSON, 400 for broken JSON, 413 for a large body', async () => {
    const { handler, post } = setup();
    const form = new Request('http://localhost/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a=1',
    });
    expect((await handler({ request: form, clientAddress: IP })).status).toBe(415);
    expect((await post('{"broken"')).status).toBe(400);
    expect((await post('"x"'.padEnd(70_000, ' '))).status).toBe(413);
  });

  it('rate limits per IP with Retry-After, before reading the body', async () => {
    const { post, parse } = setup({ limiter: createRateLimiter({ limit: 2 }) });
    await post(body());
    await post(body());
    const limited = await post(body());
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(3500);
    expect(await limited.json()).toEqual({ ok: false, error: 'rate_limited' });
    expect(parse).toHaveBeenCalledTimes(2);
    expect((await post(body(), {}, '198.51.100.1')).status).toBe(200);
  });

  it('answers 500 without internals when something unexpected throws', async () => {
    const { post, log } = setup({
      toPayload: () => {
        throw new Error('payload exploded');
      },
    });
    const response = await post(body());
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe('{"ok":false,"error":"server_error"}');
    expect(log.entries.at(-1)).toMatchObject({ level: 'error', event: 'lead_error' });
  });
});
