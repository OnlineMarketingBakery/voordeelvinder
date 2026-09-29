import type { APIRoute } from 'astro';

import { robotsTxt } from '../lib/seo/indexing';

// Prerendered at build time for the environment of that build.
export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('`site` must be set in astro.config.ts');
  return new Response(robotsTxt(__SITE_ENV__, site), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
