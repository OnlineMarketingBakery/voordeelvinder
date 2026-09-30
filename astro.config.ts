import { execSync } from 'node:child_process';

import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';
import { defineConfig, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';

import { pruneUnusedImagesIntegration } from './src/integrations/prune-unused-images';
import { parseServerEnv, type SiteEnv } from './src/server/env';

/** Internal token/component overview at /styleguide. Never part of a production build. */
function styleguide(siteEnv: SiteEnv): AstroIntegration {
  return {
    name: 'voordeelvinder:styleguide',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (siteEnv === 'production') return;
        injectRoute({ pattern: '/styleguide', entrypoint: './src/styleguide/index.astro' });
      },
    },
  };
}

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
  integrations: [
    react(),
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/styleguide') }),
    styleguide(env.SITE_ENV),
    pruneUnusedImagesIntegration(),
  ],
  // Bricolage Grotesque (SIL OFL 1.1), self-hosted from the installed Fontsource package; no
  // network at build time. The wght-only file matches Figma, which pins opsz at its default 14.
  // Only the Latin subset: it covers Dutch and French. Astro generates metric-matched fallbacks
  // to keep layout shift down while the font loads.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: [
              '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
            ],
            weight: '200 800',
            style: 'normal',
            display: 'swap',
            unicodeRange: [
              'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
            ],
          },
        ],
      },
    },
  ],
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
