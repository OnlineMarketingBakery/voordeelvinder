// schema.org structured data (brief §11): Organization and WebSite on the homepage; FAQPage on
// every page with a visible FAQ block; BlogPosting on blog posts.
export interface OrganizationInput {
  name: string;
  url: URL;
  logo: URL;
}

export function organization({ name, url, logo }: OrganizationInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: url.href,
    logo: logo.href,
  };
}

export function website({ name, url, inLanguage }: { name: string; url: URL; inLanguage: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: url.href,
    inLanguage,
  };
}

/**
 * FAQPage from the questions the page shows (answered and visible only: structured data must
 * match the visible content). Returns undefined when there are none.
 */
export function faqPage(items: Array<{ question: string; answer: string }>) {
  if (items.length === 0) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export interface BlogPostingInput {
  headline: string;
  description: string;
  url: URL;
  datePublished: string;
  dateModified?: string | undefined;
  image?: URL | undefined;
  /** A named author; without one the organisation is the author. */
  author?: string | undefined;
  publisher: { name: string; url: URL; logo: URL };
  inLanguage: string;
}

export function blogPosting(input: BlogPostingInput) {
  const publisher = {
    '@type': 'Organization',
    name: input.publisher.name,
    url: input.publisher.url.href,
    logo: { '@type': 'ImageObject', url: input.publisher.logo.href },
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.headline,
    description: input.description,
    url: input.url.href,
    mainEntityOfPage: input.url.href,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    ...(input.image ? { image: input.image.href } : {}),
    author: input.author ? { '@type': 'Person', name: input.author } : publisher,
    publisher,
    inLanguage: input.inLanguage,
  };
}

/** Serialises JSON-LD safely for a <script> tag (no `</script>` break-out). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/** "Zonnepanelen" → "Zonnepanelen | VoordeelVinder"; the site name alone stays as is. */
export function pageTitle(title: string, siteName: string, template: string): string {
  return title === siteName ? title : template.replace('{title}', title);
}
