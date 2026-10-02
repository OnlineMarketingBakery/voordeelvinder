// The results and ordering screens (ADR 0013) run on placeholder data, so they exist everywhere
// except production: there they answer 404 until the tariff API and the order hand-off exist.
import type { SiteEnv } from '../../server/env';

export function orderPreview(siteEnv: SiteEnv): boolean {
  return siteEnv !== 'production';
}

/**
 * Where the single-page form goes after a sent lead: the results screen on staging only (local
 * and CI keep the thank-you page, which the e2e tests check).
 */
export function resultsAfterLead(siteEnv: SiteEnv): boolean {
  return siteEnv === 'staging';
}

export const RESULTS_PATH = '/vergelijken/energie/resultaten';
export const ORDER_PATHS = {
  details: '/bestellen/gegevens',
  connection: '/bestellen/aansluiting',
  review: '/bestellen/controle',
  thanks: '/bestellen/bedankt',
} as const;
