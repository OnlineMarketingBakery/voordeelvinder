import type { APIRoute } from 'astro';

import { loadFormContent } from '../../lib/form-content';
import { serverEnv } from '../../server/env';
import { clientAddressOf, methodNotAllowed } from '../../server/http';
import { createLeadHandler } from '../../server/lead/handler';
import { createRateLimiter } from '../../server/lead/rate-limit';

export const prerender = false;

// The lead endpoint (brief §9.1); the pipeline lives in src/server/lead/handler.ts. Created on
// the first request, so the rate limiter lives as long as the process.
let handler: ReturnType<typeof createLeadHandler> | undefined;

function leadHandler() {
  if (!handler) {
    const env = serverEnv();
    // The flows are part of the build; load and resolve them once.
    let flows: ReturnType<typeof loadFormContent> | undefined;
    handler = createLeadHandler({
      env,
      flows: async () => (await (flows ??= loadFormContent())).flows,
      limiter: createRateLimiter({ limit: env.RATE_LIMIT_PER_HOUR }),
    });
  }
  return handler;
}

export const POST: APIRoute = (context) =>
  leadHandler()({ request: context.request, clientAddress: clientAddressOf(context) });

export const ALL: APIRoute = () => methodNotAllowed();
