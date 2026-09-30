// Small helpers for the JSON API routes. Error responses carry a stable code only (the form
// maps it to copy from the content files), never an internal message.

/** The adapter's body limit (astro.config.ts `bodySizeLimit`). */
export const MAX_BODY_BYTES = 64 * 1024;

export type ApiError =
  | 'invalid_request'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'method_not_allowed'
  | 'rate_limited'
  | 'verification_failed'
  | 'unavailable'
  | 'server_error';

export function json(
  body: unknown,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function apiError(
  error: ApiError,
  status: number,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return json({ ok: false, error }, status, headers);
}

export function methodNotAllowed(): Response {
  return apiError('method_not_allowed', 405, { allow: 'POST' });
}

export type BodyResult = { ok: true; body: unknown } | { ok: false; response: Response };

/** Reads a JSON request body: 415 unless it is JSON, 413 when too large, 400 when unreadable. */
export async function readJsonBody(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<BodyResult> {
  const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (type !== 'application/json') {
    return { ok: false, response: apiError('unsupported_media_type', 415) };
  }
  const tooLarge = { ok: false, response: apiError('payload_too_large', 413) } as const;
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return tooLarge;
  let text: string;
  try {
    text = await request.text();
  } catch {
    // The adapter aborts a body over its limit while it streams.
    return tooLarge;
  }
  if (Buffer.byteLength(text) > maxBytes) return tooLarge;
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: apiError('invalid_request', 400) };
  }
}

/**
 * The visitor's IP as Astro reports it (see rate-limit.ts for why it is the visitor's and not
 * Nginx's). Reading it throws when the adapter can't tell; then all such requests share a key.
 */
export function clientAddressOf(context: { readonly clientAddress: string }): string {
  try {
    return context.clientAddress || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The User-Agent header for the payload's meta, capped in length. */
export function userAgentOf(request: Request): string {
  return (request.headers.get('user-agent') ?? '').slice(0, 512);
}
