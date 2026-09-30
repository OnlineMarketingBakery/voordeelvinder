import type { APIRoute } from 'astro';

import { serverEnv } from '../../server/env';
import { clientAddressOf, methodNotAllowed } from '../../server/http';
import { createRateLimiter } from '../../server/lead/rate-limit';
import { createNewsletterHandler } from '../../server/newsletter';

export const prerender = false;

// The footer's newsletter sign-up (brief §5, §9.1); see src/server/newsletter.ts. Its own rate
// limiter with the same limit as the lead endpoint.
let handler: ReturnType<typeof createNewsletterHandler> | undefined;

function newsletterHandler() {
  if (!handler) {
    const env = serverEnv();
    handler = createNewsletterHandler({
      env,
      limiter: createRateLimiter({ limit: env.RATE_LIMIT_PER_HOUR }),
    });
  }
  return handler;
}

export const POST: APIRoute = (context) =>
  newsletterHandler()({ request: context.request, clientAddress: clientAddressOf(context) });

export const ALL: APIRoute = () => methodNotAllowed();
