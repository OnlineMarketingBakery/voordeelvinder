// The route files only wire the handlers (tested in lead-handler / newsletter tests) to Astro.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/form-content', () => ({
  loadFormContent: vi.fn(async () => ({ flows: {}, copy: {} })),
}));

const context = (request: Request, clientAddress = '203.0.113.5') =>
  ({ request, clientAddress }) as unknown as APIContext;

const post = (path: string, body: unknown) =>
  new Request(`http://localhost:4321${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('API routes', () => {
  let root: string;
  beforeEach(async () => {
    vi.resetModules();
    root = await mkdtemp(join(tmpdir(), 'vv-routes-'));
    vi.stubEnv('SITE_ENV', 'ci');
    vi.stubEnv('PUBLIC_SITE_URL', 'http://localhost:4321');
    vi.stubEnv('LEAD_BACKUP_DIR', join(root, 'backups'));
    vi.stubEnv('RATE_LIMIT_PER_HOUR', '1');
    vi.stubEnv('N8N_LEAD_WEBHOOK_URL', '');
    vi.stubEnv('N8N_NEWSLETTER_WEBHOOK_URL', '');
    vi.stubEnv('TURNSTILE_VERIFY_URL', 'http://127.0.0.1:1/siteverify');
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it('/api/lead: POST runs the pipeline (rate limit kept per process), other methods 405', async () => {
    const route = await import('../../../src/pages/api/lead');
    expect(route.prerender).toBe(false);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // The stub/real parser rejects an empty body; the limiter (1/hour) then refuses.
    expect((await route.POST(context(post('/api/lead', {})))).status).toBe(400);
    expect((await route.POST(context(post('/api/lead', {})))).status).toBe(429);
    expect((await route.POST(context(post('/api/lead', {}), '198.51.100.2'))).status).toBe(400);
    const other = await route.ALL(context(new Request('http://localhost:4321/api/lead')));
    expect(other.status).toBe(405);
  });

  it('/api/newsletter: POST runs the pipeline, other methods 405', async () => {
    const route = await import('../../../src/pages/api/newsletter');
    expect(route.prerender).toBe(false);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const body = { email: 'jan@example.be', consent: true, turnstile_token: 't' };
    expect((await route.POST(context(post('/api/newsletter', body)))).status).toBe(200);
    expect((await route.POST(context(post('/api/newsletter', body)))).status).toBe(429);
    const other = await route.ALL(context(new Request('http://localhost:4321/api/newsletter')));
    expect(other.status).toBe(405);
  });
});
