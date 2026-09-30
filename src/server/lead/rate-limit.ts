// Per-IP rate limit for the form endpoints (brief §9.1 step 1): a sliding window in memory,
// `limit` requests per `windowMs` (RATE_LIMIT_PER_HOUR). One Node process serves the site (PM2
// fork mode, ecosystem.config.cjs), so memory is enough; a restart resets the counts.
//
// The key is Astro's `clientAddress`. Behind Nginx that is the visitor's IP only because Nginx
// sends `X-Forwarded-For $remote_addr` (overwriting whatever the visitor sent) together with
// `X-Forwarded-Host $host`, and astro.config.ts lists that host in `security.allowedDomains`:
// Astro reads X-Forwarded-For only when the forwarded host validates, and otherwise uses the
// socket address (127.0.0.1 behind Nginx, which would put every visitor in one bucket).
//
// Memory is bounded twice: a key holds at most `limit` timestamps (refused requests aren't
// recorded), and at most `maxKeys` keys are kept; the least recently seen go first.

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  hit(key: string): RateLimitResult;
  /** Number of keys held (for tests and diagnostics). */
  size(): number;
};

export type RateLimiterOptions = {
  limit: number;
  windowMs?: number;
  maxKeys?: number;
  now?: () => number;
};

export const HOUR_MS = 60 * 60 * 1000;

export function createRateLimiter({
  limit,
  windowMs = HOUR_MS,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer');
  }
  // Insertion order = least recently seen first: a key is re-inserted on every hit.
  const hits = new Map<string, number[]>();

  return {
    hit(key) {
      const time = now();
      const recent = (hits.get(key) ?? []).filter((at) => time - at < windowMs);
      hits.delete(key);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const retryAfterMs = recent[0]! + windowMs - time;
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }
      recent.push(time);
      hits.set(key, recent);
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
      return { ok: true };
    },
    size: () => hits.size,
  };
}
