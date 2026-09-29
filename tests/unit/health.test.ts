import type { APIContext } from 'astro';
import { afterEach, describe, expect, it, vi } from 'vitest';

// serverEnv() caches, so load a fresh module per test.
async function callHealth() {
  vi.resetModules();
  const { GET } = await import('../../src/pages/api/health');
  return GET({} as APIContext);
}

const valid = { PUBLIC_SITE_URL: 'http://localhost:4321' };

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports ok without caching when the environment matches the build', async () => {
    vi.stubEnv('SITE_ENV', __SITE_ENV__);
    vi.stubEnv('PUBLIC_SITE_URL', valid.PUBLIC_SITE_URL);
    const response = await callHealth();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, env: __SITE_ENV__ });
    expect(typeof body.commit).toBe('string');
  });

  it('fails when SITE_ENV changed since the build', async () => {
    vi.stubEnv('SITE_ENV', __SITE_ENV__ === 'ci' ? 'local' : 'ci');
    vi.stubEnv('PUBLIC_SITE_URL', valid.PUBLIC_SITE_URL);
    const response = await callHealth();

    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
  });

  it('fails when the environment is invalid', async () => {
    vi.stubEnv('SITE_ENV', 'nonsense');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await callHealth();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, env: 'invalid' });
  });
});
