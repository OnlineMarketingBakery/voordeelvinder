// Legal pages (src/content/legal/<slug>.md, served at /<slug>). The footer links to them, so
// the build fails when a footer link has no page, and a production build fails while a page is
// still a placeholder (CONTENT-TODO 3.1).
import { type CollectionEntry, getCollection } from 'astro:content';

import { getSite } from './site';

export type LegalEntry = CollectionEntry<'legal'>;

interface LegalLike {
  id: string;
  data: { placeholder: boolean };
}

export const legalHref = (id: string) => `/${id}`;

/** Footer links without a page behind them. */
export function missingLegalPages(footerHrefs: string[], pages: LegalLike[]): string[] {
  const hrefs = new Set(pages.map((page) => legalHref(page.id)));
  return footerHrefs.filter((href) => !hrefs.has(href));
}

export function legalPlaceholderProblems(pages: LegalLike[]): string[] {
  return pages
    .filter((page) => page.data.placeholder)
    .map((page) => `legal/${page.id}.md is placeholder text`);
}

/** Heading links for the table of contents: the `##` headings, in order. */
export function tocItems(headings: Array<{ depth: number; slug: string; text: string }>) {
  return headings
    .filter((heading) => heading.depth === 2)
    .map(({ slug, text }) => ({ id: slug, text }));
}

export async function getLegalPages(): Promise<LegalEntry[]> {
  const [pages, site] = await Promise.all([getCollection('legal'), getSite()]);
  const missing = missingLegalPages(
    site.footer.legal.items.map((item) => item.href),
    pages,
  );
  if (missing.length > 0) {
    throw new Error(`Footer links without a page in src/content/legal: ${missing.join(', ')}`);
  }
  if (__SITE_ENV__ === 'production') {
    const problems = legalPlaceholderProblems(pages);
    if (problems.length > 0) {
      throw new Error(
        `Placeholders on a production build (docs/CONTENT-TODO.md 3.1): ${problems.join('; ')}`,
      );
    }
  }
  return pages;
}
