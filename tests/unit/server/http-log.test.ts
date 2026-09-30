import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  apiError,
  clientAddressOf,
  json,
  methodNotAllowed,
  readJsonBody,
  userAgentOf,
} from '../../../src/server/http';
import { consoleLogger, errorSummary } from '../../../src/server/log';

describe('http helpers', () => {
  it('answers JSON that is never cached', async () => {
    const response = json({ ok: true }, 201, { 'x-extra': '1' });
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-extra')).toBe('1');
    expect(await apiError('rate_limited', 429).json()).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    const notAllowed = methodNotAllowed();
    expect(notAllowed.status).toBe(405);
    expect(notAllowed.headers.get('allow')).toBe('POST');
  });

  it('reads a JSON body, with a charset too', async () => {
    const request = new Request('http://x/', {
      method: 'POST',
      headers: { 'content-type': 'Application/JSON; charset=utf-8' },
      body: '{"a":1}',
    });
    expect(await readJsonBody(request)).toEqual({ ok: true, body: { a: 1 } });
  });

  it('refuses a missing content type, an announced large body and an unreadable one', async () => {
    const noType = new Request('http://x/', { method: 'POST', body: new Blob(['{}']) });
    expect((await readJsonBody(noType)).ok).toBe(false);

    const announced = new Request('http://x/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '999999' },
      body: '{}',
    });
    const large = await readJsonBody(announced);
    expect(!large.ok && large.response.status).toBe(413);

    const broken = new Request('http://x/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: new ReadableStream({
        pull(controller) {
          controller.error(new Error('body limit exceeded'));
        },
      }),
      duplex: 'half',
    } as RequestInit);
    const unreadable = await readJsonBody(broken);
    expect(!unreadable.ok && unreadable.response.status).toBe(413);
  });

  it('reads the client address, falling back when Astro cannot tell', () => {
    expect(clientAddressOf({ clientAddress: '203.0.113.1' })).toBe('203.0.113.1');
    expect(clientAddressOf({ clientAddress: '' })).toBe('unknown');
    const throwing = {
      get clientAddress(): string {
        throw new Error('clientAddress is not available');
      },
    };
    expect(clientAddressOf(throwing)).toBe('unknown');
  });

  it('caps the user agent', () => {
    const request = new Request('http://x/', { headers: { 'user-agent': 'a'.repeat(600) } });
    expect(userAgentOf(request)).toHaveLength(512);
    expect(userAgentOf(new Request('http://x/'))).toBe('');
  });
});

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes one JSON line: info to stdout, warn and error to stderr', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogger('info', 'lead', { lead_id: 'abc' });
    consoleLogger('warn', 'lead_rate_limited');
    consoleLogger('error', 'lead_error', { error: 'x' });
    const line = JSON.parse(out.mock.calls[0]![0] as string);
    expect(line).toMatchObject({ level: 'info', event: 'lead', lead_id: 'abc' });
    expect(Date.parse(line.time)).not.toBeNaN();
    expect(err).toHaveBeenCalledTimes(2);
  });

  it('summarises errors without stacks', () => {
    expect(errorSummary(new TypeError('bad'))).toBe('TypeError: bad');
    expect(errorSummary('plain')).toBe('plain');
    expect(errorSummary({})).toBe('unknown error');
    expect(errorSummary(new Error('x'.repeat(400)))).toHaveLength(300);
  });
});
