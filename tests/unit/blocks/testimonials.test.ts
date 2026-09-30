import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys } from '../../../src/lib/asset-keys';
import { pagePlaceholderProblems, type PageData } from '../../../src/lib/pages';
import { testimonialsBlock } from '../../../src/schemas/blocks/testimonials';
import { page, section, type Section } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does (so an
// expect-error comment would fail there). Vitest compiles the component with Astro's config.
const testimonialsComponent = '../../../src/components/sections/Testimonials.astro';
const { default: Testimonials } = (await import(/* @vite-ignore */ testimonialsComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

// The JSON import types every block as one loose union; read it with its schema type.
type Block = Extract<Section, { type: 'testimonials' }>;
const found = home.sections.find((s) => s.type === 'testimonials') as unknown as Block | undefined;
if (!found) throw new Error('home.json has no testimonials block');
const block: Block = found;

// A real review as it could look once the client sends them (test data, not site content).
const review = {
  quote: 'Snel en duidelijk.',
  name: 'Test P.',
  location: 'Leuven',
  rating: 4,
  avatar: { src: 'mascot/fox-laptop', alt: 'Foto van Test P.' },
};

const parse = (value: unknown) => testimonialsBlock.safeParse(value).success;

describe('testimonials block', () => {
  it('accepts the homepage content, also through the section union and the page', () => {
    expect(parse(block)).toBe(true);
    expect(section.safeParse(block).success).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('ships hidden, with five placeholder items and no stock photos', () => {
    const data = testimonialsBlock.parse(block);
    expect(data).toMatchObject({ hidden: true, id: 'ervaringen', title: 'Wat klanten zeggen' });
    expect(data.items).toHaveLength(5);
    for (const item of data.items) {
      expect(item.placeholder).toBe(true);
      expect(item.avatar).toBeNull();
    }
  });

  it('accepts a real review with an avatar, and one with only a quote and a name', () => {
    expect(parse({ ...block, items: [review] })).toBe(true);
    expect(parse({ ...block, items: [{ quote: 'Top.', name: 'An' }] })).toBe(true);
    const { eyebrow: _e, intro: _i, id: _id, hidden: _h, ...minimal } = block;
    expect(parse(minimal)).toBe(true);
  });

  it('rejects unknown keys at every level', () => {
    expect(parse({ ...block, subtitle: 'x' })).toBe(false);
    expect(parse({ ...block, heading: { title: block.title } })).toBe(false);
    expect(parse({ ...block, labels: { ...block.labels, close: 'x' } })).toBe(false);
    expect(parse({ ...block, items: [{ ...review, date: '2026-09-30' }] })).toBe(false);
    expect(parse({ ...block, items: [{ ...review, avatar: { ...review.avatar, w: 52 } }] })).toBe(
      false,
    );
  });

  it('rejects missing or bad values', () => {
    const { labels: _labels, ...withoutLabels } = block;
    expect(parse(withoutLabels)).toBe(false);
    expect(parse({ ...block, title: '' })).toBe(false);
    expect(parse({ ...block, items: [] })).toBe(false);
    expect(parse({ ...block, id: 'Wat Klanten' })).toBe(false);
    expect(parse({ ...block, items: [{ ...review, quote: '' }] })).toBe(false);
    expect(parse({ ...block, items: [{ ...review, name: undefined }] })).toBe(false);
    expect(parse({ ...block, items: [{ ...review, placeholder: 'yes' }] })).toBe(false);
    expect(
      parse({ ...block, items: [{ ...review, avatar: { src: 'stock/sofie', alt: '' } }] }),
    ).toBe(false);
    expect(parse({ ...block, items: [{ ...review, avatar: { src: 'mascot/fox-laptop' } }] })).toBe(
      false,
    );
  });

  it('takes whole ratings from 1 to 5', () => {
    for (const rating of [1, 5])
      expect(parse({ ...block, items: [{ ...review, rating }] })).toBe(true);
    for (const rating of [0, 6, 4.5, '5']) {
      expect(parse({ ...block, items: [{ ...review, rating }] })).toBe(false);
    }
  });

  it('needs {rating} in the rating label', () => {
    expect(parse({ ...block, labels: { ...block.labels, rating: 'Vijf sterren' } })).toBe(false);
  });

  it('only uses icons that exist in src/assets', () => {
    expect(iconKeys).toEqual(
      expect.arrayContaining([
        'quote-mark',
        'star',
        'location-pin',
        'chevron-left',
        'chevron-right',
      ]),
    );
  });
});

describe('testimonials production gate', () => {
  const homeData = page.parse(home) as PageData;
  const withBlock = (value: object) =>
    ({
      ...homeData,
      sections: [homeData.sections[0]!, testimonialsBlock.parse(value)],
    }) as PageData;
  const problems = (value: object) =>
    pagePlaceholderProblems('home', withBlock(value)).filter((p) => p.includes('testimonial'));

  it('ignores the hidden homepage block', () => {
    expect(problems(block)).toEqual([]);
  });

  it('flags every placeholder item once the block is visible', () => {
    const found = problems({ ...block, hidden: false });
    expect(found).toHaveLength(5);
    expect(found[0]).toBe('home: testimonial 1 ("Sofie V., Gent") is a placeholder');
  });

  it('flags a fill-in such as "€[X]" left in a quote, even without the flag', () => {
    const quote = 'Ik bespaar nu €[X] per maand.';
    expect(problems({ ...block, hidden: false, items: [{ ...review, quote }] })).toEqual([
      'home: testimonial 1 ("Test P.") is a placeholder',
    ]);
  });

  it('passes with real reviews', () => {
    expect(
      problems({ ...block, hidden: false, items: [review, { ...review, name: 'B.' }] }),
    ).toEqual([]);
  });
});

describe('Testimonials component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(Testimonials, { props: testimonialsBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
  const visible = { ...block, hidden: false };

  it('renders a labelled section with a centred header and a keyboard-scrollable track', async () => {
    const html = await render(visible);
    expect(html).toMatch(/<section id="ervaringen" aria-labelledby="ervaringen-title"/);
    expect(html).toMatch(/<h2 id="ervaringen-title"[^>]*>Wat klanten zeggen<\/h2>/);
    expect(html).toContain('>Ervaringen</span>');
    expect(html).toContain(block.intro as string);
    expect(html).toMatch(
      /<div id="ervaringen-track" role="region" aria-label="Ervaringen van klanten" tabindex="0"/,
    );
    expect(html).toMatch(/<ul role="list"[^>]*data-reveal[ >]/);
    expect(html).not.toContain('data-reveal-stagger');
  });

  it('renders every review as a figure with a quote, name, stars and location', async () => {
    const html = await render(visible);
    expect(count(html, /<li /g)).toBe(5);
    expect(count(html, /<figure /g)).toBe(5);
    expect(count(html, /<blockquote /g)).toBe(5);
    expect(count(html, /<figcaption /g)).toBe(5);
    expect(count(html, /role="img" aria-label="5 van 5 sterren"/g)).toBe(5);
    expect(html).toContain('Thomas D.');
    expect(html).toContain('Antwerpen');
    expect(html).toMatch(/<blockquote [^>]*><p[^>]*>Ik had dit al maanden uitgesteld\./);
    // The names are not headings, and placeholders have no photo.
    expect(html).not.toContain('<h3');
    expect(html).not.toContain('<img');
  });

  it('shows an avatar in its frame, partial ratings and no location when there is none', async () => {
    const { location: _location, ...noLocation } = review;
    const html = await render({ ...visible, items: [noLocation] });
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toMatch(/<img [^>]*alt="Foto van Test P\."/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
    expect(html).toContain('aria-label="4 van 5 sterren"');
    expect(count(html, /text-purple-500"/g)).toBeGreaterThanOrEqual(4);
    // The empty star is an outline (shape differs, not only colour).
    expect(count(html, /fill-none stroke-current/g)).toBe(1);
    expect(html).not.toContain('Leuven');
  });

  it('leaves out the star row without a rating', async () => {
    const { rating: _rating, ...unrated } = review;
    const html = await render({ ...visible, items: [unrated] });
    expect(html).not.toContain('role="img"');
  });

  it('has prev/next buttons for the track, hidden until the script finds overflow', async () => {
    const html = await render(visible);
    expect(html).toMatch(/<div class="[^"]*max-md:hidden[^"]*" hidden data-carousel-controls/);
    expect(html).toMatch(
      /<button type="button" [^>]*aria-controls="ervaringen-track" aria-label="Vorige ervaring"/,
    );
    expect(html).toMatch(
      /<button type="button" [^>]*aria-controls="ervaringen-track" aria-label="Volgende ervaring"/,
    );
  });

  it('marks three reviews or fewer as a static row', async () => {
    expect(await render(visible)).not.toContain('track-few');
    expect(await render({ ...visible, items: [review, review, review] })).toContain('track-few');
  });

  it('derives ids from the block type without an anchor', async () => {
    const { id: _id, ...withoutId } = visible;
    const html = await render(withoutId);
    expect(html).toMatch(/<section aria-labelledby="testimonials-title"/);
    expect(html).toContain('id="testimonials-track"');
  });
});
