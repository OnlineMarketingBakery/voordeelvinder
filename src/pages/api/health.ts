import type { APIRoute } from 'astro';

import { serverEnv } from '../../server/env';

export const prerender = false;

// Cheap liveness check for the deploy script and Ploi's uptime monitor. No side effects.
// Fails (503) when the runtime environment is invalid, or when SITE_ENV changed since the build
// (prerendered pages would then carry the wrong robots/noindex settings until a rebuild).
export const GET: APIRoute = () => {
  let env: string;
  let problem: string | undefined;
  try {
    env = serverEnv().SITE_ENV;
    if (env !== __SITE_ENV__) problem = 'SITE_ENV changed since the build; redeploy';
  } catch (error) {
    env = 'invalid';
    problem = 'invalid server environment; see the server log';
    // Zod messages name the variable, never its value.
    console.error('[health]', error instanceof Error ? error.message : error);
  }

  const body = { ok: !problem, commit: __BUILD_COMMIT__, env, ...(problem && { problem }) };
  return new Response(JSON.stringify(body), {
    status: problem ? 503 : 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
