// Submitting the form (brief §7.6, §9). Phase 4 stub: the submission is built and validated,
// but nothing is sent; Phase 5 posts it to /api/lead. Never log a submission: it holds
// personal data (brief §13).
import type { Submission, SubmissionContext } from '../flow/engine';
import type { Derived, Product } from '../flow/types';
import { isTestVisit } from './initial';

/** The thank-you page per product (brief §5; built in PR 18). */
export function thanksPath(product: Product): string {
  return `/bedankt/${product}`;
}

/** The product's own page (energy has none: the home page is its page, like /l/ variants). */
export function productPagePath(product: Product): string {
  return product === 'energie' ? '/' : `/${product}`;
}

export type ContextInput = {
  leadId: string;
  eventId: string;
  derived: Derived;
  /** location.pathname */
  page: string;
  /** location.search */
  search: string;
  now: Date;
};

/**
 * What the form knows besides the answers. Tracking and the cookie state arrive with the cookie
 * banner and tag setup (Phase 5): until then every tracking key is sent empty and cookies as
 * not accepted.
 */
export function submissionContext({
  leadId,
  eventId,
  derived,
  page,
  search,
  now,
}: ContextInput): SubmissionContext {
  return {
    lead_id: leadId,
    event_id: eventId,
    submitted_at: now.toISOString(),
    derived,
    tracking: {},
    cookies: { analytics: false, marketing: false },
    page,
    // TODO(Phase 5): keep ?test=1 for the session, show the TESTMODUS badge (brief §9.4).
    test: isTestVisit(search),
  };
}

/**
 * How long after "Volgende" moved to a new step another "Volgende" is ignored when nothing was
 * answered in between: a double click or double tap would otherwise also validate (or submit)
 * the new step before the visitor saw it.
 */
export const STEP_GUARD_MS = 350;

/**
 * Whether a "Volgende" is the second half of a double click/tap: `advancedAt` is the time
 * (the submit event's timeStamp) the previous one moved forward, or null when the visitor has answered or
 * gone back since.
 */
export function isRepeatSubmit(advancedAt: number | null, now: number): boolean {
  return advancedAt !== null && now - advancedAt >= 0 && now - advancedAt < STEP_GUARD_MS;
}

/**
 * Sends the lead. Phase 4: does nothing and never touches the network; Phase 5 replaces it with
 * the POST to /api/lead and its error handling.
 */
export async function sendLead(submission: Submission): Promise<void> {
  void submission;
}

/**
 * Where "Terug" goes on the first shown step (brief §7.6): the product page when the product
 * was preselected, else the previous page when it is on this site, else `fallback`.
 */
export function firstStepBack({
  preselected,
  productPage,
  fallback,
  referrer,
  origin,
  historyLength,
}: {
  preselected: boolean;
  productPage: string;
  fallback: string;
  referrer: string;
  origin: string;
  historyLength: number;
}): { kind: 'history' } | { kind: 'href'; href: string } {
  if (preselected) return { kind: 'href', href: productPage };
  let sameSite: boolean;
  try {
    sameSite = referrer !== '' && new URL(referrer).origin === origin;
  } catch {
    sameSite = false;
  }
  return sameSite && historyLength > 1 ? { kind: 'history' } : { kind: 'href', href: fallback };
}
