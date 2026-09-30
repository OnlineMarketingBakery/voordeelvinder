// The footer newsletter's loader (src/scripts/newsletter.ts), its pure part. No imports: the
// loader is on every page and stays tiny; the e-mail validator and Turnstile come with
// src/scripts/newsletter-form.ts (src/lib/newsletter.ts would bring them along).

/**
 * What the visitor is told when the form's script (src/scripts/newsletter-form.ts) didn't load
 * on a submit. Offline (navigator.onLine false): that there is no connection; a later submit
 * tries again. Online, trying again can't help: browsers keep a failed module import for the
 * life of the page, and a deploy removes the old file. So the form offers a reload button, and
 * never reloads by itself (offline, that lands on the browser's error page and drops the typed
 * address).
 */
export function loadFailure(online: boolean): 'offline' | 'reload' {
  return online ? 'reload' : 'offline';
}
