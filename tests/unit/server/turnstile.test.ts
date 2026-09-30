import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SITEVERIFY_URL, verifyTurnstile } from '../../../src/server/lead/turnstile';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';

const secret = '1x0000000000000000000000000000000AA';

function fakeFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

describe('verifyTurnstile', () => {
  let mock: MockN8n;
  beforeAll(async () => {
    mock = await startMockN8n();
  });
  afterAll(() => mock.close());

  it('posts secret, token and remoteip to siteverify as a form', async () => {
    const send = fakeFetch(Response.json({ success: true }));
    expect(await verifyTurnstile('token', { secret, remoteip: '203.0.113.7', fetch: send })).toBe(
      'pass',
    );
    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe(SITEVERIFY_URL);
    expect(init?.method).toBe('POST');
    const body = init?.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({
      secret,
      response: 'token',
      remoteip: '203.0.113.7',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('leaves remoteip out when unknown', async () => {
    const send = fakeFetch(Response.json({ success: true }));
    await verifyTurnstile('token', { secret, fetch: send });
    expect((send.mock.calls[0]![1]?.body as URLSearchParams).has('remoteip')).toBe(false);
  });

  it('fails without calling Cloudflare for a missing, empty or oversized token', async () => {
    const send = fakeFetch(Response.json({ success: true }));
    for (const token of [undefined, null, 42, '', 'x'.repeat(2049)]) {
      expect(await verifyTurnstile(token, { secret, fetch: send })).toBe('fail');
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('fails when Cloudflare rejects the token', async () => {
    expect(
      await verifyTurnstile('t', {
        secret,
        fetch: fakeFetch(
          Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
        ),
      }),
    ).toBe('fail');
    expect(
      await verifyTurnstile('t', {
        secret,
        fetch: fakeFetch(new Response('nope', { status: 400 })),
      }),
    ).toBe('fail');
  });

  it('reports unavailable on a network error, a timeout, a 5xx or an unreadable 200', async () => {
    expect(
      await verifyTurnstile('t', { secret, fetch: fakeFetch(new TypeError('fetch failed')) }),
    ).toBe('unavailable');
    expect(
      await verifyTurnstile('t', { secret, fetch: fakeFetch(new Response('', { status: 503 })) }),
    ).toBe('unavailable');
    expect(
      await verifyTurnstile('t', {
        secret,
        fetch: fakeFetch(new Response('<html>', { status: 200 })),
      }),
    ).toBe('unavailable');
  });

  it('works against a real HTTP endpoint (the e2e stand-in)', async () => {
    const url = `${mock.url}/turnstile/siteverify`;
    expect(await verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX', { secret, url })).toBe('pass');
    expect(await verifyTurnstile('fail', { secret, url })).toBe('fail');
    expect(await verifyTurnstile('t', { secret, url: 'http://127.0.0.1:1/siteverify' })).toBe(
      'unavailable',
    );
  });

  it('times out', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
        }),
    );
    expect(await verifyTurnstile('t', { secret, fetch: hanging, timeoutMs: 20 })).toBe(
      'unavailable',
    );
  });
});
