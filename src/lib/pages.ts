// Page content helpers (src/content/pages/*.json).
import { type CollectionEntry, getEntry } from 'astro:content';

export type PageData = CollectionEntry<'pages'>['data'];

/** Placeholder content that must never reach production (brief §2, CONTENT-TODO 1.9, 1.11). */
export function pagePlaceholderProblems(id: string, page: PageData): string[] {
  const problems: string[] = [];
  for (const block of page.sections) {
    if (block.hidden) continue;
    if (block.type === 'hero' && block.art.mascot.todo) {
      problems.push(`${id}: hero image "${block.art.mascot.src}" is a placeholder`);
    }
  }
  return problems;
}

/** Loads a page; a production build fails while it still shows placeholders. */
export async function getPage(id: string): Promise<PageData> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`src/content/pages/${id}.json is missing`);
  if (__SITE_ENV__ === 'production') {
    const problems = pagePlaceholderProblems(id, entry.data);
    if (problems.length > 0) {
      throw new Error(
        `Placeholders on a production build (docs/CONTENT-TODO.md): ${problems.join('; ')}`,
      );
    }
  }
  return entry.data;
}
