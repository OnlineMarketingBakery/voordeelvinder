// @ts-check
import { execSync } from 'node:child_process';

import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Astro evaluates this file before it loads .env, so read it ourselves.
// Values already set in the process environment (CI) take precedence.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const env = { ...fileEnv, ...process.env };

const site = env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Short commit hash of the build, reported by /api/health so a deploy can be verified.
function buildCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  site,
  // Pages are prerendered at build time; API routes opt out with `export const prerender = false`.
  output: 'static',
  adapter: node({
    mode: 'standalone',
    // Leads and newsletter sign-ups are small JSON bodies.
    bodySizeLimit: 64 * 1024,
  }),
  // No server-side sessions: the adapter would otherwise enable filesystem sessions.
  session: false,
  integrations: [react()],
  // Real page loads with native view transitions, never <ClientRouter /> (brief §6.1).
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  security: {
    // Nginx forwards the public host and protocol; only trust our own domains.
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
    },
  },
});
