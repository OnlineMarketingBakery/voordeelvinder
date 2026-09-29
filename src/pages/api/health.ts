import type { APIRoute } from 'astro';

export const prerender = false;

// Cheap liveness check for the deploy script and Ploi's uptime monitor. No side effects.
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, commit: __BUILD_COMMIT__ }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
