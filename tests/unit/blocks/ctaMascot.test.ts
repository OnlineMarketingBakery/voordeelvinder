import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { imageKeys } from '../../../src/lib/asset-keys';
import { ctaMascotBlock } from '../../../src/schemas/blocks/ctaMascot';
import { page, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const ctaMascotComponent = '../../../src/components/sections/CtaMascot.astro';
const { default: CtaMascot } = (await import(/* @vite-ignore */ ctaMascotComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

// The JSON import types every block as one loose union; read it with its schema type.
const homeCta = home.sections.find((s) => s.type === 'ctaMascot') as unknown as
  Extract<Section, { type: 'ctaMascot' }> | undefined;
if (!homeCta) throw new Error('home.json has no ctaMascot block');

const parse = (value: unknown) => ctaMascotBlock.safeParse(value).success;

describe('ctaMascot block', () => {
  it('accepts the homepage content: three lines, the middle one highlighted', () => {
    const result = ctaMascotBlock.safeParse(homeCta);
    expect(result.success).toBe(true);
    expect(result.data?.title.split('\n')).toEqual([
      'Jij vult in.',
      'Wij vergelijken.',
      'Jij bespaart.',
    ]);
    expect(result.data).toMatchObject({
      highlight: 'Wij vergelijken.',
      cta: { href: '/vergelijken' },
      image: { src: 'mascot/fox-cheer-document', alt: '' },
    });
  });

  it('is part of the page schema, as the last homepage block', () => {
    expect(page.safeParse(home).success).toBe(true);
    expect(home.sections.at(-1)?.type).toBe('ctaMascot');
  });

  it('accepts a minimal block: one line, no highlight, no body', () => {
    const { highlight: _h, body: _b, ...minimal } = homeCta;
    expect(parse({ ...minimal, title: 'Jij bespaart.' })).toBe(true);
  });

  it('rejects unknown keys on the block, the link and the image', () => {
    expect(parse({ ...homeCta, subtitle: 'x' })).toBe(false);
    expect(parse({ ...homeCta, button: homeCta.cta })).toBe(false);
    expect(parse({ ...homeCta, variant: 'mascot' })).toBe(false);
    expect(parse({ ...homeCta, cta: { ...homeCta.cta, icon: 'arrow' } })).toBe(false);
    expect(parse({ ...homeCta, image: { ...homeCta.image, mirror: true } })).toBe(false);
  });

  it('rejects bad values', () => {
    expect(parse({ ...homeCta, title: '' })).toBe(false);
    expect(parse({ ...homeCta, id: 'Start nu' })).toBe(false);
    expect(parse({ ...homeCta, cta: { label: 'Start', href: 'https://example.com' } })).toBe(false);
    expect(parse({ ...homeCta, cta: { label: '', href: '/vergelijken' } })).toBe(false);
    expect(parse({ ...homeCta, image: { src: 'mascot/missing', alt: '' } })).toBe(false);
    expect(parse({ ...homeCta, image: { src: 'mascot/fox-cheer-document' } })).toBe(false);
    expect(parse({ ...homeCta, hidden: 'yes' })).toBe(false);
    const { cta: _cta, ...withoutCta } = homeCta;
    expect(parse(withoutCta)).toBe(false);
    const { image: _image, ...withoutImage } = homeCta;
    expect(parse(withoutImage)).toBe(false);
  });

  it('requires the highlight to equal a whole line of the title', () => {
    expect(parse({ ...homeCta, highlight: 'vergelijken' })).toBe(false);
    expect(parse({ ...homeCta, highlight: 'Wij vergelijken' })).toBe(false);
    expect(parse({ ...homeCta, highlight: 'Jij bespaart.' })).toBe(true);
  });

  it("rejects empty and zero-width lines (Figma's U+200B spacer line)", () => {
    expect(parse({ ...homeCta, title: 'Jij vult in.\n\u200B\nJij bespaart.' })).toBe(false);
    expect(parse({ ...homeCta, title: 'Jij vult in.\n\nWij vergelijken.' })).toBe(false);
    expect(parse({ ...homeCta, title: 'Wij vergelijken.\n ' })).toBe(false);
  });

  it('accepts hidden sentences in the body', () => {
    const body = ['Doe het nu.', { text: 'Een claim.', hidden: true, claim: '1.1' }];
    expect(parse({ ...homeCta, body })).toBe(true);
  });

  it('only uses images that exist in src/assets', () => {
    expect(imageKeys).toContain('mascot/fox-cheer-document');
  });
});

describe('CtaMascot component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(CtaMascot, { props: ctaMascotBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
  const headingText = (html: string) =>
    (html.match(/<h2 [^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '')
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<[^>]+>/g, '');

  it('renders a section labelled by its h2, without an anchor by default', async () => {
    const html = await render(homeCta);
    expect(html).toMatch(/<section aria-labelledby="cta-mascot-title"/);
    expect(html).toMatch(/<h2 id="cta-mascot-title"/);
    expect(count(html, /<h2 /g)).toBe(1);
    expect(html).not.toMatch(/<h1 /);
  });

  it('puts the anchor id from content on the section', async () => {
    const html = await render({ ...homeCta, id: 'start' });
    expect(html).toMatch(/<section id="start" aria-labelledby="start-title"/);
  });

  it('renders each title line as its own block line, read with spaces', async () => {
    const html = await render(homeCta);
    expect(count(html, /<span class="block"/g)).toBe(3);
    expect(headingText(html)).toBe('Jij vult in. Wij vergelijken. Jij bespaart.');
    expect(html).not.toContain('\u200B');
  });

  it('puts the highlighted line on the tilted lime chip with a decorative sparkle', async () => {
    const html = await render(homeCta);
    expect(html).toMatch(
      /<span class="[^"]*bg-lime-300[^"]*-rotate-\[1\.35deg\][^"]*"[^>]*>Wij vergelijken\./,
    );
    expect(html).not.toContain('<mark');
    const sparkle = html.match(/<svg [^>]*cta-mascot-sparkle[^>]*>/)?.[0];
    expect(sparkle).toContain('aria-hidden="true"');
    expect(sparkle).toContain('text-lime-300');
  });

  it('renders no chip without a highlight', async () => {
    const { highlight: _highlight, ...plain } = homeCta;
    const html = await render(plain);
    expect(html).not.toContain('bg-lime-300 text-ink-900');
    expect(html).not.toContain('cta-mascot-sparkle');
  });

  it('links the button to the comparison, with the label from content', async () => {
    const html = await render(homeCta);
    expect(html).toMatch(/<a href="\/vergelijken"[^>]*>\s*Start je vergelijking\s*<svg/);
    expect(html).toMatch(/<a [^>]*class="[^"]*bg-purple-600/);
  });

  it('shows the mascot as a lazy, decorative image', async () => {
    const html = await render(homeCta);
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toMatch(/<img [^>]*\balt(="")?[ >]/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
  });

  it('reveals the ring and staggers the text column', async () => {
    const html = await render(homeCta);
    expect(html).toMatch(/<div class="[^"]*aspect-square[^"]*"[^>]*data-reveal[ >]/);
    expect(html).toMatch(/<div class="[^"]*text-center[^"]*"[^>]*data-reveal-stagger/);
  });

  it('leaves out hidden body sentences', async () => {
    const body = ['Zichtbaar.', { text: 'Verborgen claim.', hidden: true, claim: '1.1' }];
    const html = await render({ ...homeCta, body });
    expect(html).toContain('Zichtbaar.');
    expect(html).not.toContain('Verborgen claim.');
  });
});
