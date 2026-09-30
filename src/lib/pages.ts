// Page content helpers (src/content/pages/*.json).
import { type CollectionEntry, getEntry } from 'astro:content';

import type { Section } from '../schemas/page';

export type PageData = CollectionEntry<'pages'>['data'];

/** The page ends in a CTA band that reaches into the footer (Page `footerOverlap`). */
export function overlapsFooter(sections: Section[]): boolean {
  const last = sections.findLast((section) => !section.hidden);
  return last?.type === 'ctaBand' && last.overlapFooter === true;
}

/**
 * Placeholder content that must never reach production (brief §2): a hero image marked
 * `todo` and dummy testimonials (CONTENT-TODO 1.11). Hidden blocks are skipped.
 */
export function pagePlaceholderProblems(id: string, page: PageData): string[] {
  const problems: string[] = [];
  for (const block of page.sections) {
    if (block.hidden) continue;
    if (block.type === 'hero' && block.art.mascot.todo) {
      problems.push(`${id}: hero image "${block.art.mascot.src}" is a placeholder`);
    }
    if (block.type === 'testimonials') {
      block.items.forEach((item, index) => {
        // `placeholder: true`, or a fill-in such as "€[X]" left in the quote.
        if (item.placeholder || /\[[^\]]*\]/.test(item.quote)) {
          problems.push(`${id}: testimonial ${index + 1} ("${item.name}") is a placeholder`);
        }
      });
    }
  }
  return problems;
}

/** Fails a production build while a page still shows placeholders (staging shows them). */
export function failOnPlaceholders(id: string, page: PageData): void {
  if (__SITE_ENV__ !== 'production') return;
  const problems = pagePlaceholderProblems(id, page);
  if (problems.length > 0) {
    throw new Error(
      `Placeholders on a production build (docs/CONTENT-TODO.md): ${problems.join('; ')}`,
    );
  }
}

/** Loads a page as it is in its content file, placeholders included. */
export async function loadPage(id: string): Promise<PageData> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`src/content/pages/${id}.json is missing`);
  return entry.data;
}

/** Loads a page; a production build fails while it still shows placeholders. */
export async function getPage(id: string): Promise<PageData> {
  const page = await loadPage(id);
  failOnPlaceholders(id, page);
  return page;
}
