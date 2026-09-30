import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys, imageKeys } from '../../../src/lib/asset-keys';
import { stepIcons, stepsBlock } from '../../../src/schemas/blocks/steps';
import { page, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const stepsComponent = '../../../src/components/sections/Steps.astro';
const { default: Steps } = (await import(/* @vite-ignore */ stepsComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

// The JSON import types every block as one loose union; read it with its schema type.
const homeSteps = home.sections.find((s) => s.type === 'steps') as unknown as
  Extract<Section, { type: 'steps' }> | undefined;
if (!homeSteps) throw new Error('home.json has no steps block');

// The product-page layout (zonnepanelen, Figma 69:938): centred header, no mascot, no chip.
const productSteps = {
  type: 'steps',
  id: 'hoe-het-werkt',
  align: 'center',
  title: 'Zo werkt het',
  intro: 'Van je eerste klik tot een helder resultaat: een paar minuten. Niet meer.',
  items: [
    { label: 'Stap 01', tone: 'purple', icon: 'contract', title: 'Een', body: 'Eerste stap.' },
    { label: 'Stap 02', tone: 'lime', icon: 'compare', title: 'Twee', body: 'Tweede stap.' },
    { label: 'Stap 03', tone: 'purple', icon: 'decision-making', title: 'Drie', body: 'Derde.' },
  ],
};

const item = productSteps.items[0]!;
const parse = (value: unknown) => stepsBlock.safeParse(value).success;

describe('steps block', () => {
  it('accepts the homepage content: start layout, mascot and highlight', () => {
    const result = stepsBlock.safeParse(homeSteps);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: 'hoe-het-werkt',
      align: 'start',
      highlight: 'energiecontract',
      mascot: { src: 'mascot/fox-magnifier', alt: '' },
    });
    expect(result.data?.items).toHaveLength(3);
  });

  it('accepts the product-page layout without a mascot', () => {
    expect(parse(productSteps)).toBe(true);
    expect(parse({ ...productSteps, intro: undefined, id: undefined })).toBe(true);
  });

  it('is part of the page schema', () => {
    expect(page.safeParse(home).success).toBe(true);
    expect(home.sections.map((s) => s.type)).toContain('steps');
  });

  it('rejects unknown keys on the block and on its items', () => {
    expect(parse({ ...productSteps, subtitle: 'x' })).toBe(false);
    expect(parse({ ...productSteps, steps: productSteps.items })).toBe(false);
    expect(parse({ ...productSteps, items: [{ ...item, number: 1 }, item] })).toBe(false);
    expect(parse({ ...homeSteps, mascot: { ...homeSteps.mascot, mirror: true } })).toBe(false);
  });

  it('rejects bad values', () => {
    expect(parse({ ...productSteps, align: 'left' })).toBe(false);
    expect(parse({ ...productSteps, id: 'Hoe het werkt' })).toBe(false);
    expect(parse({ ...productSteps, title: '' })).toBe(false);
    expect(parse({ ...productSteps, items: [{ ...item, icon: 'money' }, item] })).toBe(false);
    expect(parse({ ...productSteps, items: [{ ...item, tone: 'lavender' }, item] })).toBe(false);
    expect(parse({ ...productSteps, items: [{ ...item, body: '' }, item] })).toBe(false);
    expect(parse({ ...homeSteps, mascot: { src: 'mascot/missing', alt: '' } })).toBe(false);
    expect(parse({ ...homeSteps, mascot: { src: 'mascot/fox-magnifier' } })).toBe(false);
  });

  it('takes 2 to 4 steps', () => {
    expect(parse({ ...productSteps, items: [item] })).toBe(false);
    expect(parse({ ...productSteps, items: [item, item] })).toBe(true);
    expect(parse({ ...productSteps, items: [item, item, item, item] })).toBe(true);
    expect(parse({ ...productSteps, items: [item, item, item, item, item] })).toBe(false);
  });

  it('requires the highlight to be part of the title', () => {
    expect(parse({ ...homeSteps, highlight: 'zonnepanelen' })).toBe(false);
    expect(parse({ ...productSteps, highlight: 'werkt' })).toBe(true);
  });

  it('only allows the mascot on the start layout', () => {
    expect(parse({ ...homeSteps, align: 'center' })).toBe(false);
    const { mascot: _mascot, ...withoutMascot } = homeSteps;
    expect(parse({ ...withoutMascot, align: 'center' })).toBe(true);
  });

  it('keeps hidden steps blocks valid', () => {
    expect(parse({ ...productSteps, hidden: true })).toBe(true);
    expect(parse({ ...productSteps, hidden: 'yes' })).toBe(false);
  });

  it('only uses icons and images that exist in src/assets', () => {
    expect(iconKeys).toEqual(expect.arrayContaining([...stepIcons]));
    expect(imageKeys).toContain('mascot/fox-magnifier');
  });
});

describe('Steps component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(Steps, { props: stepsBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  it('renders the home steps as a labelled section with an ordered list', async () => {
    const html = await render(homeSteps);
    expect(html).toMatch(/<section id="hoe-het-werkt" aria-labelledby="hoe-het-werkt-title"/);
    expect(html).toMatch(/<h2 id="hoe-het-werkt-title"[^>]*>Zo werkt het vergelijken van je <span/);
    expect(html).toMatch(/<span class="[^"]*bg-lime-300[^"]*"[^>]*>energiecontract<\/span>/);
    expect(html).toMatch(/<ol role="list"[^>]*data-reveal-stagger/);
    expect(count(html, /<li /g)).toBe(3);
    expect(count(html, /<h3 /g)).toBe(3);
    for (const step of homeSteps.items ?? []) {
      expect(html).toMatch(new RegExp(`<p [^>]*>${step.label}</p>`));
      expect(html).toContain(step.title);
    }
  });

  it('shows the mascot as a lazy, decorative image breaking out above the panel', async () => {
    const html = await render(homeSteps);
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toMatch(/<img [^>]*\balt(="")?[ >]/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
    expect(html).toMatch(/<section [^>]*class="[^"]*\bpt-10\b/);
  });

  it('centres the product-page header, without a mascot', async () => {
    const { id: _id, ...withoutId } = productSteps;
    const html = await render(withoutId);
    expect(html).not.toContain('<img');
    expect(html).toMatch(/<section aria-labelledby="steps-title"/);
    expect(html).not.toMatch(/<section [^>]*class="[^"]*\bpt-10\b/);
    expect(html).toMatch(/<div class="[^"]*text-center[^"]*"[^>]*data-reveal/);
  });

  it('leaves out hidden intro sentences', async () => {
    const intro = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.1' }];
    const html = await render({ ...productSteps, intro });
    expect(html).toContain('Zichtbaar.');
    expect(html).not.toContain('Verborgen claim.');
  });
});
