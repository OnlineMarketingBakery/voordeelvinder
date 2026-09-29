import { describe, expect, it } from 'vitest';

import { isIndexable, robotsTxt } from '../../src/lib/seo/indexing';

const site = new URL('https://voordeelvinder.be');

describe('robots.txt', () => {
  it.each(['local', 'ci', 'staging'] as const)('disallows everything on %s', (siteEnv) => {
    expect(isIndexable(siteEnv)).toBe(false);
    expect(robotsTxt(siteEnv, site)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('allows crawling and points to the sitemap on production', () => {
    expect(isIndexable('production')).toBe(true);
    expect(robotsTxt('production', site)).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://voordeelvinder.be/sitemap-index.xml\n',
    );
  });
});
