import { describe, expect, it } from 'vitest';

import { createRateLimiter, HOUR_MS } from '../../../src/server/lead/rate-limit';

function clock(start = 1_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('createRateLimiter', () => {
  it('allows `limit` requests per hour per key, then refuses with Retry-After', () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ limit: 3, now });
    expect(limiter.hit('1.1.1.1')).toEqual({ ok: true });
    advance(10 * 60 * 1000);
    expect(limiter.hit('1.1.1.1')).toEqual({ ok: true });
    expect(limiter.hit('1.1.1.1')).toEqual({ ok: true });
    // The first hit leaves the window 50 minutes from now.
    expect(limiter.hit('1.1.1.1')).toEqual({ ok: false, retryAfterSeconds: 50 * 60 });
    // Another key has its own window.
    expect(limiter.hit('2.2.2.2')).toEqual({ ok: true });
  });

  it('slides: a request becomes possible again once the oldest leaves the window', () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ limit: 2, now });
    limiter.hit('ip');
    advance(1000);
    limiter.hit('ip');
    expect(limiter.hit('ip').ok).toBe(false);
    advance(HOUR_MS - 1000);
    expect(limiter.hit('ip')).toEqual({ ok: true });
    expect(limiter.hit('ip')).toEqual({ ok: false, retryAfterSeconds: 1 });
  });

  it("doesn't count refused requests", () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ limit: 1, now });
    limiter.hit('ip');
    for (let i = 0; i < 50; i++) limiter.hit('ip');
    advance(HOUR_MS);
    expect(limiter.hit('ip')).toEqual({ ok: true });
  });

  it('rounds Retry-After up and never below 1 second', () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now });
    limiter.hit('ip');
    advance(9_999);
    expect(limiter.hit('ip')).toEqual({ ok: false, retryAfterSeconds: 1 });
    advance(-4_000);
    expect(limiter.hit('ip')).toEqual({ ok: false, retryAfterSeconds: 5 });
  });

  it('keeps at most maxKeys keys, dropping the least recently seen', () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 1, maxKeys: 2, now });
    limiter.hit('a');
    limiter.hit('b');
    expect(limiter.hit('a').ok).toBe(false); // a is now the most recently seen
    limiter.hit('c'); // drops b
    expect(limiter.size()).toBe(2);
    expect(limiter.hit('a').ok).toBe(false);
    expect(limiter.hit('b')).toEqual({ ok: true });
  });

  it('rejects a limit that is not a positive integer', () => {
    expect(() => createRateLimiter({ limit: 0 })).toThrow(RangeError);
    expect(() => createRateLimiter({ limit: 1.5 })).toThrow(RangeError);
  });

  it('uses the real clock by default', () => {
    const limiter = createRateLimiter({ limit: 1 });
    expect(limiter.hit('ip').ok).toBe(true);
    const refused = limiter.hit('ip');
    expect(refused).toEqual({ ok: false, retryAfterSeconds: 3600 });
  });
});
