import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys, imageKeys } from '../../../src/lib/asset-keys';
import { productSpotlightBlock } from '../../../src/schemas/blocks/productSpotlight';
import { page, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const componentPath = '../../../src/components/sections/ProductSpotlight.astro';
const { default: ProductSpotlight } = (await import(/* @vite-ignore */ componentPath)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

type Spotlight = Extract<Section, { type: 'productSpotlight' }>;

// The JSON import types every block as one loose union; read it with its schema type.
const spotlights = home.sections.filter(
  (s) => s.type === 'productSpotlight',
) as unknown as Spotlight[];
const solar = spotlights.find((s) => s.product === 'zonnepanelen');
const battery = spotlights.find((s) => s.product === 'thuisbatterij');
if (!solar || !battery) throw new Error('home.json needs both productSpotlight blocks');

const item = { title: 'Titel', body: 'Tekst.' };
const parse = (value: unknown) => productSpotlightBlock.safeParse(value).success;

describe('productSpotlight block', () => {
  it('accepts both homepage cards, also inside the page schema', () => {
    expect(parse(solar)).toBe(true);
    expect(parse(battery)).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('has the designed homepage pair right after the comparison table', () => {
    const types = home.sections.map((s) => s.type);
    const at = types.indexOf('comparisonTable');
    expect(types.slice(at + 1, at + 3)).toEqual(['productSpotlight', 'productSpotlight']);
    expect(solar).toMatchObject({
      id: 'zonnepanelen',
      tone: 'lime',
      cta: { href: '/vergelijken/zonnepanelen' },
      image: { src: 'illustrations/spotlight-solar-lightbulb', alt: '' },
    });
    expect(battery).toMatchObject({
      id: 'thuisbatterij',
      tone: 'lavender',
      cta: { href: '/vergelijken/thuisbatterij' },
      image: { src: 'illustrations/spotlight-house-batteries', alt: '' },
    });
    expect(solar.items).toHaveLength(3);
    expect(battery.items).toHaveLength(3);
  });

  it('accepts an optional id, a hidden flag and a body with hidden claim sentences', () => {
    const body = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.6' }];
    expect(parse({ ...solar, hidden: true, body })).toBe(true);
    const { id: _id, ...withoutId } = solar;
    expect(parse(withoutId)).toBe(true);
  });

  it('rejects unknown keys on the block, the CTA, the items and the image', () => {
    expect(parse({ ...solar, intro: 'x' })).toBe(false);
    expect(parse({ ...solar, features: solar.items })).toBe(false);
    expect(parse({ ...solar, cta: { ...solar.cta, variant: 'lime' } })).toBe(false);
    expect(parse({ ...solar, items: [{ ...item, icon: 'money' }] })).toBe(false);
    expect(parse({ ...solar, image: { ...solar.image, mirror: true } })).toBe(false);
  });

  it('rejects missing or bad values', () => {
    expect(parse({ ...solar, product: 'warmtepomp' })).toBe(false);
    expect(parse({ ...solar, tone: 'purple' })).toBe(false);
    expect(parse({ ...solar, eyebrow: '' })).toBe(false);
    expect(parse({ ...solar, eyebrow: { label: 'Zonnepanelen' } })).toBe(false);
    expect(parse({ ...solar, title: '' })).toBe(false);
    expect(parse({ ...solar, id: 'Zonne Panelen' })).toBe(false);
    expect(parse({ ...solar, items: [{ ...item, body: '' }] })).toBe(false);
    expect(parse({ ...solar, image: { src: 'illustrations/missing', alt: '' } })).toBe(false);
    expect(parse({ ...solar, image: { src: solar.image.src } })).toBe(false);
    const { cta: _cta, ...withoutCta } = solar;
    expect(parse(withoutCta)).toBe(false);
  });

  it('takes 1 to 4 feature cards', () => {
    expect(parse({ ...solar, items: [] })).toBe(false);
    expect(parse({ ...solar, items: [item] })).toBe(true);
    expect(parse({ ...solar, items: [item, item, item, item] })).toBe(true);
    expect(parse({ ...solar, items: [item, item, item, item, item] })).toBe(false);
  });

  it("requires the CTA to lead to the product's own form", () => {
    const cta = (href: string) => ({ ...solar, cta: { ...solar.cta, href } });
    expect(parse(cta('/vergelijken/zonnepanelen?bron=home'))).toBe(true);
    expect(parse(cta('/vergelijken/zonnepanelen#start'))).toBe(true);
    expect(parse(cta('/vergelijken/thuisbatterij'))).toBe(false);
    expect(parse(cta('/vergelijken/zonnepanelen-extra'))).toBe(false);
    expect(parse(cta('/vergelijken'))).toBe(false);
    const result = productSpotlightBlock.safeParse(cta('/vergelijken'));
    expect(result.error?.issues[0]?.path).toEqual(['cta', 'href']);
  });

  it('only uses icons and images that exist in src/assets', () => {
    expect(iconKeys).toEqual(expect.arrayContaining(['solar-panel', 'car-battery']));
    expect(imageKeys).toEqual(expect.arrayContaining([solar.image.src, battery.image.src]));
  });
});

describe('ProductSpotlight component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(ProductSpotlight, {
      props: productSpotlightBlock.parse(value),
    });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  it('renders a labelled section with the anchor id, one h2 and an h3 per feature', async () => {
    const html = await render(solar);
    expect(html).toMatch(/<section id="zonnepanelen" aria-labelledby="zonnepanelen-title"/);
    expect(html).toMatch(/<h2 id="zonnepanelen-title"[^>]*>Betaal minder\. Produceer zelf\.<\/h2>/);
    expect(count(html, /<h2 /g)).toBe(1);
    expect(html).toMatch(/<ul role="list"[^>]*data-reveal-stagger/);
    expect(count(html, /<li /g)).toBe(3);
    expect(count(html, /<h3 /g)).toBe(3);
    for (const feature of solar.items) expect(html).toContain(feature.title);
  });

  it('puts the eyebrow in a pill, and the CTA as a link to the product form', async () => {
    const html = await render(solar);
    expect(html).toMatch(/<p [^>]*>.*Zonnepanelen/s);
    expect(html).toMatch(/<a href="\/vergelijken\/zonnepanelen"[^>]*>Bereken je besparing/);
  });

  it('reveals the card and marks it for the form-card morph without naming it', async () => {
    const html = await render(solar);
    expect(html).toMatch(/<div [^>]*data-morph="form-card"[^>]*data-reveal/);
    expect(html).not.toContain('view-transition-name');
  });

  it('shows the illustration as a lazy, decorative image', async () => {
    const html = await render(battery);
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toMatch(/<img [^>]*\balt(="")?[ >]/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
  });

  it('colours the card by tone: lime with a lime button, lavender with a purple one', async () => {
    const lime = await render(solar);
    expect(lime).toMatch(/class="[^"]*\bbg-lime-50\b[^"]*\bborder-lime-400\b/);
    expect(lime).toMatch(/<a href[^>]*class="[^"]*\bbg-lime-300\b/);
    const lavender = await render(battery);
    expect(lavender).toMatch(/class="[^"]*\bbg-lavender-100\b[^"]*\bborder-purple-500\b/);
    expect(lavender).toMatch(/<a href[^>]*class="[^"]*\bbg-purple-600\b/);
    expect(lavender).toMatch(/<section id="thuisbatterij" aria-labelledby="thuisbatterij-title"/);
  });

  it('derives the heading id from the product when there is no anchor id', async () => {
    const { id: _id, ...withoutId } = battery;
    const html = await render(withoutId);
    expect(html).toMatch(/<section aria-labelledby="spotlight-thuisbatterij-title"/);
    expect(html).toMatch(/<h2 id="spotlight-thuisbatterij-title"/);
  });

  it('leaves out hidden body sentences', async () => {
    const body = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.6' }];
    const html = await render({ ...solar, body });
    expect(html).toContain('Zichtbaar.');
    expect(html).not.toContain('Verborgen claim.');
  });
});
