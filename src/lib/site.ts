// Site-wide content helpers (src/content/site.json).
import { type CollectionEntry, getEntry } from 'astro:content';

export type Site = CollectionEntry<'site'>['data'];
export type NavLink = Site['header']['nav'][number];

/** Which optional content exists; links with `requires` only show when it does. */
export interface Availability {
  blogPosts: boolean;
}

export function isLinkVisible(link: NavLink, available: Availability): boolean {
  return link.requires === undefined || available[link.requires];
}

/** Placeholder values that must never reach production (brief §6, §15 #9). */
export function placeholderProblems(site: Site): string[] {
  const problems: string[] = [];
  if (site.contact.email.todo) problems.push('contact.email is a placeholder');
  if (site.contact.phone.todo) problems.push('contact.phone is a placeholder');
  return problems;
}

/** Replaces `{year}` in copy such as the copyright line. */
export function withYear(template: string, year = new Date().getFullYear()): string {
  return template.replaceAll('{year}', String(year));
}

/** Loads site.json; a production build fails while it still holds placeholders. */
export async function getSite(): Promise<Site> {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('src/content/site.json is missing');
  if (__SITE_ENV__ === 'production') {
    const problems = placeholderProblems(entry.data);
    if (problems.length > 0) {
      throw new Error(
        `site.json has placeholders (see docs/CONTENT-TODO.md): ${problems.join('; ')}`,
      );
    }
  }
  return entry.data;
}

/** The blog arrives in Phase 3; until then there are no posts. */
export async function contentAvailability(): Promise<Availability> {
  return { blogPosts: false };
}
