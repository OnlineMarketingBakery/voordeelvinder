import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import { type CardPost, listingHref } from '../../src/lib/blog';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
type Component = Parameters<AstroContainer['renderToString']>[0];
const load = async (path: string) =>
  ((await import(/* @vite-ignore */ path)) as { default: Component }).default;

const BlogCard = await load('../../src/components/blog/BlogCard.astro');
const BlogFeatured = await load('../../src/components/blog/BlogFeatured.astro');
const Pagination = await load('../../src/components/blog/Pagination.astro');
const PostHeader = await load('../../src/components/blog/PostHeader.astro');
const PostNav = await load('../../src/components/blog/PostNav.astro');
const RelatedPosts = await load('../../src/components/blog/RelatedPosts.astro');
const Prose = await load('../../src/components/ui/Prose.astro');
const Toc = await load('../../src/components/legal/Toc.astro');
const PageHero = await load('../../src/components/legal/PageHero.astro');

const render = async (
  component: Component,
  props: Record<string, unknown>,
  slots?: Record<string, string>,
) => {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props, ...(slots ? { slots } : {}) });
};
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

// Inline fixtures (no posts ship: CONTENT-TODO 2.14).
const card: CardPost = {
  href: '/blog/betaal-jij-te-veel',
  title: 'Betaal jij te veel voor energie? Zo ontdek je het',
  excerpt: 'Ontdek of je huidige energiecontract nog bij je past.',
  date: new Date('2026-09-29'),
};
const withCover: CardPost = {
  ...card,
  cover: { src: 'mascot/fox-laptop', alt: 'De vos achter een laptop' },
};

describe('BlogCard', () => {
  it('shows the placeholder box without a cover', async () => {
    const html = await render(BlogCard, { post: card, readMore: site.blog.readMore });
    expect(html).toContain('data-image-placeholder');
    expect(html).toMatch(/class="[^"]*\bbg-lavender-100\b[^"]*\baspect-\[376\/246\]/);
    expect(html).toMatch(/<svg[^>]*class="[^"]*\btext-lavender-300\b[^"]*\bsize-\[90px\]/);
    expect(html).not.toContain('<img');
  });

  it('renders the cover as a responsive image with its alt text', async () => {
    const html = await render(BlogCard, { post: withCover, readMore: site.blog.readMore });
    expect(html).not.toContain('data-image-placeholder');
    expect(html).toMatch(/<picture/);
    expect(html).toMatch(/<img [^>]*alt="De vos achter een laptop"/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
    expect(html).toMatch(/<img [^>]*class="[^"]*\bobject-cover\b/);
  });

  it('has one link, the title, stretched over the card; the pill is decorative', async () => {
    const html = await render(BlogCard, { post: card, readMore: site.blog.readMore });
    expect(count(html, /<a /g)).toBe(1);
    expect(html).toMatch(
      /<h3 [^>]*><a href="\/blog\/betaal-jij-te-veel" class="[^"]*after:inset-0[^"]*"[^>]*>Betaal jij te veel/,
    );
    expect(html).toMatch(
      /<div class="mt-auto pt-4" aria-hidden="true"[^>]*><span class="[^"]*bg-purple-600/,
    );
    expect(html).toContain('>Lees meer<svg');
    expect(html).not.toContain('border-white');
    expect(html).not.toContain('shadow-glow');
  });

  it('can use an h2', async () => {
    const html = await render(BlogCard, { post: card, readMore: 'Lees meer', headingLevel: 'h2' });
    expect(html).toMatch(/<h2 /);
  });
});

describe('BlogFeatured', () => {
  it('shows the heading, the nl-BE date and the post as one link, cover first', async () => {
    const html = await render(BlogFeatured, {
      heading: site.blog.listing.featuredHeading,
      post: withCover,
      readMore: site.blog.readMore,
      locale: 'nl-BE',
    });
    expect(html).toMatch(/<h2 id="blog-featured-title"[^>]*>Recent bericht<\/h2>/);
    expect(html).toMatch(/<time datetime="2026-09-29"[^>]*>29 september 2026<\/time>/);
    expect(count(html, /<a /g)).toBe(1);
    // The likely LCP image on page 1.
    expect(html).toMatch(/<img [^>]*fetchpriority="high"/);
    expect(html).toMatch(/<span class="[^"]*\bbg-lime-300\b[^"]*\bh-12\b/);
  });

  it('uses the large placeholder glyph without a cover', async () => {
    const html = await render(BlogFeatured, {
      heading: 'Recent bericht',
      post: card,
      readMore: 'Lees meer',
      locale: 'nl-BE',
    });
    expect(html).toMatch(/size-\[119px\]/);
  });
});

describe('Pagination', () => {
  const labels = site.blog.pagination;

  it('renders nothing for a single page', async () => {
    const html = await render(Pagination, { current: 1, total: 1, href: listingHref, labels });
    expect(html.trim()).toBe('');
  });

  it('page 1: numbers and "next", the current page is not a link', async () => {
    const html = await render(Pagination, { current: 1, total: 3, href: listingHref, labels });
    expect(html).toMatch(/<nav aria-label="Paginering"/);
    expect(html).toMatch(
      /<span aria-current="page"[^>]*><span class="sr-only"[^>]*>Pagina 1<\/span>/,
    );
    expect(html).toMatch(/<a href="\/blog\/pagina\/2" aria-label="Pagina 2"/);
    expect(html).toMatch(/<a href="\/blog\/pagina\/2" aria-label="Volgende pagina"/);
    expect(html).not.toContain('Vorige pagina');
  });

  it('the last page: "previous" back, no "next"', async () => {
    const html = await render(Pagination, { current: 3, total: 3, href: listingHref, labels });
    expect(html).toMatch(/<a href="\/blog\/pagina\/2" aria-label="Vorige pagina"/);
    expect(html).toMatch(/<a href="\/blog" aria-label="Pagina 1"/);
    expect(html).not.toContain('Volgende pagina');
  });
});

describe('PostHeader', () => {
  it('has the h1, the date and the placeholder box without a cover', async () => {
    const html = await render(PostHeader, { title: card.title, date: card.date, locale: 'nl-BE' });
    expect(count(html, /<h1 /g)).toBe(1);
    expect(html).toMatch(/<h1 [^>]*>Betaal jij te veel voor energie\? Zo ontdek je het<\/h1>/);
    expect(html).toContain('29 september 2026');
    expect(html).toContain('data-image-placeholder');
  });

  it('loads a cover eagerly with high priority (LCP)', async () => {
    const html = await render(PostHeader, {
      title: card.title,
      date: card.date,
      cover: withCover.cover,
      locale: 'nl-BE',
    });
    expect(html).toMatch(/<img [^>]*loading="eager"/);
    expect(html).toMatch(/<img [^>]*fetchpriority="high"/);
  });
});

describe('PostNav', () => {
  const labels = site.blog.postNav;
  const newer = { href: '/blog/nieuwer', title: 'Nieuwer artikel' };
  const older = { href: '/blog/ouder', title: 'Ouder artikel' };

  it('links to both neighbours, naming them for screen readers', async () => {
    const html = await render(PostNav, { newer, older, labels });
    expect(html).toMatch(/<nav aria-label="Meer artikelen"/);
    expect(html).toMatch(
      /<a href="\/blog\/nieuwer"[^>]*><svg[^>]*>[\s\S]*?<\/svg>Terug<span class="sr-only"[^>]*> \(vorig artikel: Nieuwer artikel\)<\/span><\/a>/,
    );
    expect(html).toMatch(
      /<a href="\/blog\/ouder"[^>]*>Volgende<span class="sr-only"[^>]*> \(volgend artikel: Ouder artikel\)<\/span><svg/,
    );
    expect(html).toContain('grid-cols-2');
  });

  it('leaves out a missing neighbour, and everything without neighbours', async () => {
    const html = await render(PostNav, { older, labels });
    expect(html).not.toContain('Terug');
    expect(html).not.toContain('grid-cols-2');
    expect((await render(PostNav, { labels })).trim()).toBe('');
  });
});

describe('RelatedPosts', () => {
  it('renders up to three cards under the heading', async () => {
    const html = await render(RelatedPosts, {
      heading: site.blog.relatedHeading,
      posts: [card, withCover],
      readMore: 'Lees meer',
    });
    expect(html).toMatch(/<h2 id="related-title"[^>]*>Misschien vind je dit ook leuk<\/h2>/);
    expect(count(html, /<article /g)).toBe(2);
    expect(count(html, /<h3 /g)).toBe(2);
  });

  it('renders nothing without related posts', async () => {
    const html = await render(RelatedPosts, { heading: 'x', posts: [], readMore: 'x' });
    expect(html.trim()).toBe('');
  });
});

describe('Prose', () => {
  const body =
    '<h2 id="a">Eerste</h2><p>Lead.</p><p>Tekst.</p><h2 id="b">Tweede</h2><ul><li>Punt</li></ul>';

  it('legal: 2 px purple rules, the lead paragraph and the text column', async () => {
    const html = await render(Prose, { variant: 'legal' }, { default: body });
    expect(html).toContain('data-prose="legal"');
    expect(html).toContain('[&amp;_h2]:after:h-0.5');
    expect(html).toContain('[&amp;>h2:first-of-type+p]:text-body-xl');
    expect(html).toContain('max-w-[44.875rem]');
    expect(html).not.toContain('nth-of-type(even)');
    expect(html).toContain('<h2 id="a">Eerste</h2>');
  });

  it('blog: 4 px rules in purple and lime by turns, full width', async () => {
    const html = await render(Prose, { variant: 'blog' }, { default: body });
    expect(html).toContain('[&amp;_h2]:after:h-1');
    expect(html).toContain('[&amp;_h2:nth-of-type(odd)]:after:bg-purple-500');
    expect(html).toContain('[&amp;_h2:nth-of-type(even)]:after:bg-lime-400');
    expect(html).not.toContain('max-w-[44.875rem]');
    expect(html).not.toContain('first-of-type+p');
  });
});

describe('Toc', () => {
  const items = [
    { id: 'wie-zijn-wij', text: 'Wie zijn wij' },
    { id: 'toepasselijk-recht', text: 'Toepasselijk recht' },
  ];

  it('links every heading, as a sticky card (lg) and a collapsed disclosure (below lg)', async () => {
    const html = await render(Toc, { label: site.legal.tocLabel, items });
    expect(html).toMatch(/<nav aria-labelledby="toc-title-compact" class="[^"]*\blg:hidden\b/);
    expect(html).toMatch(/<details class="group/);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toMatch(
      /<nav aria-labelledby="toc-title" class="[^"]*\bsticky\b[^"]*\blg:block\b/,
    );
    expect(html).toMatch(/<h2 id="toc-title"[^>]*>Inhoudsopgave<\/h2>/);
    expect(count(html, /<a href="#wie-zijn-wij"/g)).toBe(2);
    expect(count(html, /<a href="#toepasselijk-recht"/g)).toBe(2);
  });

  it('renders nothing without headings', async () => {
    expect((await render(Toc, { label: 'Inhoudsopgave', items: [] })).trim()).toBe('');
  });
});

describe('PageHero', () => {
  it('holds the h1 on the purple band, with an optional meta line', async () => {
    const html = await render(PageHero, { title: 'Algemene Voorwaarden' });
    expect(html).toMatch(/class="[^"]*\bbg-purple-600\b[^"]*\bsurface-dark\b/);
    expect(html).toMatch(/<h1 [^>]*>Algemene Voorwaarden<\/h1>/);
    expect(html).not.toContain('<p');
    const dated = await render(PageHero, {
      title: 'Privacybeleid',
      meta: 'Laatst bijgewerkt: 30 september 2026',
    });
    expect(dated).toMatch(/<p [^>]*>Laatst bijgewerkt: 30 september 2026<\/p>/);
  });
});
