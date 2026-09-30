// Blog posts (src/content/blog/*.md): which posts are published, the listing pages, a post's
// neighbours and related posts. The helpers are pure (tested in tests/unit/blog.test.ts);
// getPosts() reads the collection.
import { type CollectionEntry, getCollection } from 'astro:content';

import type { SiteEnv } from '../server/env';

export type Post = CollectionEntry<'blog'>;

/** The fields the helpers need, so tests can pass plain objects. */
export interface PostLike {
  id: string;
  data: {
    title: string;
    excerpt: string;
    date: Date;
    featured: boolean;
    draft: boolean;
    placeholder: boolean;
    related?: string[] | undefined;
    cover?: { src: string; alt: string } | undefined;
  };
}

/** What a card or the featured post shows. */
export interface CardPost {
  href: string;
  title: string;
  excerpt: string;
  date: Date;
  cover?: { src: string; alt: string } | undefined;
}

export const BLOG_PATH = '/blog';

export const postHref = (id: string) => `${BLOG_PATH}/${id}`;

/** Listing page n: 1 → /blog, n → /blog/pagina/n (/blog/2 would clash with a post slug). */
export const listingHref = (page: number) =>
  page <= 1 ? BLOG_PATH : `${BLOG_PATH}/pagina/${page}`;

export function toCard(post: PostLike): CardPost {
  const { title, excerpt, date, cover } = post.data;
  return { href: postHref(post.id), title, excerpt, date, cover };
}

/** Newest first (ties by file name); drafts only outside production. */
export function publishedPosts<T extends PostLike>(posts: T[], siteEnv: SiteEnv): T[] {
  return posts
    .filter((post) => siteEnv !== 'production' || !post.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

/** Test posts that must never reach production. */
export function postPlaceholderProblems(posts: PostLike[]): string[] {
  return posts
    .filter((post) => post.data.placeholder)
    .map((post) => `blog/${post.id}.md is a placeholder post`);
}

/** The "Recent bericht" post: the newest featured one, else the newest. */
export function featuredPost<T extends PostLike>(posts: T[]): T | undefined {
  return posts.find((post) => post.data.featured) ?? posts[0];
}

/**
 * The listing: the featured post on top of page 1, the other posts in pages of `perPage`.
 * No posts, no pages (the blog routes are then not built). One post: page 1 with only it.
 */
export function listingPages<T extends PostLike>(
  posts: T[],
  perPage: number,
): { featured: T | undefined; pages: T[][] } {
  const featured = featuredPost(posts);
  if (!featured) return { featured, pages: [] };
  const rest = posts.filter((post) => post !== featured);
  const pages: T[][] = [];
  for (let start = 0; start < rest.length; start += perPage) {
    pages.push(rest.slice(start, start + perPage));
  }
  return { featured, pages: pages.length > 0 ? pages : [[]] };
}

/**
 * The page links: all of them up to 5 pages, else the first, the last and the current one with
 * its neighbours, with a gap where pages are left out (1 … 4 5 6 … 12).
 */
export function pageItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const shown = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  shown.forEach((page, index) => {
    const previous = shown[index - 1];
    if (previous !== undefined && page - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) items.push('gap');
    items.push(page);
  });
  return items;
}

/** The posts before and after this one in listing order (newest first). */
export function neighbours<T extends PostLike>(
  posts: T[],
  id: string,
): { newer: T | undefined; older: T | undefined } {
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) return { newer: undefined, older: undefined };
  return { newer: posts[index - 1], older: posts[index + 1] };
}

/** Frontmatter `related`, else the newest other posts. An unknown slug fails the build. */
export function relatedPosts<T extends PostLike>(posts: T[], post: T, max = 3): T[] {
  const { related } = post.data;
  if (!related) return posts.filter((other) => other.id !== post.id).slice(0, max);
  return related.slice(0, max).map((slug) => {
    const found = posts.find((other) => other.id === slug && other.id !== post.id);
    if (!found) throw new Error(`blog/${post.id}.md: related post "${slug}" is not published`);
    return found;
  });
}

/** Published posts, newest first; a production build fails on a placeholder post. */
export async function getPosts(): Promise<Post[]> {
  const posts = publishedPosts(await getCollection('blog'), __SITE_ENV__);
  if (__SITE_ENV__ === 'production') {
    const problems = postPlaceholderProblems(posts);
    if (problems.length > 0) {
      throw new Error(
        `Placeholders on a production build (docs/CONTENT-TODO.md): ${problems.join('; ')}`,
      );
    }
  }
  return posts;
}
