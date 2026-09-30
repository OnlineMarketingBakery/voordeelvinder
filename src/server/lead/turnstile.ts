// Server-side Turnstile check (brief §9.1 step 4): Cloudflare's siteverify API
// (developers.cloudflare.com/turnstile/get-started/server-side-validation/).
//
// - "pass": Cloudflare accepted the token.
// - "fail": no token, a malformed one, or Cloudflare rejected it. The endpoint answers 403.
// - "unavailable": siteverify didn't answer usably (network error, timeout, 5xx). The endpoint
//   lets the request through and logs it: a Cloudflare outage must not cost leads (brief §9.1:
//   "never lose a lead"); the honeypot and the rate limit still apply.
// Redirects are never followed, so the secret is never posted anywhere but siteverify; a
// redirect counts as "unavailable".

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Cloudflare's documented maximum token length. */
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileResult = 'pass' | 'fail' | 'unavailable';

export type TurnstileOptions = {
  secret: string;
  /** The visitor's IP, passed to Cloudflare as `remoteip`. */
  remoteip?: string;
  /** Defaults to Cloudflare's siteverify; the e2e mock replaces it (local and CI only). */
  url?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export async function verifyTurnstile(
  token: unknown,
  {
    secret,
    remoteip,
    url = SITEVERIFY_URL,
    timeoutMs = 5000,
    fetch: send = fetch,
  }: TurnstileOptions,
): Promise<TurnstileResult> {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return 'fail';
  }
  const form = new URLSearchParams({ secret, response: token });
  if (remoteip) form.set('remoteip', remoteip);

  let response: Response;
  try {
    response = await send(url, {
      method: 'POST',
      body: form,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return 'unavailable';
  }
  const redirected =
    response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
  if (redirected || response.status >= 500) {
    await response.body?.cancel().catch(() => {});
    return 'unavailable';
  }
  try {
    const body = (await response.json()) as { success?: unknown };
    return body.success === true ? 'pass' : 'fail';
  } catch {
    return response.ok ? 'unavailable' : 'fail';
  }
}
