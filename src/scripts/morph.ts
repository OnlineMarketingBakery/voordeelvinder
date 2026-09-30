// Product card → form card (brief §6.1, docs/MOTION.md). Loaded by ProductSpotlight.astro, so
// only pages with a product card run it. The click remembers which card's CTA was used; in
// `pageswap` (the old page is about to be captured for the view transition) that card, and
// only that one, gets `view-transition-name: form-card`, the name of the form card on
// /vergelijken/<product>. Browsers without cross-document view transitions never fire
// `pageswap` with a transition, so nothing changes for them. With reduced motion the card is
// not named: the page crossfades like any other.
import { FORM_CARD_MORPH, morphDestination, samePage } from '../lib/morph';

let pending: { card: HTMLElement; url: string } | null = null;
const named = new Set<HTMLElement>();

function clearNames() {
  for (const card of named) card.style.removeProperty('view-transition-name');
  named.clear();
}

document.addEventListener('click', (event) => {
  pending = null;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement)) return;
  const card = link.closest<HTMLElement>('[data-morph="form-card"]');
  if (!card) return;
  const url = morphDestination(event, link, window.location.origin);
  if (url) pending = { card, url: url.href };
});

window.addEventListener('pageswap', (event) => {
  const clicked = pending;
  pending = null;
  if (!clicked || !event.viewTransition) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = event.activation?.entry?.url;
  if (to && !samePage(to, clicked.url)) return;
  clearNames();
  clicked.card.style.setProperty('view-transition-name', FORM_CARD_MORPH);
  named.add(clicked.card);
});

// Back from the form (bfcache): the name may still be set. Let the reverse morph play, then
// clear it, so the next click starts clean.
window.addEventListener('pagereveal', (event) => {
  if (named.size === 0) return;
  const transition = event.viewTransition;
  // then(f, f), not finally: Chromium rejects `finished` when it aborts the transition.
  if (transition) void transition.finished.then(clearNames, clearNames);
  else clearNames();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && !('onpagereveal' in window)) clearNames();
});
