import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { forward } from '../../../src/server/lead/forward';
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
