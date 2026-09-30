import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import home from '../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys, imageKeys } from '../../src/lib/asset-keys';
import { allIconKeys, allImageKeys } from '../../src/lib/assets';
import { visibleCopy } from '../../src/lib/copy';
import { pagePlaceholderProblems, type PageData } from '../../src/lib/pages';
import { page } from '../../src/schemas/page';

describe('copy with hidden claims', () => {
  it('leaves hidden sentences out and joins the rest', () => {
    expect(visibleCopy('Gewoon tekst.')).toBe('Gewoon tekst.');
    expect(
      visibleCopy([
        'Energieprijzen blijven stijgen.',
        { text: 'Subsidies zijn beschikbaar.', hidden: true, claim: '1.8' },
        'En met de juiste panelen verdien je je investering sneller terug.',
      ]),
    ).toBe(
      'Energieprijzen blijven stijgen. En met de juiste panelen verdien je je investering sneller terug.',
    );
  });
});

describe('page schema', () => {
  it('accepts the homepage content', () => {
    expect(page.safeParse(home).success).toBe(true);
  });

  it('requires exactly one hero, as the first block', () => {
    const hero = home.sections[0]!;
    expect(page.safeParse({ ...home, sections: [] }).success).toBe(false);
    expect(page.safeParse({ ...home, sections: [hero, hero] }).success).toBe(false);
    expect(page.safeParse({ ...home, sections: [{ ...hero, hidden: true }] }).success).toBe(false);
  });

  it('reserves the generated block ids (<type>-<n>) that Sections.astro gives blocks without one', () => {
    const [hero, ...rest] = home.sections;
    expect(
      page.safeParse({ ...home, sections: [{ ...hero, id: 'steps-3' }, ...rest] }).success,
    ).toBe(false);
    expect(page.safeParse({ ...home, sections: [{ ...hero, id: 'intro' }, ...rest] }).success).toBe(
      true,
    );
  });

  it('pairs the hero variant with its art preset', () => {
    const hero = home.sections[0]!;
    const withPreset = (variant: string, preset: string) => ({
      ...home,
      sections: [{ ...hero, variant, art: { ...hero.art, preset } }],
    });
    expect(page.safeParse(withPreset('home', 'solar')).success).toBe(false);
    const {
      eyebrow: _e,
      usps: _u,
      socialProof: _s,
      ...productHero
    } = hero as Record<string, unknown>;
    const product = (preset: string) => ({
      ...home,
      sections: [{ ...productHero, variant: 'product', art: { ...hero.art, preset } }],
    });
    expect(page.safeParse(product('home')).success).toBe(false);
    expect(page.safeParse(product('battery')).success).toBe(true);
  });

  it('rejects unknown keys, unknown images and home-only fields on a product hero', () => {
    const hero = home.sections[0]!;
    expect(page.safeParse({ ...home, sections: [{ ...hero, subtitle: 'x' }] }).success).toBe(false);
    const badImage = { ...hero, art: { ...hero.art, product: { src: 'nope/missing', alt: '' } } };
    expect(page.safeParse({ ...home, sections: [badImage] }).success).toBe(false);
    const productWithEyebrow = { ...hero, variant: 'product' };
    expect(page.safeParse({ ...home, sections: [productWithEyebrow] }).success).toBe(false);
  });
});

describe('assets', () => {
  it('lists every image and icon a content file may use', () => {
    expect(imageKeys).toContain('mascot/fox-waving');
    expect(imageKeys).toContain('illustrations/hero-solar-battery');
    expect(iconKeys).toEqual(
      expect.arrayContaining(['no-call', 'eye-off', 'file-check', 'contract']),
    );
  });

  it('validates the same keys the components resolve', () => {
    expect(imageKeys).toEqual(allImageKeys);
    expect(iconKeys).toEqual(allIconKeys);
  });

  it('keeps a viewBox on every SVG, so it scales', () => {
    const svgs = readdirSync('src/assets', { recursive: true, encoding: 'utf8' }).filter((file) =>
      file.endsWith('.svg'),
    );
    expect(svgs.length).toBeGreaterThan(0);
    for (const file of svgs) {
      const root = readFileSync(join('src/assets', file), 'utf8').match(/<svg\b[^>]*>/)?.[0];
      expect(root, file).toMatch(/\bviewBox=/);
    }
  });
});

describe('production gate', () => {
  it("passes the homepage (the design's hero image is approved, CONTENT-TODO 1.9)", () => {
    const data = page.parse(home) as PageData;
    expect(pagePlaceholderProblems('home', data)).toEqual([]);
  });

  it('flags a hero image marked todo', () => {
    const data = page.parse(home) as PageData;
    const hero = data.sections[0]!;
    if (hero.type !== 'hero') throw new Error('hero expected');
    const pending = {
      ...data,
      sections: [{ ...hero, art: { ...hero.art, mascot: { ...hero.art.mascot, todo: true } } }],
    } as PageData;
    expect(pagePlaceholderProblems('home', pending)).toEqual([
      'home: hero image "mascot/fox-thumbsup-with-price" is a placeholder',
    ]);
  });
});
