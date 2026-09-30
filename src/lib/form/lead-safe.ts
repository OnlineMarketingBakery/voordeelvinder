// The "lead is safe" flag (brief §9.1 step 9, §10): once POST /api/lead has answered OK, the form
// saves { event_id, product } in sessionStorage and goes to /bedankt/<product>. The thank-you page
// celebrates only when the flag is there for its own product, and removes it, so a direct visit
// or a reload shows the page without the cheer. Phase 6 pushes `generate_lead` from the same
// read (a direct visit never fires a lead).
//
// No imports on purpose: the thank-you page's script (src/scripts/celebrate.ts) loads this, and
// must not pull in the form engine.

export const LEAD_SAFE_KEY = 'voordeelvinder:lead-safe';

export type LeadSafe = { event_id: string; product: string };

type Store = Pick<Storage, 'getItem' | 'removeItem'>;

export function serializeLeadSafe(value: LeadSafe): string {
  return JSON.stringify({ event_id: value.event_id, product: value.product });
}

/** The stored flag, or null when it is missing or not { event_id, product } strings. */
export function parseLeadSafe(raw: string | null): LeadSafe | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { event_id: eventId, product } = data as Record<string, unknown>;
  if (typeof eventId !== 'string' || eventId === '') return null;
  if (typeof product !== 'string' || product === '') return null;
  return { event_id: eventId, product };
}

/** The product of a thank-you URL: "/bedankt/energie" or "/bedankt/energie/" → "energie". */
export function thanksProduct(pathname: string): string | null {
  return /^\/bedankt\/([a-z]+)\/?$/.exec(pathname)?.[1] ?? null;
}

/**
 * Reads and removes the flag (it is good for one thank-you page view), and returns it only when
 * it was set for `product`. Null without storage, without a flag, or for another product.
 */
export function takeLeadSafe(store: Store | null, product: string | null): LeadSafe | null {
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(LEAD_SAFE_KEY);
    if (raw !== null) store.removeItem(LEAD_SAFE_KEY);
  } catch {
    return null;
  }
  const flag = parseLeadSafe(raw);
  return flag && product !== null && flag.product === product ? flag : null;
}
