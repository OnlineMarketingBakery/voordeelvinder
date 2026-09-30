// Campaign landing variants (/l/<slug>) are static pages, so the ad's query string (utm_*,
// fbclid, gclid, …) is only known in the browser: carry it over to every link into the form, so
// the form sees the same parameters as the landing page. Without JavaScript the links still work,
// only without the parameters.
import { withQuery } from '../lib/landing';

const { search } = window.location;
if (search) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/vergelijken"]')) {
    const href = link.getAttribute('href');
    if (href) link.setAttribute('href', withQuery(href, search));
  }
}
