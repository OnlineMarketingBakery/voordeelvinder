import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../src/content/pages/home.json' with { type: 'json' };
import thuisbatterij from '../../src/content/pages/thuisbatterij.json' with { type: 'json' };
import zonnepanelen from '../../src/content/pages/zonnepanelen.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };
import { visibleCopy } from '../../src/lib/copy';
import { visibleFaqItems } from '../../src/lib/faq';
import { overlapsFooter, pagePlaceholderProblems } from '../../src/lib/pages';
import { page, section, type Section } from '../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const heroComponent = '../../src/components/sections/Hero.astro';
const { default: Hero } = (await import(/* @vite-ignore */ heroComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

type Block<T extends Section['type']> = Extract<Section, { type: T }>;

const pages = {
  zonnepanelen: page.parse(zonnepanelen),
  thuisbatterij: page.parse(thuisbatterij),
};

const find = <T extends Section['type']>(sections: Section[], type: T) => {
  const block = sections.find((s): s is Block<T> => s.type === type);
  if (!block) throw new Error(`no ${type} block`);
  return block;
};

describe.each(Object.entries(pages))('/%s content', (product, data) => {
  const { sections } = data;

  it('has the designed block order (catalogue §4.2/§4.3)', () => {
    expect(sections.map((s) => s.type)).toEqual([
      'hero',
      'features',
      'steps',
      'benefits',
      'faq',
      'ctaBand',
    ]);
    expect(sections.every((s) => !s.hidden)).toBe(true);
  });

  it('has an SEO title without the site name (the title template adds it) and a description', () => {
    expect(data.seo.title).not.toContain(site.name);
    expect(site.seo.titleTemplate).toContain('{title}');
    expect(data.seo.description).toBeTruthy();
  });

  it('opens with the product hero, its art preset and a CTA to its own form', () => {
    const hero = find(sections, 'hero');
    expect(hero.variant).toBe('product');
    expect(hero.art.preset).toBe(product === 'zonnepanelen' ? 'solar' : 'battery');
    expect(hero.art.mascot).toMatchObject({ src: 'mascot/fox-waving', mirror: true, todo: false });
    expect(hero.cta.href).toBe(`/vergelijken/${product}`);
  });

  it('uses the product-page variants of the shared blocks', () => {
    expect(find(sections, 'features').cardStyle).toBe('solid');
    expect(find(sections, 'steps')).toMatchObject({ align: 'center', id: 'hoe-het-werkt' });
    expect(find(sections, 'benefits')).toMatchObject({
      layout: 'list',
      background: 'clouds',
      image: { src: 'mascot/fox-cheering' },
    });
    expect(find(sections, 'faq')).toMatchObject({ tone: 'white', id: 'veelgestelde-vragen' });
  });

  it('shows only the answered FAQ items (CONTENT-TODO 2.2/2.3), the answered one open', () => {
    const faq = find(sections, 'faq');
    const shown = visibleFaqItems(sections);
    expect(faq.items).toHaveLength(5);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.open).toBe(true);
  });

  it('ends with the lime CTA band that reaches into the footer, to the product form', () => {
    const band = find(sections, 'ctaBand');
    expect(sections.at(-1)).toBe(band);
    expect(band).toMatchObject({ tone: 'lime', overlapFooter: true });
    expect(band.cta.href).toBe(`/vergelijken/${product}`);
    expect(overlapsFooter(sections)).toBe(true);
  });

  it('passes the production placeholder gate', () => {
    expect(pagePlaceholderProblems(product, data)).toEqual([]);
  });
});

describe('/zonnepanelen claims waiting for sign-off', () => {
  const { sections } = pages.zonnepanelen;

  it('keeps the payback card in the file but hidden (CONTENT-TODO 1.7)', () => {
    const features = find(sections, 'features');
    const payback = features.items.find((item) => item.title === 'Snel terugverdiend');
    expect(payback).toMatchObject({ hidden: true, claim: '1.7' });
    expect(features.items.filter((item) => !item.hidden)).toHaveLength(2);
  });

  it('hides "Subsidies zijn beschikbaar." in both intros (CONTENT-TODO 1.8)', () => {
    for (const type of ['features', 'benefits'] as const) {
      const intro = find(sections, type).intro!;
      expect(intro).toContainEqual({
        text: 'Subsidies zijn beschikbaar.',
        hidden: true,
        claim: '1.8',
      });
      expect(visibleCopy(intro)).toBe(
        'Energieprijzen blijven stijgen. En met de juiste panelen verdien je je investering sneller terug dan je denkt.',
      );
    }
  });
});

describe('footer overlap', () => {
  const band = find(pages.zonnepanelen.sections, 'ctaBand');
  const [hero, ...rest] = pages.zonnepanelen.sections;

  it('is off on the homepage (its last block is the mascot CTA)', () => {
    expect(overlapsFooter(page.parse(home).sections)).toBe(false);
  });

  it('follows the last visible block', () => {
    const hiddenAfter = { ...rest[0]!, hidden: true };
    expect(overlapsFooter([hero!, band, hiddenAfter])).toBe(true);
    expect(overlapsFooter([hero!, { ...band, overlapFooter: false }])).toBe(false);
    expect(overlapsFooter([hero!, { ...band, hidden: true }])).toBe(false);
  });

  it('is only allowed on the last visible block of a page', () => {
    const faq = find(pages.zonnepanelen.sections, 'faq');
    expect(page.safeParse({ ...zonnepanelen, sections: [hero, band, faq] }).success).toBe(false);
    expect(
      page.safeParse({ ...zonnepanelen, sections: [hero, band, { ...faq, hidden: true }] }).success,
    ).toBe(true);
    // A hidden band may keep the flag: it is not rendered.
    expect(
      page.safeParse({ ...zonnepanelen, sections: [hero, { ...band, hidden: true }, faq] }).success,
    ).toBe(true);
    expect(section.safeParse({ ...band, tone: 'purple' }).success).toBe(false);
  });
});

describe('Hero title', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(Hero, { props: section.parse(value) });
  };

  it('breaks the battery h1 where the content has "\\n", with a space for assistive tech', async () => {
    const html = await render(find(pages.thuisbatterij.sections, 'hero'));
    expect(html).toMatch(
      /<h1 id="hero-title"[^>]*><span class="block"[^>]*>Sla je energie op\.<\/span><span class="block"[^>]*> Gebruik het wanneer jij wil\.<\/span><\/h1>/,
    );
  });

  it('loads the product art as the LCP image on product pages (the fox is a small SVG)', async () => {
    const html = await render(find(pages.zonnepanelen.sections, 'hero'));
    const priority = html.match(/<img [^>]*fetchpriority="high"[^>]*>/g) ?? [];
    expect(priority).toHaveLength(1);
    expect(priority[0]).not.toContain('.svg');
    expect(html).toMatch(/<img [^>]*\.svg[^>]*loading="eager"/);
  });
});
