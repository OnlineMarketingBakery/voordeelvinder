// Blog: the post frontmatter (src/content/blog/*.md) and the blog's interface copy in site.json.
import { z } from 'astro/zod';

import { imageKey, text } from './primitives';

/** A post slug (the file name without .md), e.g. "betaal-jij-te-veel". */
export const postSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a post file name');

/** Frontmatter of a blog post. The Markdown body is the article (from its first `##`). */
export const postFrontmatter = z
  .strictObject({
    /** The h1 and, unless `seo.title` is set, the page title. */
    title: text,
    /** Card text and, unless `seo.description` is set, the meta description. */
    excerpt: text,
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** An image from src/assets/images; without one the design's placeholder box shows. */
    cover: z.strictObject({ src: imageKey, alt: text }).optional(),
    author: text.optional(),
    tags: z.array(text).optional(),
    /** Shown in the "Recent bericht" slot; the newest featured post wins, else the newest post. */
    featured: z.boolean().default(false),
    /** Built on local, CI and staging only; never in production. */
    draft: z.boolean().default(false),
    /** A test post: staging only, a production build fails while one is published. */
    placeholder: z.boolean().default(false),
    /** Up to three other posts for "Misschien vind je dit ook leuk"; default the newest others. */
    related: z.array(postSlug).max(3).optional(),
    seo: z
      .strictObject({
        title: text.optional(),
        description: text.optional(),
        /** The share image (image key); default the cover, else the site's. */
        ogImage: imageKey.optional(),
        noindex: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((post) => !post.updated || post.updated >= post.date, {
    message: '`updated` is before `date`',
    path: ['updated'],
  });

export type PostFrontmatter = z.infer<typeof postFrontmatter>;

/** Replaces `{title}`, `{n}` or `{date}` in interface copy. */
const withTokens = (...tokens: string[]) =>
  text.refine((value) => tokens.every((token) => value.includes(`{${token}}`)), {
    message: `must contain ${tokens.map((token) => `{${token}}`).join(', ')}`,
  });

/** site.json `blog`: listing copy and the labels of the blog components. */
export const blogCopy = z.strictObject({
  listing: z.strictObject({
    /** The overview's visually hidden h1 and its page title. */
    title: text,
    /** Page title from page 2 on. */
    pagedTitle: withTokens('n'),
    description: text,
    featuredHeading: text,
    gridHeading: text,
    /** Cards per page in the grid (the featured post comes on top of page 1). */
    perPage: z.number().int().min(1).max(24),
  }),
  /** The (decorative) pill on the cards; the card title is the link. */
  readMore: text,
  relatedHeading: text,
  postNav: z.strictObject({
    label: text,
    previous: text,
    next: text,
    /** Visually hidden after the label, so the link names the post. */
    previousHint: withTokens('title'),
    nextHint: withTokens('title'),
  }),
  pagination: z.strictObject({
    label: text,
    page: withTokens('n'),
    previous: text,
    next: text,
  }),
});

export type BlogCopy = z.infer<typeof blogCopy>;
