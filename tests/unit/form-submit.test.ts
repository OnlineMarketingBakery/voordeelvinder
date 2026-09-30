// Sending the lead from the form (brief §9.1, §9.4): sendLead's request and its answer per
// response, the one retry, the timeout; the test-mode flag; the lead-safe flag the thank-you page
// reads (never after a filled honeypot). The Turnstile widget is in turnstile-client.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Submission } from '../../src/lib/flow/engine';
import {
  LEAD_SAFE_KEY,
  parseLeadSafe,
  serializeLeadSafe,
  takeLeadSafe,
  thanksProduct,
} from '../../src/lib/form/lead-safe';
import {
  honeypotFilled,
  LEAD_ENDPOINT,
  RETRY_DELAY_MS,
  retryAfterSeconds,
  sendLead,
  SEND_TIMEOUT_MS,
  submissionContext,
  type SendOptions,
} from '../../src/lib/form/submit';
import {
  isTestSession,
  TEST_MODE_ATTRIBUTE,
  TEST_MODE_KEY,
  testModeScript,
  testParam,
} from '../../src/lib/test-mode';
import { HONEYPOT_FIELD, parseLeadRequest } from '../../src/server/lead/validate';
import { body, energyAnswers, flows } from './lead-fixtures';

const LEAD = '0b7f8a3e-2c1d-4e5f-8a9b-1c2d3e4f5a6b';
const EVENT = '9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const submission: Submission = {
  schema_version: 1,
  lead_id: LEAD,
  event_id: EVENT,
  submitted_at: '2026-10-01T09:30:00.000Z',
  product: 'zonnepanelen',
  flow_id: 'zonnepanelen',
  flow_version: 1,
  answers: { ownership: 'owner' },
  derived: { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' },
  contact: { first_name: 'Jan', email: 'jan@example.be' },
  call_preference: { day: 'wed', slot: '13-14' },
  consent: { terms: true, newsletter: false, cookies: { analytics: false, marketing: false } },
  tracking: {} as Submission['tracking'],
  meta: { page: '/vergelijken/zonnepanelen', test: false },
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

type Call = { url: string; init: RequestInit; body: Record<string, unknown> };

/** A fetch that answers with `responses` in turn (a function throws or returns one). */
function fakeFetch(...responses: Array<Response | (() => Promise<Response>)>) {
  const calls: Call[] = [];
  const send = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    return typeof next === 'function' ? next() : next;
  });
  return { fetch: send as unknown as typeof fetch, calls };
}

const noSleep: SendOptions['sleep'] = async () => {};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendLead', () => {
  it('posts the submission, the honeypot and the Turnstile token as JSON to /api/lead', async () => {
    const { fetch, calls } = fakeFetch(json(200, { ok: true, redirect: '/bedankt/zonnepanelen' }));
    const result = await sendLead(submission, {
      fetch,
      turnstileToken: async () => 'token-1',
      honeypot: '',
    });
    expect(result).toEqual({ ok: true, redirect: '/bedankt/zonnepanelen' });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call!.url).toBe(LEAD_ENDPOINT);
    expect(call!.init.method).toBe('POST');
    expect(call!.init.credentials).toBe('same-origin');
    expect(call!.init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(call!.init.signal).toBeInstanceOf(AbortSignal);
    expect(call!.body).toEqual({ ...submission, website: '', turnstile_token: 'token-1' });
  });

  it('sends without turnstile_token when there is none, and a filled honeypot as is', async () => {
    const { fetch, calls } = fakeFetch(json(200, { ok: true, redirect: '/bedankt/zonnepanelen' }));
    await sendLead(submission, {
      fetch,
      turnstileToken: () => undefined,
      honeypot: 'spam.example',
    });
    expect(calls[0]!.body.website).toBe('spam.example');
    expect(calls[0]!.body).not.toHaveProperty('turnstile_token');

    // A token callback that throws doesn't stop the send.
    const second = fakeFetch(json(200, { ok: true, redirect: '/bedankt/zonnepanelen' }));
    const result = await sendLead(submission, {
      fetch: second.fetch,
      turnstileToken: () => {
        throw new Error('widget gone');
      },
    });
    expect(result.ok).toBe(true);
    expect(second.calls[0]!.body).toMatchObject({ website: '' });
    expect(second.calls[0]!.body).not.toHaveProperty('turnstile_token');
  });

  it('only follows a same-site redirect, else the product thank-you page', async () => {
    for (const redirect of ['https://evil.example/', '//evil.example', '/\\evil', 42, undefined]) {
      const { fetch } = fakeFetch(json(200, { ok: true, redirect }));
      expect(await sendLead(submission, { fetch })).toEqual({
        ok: true,
        redirect: '/bedankt/zonnepanelen',
      });
    }
  });

  it('maps each error response to its kind, without retrying', async () => {
    const cases: Array<[Response, string]> = [
      [json(400, { ok: false, error: 'invalid_request' }), 'invalid'],
      [json(413, { ok: false, error: 'payload_too_large' }), 'invalid'],
      [json(415, { ok: false, error: 'unsupported_media_type' }), 'invalid'],
      [json(403, { ok: false, error: 'verification_failed' }), 'turnstile'],
      [json(500, { ok: false, error: 'server_error' }), 'unavailable'],
      [new Response('Not found', { status: 404 }), 'unavailable'],
    ];
    for (const [response, kind] of cases) {
      const { fetch, calls } = fakeFetch(response);
      expect(await sendLead(submission, { fetch, sleep: noSleep })).toEqual({ ok: false, kind });
      expect(calls).toHaveLength(1);
    }
  });

  it('reports a rate limit with Retry-After in seconds', async () => {
    const { fetch, calls } = fakeFetch(
      json(429, { ok: false, error: 'rate_limited' }, { 'retry-after': '1800' }),
    );
    expect(await sendLead(submission, { fetch, sleep: noSleep })).toEqual({
      ok: false,
      kind: 'rate_limit',
      retryAfter: 1800,
    });
    expect(calls).toHaveLength(1);
    const bare = fakeFetch(json(429, { ok: false }));
    expect(await sendLead(submission, { fetch: bare.fetch })).toEqual({
      ok: false,
      kind: 'rate_limit',
    });
  });

  it('retries a 503 once after 1.5 s, with the same lead_id and a new Turnstile token', async () => {
    const { fetch, calls } = fakeFetch(
      json(503, { ok: false, error: 'unavailable' }),
      json(200, { ok: true, redirect: '/bedankt/zonnepanelen' }),
    );
    const sleep = vi.fn(async () => {});
    let tokens = 0;
    const result = await sendLead(submission, {
      fetch,
      sleep,
      turnstileToken: async () => `token-${++tokens}`,
    });
    expect(result).toEqual({ ok: true, redirect: '/bedankt/zonnepanelen' });
    expect(sleep).toHaveBeenCalledExactlyOnceWith(RETRY_DELAY_MS);
    expect(RETRY_DELAY_MS).toBe(1500);
    expect(calls.map((call) => call.body.lead_id)).toEqual([LEAD, LEAD]);
    expect(calls.map((call) => call.body.event_id)).toEqual([EVENT, EVENT]);
    expect(calls.map((call) => call.body.turnstile_token)).toEqual(['token-1', 'token-2']);
  });

  it('retries only once', async () => {
    const { fetch, calls } = fakeFetch(json(503, { ok: false }), json(503, { ok: false }));
    expect(await sendLead(submission, { fetch, sleep: noSleep })).toEqual({
      ok: false,
      kind: 'unavailable',
    });
    expect(calls).toHaveLength(2);
    // Nginx without the Node process (a deploy) counts as unavailable too.
    const gateway = fakeFetch(new Response('', { status: 502 }), json(200, { ok: true }));
    expect((await sendLead(submission, { fetch: gateway.fetch, sleep: noSleep })).ok).toBe(true);
    // A 2xx that isn't the endpoint's answer (a proxy page) is no proof the lead is safe.
    const proxy = fakeFetch(new Response('<html>', { status: 200 }), json(503, {}));
    expect(await sendLead(submission, { fetch: proxy.fetch, sleep: noSleep })).toEqual({
      ok: false,
      kind: 'unavailable',
    });
  });

  it('retries a network failure once', async () => {
    const offline = () => Promise.reject(new TypeError('Failed to fetch'));
    const once = fakeFetch(offline, json(200, { ok: true, redirect: '/bedankt/zonnepanelen' }));
    expect((await sendLead(submission, { fetch: once.fetch, sleep: noSleep })).ok).toBe(true);
    expect(once.calls.map((call) => call.body.lead_id)).toEqual([LEAD, LEAD]);
    const twice = fakeFetch(offline, offline);
    expect(await sendLead(submission, { fetch: twice.fetch, sleep: noSleep })).toEqual({
      ok: false,
      kind: 'network',
    });
    expect(twice.calls).toHaveLength(2);
  });

  it('gives up an attempt after the timeout (15 s by default)', async () => {
    expect(SEND_TIMEOUT_MS).toBe(15_000);
    const hang = (_url: RequestInfo | URL, init: RequestInit = {}) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    const send = vi.fn(hang);
    const started = Date.now();
    const result = await sendLead(submission, {
      fetch: send as unknown as typeof fetch,
      timeoutMs: 20,
      sleep: noSleep,
    });
    expect(result).toEqual({ ok: false, kind: 'network' });
    expect(send).toHaveBeenCalledTimes(2);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('never logs', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    const { fetch } = fakeFetch(json(400, {}));
    await sendLead(submission, { fetch });
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('reads Retry-After as seconds or as an HTTP date', () => {
    expect(retryAfterSeconds('120')).toBe(120);
    expect(retryAfterSeconds('1.2')).toBe(2);
    expect(retryAfterSeconds(null)).toBeUndefined();
    expect(retryAfterSeconds('')).toBeUndefined();
    expect(retryAfterSeconds('-5')).toBeUndefined();
    expect(retryAfterSeconds('soon')).toBeUndefined();
    const now = Date.parse('2026-10-01T09:00:00Z');
    expect(retryAfterSeconds('Thu, 01 Oct 2026 09:30:00 GMT', now)).toBe(1800);
    expect(retryAfterSeconds('Thu, 01 Oct 2026 08:00:00 GMT', now)).toBe(0);
  });
});

/** A sessionStorage stand-in. */
function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe('test mode (brief §9.4)', () => {
  it('reads ?test=1 and ?test=0', () => {
    expect(testParam('?test=1')).toBe('on');
    expect(testParam('?utm_source=meta&test=0')).toBe('off');
    expect(testParam('?test=yes')).toBeNull();
    expect(testParam('')).toBeNull();
  });

  it('keeps ?test=1 for the session: the URL decides, else the session flag', () => {
    const on = memoryStore({ [TEST_MODE_KEY]: '1' });
    expect(isTestSession('', on)).toBe(true);
    expect(isTestSession('?test=0', on)).toBe(false);
    expect(isTestSession('?test=1', memoryStore())).toBe(true);
    expect(isTestSession('', memoryStore())).toBe(false);
    expect(isTestSession('', null)).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(isTestSession('', blocked)).toBe(false);
    expect(isTestSession('?test=1', blocked)).toBe(true);
  });

  it('marks the submission meta.test from the session', () => {
    const base = {
      leadId: LEAD,
      eventId: EVENT,
      derived: { preselected: true },
      page: '/vergelijken/energie',
      now: new Date('2026-10-01T09:30:00.000Z'),
    };
    expect(submissionContext({ ...base, search: '' }).test).toBe(false);
    expect(submissionContext({ ...base, search: '?test=1' }).test).toBe(true);
    const store = memoryStore({ [TEST_MODE_KEY]: '1' });
    expect(submissionContext({ ...base, search: '', store }).test).toBe(true);
    expect(submissionContext({ ...base, search: '?test=0', store }).test).toBe(false);
  });

  /** Runs the inline <head> script against a URL and a store. */
  function runScript(search: string, store: ReturnType<typeof memoryStore> | 'blocked') {
    const attributes = new Map<string, string>();
    const window = {} as { sessionStorage?: unknown };
    Object.defineProperty(window, 'sessionStorage', {
      get: () => {
        if (store === 'blocked') throw new Error('blocked');
        return store;
      },
    });
    const document = {
      documentElement: {
        setAttribute: (name: string, value: string) => attributes.set(name, value),
      },
    };
    new Function('window', 'location', 'document', testModeScript)(window, { search }, document);
    return attributes;
  }

  it('the inline script stores, keeps and clears the flag and marks <html>', () => {
    const store = memoryStore();
    expect(runScript('?test=1', store).has(TEST_MODE_ATTRIBUTE)).toBe(true);
    expect(store.data.get(TEST_MODE_KEY)).toBe('1');
    // The next page, without the parameter: still on.
    expect(runScript('', store).has(TEST_MODE_ATTRIBUTE)).toBe(true);
    expect(runScript('?test=0', store).has(TEST_MODE_ATTRIBUTE)).toBe(false);
    expect(store.data.has(TEST_MODE_KEY)).toBe(false);
    expect(runScript('', store).has(TEST_MODE_ATTRIBUTE)).toBe(false);
    // Without storage only the URL counts, and nothing throws.
    expect(runScript('?test=1', 'blocked').has(TEST_MODE_ATTRIBUTE)).toBe(true);
    expect(runScript('', 'blocked').has(TEST_MODE_ATTRIBUTE)).toBe(false);
  });
});

describe('the lead-safe flag (brief §9.1 step 9)', () => {
  it('stores { event_id, product } only', () => {
    const raw = serializeLeadSafe({ event_id: EVENT, product: 'energie' });
    expect(JSON.parse(raw)).toEqual({ event_id: EVENT, product: 'energie' });
    expect(parseLeadSafe(raw)).toEqual({ event_id: EVENT, product: 'energie' });
    expect(parseLeadSafe(null)).toBeNull();
    expect(parseLeadSafe('energie')).toBeNull();
    expect(parseLeadSafe('{"event_id":"","product":"energie"}')).toBeNull();
    expect(parseLeadSafe('{"event_id":"x"}')).toBeNull();
  });

  it('knows the product of a thank-you URL', () => {
    expect(thanksProduct('/bedankt/energie')).toBe('energie');
    expect(thanksProduct('/bedankt/thuisbatterij/')).toBe('thuisbatterij');
    expect(thanksProduct('/bedankt/')).toBeNull();
    expect(thanksProduct('/vergelijken/energie')).toBeNull();
  });

  it("is not for a filled honeypot, by the endpoint's own test (only spaces are empty)", () => {
    // A filled honeypot gets the endpoint's pretend OK: no flag, no cheer, no counted lead.
    expect(honeypotFilled('')).toBe(false);
    expect(honeypotFilled('   ')).toBe(false);
    expect(honeypotFilled('https://spam.example')).toBe(true);
    for (const value of ['', ' ', '\t\n ', 'x', ' spam ', 'https://spam.example']) {
      const parsed = parseLeadRequest(
        body('energie', energyAnswers, { [HONEYPOT_FIELD]: value }),
        flows,
      );
      if (!parsed.ok) throw new Error('expected the fixture to be valid');
      expect(honeypotFilled(value), JSON.stringify(value)).toBe(parsed.honeypot);
    }
  });

  it('is taken once, and only for its own product', () => {
    const raw = serializeLeadSafe({ event_id: EVENT, product: 'energie' });
    const store = memoryStore({ [LEAD_SAFE_KEY]: raw });
    expect(takeLeadSafe(store, 'energie')).toEqual({ event_id: EVENT, product: 'energie' });
    expect(store.data.has(LEAD_SAFE_KEY)).toBe(false);
    expect(takeLeadSafe(store, 'energie')).toBeNull();
    const other = memoryStore({ [LEAD_SAFE_KEY]: raw });
    expect(takeLeadSafe(other, 'zonnepanelen')).toBeNull();
    expect(other.data.has(LEAD_SAFE_KEY)).toBe(false);
    expect(takeLeadSafe(memoryStore({ [LEAD_SAFE_KEY]: raw }), null)).toBeNull();
    expect(takeLeadSafe(null, 'energie')).toBeNull();
  });
});
