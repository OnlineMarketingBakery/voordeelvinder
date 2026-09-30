import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { dropNoindexFromSitemap } from '../../src/integrations/sitemap-noindex';

const url = (loc: string) => `<url><loc>${loc}</loc></url>`;

describe('dropNoindexFromSitemap', () => {
  it('leaves out pages whose HTML is noindex and keeps the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vv-sitemap-'));
    for (const [path, robots] of [
      ['', ''],
      ['blog/verborgen', '<meta name="robots" content="noindex, nofollow">'],
      ['zonnepanelen', '<meta name="robots" content="index">'],
    ] as const) {
      mkdirSync(join(dir, path), { recursive: true });
      writeFileSync(join(dir, path, 'index.html'), `<html><head>${robots}</head></html>`);
    }
    const site = 'https://voordeelvinder.be';
    writeFileSync(
      join(dir, 'sitemap-0.xml'),
      `<urlset>${url(`${site}/`)}${url(`${site}/blog/verborgen/`)}${url(`${site}/zonnepanelen/`)}</urlset>`,
    );

    expect(dropNoindexFromSitemap(dir)).toEqual([`${site}/blog/verborgen/`]);
    expect(readFileSync(join(dir, 'sitemap-0.xml'), 'utf8')).toBe(
      `<urlset>${url(`${site}/`)}${url(`${site}/zonnepanelen/`)}</urlset>`,
    );
  });
});
