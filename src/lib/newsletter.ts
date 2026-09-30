// The footer newsletter sign-up in the browser (brief §5, §9.1): the pure parts of
// src/scripts/newsletter-form.ts. The request shape is the server's (newsletterRequest in
// src/server/newsletter.ts, docs/PAYLOAD.md "Newsletter sign-up"); the copy is in site.json
// (footer.newsletter). Never log an address: it is personal data (brief §13).
import { fill } from './copy';
import { validateEmail } from './flow/validators/email';

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
}: {
  email: string;
  /** The honeypot's value: empty for people. */
  website: string;
  token: string;
  /** location.pathname */
  pathname: string;
  /** location.search */
  search: string;
}): NewsletterBody {
  return {
    email,
    consent: true,
    website,
    turnstile_token: token,
    page: pathname.startsWith('/') ? pathname.slice(0, MAX_PAGE_LENGTH) : '/',
    // The visitor arrived with ?test=1 (brief §9.4), as the form's isTestVisit.
    test: new URLSearchParams(search).get('test') === '1',
  };
}

/** What a response from POST /api/newsletter means for the visitor. */
export function outcomeOf(status: number): 'success' | NewsletterError {
  if (status >= 200 && status < 300) return 'success';
  if (status === 429) return 'rate_limited';
  if (status === 403) return 'verification_failed';
  if (status === 400 || status === 413 || status === 415) return 'invalid_request';
  return 'unavailable';
}

/** The field an error is about, to mark it invalid and move focus to it. */
export function errorField(error: NewsletterError): 'email' | 'consent' | undefined {
  if (error === 'email_required' || error === 'email_invalid' || error === 'invalid_request') {
    return 'email';
  }
  return error === 'consent_required' ? 'consent' : undefined;
}

/** "Bedoel je jan@gmail.com?". */
export function suggestionText(copy: NewsletterCopy, suggestion: string): string {
  return fill(copy.messages.suggestion, { suggestion });
}
