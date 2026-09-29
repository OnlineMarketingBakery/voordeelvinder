import { execSync } from 'node:child_process';

import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import { parseServerEnv } from './src/server/env';

// Astro evaluates this file before it loads .env, so read it ourselves.
// Values already set in the process environment (CI) take precedence.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// Fail the build (and so the deploy, before the old process is replaced) on a bad environment.
const env = parseServerEnv({ ...fileEnv, ...process.env });

// Short commit hash of the build, reported by /api/health so a deploy can be verified.
function buildCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  site: env.PUBLIC_SITE_URL,
  // Pages are prerendered at build time; API routes opt out with `export const prerender = false`.
  output: 'static',
  adapter: node({
    mode: 'standalone',
    // Leads and newsletter sign-ups are small JSON bodies.
    bodySizeLimit: 64 * 1024,
  }),
  // No server-side sessions: the adapter would otherwise enable filesystem sessions.
  session: false,
  integrations: [react(), sitemap()],
  // Real page loads with native view transitions, never <ClientRouter /> (brief §6.1).
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  security: {
    // Nginx talks to Node over plain http and sends Host, X-Forwarded-Host, X-Forwarded-Proto
    // and X-Forwarded-For. Astro trusts the forwarded protocol and client IP only when
    // X-Forwarded-Host matches one of these hosts (see docs/ops/nginx-staging.conf).
    allowedDomains: [
      { hostname: 'voordeelvinder.onlinemarketingbakery.nl', protocol: 'https' },
      { hostname: 'voordeelvinder.be', protocol: 'https' },
      { hostname: 'www.voordeelvinder.be', protocol: 'https' },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_COMMIT__: JSON.stringify(buildCommit()),
      __SITE_ENV__: JSON.stringify(env.SITE_ENV),
    },
  },
});
