// The footer newsletter sign-up in the browser (brief §5, §9.1): the pure parts of
// src/scripts/newsletter-form.ts. The request shape is the server's (newsletterRequest in
// src/server/newsletter.ts, docs/PAYLOAD.md "Newsletter sign-up"); the copy is in site.json
// (footer.newsletter). Never log an address: it is personal data (brief §13).
import { fill } from './copy';
import { validateEmail } from './flow/validators/email';
import { isTestSession } from './test-mode';

/** What the form can go wrong on; each has a message in site.json `footer.newsletter.errors`. */
export type NewsletterError =
  | 'email_required'
  | 'email_invalid'
  | 'consent_required'
  | 'invalid_request'
  | 'verification_failed'
  | 'rate_limited'
  | 'unavailable'
  | 'network';

export type NewsletterCopy = {
  messages: { sending: string; success: string; suggestion: string };
  errors: Record<NewsletterError, string>;
};

/** The request body; matches newsletterRequest (strict: no other keys). */
export type NewsletterBody = {
  email: string;
  consent: true;
  website: string;
  turnstile_token: string;
  page: string;
  test: boolean;
};

export type EmailCheck =
  | { ok: true; email: string; suggestion?: string }
  | { ok: false; error: 'email_required' | 'email_invalid'; suggestion?: string };

/** The shared e-mail validator (brief §7.5): trimmed and lowercased, with a typo suggestion. */
export function checkEmail(raw: string): EmailCheck {
  const result = validateEmail(raw, { id: 'email', type: 'email', required: true });
  const suggestion = result.suggestion ? { suggestion: result.suggestion } : {};
  if (!result.ok) {
    return {
      ok: false,
      error: result.code === 'required' ? 'email_required' : 'email_invalid',
      ...suggestion,
    };
  }
  return { ok: true, email: String(result.value), ...suggestion };
}

/** The server's limit on `page` (newsletterRequest). */
const MAX_PAGE_LENGTH = 300;

export function newsletterBody({
  email,
  website,
  token,
  pathname,
  search,
  store,
}: {
  email: string;
  /** The honeypot's value: empty for people. */
  website: string;
  token: string;
  /** location.pathname */
  pathname: string;
  /** location.search */
  search: string;
  /** sessionStorage, for the test-mode flag (?test=1 is kept for the session, brief §9.4). */
  store: Pick<Storage, 'getItem'> | null;
}): NewsletterBody {
  return {
    email,
    consent: true,
    website,
    turnstile_token: token,
    page: pathname.startsWith('/') ? pathname.slice(0, MAX_PAGE_LENGTH) : '/',
    // The session's test mode, as a lead's meta.test (src/lib/test-mode.ts): ?test=1 on this
    // URL or earlier in the session, until ?test=0.
    test: isTestSession(search, store),
  };
}

/** The sign-up endpoint (src/pages/api/newsletter.ts), the form's `action`. */
export const NEWSLETTER_ENDPOINT = '/api/newsletter';
/**
 * How long the request may take before it counts as a network failure, so the button unlocks:
 * above the endpoint's worst case (a 5 s Turnstile check, then three 8 s n8n attempts with 2 s
 * of backoff, about 31 s).
 */
export const SIGNUP_TIMEOUT_MS = 35_000;

/** What a response from POST /api/newsletter means for the visitor. */
export function outcomeOf(status: number): 'success' | NewsletterError {
  if (status >= 200 && status < 300) return 'success';
  if (status === 429) return 'rate_limited';
  if (status === 403) return 'verification_failed';
  if (status === 400 || status === 413 || status === 415) return 'invalid_request';
  return 'unavailable';
}

/**
 * Posts the sign-up as JSON and answers what came of it. Never throws: no answer (offline, or
 * none within `timeoutMs`) is 'network'.
 */
export async function sendSignup(
  body: NewsletterBody,
  {
    endpoint = NEWSLETTER_ENDPOINT,
    fetch: send = globalThis.fetch,
    timeoutMs = SIGNUP_TIMEOUT_MS,
  }: { endpoint?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<'success' | NewsletterError> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await send(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return outcomeOf(response.status);
  } catch {
    return 'network';
  } finally {
    clearTimeout(timer);
  }
}

/** The field an error is about, to mark it invalid and move focus to it. */
export function errorField(error: NewsletterError): 'email' | 'consent' | undefined {
  if (error === 'email_required' || error === 'email_invalid' || error === 'invalid_request') {
    return 'email';
  }
  return error === 'consent_required' ? 'consent' : undefined;
}

/**
 * A field's aria-describedby: the status line while the field is invalid (its error is there),
 * then the typo suggestion while one shows. Undefined when there is neither.
 */
export function describedBy({
  error,
  suggestion,
}: {
  error?: string | undefined;
  suggestion?: string | undefined;
}): string | undefined {
  const ids = [error, suggestion].filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** "Bedoel je jan@gmail.com?". */
export function suggestionText(copy: NewsletterCopy, suggestion: string): string {
  return fill(copy.messages.suggestion, { suggestion });
}
