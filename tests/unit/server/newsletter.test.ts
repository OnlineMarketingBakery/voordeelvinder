import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { listPending } from '../../../src/server/lead/backup';
import { createRateLimiter } from '../../../src/server/lead/rate-limit';
import {
  createNewsletterHandler,
  parseNewsletterRequest,
  type NewsletterHandlerDeps,
} from '../../../src/server/newsletter';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';
import { FAKE_SECRET, jsonRequest, recordingLogger, tempDir, testEnv } from './fixtures';

const IP = '203.0.113.9';

describe('parseNewsletterRequest', () => {
  it('normalises the e-mail address and fills defaults', () => {
    expect(parseNewsletterRequest({ email: '  Jan@Example.BE ', consent: true })).toEqual({
      ok: true,
      request: { email: 'jan@example.be', consent: true, website: '', page: '/', test: false },
    });
  });

  it('rejects a bad address, missing consent and unknown keys', () => {
    for (const body of [
      { email: 'jan@', consent: true },
      { email: '', consent: true },
      { email: 'jan@example.be', consent: false },
      { email: 'jan@example.be' },
      { email: 'jan@example.be', consent: true, name: 'Jan' },
      { email: 'jan@example.be', consent: true, page: 'https://evil.example' },
      'jan@example.be',
      null,
    ]) {
      expect(parseNewsletterRequest(body)).toEqual({ ok: false });
    }
  });
});

describe('POST /api/newsletter (handler)', () => {
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

  function setup(env: Record<string, string> = {}, overrides: Partial<NewsletterHandlerDeps> = {}) {
    const log = recordingLogger();
    const handler = createNewsletterHandler({
      env: testEnv({
        LEAD_BACKUP_DIR: dir,
        N8N_LEAD_WEBHOOK_URL: `${mock.url}/webhook/lead`,
        N8N_NEWSLETTER_WEBHOOK_URL: `${mock.url}/webhook/newsletter`,
        N8N_WEBHOOK_SECRET: FAKE_SECRET,
        TURNSTILE_VERIFY_URL: `${mock.url}/turnstile/siteverify`,
        ...env,
      }),
      limiter: createRateLimiter({ limit: 2 }),
      log,
      now: () => new Date('2026-10-01T09:30:00.000Z'),
      newId: () => 'signup-1',
      forward: { sleep: async () => {} },
      ...overrides,
    });
    const post = (body: unknown) => handler({ request: jsonRequest(body), clientAddress: IP });
    return { post, log };
  }

  const signup = (extra: Record<string, unknown> = {}) => ({
    email: 'Jan@Example.be',
    consent: true,
    website: '',
    turnstile_token: 'ok-token',
    page: '/zonnepanelen',
    ...extra,
  });

  it('forwards the newsletter payload and answers ok', async () => {
    const { post, log } = setup();
    const response = await post(signup());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mock.received).toHaveLength(1);
    expect(mock.received[0]!.path).toBe('/webhook/newsletter');
    expect(mock.received[0]!.headers['x-vv-secret']).toBe(FAKE_SECRET);
    expect(mock.received[0]!.body).toEqual({
      type: 'newsletter',
      schema_version: 1,
      brand: 'voordeelvinder',
      signup_id: 'signup-1',
      is_test: true,
      submitted_at: '2026-10-01T09:30:00.000Z',
      email: 'jan@example.be',
      consent: { newsletter: true },
      meta: { page: '/zonnepanelen', user_agent: 'vitest', ip: IP, site_env: 'ci' },
    });
    expect(JSON.stringify(log.entries)).not.toContain('example.be');
    expect(log.entries.at(-1)).toMatchObject({ event: 'newsletter', fields: { id: 'signup-1' } });
  });

  it('falls back to the lead webhook', async () => {
    const { post } = setup({ N8N_NEWSLETTER_WEBHOOK_URL: '' });
    await post(signup());
    expect(mock.received[0]!.path).toBe('/webhook/lead');
  });

  it('marks production sign-ups real unless the visit was ?test=1', async () => {
    const seen: { is_test: boolean }[] = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      if (String(url).includes('siteverify')) return Response.json({ success: true });
      seen.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 200 });
    };
    const { post } = setup(
      {
        SITE_ENV: 'production',
        PUBLIC_SITE_URL: 'https://voordeelvinder.be',
        N8N_LEAD_WEBHOOK_URL: 'https://n8n.example.test/webhook/lead',
        N8N_NEWSLETTER_WEBHOOK_URL: '',
        TURNSTILE_SECRET_KEY: 'fake-production-secret',
        PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAfakesitekey',
        TURNSTILE_VERIFY_URL: '',
      },
      {
        fetch: fakeFetch,
        newId: (() => {
          let n = 0;
          return () => `signup-${++n}`;
        })(),
      },
    );
    await post(signup());
    await post(signup({ test: true }));
    expect(seen.map((payload) => payload.is_test)).toEqual([false, true]);
  });

  it('pretends success for a filled honeypot', async () => {
    const { post, log } = setup();
    expect(await (await post(signup({ website: 'https://spam.example' }))).json()).toEqual({
      ok: true,
    });
    expect(mock.received).toHaveLength(0);
    expect(await listPending(dir)).toEqual([]);
    expect(log.entries.map((entry) => entry.event)).toEqual(['newsletter_honeypot']);
  });

  it('answers 400, 403, 415 and 429 like the lead endpoint', async () => {
    const { post } = setup();
    expect((await post(signup({ consent: false }))).status).toBe(400);
    const limited = await post(signup({ turnstile_token: 'fail' }));
    expect(limited.status).toBe(403);
    expect((await post(signup())).status).toBe(429);

    const { post: fresh } = setup();
    expect((await fresh('{')).status).toBe(400);
  });

  it('lets a sign-up through when Cloudflare is down', async () => {
    const { post, log } = setup({ TURNSTILE_VERIFY_URL: 'http://127.0.0.1:1/siteverify' });
    expect((await post(signup())).status).toBe(200);
    expect(log.entries[0]!.event).toBe('newsletter_verification_unavailable');
  });

  it('keeps a sign-up n8n refused for the retry job, and answers 503 when nothing kept it', async () => {
    mock.respond({ status: 500 }, { status: 500 }, { status: 500 });
    const { post } = setup();
    expect((await post(signup())).status).toBe(200);
    expect((await listPending(dir)).map(({ record }) => record.kind)).toEqual(['newsletter']);

    mock.respond({ status: 400 });
    const { post: broken } = setup({ LEAD_BACKUP_DIR: '/dev/null/cannot-exist' });
    expect((await broken(signup())).status).toBe(503);
  });

  it('answers 500 without internals when something unexpected throws', async () => {
    const { post, log } = setup(
      {},
      {
        newId: () => {
          throw new Error('no ids');
        },
      },
    );
    const response = await post(signup());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'server_error' });
    expect(log.entries.at(-1)).toMatchObject({ event: 'newsletter_error' });
  });

  it('uses the real clock and random ids by default', async () => {
    const { post } = setup({}, { now: undefined, newId: undefined });
    await post(signup());
    const payload = mock.received[0]!.body as { signup_id: string; submitted_at: string };
    expect(payload.signup_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(payload.submitted_at)).toBeGreaterThan(Date.parse('2026-01-01'));
  });
});
