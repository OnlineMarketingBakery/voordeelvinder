// The footer newsletter's pure parts (src/lib/newsletter.ts and the loader's
// src/lib/newsletter-loader.ts; Turnstile: turnstile-client.test.ts): what the browser checks and
// sends must be exactly what POST /api/newsletter accepts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import {
  checkEmail,
  describedBy,
  errorField,
  NEWSLETTER_ENDPOINT,
  newsletterBody,
  outcomeOf,
  sendSignup,
  SIGNUP_TIMEOUT_MS,
  suggestionText,
  type NewsletterCopy,
  type NewsletterError,
} from '../../src/lib/newsletter';
import { loadFailure } from '../../src/lib/newsletter-loader';
import { TEST_MODE_ATTRIBUTE, TEST_MODE_KEY, testModeScript } from '../../src/lib/test-mode';
import { parseNewsletterRequest } from '../../src/server/newsletter';

const copy: NewsletterCopy = site.footer.newsletter;

const ERRORS: NewsletterError[] = [
  'email_required',
  'email_invalid',
  'consent_required',
  'invalid_request',
  'verification_failed',
  'rate_limited',
  'unavailable',
  'network',
];

afterEach(() => {
  vi.useRealTimers();
});

describe('checkEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(checkEmail('  Jan@Example.BE ')).toEqual({ ok: true, email: 'jan@example.be' });
  });

  it('tells an empty field from an invalid address', () => {
    expect(checkEmail('   ')).toEqual({ ok: false, error: 'email_required' });
    expect(checkEmail('jan@')).toEqual({ ok: false, error: 'email_invalid' });
  });

  it('suggests a correction without changing the value', () => {
    expect(checkEmail('jan@gmial.com')).toEqual({
      ok: true,
      email: 'jan@gmial.com',
      suggestion: 'jan@gmail.com',
    });
    expect(checkEmail('jan@gmail,com')).toEqual({
      ok: false,
      error: 'email_invalid',
      suggestion: 'jan@gmail.com',
    });
  });
});

/** A sessionStorage stand-in. */
function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

/** A page load: runs the inline <head> script (Base.astro); true when the TESTMODUS badge shows. */
function visit(search: string, store: ReturnType<typeof memoryStore>): boolean {
  let badge = false;
  const document = {
    documentElement: {
      setAttribute: (name: string) => {
        if (name === TEST_MODE_ATTRIBUTE) badge = true;
      },
    },
  };
  new Function('window', 'location', 'document', testModeScript)(
    { sessionStorage: store },
    { search },
    document,
  );
  return badge;
}

describe('newsletterBody', () => {
  const base = {
    email: 'jan@example.be',
    website: '',
    token: 'XXXX.DUMMY.TOKEN.XXXX',
    pathname: '/zonnepanelen',
    search: '',
    store: null,
  };

  it('is accepted as is by the endpoint (strict schema)', () => {
    const body = newsletterBody(base);
    expect(body).toEqual({
      email: 'jan@example.be',
      consent: true,
      website: '',
      turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
      page: '/zonnepanelen',
      test: false,
    });
    expect(parseNewsletterRequest(JSON.parse(JSON.stringify(body)))).toEqual({
      ok: true,
      request: body,
    });
  });

  it('passes on ?test=1 and the honeypot, and keeps `page` within the limit', () => {
    const body = newsletterBody({
      ...base,
      website: 'https://spam.example',
      pathname: `/${'a'.repeat(400)}`,
      search: '?utm_source=meta&test=1',
    });
    expect(body.test).toBe(true);
    expect(body.website).toBe('https://spam.example');
    expect(body.page).toHaveLength(300);
    expect(parseNewsletterRequest(body).ok).toBe(true);
    expect(newsletterBody({ ...base, pathname: '' }).page).toBe('/');
  });

  it('is a test on every page of a ?test=1 session, like a lead (brief §9.4)', () => {
    const store = memoryStore();
    // A tester opens /?test=1, goes on to other pages, then ends test mode with ?test=0.
    const visits = [
      ['?test=1', true],
      ['', true],
      ['?utm_source=meta', true],
      ['?test=0', false],
      ['', false],
    ] as const;
    for (const [search, test] of visits) {
      expect(visit(search, store), `badge on "${search}"`).toBe(test);
      expect(newsletterBody({ ...base, search, store }).test, `test on "${search}"`).toBe(test);
    }
    // The URL decides over the flag.
    const on = memoryStore({ [TEST_MODE_KEY]: '1' });
    expect(newsletterBody({ ...base, search: '', store: on }).test).toBe(true);
    expect(newsletterBody({ ...base, search: '?test=0', store: on }).test).toBe(false);
  });

  it('without storage only the URL counts', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(newsletterBody({ ...base, search: '?test=1', store: blocked }).test).toBe(true);
    expect(newsletterBody({ ...base, search: '', store: blocked }).test).toBe(false);
    expect(newsletterBody({ ...base, search: '', store: null }).test).toBe(false);
  });
});

describe('sendSignup', () => {
  const body = newsletterBody({
    email: 'jan@example.be',
    website: '',
    token: 'XXXX.DUMMY.TOKEN.XXXX',
    pathname: '/',
    search: '',
    store: null,
  });
  const answer = (status: number) =>
    (async () => new Response('{}', { status })) as unknown as typeof fetch;

  it('posts the body as JSON to /api/newsletter and says what came of it', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const send = async (url: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response('{"ok":true}', { status: 200 });
    };
    expect(await sendSignup(body, { fetch: send as unknown as typeof fetch })).toBe('success');
    expect(calls).toHaveLength(1);
    const [call] = calls;
    // The route (src/pages/api/newsletter.ts), also the footer form's `action`.
    expect(NEWSLETTER_ENDPOINT).toBe('/api/newsletter');
    expect(call!.url).toBe(NEWSLETTER_ENDPOINT);
    expect(call!.init.method).toBe('POST');
    expect(call!.init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(call!.init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(call!.init.body))).toEqual(body);

    expect(await sendSignup(body, { fetch: answer(429) })).toBe('rate_limited');
    expect(await sendSignup(body, { fetch: answer(503) })).toBe('unavailable');
    // The form's own `action`.
    await sendSignup(body, { fetch: send as unknown as typeof fetch, endpoint: '/elders' });
    expect(calls[1]!.url).toBe('/elders');
  });

  it('says "network" when there is no connection', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await sendSignup(body, { fetch: offline })).toBe('network');
  });

  it('gives up after 35 s without an answer, so the form unlocks', async () => {
    // Above the endpoint's worst case: Turnstile 5 s + 3 × 8 s to n8n + 2 s backoff.
    expect(SIGNUP_TIMEOUT_MS).toBe(35_000);
    vi.useFakeTimers();
    const hang = (_url: RequestInfo | URL, init: RequestInit = {}) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    let outcome: string | undefined;
    const sent = sendSignup(body, { fetch: hang as unknown as typeof fetch }).then((result) => {
      outcome = result;
    });
    await vi.advanceTimersByTimeAsync(SIGNUP_TIMEOUT_MS - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await sent;
    expect(outcome).toBe('network');
  });

  it('stops its timer once answered', async () => {
    vi.useFakeTimers();
    expect(await sendSignup(body, { fetch: answer(200) })).toBe('success');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('outcomeOf', () => {
  it('maps the endpoint status codes to what the visitor is told', () => {
    expect(outcomeOf(200)).toBe('success');
    expect(outcomeOf(429)).toBe('rate_limited');
    expect(outcomeOf(403)).toBe('verification_failed');
    for (const status of [400, 413, 415]) expect(outcomeOf(status)).toBe('invalid_request');
    for (const status of [404, 405, 500, 502, 503]) expect(outcomeOf(status)).toBe('unavailable');
  });

  it('points field errors at their field', () => {
    expect(errorField('email_required')).toBe('email');
    expect(errorField('email_invalid')).toBe('email');
    expect(errorField('invalid_request')).toBe('email');
    expect(errorField('consent_required')).toBe('consent');
    expect(errorField('rate_limited')).toBeUndefined();
    expect(errorField('network')).toBeUndefined();
  });
});

describe('describedBy', () => {
  it('names the status while invalid and the suggestion while it shows, in that order', () => {
    expect(describedBy({})).toBeUndefined();
    expect(describedBy({ error: 'newsletter-status' })).toBe('newsletter-status');
    expect(describedBy({ suggestion: 'newsletter-suggestion' })).toBe('newsletter-suggestion');
    expect(describedBy({ error: 'newsletter-status', suggestion: 'newsletter-suggestion' })).toBe(
      'newsletter-status newsletter-suggestion',
    );
    // An element without an id adds nothing.
    expect(describedBy({ error: '', suggestion: undefined })).toBeUndefined();
  });
});

describe('loadFailure (the loader, when the form script did not load)', () => {
  it('offline says so; online offers a reload, as a retry would fail the same way', () => {
    expect(loadFailure(false)).toBe('offline');
    expect(loadFailure(true)).toBe('reload');
  });
});

describe('newsletter copy (site.json)', () => {
  it('has a message for every error and fills in the suggestion', () => {
    for (const error of ERRORS) expect(copy.errors[error]).toBeTruthy();
    expect(Object.keys(copy.errors).sort()).toEqual([...ERRORS].sort());
    expect(suggestionText(copy, 'jan@gmail.com')).toContain('jan@gmail.com');
  });

  it('has the reload message and button for a script that could not load', () => {
    const { reload } = site.footer.newsletter;
    expect(reload.message).toBeTruthy();
    expect(reload.button).toBeTruthy();
    // Not the offline copy: online, only a reload helps.
    expect(reload.message).not.toBe(copy.errors.network);
  });

  it('is enabled and links the consent to the privacy policy', () => {
    expect(site.footer.newsletter.enabled).toBe(true);
    const { label, links } = site.footer.newsletter.consent;
    expect(links).toContainEqual({ text: 'privacybeleid', href: '/privacybeleid' });
    for (const link of links) expect(label).toContain(link.text);
  });
});
