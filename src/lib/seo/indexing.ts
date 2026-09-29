// Search-engine indexing per environment (brief §4.5, §11): only production is indexable.
import type { SiteEnv } from '../../server/env';

export function isIndexable(siteEnv: SiteEnv): boolean {
  return siteEnv === 'production';
}

export function robotsTxt(siteEnv: SiteEnv, site: URL): string {
  if (!isIndexable(siteEnv)) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`;
}
