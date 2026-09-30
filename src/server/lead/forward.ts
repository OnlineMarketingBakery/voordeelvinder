// Forwarding to n8n (brief §9.1 step 8): POST the JSON payload with `X-VV-Secret`, an 8-second
// timeout per attempt, retried twice with backoff. The result never carries the webhook URL or
// a response body: both stay out of the logs.
//
// Redirects are never followed (`redirect: "manual"`): fetch would re-send the secret and, on a
// 307/308, the whole lead to wherever the Location points, and on a 301/302/303 it would switch
// to a body-less GET whose 2xx (a login page behind a proxy) looks like success. Any 3xx is a
// failed forward (`http_3xx`), not retried: the record stays pending_forward, and leads:retry
// alerts when it stays that way.

export const SECRET_HEADER = 'X-VV-Secret';

export type ForwardResult =
  | { status: 'forwarded'; attempts: number }
  | { status: 'failed'; attempts: number; reason: string };

export type ForwardOptions = {
  secret?: string;
  timeoutMs?: number;
  /** Extra attempts after the first. */
  retries?: number;
  /** Wait before retry n (the last value repeats). */
  backoffMs?: readonly number[];
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 4xx means n8n refused the request (bad secret, wrong URL): retrying now won't help. */
function retriable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Whether a failed forward's reason means n8n is probably down or overloaded (a network error,
 * a timeout, 5xx, 408, 429), rather than refusing this request (other 4xx, a redirect).
 */
export function retriableReason(reason: string): boolean {
  if (reason === 'network' || reason === 'timeout') return true;
  const status = /^http_(\d{3})$/.exec(reason)?.[1];
  return status !== undefined && retriable(Number(status));
}

function isRedirect(response: Response): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

export async function forward(
  url: string,
  payload: unknown,
  {
    secret,
    timeoutMs = 8000,
    retries = 2,
    backoffMs = [500, 1500],
    fetch: send = fetch,
    sleep = wait,
  }: ForwardOptions = {},
): Promise<ForwardResult> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret) headers[SECRET_HEADER] = secret;

  let reason = 'not_sent';
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    if (attempt > 1) {
      await sleep(backoffMs[Math.min(attempt - 2, backoffMs.length - 1)] ?? 0);
    }
    try {
      const response = await send(url, {
        method: 'POST',
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Free the connection; the body is never read.
      await response.body?.cancel().catch(() => {});
      if (isRedirect(response)) return { status: 'failed', attempts: attempt, reason: 'http_3xx' };
      if (response.ok) return { status: 'forwarded', attempts: attempt };
      reason = `http_${response.status}`;
      if (!retriable(response.status)) return { status: 'failed', attempts: attempt, reason };
    } catch (error) {
      reason =
        (error as { name?: unknown } | null)?.name === 'TimeoutError' ? 'timeout' : 'network';
    }
  }
  return { status: 'failed', attempts: retries + 1, reason };
}
