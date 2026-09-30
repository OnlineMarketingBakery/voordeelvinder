import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { imageKeys } from '../../../src/lib/asset-keys';
import { ctaBandBlock } from '../../../src/schemas/blocks/ctaBand';
import { page, section, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const ctaBandComponent = '../../../src/components/sections/CtaBand.astro';
const { default: CtaBand } = (await import(/* @vite-ignore */ ctaBandComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

// The JSON import types every block as one loose union; read it with its schema type.
const homeBand = home.sections.find((s) => s.type === 'ctaBand') as unknown as
  Extract<Section, { type: 'ctaBand' }> | undefined;
if (!homeBand) throw new Error('home.json has no ctaBand block');

// The product-page band (thuisbatterij, Figma 81:3830): lime, dark text, white button.
const productBand = {
  type: 'ctaBand',
  tone: 'lime',
  title: 'Ontdek wat een thuisbatterij voor jou betekent.',
  body: 'In een paar minuten zie je welke thuisbatterij het beste past bij jouw situatie.',
  cta: { label: 'Start je berekening', href: '/vergelijken/thuisbatterij' },
};

const parse = (value: unknown) => ctaBandBlock.safeParse(value).success;

describe('ctaBand block', () => {
  it('accepts the homepage content, also through the section union and the page', () => {
    expect(parse(homeBand)).toBe(true);
    expect(section.safeParse(homeBand).success).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('has the designed homepage band: purple, with the comparison CTA', () => {
    const data = ctaBandBlock.parse(homeBand);
    expect(data.tone).toBe('purple');
    expect(data.title).toBe('Klaar om te zien wat jij betaalt?');
    expect(data.cta).toEqual({ label: 'Start je vergelijking', href: '/vergelijken' });
  });

  it('accepts the product-page tone, an anchor id, the hidden flag and no body', () => {
    expect(parse(productBand)).toBe(true);
    expect(parse({ ...productBand, id: 'bereken', hidden: true })).toBe(true);
    const { body: _body, ...withoutBody } = productBand;
    expect(parse(withoutBody)).toBe(true);
  });

  it('accepts a body with hidden claim sentences', () => {
    const body = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.18' }];
    expect(parse({ ...productBand, body })).toBe(true);
  });

  it('rejects unknown keys at every level', () => {
    expect(parse({ ...homeBand, subtitle: 'x' })).toBe(false);
    expect(parse({ ...homeBand, eyebrow: 'x' })).toBe(false);
    expect(parse({ ...homeBand, cta: { ...homeBand.cta, variant: 'white' } })).toBe(false);
    // Overlapping the footer is not part of this block yet.
    expect(parse({ ...productBand, overlapFooter: true })).toBe(false);
  });

  it('rejects missing or bad values', () => {
    const { tone: _tone, ...withoutTone } = homeBand;
    expect(parse(withoutTone)).toBe(false);
    const { cta: _cta, ...withoutCta } = homeBand;
    expect(parse(withoutCta)).toBe(false);
    expect(parse({ ...homeBand, tone: 'lavender' })).toBe(false);
    expect(parse({ ...homeBand, title: '' })).toBe(false);
    expect(parse({ ...homeBand, body: '' })).toBe(false);
    expect(parse({ ...homeBand, body: [] })).toBe(false);
    expect(parse({ ...homeBand, id: 'Start Nu' })).toBe(false);
    expect(parse({ ...homeBand, cta: { label: '', href: '/vergelijken' } })).toBe(false);
    expect(parse({ ...homeBand, cta: { label: 'Start', href: 'https://example.com' } })).toBe(
      false,
    );
    expect(parse({ ...homeBand, cta: 'Start je vergelijking' })).toBe(false);
  });

  it('uses a rings decoration that exists in src/assets', () => {
    expect(imageKeys).toContain('decor/cta-band-rings');
  });
});

describe('CtaBand component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(CtaBand, { props: ctaBandBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  it('renders the home band as a section labelled by its h2, with one link', async () => {
    const html = await render(homeBand);
    expect(html).toMatch(/<section aria-labelledby="cta-band-title"/);
    expect(html).toMatch(/<h2 id="cta-band-title"[^>]*>Klaar om te zien wat jij betaalt\?<\/h2>/);
    expect(count(html, /<h[1-6] /g)).toBe(1);
    expect(html).toContain(`>${homeBand.body as string}</p>`);
    expect(count(html, /<a /g)).toBe(1);
    expect(html).toMatch(/<a href="\/vergelijken"[^>]*>Start je vergelijking<svg/);
  });

  it('paints the purple band with white text, the lime button and a white focus ring', async () => {
    const html = await render(homeBand);
    expect(html).toMatch(
      /class="[^"]*\bsurface-dark\b[^"]*\bbg-purple-600\b[^"]*"[^>]*data-reveal/,
    );
    expect(html).toMatch(/<h2 [^>]*class="[^"]*\btext-white\b/);
    expect(html).toMatch(/<a [^>]*class="[^"]*\bbg-lime-300\b/);
    expect(html).toMatch(/class="[^"]*\bcta-band-rings\b[^"]*\btext-white\b/);
  });

  it('paints the lime band with dark text and the white button', async () => {
    const html = await render(productBand);
    expect(html).toMatch(/class="[^"]*\bbg-lime-300\b[^"]*"[^>]*data-reveal/);
    expect(html).not.toContain('surface-dark');
    expect(html).toMatch(/<h2 [^>]*class="[^"]*\btext-ink-900\b/);
    expect(html).toMatch(/<a [^>]*class="[^"]*\bbg-white\b/);
    expect(html).toMatch(/class="[^"]*\bcta-band-rings\b[^"]*\bopacity-67\b/);
  });

  it('hides the rings from assistive technology and inlines them at the designed size', async () => {
    const html = await render(homeBand);
    expect(html).toMatch(/<div class="[^"]*\bcta-band-rings\b[^"]*"[^>]*aria-hidden="true"/);
    expect(count(html, /<circle /g)).toBe(3);
    expect(html).not.toContain('<img');
  });

  it('uses the anchor id from content for the section and its heading', async () => {
    const html = await render({ ...productBand, id: 'bereken' });
    expect(html).toMatch(/<section id="bereken" aria-labelledby="bereken-title"/);
    expect(html).toMatch(/<h2 id="bereken-title"/);
  });

  it('leaves out hidden body sentences, and the body when there is none', async () => {
    const body = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.18' }];
    const html = await render({ ...productBand, body });
    expect(html).toContain('Zichtbaar.');
    expect(html).not.toContain('Verborgen claim.');
    const { body: _body, ...withoutBody } = productBand;
    expect(await render(withoutBody)).not.toMatch(/<p[ >]/);
  });
});
