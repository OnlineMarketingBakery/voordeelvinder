import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import notFoundPage from '../../../src/content/pages/404.json' with { type: 'json' };
import site from '../../../src/content/site.json' with { type: 'json' };
import { notFoundBlock } from '../../../src/schemas/blocks/notFound';
import { page } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const notFoundComponent = '../../../src/components/sections/NotFound.astro';
const { default: NotFound } = (await import(/* @vite-ignore */ notFoundComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

const block = notFoundPage.sections[0]!;
const parse = (value: unknown) => notFoundBlock.safeParse(value).success;

describe('notFound block', () => {
  it('accepts the 404 content, also as a whole page', () => {
    expect(parse(block)).toBe(true);
    expect(page.safeParse(notFoundPage).success).toBe(true);
  });

  it('is noindex, with a title the site template completes', () => {
    const data = page.parse(notFoundPage);
    expect(data.seo.noindex).toBe(true);
    expect(data.seo.title).not.toContain(site.name);
  });

  it('links to the form with the header CTA label (the only designed copy) and home', () => {
    const data = notFoundBlock.parse(block);
    expect(data.primaryCta).toEqual(site.header.cta);
    expect(data.secondaryLink.href).toBe('/');
  });

  it('rejects unknown keys, missing copy and unknown images', () => {
    expect(parse({ ...block, subtitle: 'x' })).toBe(false);
    expect(parse({ ...block, title: '' })).toBe(false);
    expect(parse({ ...block, image: { src: 'mascot/nope', alt: '' } })).toBe(false);
  });

  it('holds the h1: it may open a page instead of a hero, but not next to one', () => {
    const data = page.parse(notFoundPage);
    const hero = {
      type: 'hero',
      variant: 'product',
      title: 'Titel',
      body: 'Tekst.',
      cta: { label: 'Start', href: '/vergelijken' },
      art: {
        preset: 'solar',
        product: { src: 'illustrations/hero-solar-panel', alt: '' },
        mascot: { src: 'mascot/fox-waving', alt: '' },
      },
    };
    expect(page.safeParse({ ...data, sections: [block, hero] }).success).toBe(false);
    expect(page.safeParse({ ...data, sections: [{ ...block, hidden: true }] }).success).toBe(false);
  });

  it('renders one h1 that labels the section, the button and the home link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(NotFound, {
      props: { ...notFoundBlock.parse(block), id: 'notFound-1' },
    });
    expect(html).toMatch(/<section id="notFound-1" aria-labelledby="notFound-1-title"/);
    expect(html.match(/<h[1-6][ >]/g)).toEqual(['<h1 ']);
    expect(html).toContain(block.title);
    expect(html).toContain(block.text);
    expect(html).toMatch(/<a href="\/vergelijken"[^>]*>\s*Gratis beginnen/);
    expect(html).toMatch(/<a href="\/"[^>]*>\s*Naar de homepage\s*<\/a>/);
    // The fox is decorative, and its motion only runs without reduced motion.
    expect(html).toMatch(/<img [^>]*\balt(="")?[\s>]/);
    expect(html).toContain('motion-safe:animate-');
  });
});
