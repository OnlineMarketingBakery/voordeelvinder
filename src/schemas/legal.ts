// Legal pages: the frontmatter of src/content/legal/*.md and their interface copy in site.json.
import { z } from 'astro/zod';

import { text } from './primitives';

export const legalFrontmatter = z.strictObject({
  /** The h1 and the page title. */
  title: text,
  seo: z.strictObject({
    description: text,
    noindex: z.boolean().optional(),
  }),
  /** "Laatst bijgewerkt" under the title; only once the final text is in. */
  lastUpdated: z.coerce.date().optional(),
  /**
   * The text is not the lawyer's final text (CONTENT-TODO 3.1). Staging shows a notice; a
   * production build fails. Defaults to true, so a new page must be signed off explicitly.
   */
  placeholder: z.boolean().default(true),
});

export type LegalFrontmatter = z.infer<typeof legalFrontmatter>;

/** site.json `legal`. */
export const legalCopy = z.strictObject({
  tocLabel: text,
  /** `{date}` is the formatted `lastUpdated`. */
  lastUpdated: text.includes('{date}'),
  placeholderNotice: text,
});

export type LegalCopy = z.infer<typeof legalCopy>;
