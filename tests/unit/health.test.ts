import type { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';

import { GET } from '../../src/pages/api/health';

describe('GET /api/health', () => {
  it('reports ok without caching', async () => {
    const response = await GET({} as APIContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.commit).toBe('string');
  });
});
