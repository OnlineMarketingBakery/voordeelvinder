import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys } from '../../../src/lib/asset-keys';
import { benefitIcons, benefitsBlock } from '../../../src/schemas/blocks/benefits';
import { page, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const benefitsComponent = '../../../src/components/sections/Benefits.astro';
const { default: Benefits } = (await import(/* @vite-ignore */ benefitsComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

// The JSON import types every block as one loose union; read it with its schema type.
const homeBenefits = home.sections.find((s) => s.type === 'benefits') as unknown as
  Extract<Section, { type: 'benefits' }> | undefined;
if (!homeBenefits) throw new Error('home.json has no benefits block');

// The product-page layout (zonnepanelen, Figma 69:1304): clouds, stacked cards with coloured
// tiles, an intro with a hidden claim sentence (1.8), no eyebrow or CTA.
const productBenefits = {
  type: 'benefits',
  layout: 'list',
  background: 'clouds',
  title: 'Wat je van ons mag verwachten',
  intro: ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.8' }],
  image: { src: 'mascot/fox-cheering', alt: '' },
  items: [
    { icon: 'advice', tone: 'purple', title: 'Een', body: 'Eerste.' },
    { icon: 'label', tone: 'lime', title: 'Twee', body: 'Tweede.' },
    { icon: 'book', tone: 'purple', title: 'Drie', body: 'Derde.' },
    { icon: 'check', tone: 'lime', title: 'Vier', body: 'Vierde.' },
  ],
};

const item = { icon: 'eye', title: 'Titel', body: 'Tekst.' };
const parse = (value: unknown) => benefitsBlock.safeParse(value).success;

describe('benefits block', () => {
  it('accepts the homepage content, inside the page schema too', () => {
    const result = benefitsBlock.safeParse(homeBenefits);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      layout: 'grid',
      cta: { label: 'Vergelijk nu gratis', href: '/vergelijken' },
      image: { src: 'mascot/fox-euro-documents', alt: '' },
    });
    expect(result.data?.items.map((i) => i.icon)).toEqual(['eye', 'rocket', 'charity', 'fist']);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('accepts the product-page list layout with clouds and hidden sentences', () => {
    expect(parse(productBenefits)).toBe(true);
  });

  it('rejects unknown keys on the block and on items', () => {
    expect(parse({ ...homeBenefits, decoration: 'clouds' })).toBe(false);
    expect(parse({ ...homeBenefits, items: [item, { ...item, accent: 'lime' }] })).toBe(false);
    expect(parse({ ...homeBenefits, image: { src: 'mascot/fox-cheering', alt: '', w: 1 } })).toBe(
      false,
    );
  });

  it('rejects bad values', () => {
    const bad = [
      { layout: 'columns' },
      { layout: undefined },
      { background: 'none' },
      { title: '' },
      { eyebrow: '' },
      { id: 'Waarom Wij' },
      { cta: { label: 'Vergelijk', href: 'https://example.com' } },
      { image: { src: 'mascot/unknown', alt: '' } },
      { image: undefined },
      { items: [item, { ...item, icon: 'money' }] },
      { items: [item, { ...item, claim: 'one' }] },
      { items: [item, { ...item, body: '' }] },
    ];
    for (const change of bad) {
      expect(parse({ ...homeBenefits, ...change }), JSON.stringify(change)).toBe(false);
    }
  });

  it('needs 2 to 6 visible cards; hidden cards do not count', () => {
    const cards = (visible: number, hidden = 0) => [
      ...Array.from({ length: visible }, () => item),
      ...Array.from({ length: hidden }, () => ({ ...item, hidden: true, claim: '1.1' })),
    ];
    expect(parse({ ...homeBenefits, items: cards(2) })).toBe(true);
    expect(parse({ ...homeBenefits, items: cards(6, 2) })).toBe(true);
    expect(parse({ ...homeBenefits, items: cards(1) })).toBe(false);
    expect(parse({ ...homeBenefits, items: cards(1, 3) })).toBe(false);
    expect(parse({ ...homeBenefits, items: cards(7) })).toBe(false);
  });

  it('needs a tile tone on every list item, and none on grid items', () => {
    const [first, ...rest] = productBenefits.items;
    const { tone: _tone, ...untoned } = first!;
    expect(parse({ ...productBenefits, items: [untoned, ...rest] })).toBe(false);
    expect(parse({ ...homeBenefits, items: [item, { ...item, tone: 'lime' }] })).toBe(false);
    expect(parse({ ...productBenefits, items: [{ ...first, tone: 'lavender' }, ...rest] })).toBe(
      false,
    );
  });

  it('only offers icons that exist in src/assets/icons', () => {
    expect(iconKeys).toEqual(expect.arrayContaining([...benefitIcons]));
  });
});

describe('Benefits component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(Benefits, { props: benefitsBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  it('renders the home grid as a labelled section: pill, h2, intro, CTA and four h3 cards', async () => {
    const html = await render(homeBenefits);
    const headingId = 'benefits-waarom-kiezen-voor-voordeelvinder-title';
    expect(html).toMatch(new RegExp(`<section aria-labelledby="${headingId}"`));
    expect(html).toMatch(
      new RegExp(`<h2 id="${headingId}"[^>]*>Waarom kiezen voor VoordeelVinder\\?</h2>`),
    );
    expect(html).toContain('Waarom voor ons kiezen?');
    expect(html).toContain(homeBenefits.intro);
    expect(html).toMatch(/<a href="\/vergelijken"[^>]*>Vergelijk nu gratis/);
    expect(html).toMatch(/<ul role="list"[^>]*data-reveal-stagger/);
    expect(count(html, /<li /g)).toBe(4);
    expect(count(html, /<h3 /g)).toBe(4);
    for (const card of homeBenefits.items) {
      expect(html).toMatch(new RegExp(`<h3 [^>]*>${card.title}</h3>`));
      expect(html).toContain(card.body);
    }
    // The header reveals as one group; the art reveals (and pops) on its own.
    expect(count(html, /data-reveal(?!-)/g)).toBe(2);
  });

  it('draws the mascot and the energy pattern as lazy, decorative images', async () => {
    const html = await render(homeBenefits);
    expect(count(html, /<img /g)).toBe(2);
    expect(count(html, /<img [^>]*\balt(="")?[ >]/g)).toBe(2);
    expect(count(html, /<img [^>]*loading="lazy"/g)).toBe(2);
    expect(html).not.toContain('clouds-purple-fade');
  });

  it('uses an anchor id from content for the section and the heading', async () => {
    const html = await render({ ...homeBenefits, id: 'waarom-wij' });
    expect(html).toMatch(/<section id="waarom-wij" aria-labelledby="waarom-wij-title"/);
    expect(html).toMatch(/<h2 id="waarom-wij-title"/);
  });

  it('leaves out hidden cards', async () => {
    const items = [
      ...homeBenefits.items.slice(0, 3),
      { ...item, title: 'Verborgen', hidden: true },
    ];
    const html = await render({ ...homeBenefits, items });
    expect(count(html, /<li /g)).toBe(3);
    expect(html).not.toContain('Verborgen');
  });

  it('renders the list layout on clouds with purple and lime tiles, without a CTA', async () => {
    const html = await render(productBenefits);
    expect(html).toContain('clouds-purple-fade');
    expect(html).not.toContain('<a ');
    expect(count(html, /<li /g)).toBe(4);
    expect(count(html, /bg-purple-600 text-white/g)).toBe(2);
    expect(count(html, /bg-lime-400 text-ink-900/g)).toBe(2);
    expect(html).toContain('Zichtbaar.');
    expect(html).not.toContain('Verborgen claim.');
  });
});
