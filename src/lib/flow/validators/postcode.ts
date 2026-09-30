// Belgian postcode (brief §7.5): 4 digits, 1000–9999. The region and province are derived from
// the number, never asked.
//
// Regions follow the brief exactly. Provinces follow bpost's range scheme (the first digits of
// the postcode follow the provinces, as described in bpost's postcode list and Wikipedia's
// "List of postal codes in Belgium"). Brussels-Capital is a region, not a province; it gets the
// province code `brussel` so every valid postcode has one. Assumption: a range scheme, not a
// per-municipality list, so a rare border exception could get a neighbouring province. The
// province is informational; qualification uses the region (brief §8).
import { empty, fail, isEmpty, ok } from './shared';
import type { FieldConfig, ValidationResult } from './types';

export type Region = 'brussels' | 'wallonia' | 'flanders';

export type Province =
  | 'brussel'
  | 'waals-brabant'
  | 'vlaams-brabant'
  | 'antwerpen'
  | 'limburg'
  | 'luik'
  | 'namen'
  | 'henegouwen'
  | 'luxemburg'
  | 'west-vlaanderen'
  | 'oost-vlaanderen';

/** Inclusive ranges, in order (brief §7.5). */
const REGION_RANGES: readonly (readonly [number, number, Region])[] = [
  [1000, 1299, 'brussels'],
  [1300, 1499, 'wallonia'],
  [1500, 3999, 'flanders'],
  [4000, 7999, 'wallonia'],
  [8000, 9999, 'flanders'],
];

/** Inclusive ranges, in order (bpost). */
const PROVINCE_RANGES: readonly (readonly [number, number, Province])[] = [
  [1000, 1299, 'brussel'],
  [1300, 1499, 'waals-brabant'],
  [1500, 1999, 'vlaams-brabant'],
  [2000, 2999, 'antwerpen'],
  [3000, 3499, 'vlaams-brabant'],
  [3500, 3999, 'limburg'],
  [4000, 4999, 'luik'],
  [5000, 5999, 'namen'],
  [6000, 6599, 'henegouwen'],
  [6600, 6999, 'luxemburg'],
  [7000, 7999, 'henegouwen'],
  [8000, 8999, 'west-vlaanderen'],
  [9000, 9999, 'oost-vlaanderen'],
];

const POSTCODE = /^[1-9]\d{3}$/;

function lookup<T>(ranges: readonly (readonly [number, number, T])[], postcode: number): T {
  // The ranges cover 1000–9999 without gaps, and callers pass only valid postcodes.
  return ranges.find(([from, to]) => postcode >= from && postcode <= to)![2];
}

/** The normalised postcode ("9000"), or `null` when it isn't one. Accepts a string or a number. */
export function parsePostcode(value: unknown): string | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  const trimmed = text.trim();
  return POSTCODE.test(trimmed) ? trimmed : null;
}

/** The region for a valid postcode ("9000" → flanders). */
export function regionFor(postcode: string): Region {
  return lookup(REGION_RANGES, Number(postcode));
}

/** The province for a valid postcode ("9000" → oost-vlaanderen). */
export function provinceFor(postcode: string): Province {
  return lookup(PROVINCE_RANGES, Number(postcode));
}

export function validatePostcode(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string' && typeof value !== 'number') return fail('invalid_type');
  const postcode = parsePostcode(value);
  return postcode ? ok(postcode) : fail('postcode_invalid');
}

export interface PostcodeDerived {
  postcode?: string;
  region?: Region;
  province?: Province;
}

/**
 * Derived values for the engine's JSONLogic context and the payload's `derived` block
 * (brief §9.2): `{ postcode, region, province }`, or `{}` while the postcode answer is missing or
 * invalid.
 */
export function derive(
  answers: Readonly<Record<string, unknown>>,
  postcodeField = 'postcode',
): PostcodeDerived {
  const postcode = parsePostcode(answers[postcodeField]);
  if (!postcode) return {};
  return { postcode, region: regionFor(postcode), province: provinceFor(postcode) };
}
