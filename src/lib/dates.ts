// Dates in content (blog posts, "Laatst bijgewerkt"). Frontmatter dates are calendar days, which
// YAML reads as midnight UTC, so they are formatted in UTC: never a day early or late.

/** "29 september 2026" for nl-BE (CONTENT-TODO 4.11). */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "2026-09-29", for <time datetime> and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
