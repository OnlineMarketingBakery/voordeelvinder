// The thank-you celebration (brief §6.1: "celebrate on the thank-you page, once the lead is
// safe"; docs/MOTION.md). CSS does the motion (ThankYou.astro: the badge hops once, confetti
// bursts out, nothing with reduced motion); this script only decides whether it plays, by
// setting data-celebrate on every [data-celebration] element.
//
// It plays only when the form left the "lead is safe" flag for this page's product
// (src/lib/form/lead-safe.ts), right after POST /api/lead answered OK. The flag is removed on
// the first read, so a direct visit or a reload shows the page without the cheer. Phase 6: push
// `generate_lead` from the same read (brief §10), never from a second one.
import { takeLeadSafe, thanksProduct, type LeadSafe } from '../lib/form/lead-safe';

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** The flag for this page's product, removed once read; null for a direct visit. */
export function leadIsSafe(): LeadSafe | null {
  return takeLeadSafe(sessionStore(), thanksProduct(window.location.pathname));
}

export function celebrate(root: ParentNode = document): LeadSafe | null {
  const lead = leadIsSafe();
  if (!lead) return null;
  root.querySelectorAll<HTMLElement>('[data-celebration]').forEach((element) => {
    element.setAttribute('data-celebrate', '');
  });
  return lead;
}

celebrate();
