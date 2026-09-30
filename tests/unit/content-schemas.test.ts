import { describe, expect, it } from 'vitest';

import home from '../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys, imageKeys } from '../../src/lib/asset-keys';
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
});

describe('production gate', () => {
  it('flags the €52 hero image as a placeholder', () => {
    const data = page.parse(home) as PageData;
    expect(pagePlaceholderProblems('home', data)).toEqual([
      'home: hero image "mascot/fox-thumbsup-with-price" is a placeholder',
    ]);
  });

  it('passes once the production-safe fox is used', () => {
    const data = page.parse(home) as PageData;
    const hero = data.sections[0]!;
    if (hero.type !== 'hero') throw new Error('hero expected');
    const safe = {
      ...data,
      sections: [
        {
          ...hero,
          art: {
            ...hero.art,
            mascot: { src: 'mascot/fox-waving', alt: '', mirror: true, todo: false },
          },
        },
      ],
    } as PageData;
    expect(pagePlaceholderProblems('home', safe)).toEqual([]);
  });
});
