import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import {
  featuredPost,
  listingHref,
  listingPages,
  neighbours,
  pageItems,
  relatedProblems,
  type PostLike,
  postPlaceholderProblems,
  publishedPosts,
  relatedPosts,
  toCard,
} from '../../src/lib/blog';
import { fill } from '../../src/lib/copy';
import { formatDate, isoDate } from '../../src/lib/dates';
import { blogPosting } from '../../src/lib/seo/structured-data';
import { blogCopy, postFrontmatter } from '../../src/schemas/blog';

// Inline fixtures: no posts ship (CONTENT-TODO 2.14), and none may live in src/content.
const post = (id: string, date: string, data: Partial<PostLike['data']> = {}): PostLike => ({
  id,
  data: {
    title: `Titel ${id}`,
    excerpt: `Samenvatting ${id}`,
    date: new Date(date),
    featured: false,
    draft: false,
    placeholder: false,
    ...data,
  },
});

const frontmatter = {
  title: 'Betaal jij te veel voor energie? Zo ontdek je het',
  excerpt: 'Ontdek of je huidige energiecontract nog bij je past.',
  date: '2026-09-29',
};

describe('post frontmatter', () => {
  it('accepts the minimum and fills in the flags', () => {
    const data = postFrontmatter.parse(frontmatter);
    expect(data.date).toEqual(new Date('2026-09-29'));
    expect(data).toMatchObject({ featured: false, draft: false, placeholder: false });
  });

  it('accepts every optional field', () => {
    const full = {
      ...frontmatter,
      updated: '2026-10-02',
      cover: { src: 'mascot/fox-laptop', alt: 'De vos achter een laptop' },
      author: 'Redactie',
      tags: ['energie'],
      featured: true,
      draft: true,
      placeholder: true,
      related: ['zonnepanelen-uitgelegd'],
      seo: { title: 'Te veel betalen?', description: 'Korter.', noindex: true },
    };
    expect(postFrontmatter.safeParse(full).success).toBe(true);
  });

  it('rejects unknown keys, bad cover keys and bad dates', () => {
    const parse = (value: unknown) => postFrontmatter.safeParse(value).success;
    expect(parse({ ...frontmatter, subtitle: 'x' })).toBe(false);
    expect(parse({ ...frontmatter, description: 'x' })).toBe(false);
    expect(parse({ ...frontmatter, cover: { src: 'blog/bestaat-niet', alt: 'x' } })).toBe(false);
    expect(parse({ ...frontmatter, cover: { src: 'mascot/fox-laptop', alt: '' } })).toBe(false);
    expect(parse({ ...frontmatter, date: 'gisteren' })).toBe(false);
    expect(parse({ ...frontmatter, updated: '2026-09-01' })).toBe(false);
    expect(parse({ ...frontmatter, related: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(parse({ ...frontmatter, related: ['Geen Slug'] })).toBe(false);
    const { excerpt: _excerpt, ...withoutExcerpt } = frontmatter;
    expect(parse(withoutExcerpt)).toBe(false);
  });
});

describe('blog copy in site.json', () => {
  it('matches the schema, with the designed labels', () => {
    const copy = blogCopy.parse(site.blog);
    expect(copy.listing.featuredHeading).toBe('Recent bericht');
    expect(copy.listing.gridHeading).toBe('Onze blogs en artikelen');
    expect(copy.listing.perPage).toBe(9);
    expect(copy.readMore).toBe('Lees meer');
    expect(copy.relatedHeading).toBe('Misschien vind je dit ook leuk');
    expect([copy.postNav.previous, copy.postNav.next]).toEqual(['Terug', 'Volgende']);
  });

  it('requires the tokens the components fill in', () => {
    const parse = (value: unknown) => blogCopy.safeParse(value).success;
    expect(parse({ ...site.blog, pagination: { ...site.blog.pagination, page: 'Pagina' } })).toBe(
      false,
    );
    expect(parse({ ...site.blog, postNav: { ...site.blog.postNav, nextHint: 'Volgend' } })).toBe(
      false,
    );
  });
});

describe('the blog ships without posts (CONTENT-TODO 2.14)', () => {
  it('has no post files, so no blog route is built and "Blogs" stays hidden', () => {
    const files = readdirSync(new URL('../../src/content/blog/', import.meta.url));
    expect(files.filter((file) => file.endsWith('.md'))).toEqual([]);
    expect(listingPages([], 9)).toEqual({ featured: undefined, pages: [] });
  });
});

describe('published posts', () => {
  const posts = [
    post('oud', '2026-01-10'),
    post('nieuw', '2026-09-29'),
    post('concept', '2026-10-01', { draft: true }),
    post('midden', '2026-05-01'),
  ];

  it('sorts newest first and drops drafts in production only', () => {
    expect(publishedPosts(posts, 'production').map((p) => p.id)).toEqual([
      'nieuw',
      'midden',
      'oud',
    ]);
    expect(publishedPosts(posts, 'staging').map((p) => p.id)).toEqual([
      'concept',
      'nieuw',
      'midden',
      'oud',
    ]);
  });

  it('reports placeholder posts (a production build fails on them)', () => {
    expect(postPlaceholderProblems(posts)).toEqual([]);
    expect(postPlaceholderProblems([post('test', '2026-09-29', { placeholder: true })])).toEqual([
      'blog/test.md is a placeholder post',
    ]);
  });

  it('features the newest featured post, else the newest', () => {
    const sorted = publishedPosts(posts, 'production');
    expect(featuredPost(sorted)?.id).toBe('nieuw');
    const withFeatured = sorted.map((p) =>
      p.id === 'oud' ? { ...p, data: { ...p.data, featured: true } } : p,
    );
    expect(featuredPost(withFeatured)?.id).toBe('oud');
  });
});

describe('listing pages', () => {
  const many = Array.from({ length: 20 }, (_, i) =>
    post(`post-${i + 1}`, `2026-01-${String(28 - i).padStart(2, '0')}`),
  );

  it('puts the featured post above page 1 and the rest in pages of perPage', () => {
    const { featured, pages } = listingPages(many, 9);
    expect(featured?.id).toBe('post-1');
    expect(pages.map((page) => page.length)).toEqual([9, 9, 1]);
    expect(pages.flat()).not.toContain(featured);
  });

  it('builds page 1 with only the featured post when there is one post', () => {
    const { featured, pages } = listingPages([post('enige', '2026-09-29')], 9);
    expect(featured?.id).toBe('enige');
    expect(pages).toEqual([[]]);
  });

  it('links page 1 to /blog and later pages to /blog/pagina/<n>', () => {
    expect(listingHref(1)).toBe('/blog');
    expect(listingHref(2)).toBe('/blog/pagina/2');
  });

  it('shows every page up to five, then gaps around the current one', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(1, 12)).toEqual([1, 2, 'gap', 12]);
    expect(pageItems(3, 12)).toEqual([1, 2, 3, 4, 'gap', 12]);
    // Phones: at most 5 page items, so 7 with both arrows (fits a 358 px row).
    expect(pageItems(3, 6, { compact: true })).toEqual([1, 2, 3, 'gap', 6]);
    expect(pageItems(6, 12, { compact: true })).toEqual([1, 'gap', 6, 'gap', 12]);
    for (let current = 1; current <= 12; current++) {
      expect(pageItems(current, 12, { compact: true }).length).toBeLessThanOrEqual(5);
    }
    expect(pageItems(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageItems(12, 12)).toEqual([1, 'gap', 11, 12]);
  });
});

describe('neighbours and related posts', () => {
  const posts = [post('c', '2026-03-01'), post('b', '2026-02-01'), post('a', '2026-01-01')];

  it('"Terug" is the newer post, "Volgende" the older one', () => {
    expect(neighbours(posts, 'b')).toEqual({ newer: posts[0], older: posts[2] });
    expect(neighbours(posts, 'c')).toEqual({ newer: undefined, older: posts[1] });
    expect(neighbours(posts, 'a')).toEqual({ newer: posts[1], older: undefined });
  });

  it('uses frontmatter `related`, else the newest other posts', () => {
    expect(relatedPosts(posts, posts[0]!).map((p) => p.id)).toEqual(['b', 'a']);
    const picked = { ...posts[0]!, data: { ...posts[0]!.data, related: ['a'] } };
    expect(relatedPosts(posts, picked).map((p) => p.id)).toEqual(['a']);
  });

  it('fails the build on a related slug that is not published', () => {
    const broken = { ...posts[0]!, data: { ...posts[0]!.data, related: ['bestaat-niet'] } };
    expect(() => relatedPosts(posts, broken)).toThrow(/related post "bestaat-niet"/);
    const self = { ...posts[0]!, data: { ...posts[0]!.data, related: ['c'] } };
    expect(() => relatedPosts(posts, self)).toThrow();
  });

  it('turns a post into a card', () => {
    expect(toCard(posts[0]!)).toEqual({
      href: '/blog/c',
      title: 'Titel c',
      excerpt: 'Samenvatting c',
      date: new Date('2026-03-01'),
      cover: undefined,
    });
  });
});

describe('dates and copy tokens', () => {
  it('formats dates in nl-BE without shifting the day (CONTENT-TODO 4.11)', () => {
    expect(formatDate(new Date('2026-09-29'), 'nl-BE')).toBe('29 september 2026');
    expect(formatDate(new Date('2026-01-01'), 'nl-BE')).toBe('1 januari 2026');
    expect(isoDate(new Date('2026-09-29'))).toBe('2026-09-29');
  });

  it('fills tokens and leaves unknown ones', () => {
    expect(fill('Pagina {n}', { n: 2 })).toBe('Pagina 2');
    expect(fill('{title} {x}', { title: 'A' })).toBe('A {x}');
  });
});

describe('BlogPosting structured data', () => {
  const base = {
    headline: 'Titel',
    description: 'Samenvatting',
    url: new URL('https://voordeelvinder.be/blog/titel'),
    datePublished: '2026-09-29',
    publisher: {
      name: 'VoordeelVinder',
      url: new URL('https://voordeelvinder.be/'),
      logo: new URL('https://voordeelvinder.be/icon-512.png'),
    },
    inLanguage: 'nl-BE',
  };

  it('describes the post, with the organisation as author by default', () => {
    const data = blogPosting(base);
    expect(data).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Titel',
      url: 'https://voordeelvinder.be/blog/titel',
      datePublished: '2026-09-29',
      dateModified: '2026-09-29',
      author: { '@type': 'Organization', name: 'VoordeelVinder' },
    });
    expect(data).not.toHaveProperty('image');
  });

  it('adds a named author, an update date and the cover', () => {
    const data = blogPosting({
      ...base,
      author: 'Redactie',
      dateModified: '2026-10-02',
      image: new URL('https://voordeelvinder.be/_astro/cover.png'),
    });
    expect(data.author).toEqual({ '@type': 'Person', name: 'Redactie' });
    expect(data.dateModified).toBe('2026-10-02');
    expect(data.image).toBe('https://voordeelvinder.be/_astro/cover.png');
  });
});

describe('related posts', () => {
  const post = (id: string, data: { draft?: boolean; related?: string[] }) => ({
    id,
    data: { draft: false, ...data },
  });

  it('fails on every environment when a published post points at a draft or an unknown post', () => {
    const posts = [
      post('a', { related: ['b', 'c'] }),
      post('b', { draft: true }),
      post('d', { draft: true, related: ['b'] }),
    ];
    expect(relatedProblems(posts as never)).toEqual([
      'blog/a.md: related post "b" is a draft',
      'blog/a.md: related post "c" does not exist',
    ]);
  });
});
