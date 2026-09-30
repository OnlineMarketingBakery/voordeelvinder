import { describe, expect, it } from 'vitest';

import home from '../../src/content/pages/home.json' with { type: 'json' };
import thuisbatterij from '../../src/content/pages/thuisbatterij.json' with { type: 'json' };
import zonnepanelen from '../../src/content/pages/zonnepanelen.json' with { type: 'json' };
import { compareHref, landingBasePage, landingSections, withQuery } from '../../src/lib/landing';
import { pagePlaceholderProblems } from '../../src/lib/pages';
import { inSitemap } from '../../src/lib/seo/indexing';
import { landing, landingProducts, type LandingData } from '../../src/schemas/landing';
import { page, type Section } from '../../src/schemas/page';

// A test fixture only: no campaign copy exists, so no variant ships (never invent copy).
const fixture = {
  product: 'zonnepanelen',
  title: 'Testkop',
  subtitle: 'Testtekst.',
  seo: { title: 'Testvariant' },
};

const pages = {
  home: page.parse(home),
  zonnepanelen: page.parse(zonnepanelen),
  thuisbatterij: page.parse(thuisbatterij),
} as Record<string, { sections: Section[] }>;

const compose = (data: LandingData) => {
  const base = pages[landingBasePage[data.product]]!;
  return landingSections(data, base.sections);
};

/** Every href in a value, however deeply nested. */
const hrefs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(hrefs);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      key === 'href' && typeof item === 'string' ? [item] : hrefs(item),
    );
  }
  return [];
};

describe('landing frontmatter schema', () => {
  it('accepts a minimal variant and the optional fields', () => {
    expect(landing.safeParse(fixture).success).toBe(true);
    expect(
      landing.safeParse({
        ...fixture,
        product: 'energie',
        title: 'Regel een\nRegel twee',
        subtitle: ['Eerste zin.', { text: 'Een claim.', hidden: true, claim: '1.8' }],
        cta: 'Start',
        heroImage: {
          product: { src: 'illustrations/hero-solar-battery', alt: '' },
          mascot: { src: 'mascot/fox-waving', alt: '', mirror: true },
        },
        seo: { title: 'Test', description: 'Omschrijving.' },
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown product, unknown keys and missing copy', () => {
    expect(landing.safeParse({ ...fixture, product: 'warmtepomp' }).success).toBe(false);
    expect(landing.safeParse({ ...fixture, headline: 'x' }).success).toBe(false);
    expect(landing.safeParse({ ...fixture, seo: { title: 'x', noindex: false } }).success).toBe(
      false,
    );
    expect(landing.safeParse({ ...fixture, title: '' }).success).toBe(false);
    const { seo: _seo, ...withoutSeo } = fixture;
    expect(landing.safeParse(withoutSeo).success).toBe(false);
  });

  it('rejects unknown image keys', () => {
    expect(
      landing.safeParse({ ...fixture, heroImage: { product: { src: 'nope', alt: '' } } }).success,
    ).toBe(false);
  });
});

describe('landing CTA href', () => {
  it('preselects the product in the form', () => {
    expect(landingProducts.map(compareHref)).toEqual([
      '/vergelijken/energie',
      '/vergelijken/zonnepanelen',
      '/vergelijken/thuisbatterij',
    ]);
  });

  it('carries over the landing query string (utm and click ids)', () => {
    expect(
      withQuery('/vergelijken/energie', '?utm_source=meta&utm_campaign=zomer&fbclid=IwAR1-_x'),
    ).toBe('/vergelijken/energie?utm_source=meta&utm_campaign=zomer&fbclid=IwAR1-_x');
    expect(withQuery('/vergelijken/zonnepanelen', 'gclid=abc')).toBe(
      '/vergelijken/zonnepanelen?gclid=abc',
    );
  });

  it('leaves the link alone without a query string', () => {
    expect(withQuery('/vergelijken/energie', '')).toBe('/vergelijken/energie');
    expect(withQuery('/vergelijken/energie', '?')).toBe('/vergelijken/energie');
  });

  it("keeps the link's own parameters and hash; its own values win", () => {
    expect(withQuery('/vergelijken/energie?energie=both#start', '?energie=gas&utm_source=x')).toBe(
      '/vergelijken/energie?energie=both&utm_source=x#start',
    );
  });

  it('keeps repeated parameters and encodes values safely', () => {
    expect(withQuery('/vergelijken/energie', '?utm_term=a&utm_term=b')).toBe(
      '/vergelijken/energie?utm_term=a&utm_term=b',
    );
    expect(withQuery('/vergelijken/energie', '?utm_content=zomer%20actie%26co')).toBe(
      '/vergelijken/energie?utm_content=zomer+actie%26co',
    );
  });
});

describe('landing page composition', () => {
  it.each(landingProducts)('%s: a valid page with the variant hero first', (product) => {
    const sections = compose(landing.parse({ ...fixture, product }));
    expect(page.safeParse({ seo: fixture.seo, sections }).success).toBe(true);

    const [hero, ...rest] = sections;
    expect(hero).toMatchObject({
      type: 'hero',
      title: fixture.title,
      body: fixture.subtitle,
      cta: { href: `/vergelijken/${product}` },
    });
    // Then the product page's own sections, in their order.
    const base = pages[landingBasePage[product]]!.sections;
    expect(rest.map((s) => s.type)).toEqual(base.slice(1).map((s) => s.type));
  });

  it('energie reuses the home hero without the eyebrow, USP bar and social proof', () => {
    const [hero] = compose(landing.parse({ ...fixture, product: 'energie' }));
    if (hero?.type !== 'hero') throw new Error('no hero');
    expect(hero.variant).toBe('home');
    expect(hero.art.preset).toBe('home');
    expect(hero.eyebrow).toBeUndefined();
    expect(hero.usps).toBeUndefined();
    expect(hero.socialProof).toBeUndefined();
  });

  it('product variants reuse the product hero and its art', () => {
    const [hero] = compose(landing.parse({ ...fixture, product: 'thuisbatterij' }));
    if (hero?.type !== 'hero') throw new Error('no hero');
    expect(hero).toMatchObject({ variant: 'product', art: { preset: 'battery' } });
  });

  it("uses the product page's CTA label unless the variant sets one", () => {
    const [plain] = compose(landing.parse(fixture));
    const [own] = compose(landing.parse({ ...fixture, cta: 'Eigen label' }));
    const base = pages.zonnepanelen!.sections[0];
    if (plain?.type !== 'hero' || own?.type !== 'hero' || base?.type !== 'hero') {
      throw new Error('no hero');
    }
    expect(plain.cta.label).toBe(base.cta.label);
    expect(own.cta.label).toBe('Eigen label');
  });

  it('leads every CTA to the form to the preselected product', () => {
    const sections = compose(landing.parse({ ...fixture, product: 'energie' }));
    const links = hrefs(sections);
    expect(links).toContain('/vergelijken/energie');
    expect(links).not.toContain('/vergelijken');
    // The homepage's own content is not touched.
    expect(hrefs(pages.home!.sections)).toContain('/vergelijken');
  });

  it('inherits a placeholder hero image unless the variant replaces it', () => {
    const base = structuredClone(pages.zonnepanelen!.sections);
    const baseHero = base[0];
    if (baseHero?.type !== 'hero') throw new Error('no hero');
    baseHero.art.mascot.todo = true;
    const data = landing.parse(fixture);
    const problems = (sections: Section[]) =>
      pagePlaceholderProblems('landing/test', { seo: fixture.seo, sections });

    expect(problems(landingSections(data, base))).toHaveLength(1);
    const ownMascot = { src: 'mascot/fox-waving', alt: '', mirror: true } as const;
    expect(problems(landingSections({ ...data, heroImage: { mascot: ownMascot } }, base))).toEqual(
      [],
    );
  });
});

describe('landing variants and search engines', () => {
  it('keeps /l/* (noindex) and the styleguide out of the sitemap', () => {
    expect(inSitemap('/')).toBe(true);
    expect(inSitemap('/zonnepanelen/')).toBe(true);
    expect(inSitemap('/l/zomer/')).toBe(false);
    expect(inSitemap('/l/')).toBe(false);
    expect(inSitemap('/styleguide/')).toBe(false);
    expect(inSitemap('/lente/')).toBe(true);
  });
});
