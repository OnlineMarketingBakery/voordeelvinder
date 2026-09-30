import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import thanksPage from '../../../src/content/pages/bedankt.json' with { type: 'json' };
import site from '../../../src/content/site.json' with { type: 'json' };
import { visibleCopy } from '../../../src/lib/copy';
import { thankYouBlock } from '../../../src/schemas/blocks/thankYou';
import { page } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const thankYouComponent = '../../../src/components/sections/ThankYou.astro';
const { default: ThankYou } = (await import(/* @vite-ignore */ thankYouComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

const block = thanksPage.sections[0]!;
const parse = (value: unknown) => thankYouBlock.safeParse(value).success;
const render = async (props: Record<string, unknown> = {}) => {
  const container = await AstroContainer.create();
  return container.renderToString(ThankYou, {
    props: { ...thankYouBlock.parse(block), id: 'thankYou-1', ...props },
  });
};

describe('thankYou block', () => {
  it('accepts the thank-you content, also as a whole page', () => {
    expect(parse(block)).toBe(true);
    expect(page.safeParse(thanksPage).success).toBe(true);
  });

  it('is noindex, with a title the site template completes', () => {
    const data = page.parse(thanksPage);
    expect(data.seo.noindex).toBe(true);
    expect(data.seo.title).not.toContain(site.name);
  });

  it('keeps the designed copy, informal and with the claim tagged (CONTENT-TODO 1.12)', () => {
    const data = thankYouBlock.parse(block);
    expect(data.title).toBe('Bedankt! We gaan voor je aan de slag.');
    // Built as designed (row 1.12's default); hiding the sentence is a JSON-only change.
    expect(visibleCopy(data.body)).toBe(
      'We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op.',
    );
    expect(data.body).toContainEqual(expect.objectContaining({ claim: '1.12', hidden: false }));
    expect(data.cta).toEqual({ label: 'Terug naar de startpagina', href: '/' });
    expect(JSON.stringify(thanksPage)).not.toMatch(/\b(u|uw)\b/i);
  });

  it('rejects unknown keys, missing copy and unknown images', () => {
    expect(parse({ ...block, subtitle: 'x' })).toBe(false);
    expect(parse({ ...block, title: '' })).toBe(false);
    expect(parse({ ...block, image: { src: 'mascot/nope', alt: '' } })).toBe(false);
  });

  it('holds the h1: it opens the page, and can not be hidden', () => {
    const data = page.parse(thanksPage);
    expect(page.safeParse({ ...data, sections: [{ ...block, hidden: true }] }).success).toBe(false);
    expect(page.safeParse({ ...data, sections: [block, block] }).success).toBe(false);
  });

  it('renders one h1 that labels the section, the text and the button home', async () => {
    const html = await render();
    expect(html).toMatch(/<section id="thankYou-1" aria-labelledby="thankYou-1-title"/);
    expect(html.match(/<h[1-6][ >]/g)).toEqual(['<h1 ']);
    expect(html).toContain(block.title);
    expect(html).toContain('We hebben je gegevens goed ontvangen.');
    expect(html).toMatch(/<a href="\/"[^>]*>\s*(<svg[\s\S]*?<\/svg>\s*)?Terug naar de startpagina/);
  });

  it('leaves a hidden claim out', async () => {
    const body = [
      'We hebben je gegevens goed ontvangen.',
      { text: 'We vergelijken de mogelijkheden.', hidden: true, claim: '1.12' },
    ];
    const html = await render({ body });
    expect(html).toContain('We hebben je gegevens goed ontvangen.');
    expect(html).not.toContain('We vergelijken');
  });

  it('marks the card and the badge for the form morph, and the badge for the celebration', async () => {
    const html = await render();
    expect(html.match(/data-morph="form-card"/g)).toHaveLength(1);
    expect(html.match(/data-morph="form-mascot"/g)).toHaveLength(1);
    expect(html).toMatch(/data-morph="form-mascot"[^>]*data-celebration/);
    // The card, and only the card, carries the form card's view-transition name, so the form
    // card morphs into it on "Verstuur"; the badge isn't named (one name per page).
    expect(html.match(/view-transition-name:form-card/g)).toHaveLength(1);
    expect(html).toMatch(/data-morph="form-card"[^>]*\[view-transition-name:form-card\]/);
  });

  it('draws the decorative fox twice (circle and head), from one srcset', async () => {
    const html = await render();
    const imgs = html.match(/<img [^>]*>/g) ?? [];
    expect(imgs).toHaveLength(2);
    for (const img of imgs) expect(img).toMatch(/\balt(="")?[\s>]/);
    const srcsets = html.match(/<source [^>]*srcset="([^"]+)"/g) ?? [];
    expect(srcsets.length).toBeGreaterThan(0);
    expect(new Set(srcsets).size).toBe(srcsets.length / 2);
    expect(html).toContain('clip-path:ellipse(');
    expect(html).toContain('clip-path:inset(');
  });

  it('shows nothing personal: no answers, no storage reads in the markup', async () => {
    const html = await render();
    expect(html).not.toMatch(/sessionStorage|localStorage|\{[a-z_]+\}/);
  });
});
