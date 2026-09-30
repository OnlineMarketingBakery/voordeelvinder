import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { forward, retriableReason } from '../../../src/server/lead/forward';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';
import { FAKE_SECRET } from './fixtures';

describe('forward', () => {
  let mock: MockN8n;
  let url: string;
  const sleep = vi.fn(async (_ms: number) => {});

  beforeAll(async () => {
    mock = await startMockN8n();
    url = `${mock.url}/webhook/lead`;
  });
  afterEach(() => {
    mock.received.length = 0;
    sleep.mockClear();
  });
  afterAll(() => mock.close());

  it('posts the payload as JSON with X-VV-Secret', async () => {
    const payload = { lead_id: 'abc', nested: { ok: true } };
    expect(await forward(url, payload, { secret: FAKE_SECRET, sleep })).toEqual({
      status: 'forwarded',
      attempts: 1,
    });
    expect(mock.received).toHaveLength(1);
    const [request] = mock.received;
    expect(request!.body).toEqual(payload);
    expect(request!.headers['content-type']).toBe('application/json');
    expect(request!.headers['x-vv-secret']).toBe(FAKE_SECRET);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('sends no secret header without a secret', async () => {
    await forward(url, {}, { sleep });
    expect(mock.received[0]!.headers['x-vv-secret']).toBeUndefined();
  });

  it('retries twice with backoff on 5xx, then succeeds', async () => {
    mock.respond({ status: 502 }, { status: 503 });
    expect(await forward(url, {}, { sleep })).toEqual({ status: 'forwarded', attempts: 3 });
    expect(mock.received).toHaveLength(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1500]);
  });

  it('gives up after three attempts', async () => {
    mock.respond({ status: 500 }, { status: 500 }, { status: 500 });
    expect(await forward(url, {}, { sleep, backoffMs: [1] })).toEqual({
      status: 'failed',
      attempts: 3,
      reason: 'http_500',
    });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1, 1]);
  });

  it("doesn't retry a refusal (4xx), but does retry 408 and 429", async () => {
    mock.respond({ status: 401 });
    expect(await forward(url, {}, { sleep })).toEqual({
      status: 'failed',
      attempts: 1,
      reason: 'http_401',
    });
    mock.respond({ status: 429 }, { status: 408 });
    expect(await forward(url, {}, { sleep })).toMatchObject({ status: 'forwarded', attempts: 3 });
  });

  it('never follows a redirect: a failed forward (http_3xx), not retried, nothing sent on', async () => {
    const elsewhere = await startMockN8n();
    try {
      for (const status of [301, 302, 303, 307, 308]) {
        mock.respond({ status, location: `${elsewhere.url}/webhook/elsewhere` });
        expect(await forward(url, { lead_id: 'x' }, { secret: FAKE_SECRET, sleep })).toEqual({
          status: 'failed',
          attempts: 1,
          reason: 'http_3xx',
        });
      }
      // Neither the secret nor the lead went anywhere else, and nothing was retried.
      expect(elsewhere.received).toEqual([]);
      expect(mock.received).toHaveLength(5);
      expect(sleep).not.toHaveBeenCalled();
    } finally {
      await elsewhere.close();
    }
  });

  it('treats an opaque redirect as a redirect', async () => {
    const opaque = new Response(null, { status: 200 });
    Object.defineProperty(opaque, 'type', { value: 'opaqueredirect' });
    const send = vi.fn<typeof fetch>(async () => opaque);
    expect(await forward(url, {}, { fetch: send, sleep })).toEqual({
      status: 'failed',
      attempts: 1,
      reason: 'http_3xx',
    });
    expect(send.mock.calls[0]![1]?.redirect).toBe('manual');
  });

  it('tells reasons worth retrying (n8n down) from refusals', () => {
    for (const reason of ['network', 'timeout', 'http_500', 'http_503', 'http_408', 'http_429']) {
      expect(retriableReason(reason), reason).toBe(true);
    }
    for (const reason of ['http_3xx', 'http_400', 'http_401', 'http_404', 'not_sent', 'http_5']) {
      expect(retriableReason(reason), reason).toBe(false);
    }
  });

  it('times out a slow webhook per attempt', async () => {
    mock.respond({ status: 200, delayMs: 300 });
    expect(await forward(url, {}, { sleep, timeoutMs: 50, retries: 0 })).toEqual({
      status: 'failed',
      attempts: 1,
      reason: 'timeout',
    });
  });

  it('reports a network error without the URL', async () => {
    const result = await forward('http://127.0.0.1:1/webhook', {}, { sleep, retries: 1 });
    expect(result).toEqual({ status: 'failed', attempts: 2, reason: 'network' });
  });

  it('waits for real between attempts by default', async () => {
    mock.respond({ status: 500 });
    const started = Date.now();
    expect(await forward(url, {}, { backoffMs: [30] })).toMatchObject({ status: 'forwarded' });
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });

  it('handles an empty backoff list', async () => {
    mock.respond({ status: 500 });
    expect(await forward(url, {}, { backoffMs: [] })).toMatchObject({ attempts: 2 });
  });
});
