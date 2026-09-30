// Submitting the form (brief §7.6, §9): the submission is built and validated in the browser,
// then posted to /api/lead, which validates it again and answers where to go. Never log a
// submission or a response body: they hold personal data (brief §13).
import type { Submission, SubmissionContext } from '../flow/engine';
import type { Derived, Product } from '../flow/types';
import { isTestSession } from '../test-mode';

/**
 * A one-time marker the form leaves just before it goes to the thank-you page, so that page
 * names its card for the form-card morph (ThankYou.astro reads and removes it). More reliable
 * than the referrer, which privacy settings and some browsers drop.
 */
export const MORPH_MARKER = 'voordeelvinder:morph';

/** The thank-you page per product (brief §5; src/pages/bedankt/[product].astro). */
export function thanksPath(product: Product): string {
  return `/bedankt/${product}`;
}

/** The product's own page (energy has none: the home page is its page, like /l/ variants). */
export function productPagePath(product: Product): string {
  return product === 'energie' ? '/' : `/${product}`;
}

export type ContextInput = {
  leadId: string;
  eventId: string;
  derived: Derived;
  /** location.pathname */
  page: string;
  /** location.search */
  search: string;
  /** sessionStorage, for the test-mode flag (?test=1 is kept for the session, brief §9.4). */
  store?: Pick<Storage, 'getItem'> | null;
  now: Date;
};

/**
 * What the form knows besides the answers. Tracking and the cookie state arrive with the cookie
 * banner and tag setup (Phase 6): until then every tracking key is sent empty and cookies as
 * not accepted. `test` is the session's test mode (src/lib/test-mode.ts): ?test=1 on this URL
 * or earlier in the session.
 */
export function submissionContext({
  leadId,
  eventId,
  derived,
  page,
  search,
  store = null,
  now,
}: ContextInput): SubmissionContext {
  return {
    lead_id: leadId,
    event_id: eventId,
    submitted_at: now.toISOString(),
    derived,
    tracking: {},
    cookies: { analytics: false, marketing: false },
    page,
    test: isTestSession(search, store),
  };
}

/**
 * How long after "Volgende" moved to a new step another "Volgende" is ignored when nothing was
 * answered in between: a double click or double tap would otherwise also validate (or submit)
 * the new step before the visitor saw it.
 */
export const STEP_GUARD_MS = 350;

/**
 * Whether a "Volgende" (or an auto-advance) is the second half of a double click/tap:
 * `advancedAt` is the time (event.timeStamp or performance.now(), the same clock) the form last
 * moved forward, or null when the visitor has answered or gone back since.
 */
export function isRepeatSubmit(advancedAt: number | null, now: number): boolean {
  return advancedAt !== null && now - advancedAt >= 0 && now - advancedAt < STEP_GUARD_MS;
}

/** The lead endpoint (src/pages/api/lead.ts, brief §9.1). */
export const LEAD_ENDPOINT = '/api/lead';
/** How long one attempt may take before it counts as a network failure. */
export const SEND_TIMEOUT_MS = 15_000;
/** The pause before the one automatic retry (503 or a network failure). */
export const RETRY_DELAY_MS = 1_500;

/**
 * Why a send failed, one message each in _copy.json `submitErrors`:
 * - invalid: 400/413/415, the server rejected the submission (also a flow changed by a deploy);
 * - turnstile: 403, the Turnstile check failed;
 * - rate_limit: 429, too many sends from this address;
 * - unavailable: the lead is neither backed up nor forwarded (503), or any other server error;
 * - network: no answer (offline, timeout).
 */
export type SendFailure = 'invalid' | 'turnstile' | 'rate_limit' | 'unavailable' | 'network';

export type SendResult =
  { ok: true; redirect: string } | { ok: false; kind: SendFailure; retryAfter?: number };

export type SendOptions = {
  /**
   * The Turnstile token, asked for per attempt: a token is good for one check only, so the
   * retry needs a new one. Undefined when there is none (the script didn't load): the lead is
   * sent anyway and the server decides.
   */
  turnstileToken?: () => Promise<string | undefined> | string | undefined;
  /** The honeypot input's value (empty for people). */
  honeypot?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Whether the honeypot was filled, by the endpoint's own test (src/server/lead/validate.ts): a
 * filled one gets a pretend OK and nothing is stored; only spaces count as empty, a real lead.
 */
export function honeypotFilled(value: string): boolean {
  return value.trim() !== '';
}

type Attempt = SendResult & { retry: boolean };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retry-After as seconds (a number or an HTTP date), when it is usable. */
export function retryAfterSeconds(header: string | null, now = Date.now()): number | undefined {
  if (header === null || header.trim() === '') return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds >= 0 ? Math.ceil(seconds) : undefined;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

/** A same-site path such as /bedankt/energie, never another origin (//host, https:…). */
function safeRedirect(value: unknown): string | undefined {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : undefined;
}

async function attempt(
  body: string,
  { fetch: send = globalThis.fetch, timeoutMs = SEND_TIMEOUT_MS }: SendOptions,
  fallback: string,
): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await send(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body,
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch {
    return { ok: false, kind: 'network', retry: true };
  } finally {
    clearTimeout(timer);
  }
  const { status } = response;
  if (status >= 200 && status < 300) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const answer = (data ?? {}) as { ok?: unknown; redirect?: unknown };
    // A 2xx that isn't the endpoint's answer (a proxy page): not proof the lead is safe.
    if (answer.ok !== true) return { ok: false, kind: 'unavailable', retry: true };
    return { ok: true, redirect: safeRedirect(answer.redirect) ?? fallback, retry: false };
  }
  if (status === 400 || status === 413 || status === 415) {
    return { ok: false, kind: 'invalid', retry: false };
  }
  if (status === 403) return { ok: false, kind: 'turnstile', retry: false };
  if (status === 429) {
    const retryAfter = retryAfterSeconds(response.headers.get('retry-after'));
    return {
      ok: false,
      kind: 'rate_limit',
      ...(retryAfter === undefined ? {} : { retryAfter }),
      retry: false,
    };
  }
  // 503: neither backed up nor forwarded; 502/504: Nginx without the Node process (a deploy).
  return {
    ok: false,
    kind: 'unavailable',
    retry: status === 502 || status === 503 || status === 504,
  };
}

/**
 * Posts the lead to /api/lead: the submission plus the honeypot (`website`) and the Turnstile
 * token (`turnstile_token`), as JSON. On a 503 or a network failure it tries once more after
 * RETRY_DELAY_MS, with the same lead_id (the endpoint is idempotent on it) and a new Turnstile
 * token. Never throws, never logs.
 */
export async function sendLead(
  submission: Submission,
  options: SendOptions = {},
): Promise<SendResult> {
  const { turnstileToken, honeypot = '', retryDelayMs = RETRY_DELAY_MS, sleep = wait } = options;
  const fallback = thanksPath(submission.product);
  const bodyFor = async () => {
    let token: string | undefined;
    try {
      token = (await turnstileToken?.()) || undefined;
    } catch {
      token = undefined;
    }
    return JSON.stringify({
      ...submission,
      website: honeypot,
      ...(token === undefined ? {} : { turnstile_token: token }),
    });
  };
  let result = await attempt(await bodyFor(), options, fallback);
  if (!result.ok && result.retry) {
    await sleep(retryDelayMs);
    result = await attempt(await bodyFor(), options, fallback);
  }
  const { retry: _retry, ...outcome } = result;
  return outcome;
}

/**
 * Where "Terug" goes on the first shown step (brief §7.6): the product page when the product
 * was preselected, else the previous page when it is on this site, else `fallback`.
 */
export function firstStepBack({
  preselected,
  productPage,
  fallback,
  referrer,
  origin,
  historyLength,
}: {
  preselected: boolean;
  productPage: string;
  fallback: string;
  referrer: string;
  origin: string;
  historyLength: number;
}): { kind: 'history' } | { kind: 'href'; href: string } {
  if (preselected) return { kind: 'href', href: productPage };
  let sameSite: boolean;
  try {
    sameSite = referrer !== '' && new URL(referrer).origin === origin;
  } catch {
    sameSite = false;
  }
  return sameSite && historyLength > 1 ? { kind: 'history' } : { kind: 'href', href: fallback };
}
