// Campaign landing variants (/l/<slug>): framework-free, so the query helper also runs in the
// browser (src/scripts/keep-query.ts) and everything is unit-tested.
import type { LandingData, LandingProduct } from '../schemas/landing';
import type { Section } from '../schemas/page';

/** The page whose sections a variant reuses after its own hero (src/content/pages/<id>.json). */
export const landingBasePage: Record<LandingProduct, string> = {
  energie: 'home',
  zonnepanelen: 'zonnepanelen',
  thuisbatterij: 'thuisbatterij',
};

/** The form with the product preselected (brief §5: it skips step 1). */
export function compareHref(product: LandingProduct): string {
  return `/vergelijken/${product}`;
}

/** The form without a product (step 1); on a variant, links to it get the variant's product. */
const COMPARE = '/vergelijken';

/**
 * Adds the parameters of `search` (a location.search such as "?utm_source=meta&fbclid=…") to
 * `href`, keeping its path and hash. A parameter the link already sets wins, so a preselect in
 * the content (e.g. ?energie=both) is never overridden by the visitor's URL.
 */
export function withQuery(href: string, search: string): string {
  const incoming = new URLSearchParams(search);
  if (incoming.size === 0) return href;

  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const withoutHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = withoutHash.indexOf('?');
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? '' : withoutHash.slice(queryAt + 1));

  const own = new Set(params.keys());
  for (const [key, value] of incoming) {
    if (!own.has(key)) params.append(key, value);
  }
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

/** Deep copy of `value` in which every `href` to the product-less form gets the product. */
function retarget<T>(value: T, href: string): T {
  if (Array.isArray(value)) return value.map((item: unknown) => retarget(item, href)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === 'href' && item === COMPARE ? href : retarget(item, href),
      ]),
    ) as T;
  }
  return value;
}

/**
 * The sections of a variant: the product page's hero with the variant's copy and images, then
 * the rest of that page as it is. The home hero (energie) keeps its layout and art but loses the
 * eyebrow, the USP bar and the social proof, which belong to the homepage. Every CTA to the form
 * leads to /vergelijken/<product>.
 */
export function landingSections(landing: LandingData, base: Section[]): Section[] {
  const [first, ...rest] = base;
  if (first?.type !== 'hero') throw new Error('the product page must start with a hero');
  const href = compareHref(landing.product);
  const { eyebrow: _eyebrow, usps: _usps, socialProof: _socialProof, ...hero } = first;
  const { product, mascot } = landing.heroImage ?? {};

  const variantHero: Section = {
    ...hero,
    title: landing.title,
    body: landing.subtitle,
    cta: { label: landing.cta ?? hero.cta.label, href },
    art: {
      ...hero.art,
      product: product ?? hero.art.product,
      // A variant's own mascot is final; the product page's may still be a placeholder (todo).
      mascot: mascot ? { ...mascot, todo: false } : hero.art.mascot,
    },
  };
  return [variantHero, ...rest.map((section) => retarget(section, href))];
}
