// Keeps noindex pages out of the sitemap. The sitemap integration filters by path only, but a
// page can also opt out in its content (`seo.noindex` on a page, post or legal text): listing it
// would make Search Console report "Submitted URL marked noindex". After the build, drop every
// sitemap entry whose HTML carries a noindex robots tag. Production only: on other environments
// every page is noindex and robots.txt disallows crawling anyway.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

import type { SiteEnv } from '../server/env';

const NOINDEX = /<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i;

/** The built HTML file for a sitemap URL (`/zonnepanelen/` → zonnepanelen/index.html). */
function htmlFile(clientDir: string, loc: string): string {
  const path = decodeURIComponent(new URL(loc).pathname);
  return path.endsWith('/') ? join(clientDir, path, 'index.html') : join(clientDir, `${path}.html`);
}

/** Removes noindex pages from the sitemap files in `clientDir`; returns the removed URLs. */
export function dropNoindexFromSitemap(clientDir: string): string[] {
  const removed: string[] = [];
  const sitemaps = readdirSync(clientDir).filter((file) => /^sitemap-\d+\.xml$/.test(file));
  for (const file of sitemaps) {
    const path = join(clientDir, file);
    const xml = readFileSync(path, 'utf8');
    const next = xml.replace(
      /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g,
      (entry, loc: string) => {
        const html = htmlFile(clientDir, loc);
        if (!existsSync(html) || !NOINDEX.test(readFileSync(html, 'utf8'))) return entry;
        removed.push(loc);
        return '';
      },
    );
    if (next !== xml) writeFileSync(path, next);
  }
  return removed;
}

export function sitemapNoindexIntegration(siteEnv: SiteEnv): AstroIntegration {
  return {
    name: 'voordeelvinder:sitemap-noindex',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (siteEnv !== 'production') return;
        const removed = dropNoindexFromSitemap(fileURLToPath(dir));
        if (removed.length > 0)
          logger.info(`Left ${removed.length} noindex page(s) out of the sitemap`);
      },
    },
  };
}
