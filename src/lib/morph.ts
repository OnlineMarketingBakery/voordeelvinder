// The product card → form card morph (brief §6.1 signature morphs, docs/MOTION.md): the pure
// decisions, used by src/scripts/morph.ts. A view-transition name must be unique on a page, so
// only the card whose CTA was clicked gets it, in `pageswap`, right before the old page is
// captured. The form card on /vergelijken/<product> always carries the same name (it is the
// only one there), so the two morph into each other.

/** The view-transition-name shared by the clicked product card and the form card. */
export const FORM_CARD_MORPH = 'form-card';

/** A click as the morph needs it (a MouseEvent has all of these). */
export type ClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
};

/** A link as the morph needs it (an HTMLAnchorElement has all of these). */
export type LinkLike = { href: string; target: string; hasAttribute(name: string): boolean };

/**
 * The URL a click on a product card's link navigates to in this tab, when it opens a form page
 * (/vergelijken/<product>) of this site; null for anything else (a modifier key, another tab,
 * a download, another site or page).
 */
export function morphDestination(click: ClickLike, link: LinkLike, origin: string): URL | null {
  if (click.defaultPrevented || click.button !== 0) return null;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null;
  if ((link.target !== '' && link.target !== '_self') || link.hasAttribute('download')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(link.href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin || !/^\/vergelijken\/[^/]+\/?$/.test(url.pathname)) return null;
  return url;
}

/**
 * True when a navigation goes to the clicked link's page. Query and hash may differ: landing
 * pages add the ad's query string to the form links (src/scripts/keep-query.ts).
 */
export function samePage(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const path = (url: URL) => url.pathname.replace(/\/$/, '');
    return left.origin === right.origin && path(left) === path(right);
  } catch {
    return false;
  }
}
