// The thank-you celebration (brief §6.1: "celebrate on the thank-you page, once the lead is
// safe"; docs/MOTION.md). CSS does the motion (ThankYou.astro: the badge hops once, confetti
// bursts out, nothing with reduced motion); this script only decides whether it plays, by
// setting data-celebrate on every [data-celebration] element.

/**
 * Whether the lead behind this visit is safe. Phase 4 sends nothing, so every visit celebrates.
 *
 * TODO(Phase 5): the form island sets a sessionStorage flag (e.g.
 * `voordeelvinder:lead-safe` = the product) once POST /api/lead has answered OK, right before
 * it navigates here. Celebrate only when the flag matches this page's product, then remove it,
 * so a direct visit or a reload shows the page without the cheer (the same flag can gate the
 * generate_lead push: a direct visit never fires a lead, brief §12, §14).
 */
export function leadIsSafe(): boolean {
  return true;
}

export function celebrate(root: ParentNode = document): void {
  if (!leadIsSafe()) return;
  root.querySelectorAll<HTMLElement>('[data-celebration]').forEach((element) => {
    element.setAttribute('data-celebrate', '');
  });
}

celebrate();
