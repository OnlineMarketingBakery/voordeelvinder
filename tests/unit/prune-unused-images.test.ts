import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { pruneUnusedImages } from '../../src/integrations/prune-unused-images';

describe('pruneUnusedImages', () => {
  it('keeps images a page, stylesheet or script references and deletes the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vv-prune-'));
    mkdirSync(join(dir, '_astro'));
    for (const name of ['used.a1.webp', 'masked.b2.png', 'placeholder.c3.png', 'app.d4.js']) {
      writeFileSync(join(dir, '_astro', name), '');
    }
    writeFileSync(join(dir, 'index.html'), '<img src="/_astro/used.a1.webp">');
    writeFileSync(join(dir, '_astro', 'style.css'), '.i{mask:url(/_astro/masked.b2.png)}');

    expect(pruneUnusedImages(dir)).toEqual(['placeholder.c3.png']);
    expect(existsSync(join(dir, '_astro', 'used.a1.webp'))).toBe(true);
    expect(existsSync(join(dir, '_astro', 'masked.b2.png'))).toBe(true);
    expect(existsSync(join(dir, '_astro', 'app.d4.js'))).toBe(true);
    expect(existsSync(join(dir, '_astro', 'placeholder.c3.png'))).toBe(false);
  });

  it('keeps the original of a used transformed image, for the image endpoint', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vv-prune-'));
    mkdirSync(join(dir, '_astro'));
    const names = [
      'fox.Ab_c1234.png',
      'fox.Ab_c1234_Zx9.webp',
      'fox.Ab_c1234_Qq1.avif',
      'old.e5.png',
    ];
    for (const name of names) writeFileSync(join(dir, '_astro', name), '');
    writeFileSync(join(dir, 'index.html'), '<img src="/_astro/fox.Ab_c1234_Zx9.webp">');

    expect(pruneUnusedImages(dir).sort()).toEqual(['fox.Ab_c1234_Qq1.avif', 'old.e5.png']);
    expect(existsSync(join(dir, '_astro', 'fox.Ab_c1234.png'))).toBe(true);
  });
});
