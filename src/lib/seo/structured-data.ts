// schema.org structured data (brief §11): Organization and WebSite on the homepage; FAQPage
// comes with the FAQ block.
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
