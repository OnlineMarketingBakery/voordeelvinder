// Belgian phone numbers (brief §7.5), ported from the PromoCheckers rules:
//
// - Strip spaces and punctuation (. , - / ( ) and any whitespace), nothing else. Letters or other
//   symbols make the input invalid.
// - Read the rest as a Belgian number: "0475…" (trunk 0), "475…" (the form shows a fixed +32
//   chip), "+32 475…", "0032 475…", and a bare "32 475…" when that reading is valid.
// - The national number of a mobile is 9 digits starting with 4.
// - Never truncate or "fix" digits. "+32 0475 12 34 56" and "0032 0475…" are rejected: dropping
//   the 0 would be a fix. The one exception is the written convention "+32 (0)475 12 34 56",
//   where the bracketed 0 explicitly marks the trunk prefix as "leave out when calling from
//   abroad"; reading it that way changes no digit the visitor meant to dial.
// - Landlines are rejected unless the field sets `allowLandlines`. A landline's national number
//   is 8 digits starting with 1–9 (single-digit zones 2 Brussels, 3 Antwerp, 4 Liège, 9 Ghent;
//   two-digit zones otherwise), per the BIPT numbering plan. Non-geographic numbers (070, 077,
//   078, 0800, 090x) are never accepted, and neither is 045x–049x with 8 digits: that range is
//   mobile, so it is a mobile a digit short, not a Liège landline. This is a shape check, not
//   an allocation check.
//
// Output: E.164 ("+32475123456") and a display format ("+32 475 12 34 56").
import { empty, fail, isEmpty, ok } from './shared';
import type { FieldConfig, ValidationResult } from './types';

export type PhoneKind = 'mobile' | 'landline';

export interface PhoneNumber {
  /** "+32475123456" */
  e164: string;
  /** "+32 475 12 34 56" (mobile), "+32 2 123 45 67" / "+32 50 12 34 56" (landline) */
  display: string;
  kind: PhoneKind;
}

export interface PhoneOptions {
  allowLandlines?: boolean;
}

export type PhoneParseResult =
  { ok: true; value: PhoneNumber } | { ok: false; code: 'phone_invalid' | 'phone_landline' };

const SEPARATORS = /[\s.,\-/()]/g;
/** "+32 (0)…" or "0032 (0)…": the bracketed trunk prefix (see the header). */
const BRACKETED_TRUNK = /^(\+|00)\s*32\s*\(\s*0\s*\)/;
const MOBILE = /^4\d{8}$/;
const LANDLINE = /^[1-9]\d{7}$/;
/** Never a landline: non-geographic ranges, and 045x–049x, which is mobile (a digit short). */
const NEVER_LANDLINE = /^(4[5-9]|70|77|78|800|90)/;
const SINGLE_DIGIT_ZONES = '2349';

/** The national numbers the input can be read as, most likely first. */
function nationalReadings(compact: string): string[] {
  if (compact.startsWith('+')) return compact.startsWith('+32') ? [compact.slice(3)] : [];
  if (compact.startsWith('00')) return compact.startsWith('0032') ? [compact.slice(4)] : [];
  if (compact.startsWith('0')) return [compact.slice(1)];
  // "32475123456" is +32 475…; "475123456" is the national number typed after the +32 chip.
  // The lengths differ by two, so at most one reading is ever valid.
  return compact.startsWith('32') ? [compact.slice(2), compact] : [compact];
}

function kindOf(national: string): PhoneKind | null {
  if (MOBILE.test(national)) return 'mobile';
  if (LANDLINE.test(national) && !NEVER_LANDLINE.test(national)) return 'landline';
  return null;
}

function displayOf(national: string, kind: PhoneKind): string {
  const groups =
    kind === 'mobile'
      ? [national.slice(0, 3), national.slice(3, 5), national.slice(5, 7), national.slice(7)]
      : SINGLE_DIGIT_ZONES.includes(national[0]!)
        ? [national.slice(0, 1), national.slice(1, 4), national.slice(4, 6), national.slice(6)]
        : [national.slice(0, 2), national.slice(2, 4), national.slice(4, 6), national.slice(6)];
  return `+32 ${groups.join(' ')}`;
}

/** Reads a typed phone number as a Belgian number, without changing any digit. */
export function parsePhone(raw: string, options: PhoneOptions = {}): PhoneParseResult {
  const compact = raw
    .trim()
    .replace(BRACKETED_TRUNK, (_match, prefix: string) => `${prefix}32`)
    .replace(SEPARATORS, '');
  if (!/^\+?\d+$/.test(compact)) return { ok: false, code: 'phone_invalid' };

  // At most one reading is ever valid (see nationalReadings).
  const match = nationalReadings(compact)
    .map((national) => ({ national, kind: kindOf(national) }))
    .find((reading) => reading.kind !== null);
  if (!match) return { ok: false, code: 'phone_invalid' };
  const { national, kind } = match as { national: string; kind: PhoneKind };
  if (kind === 'landline' && !options.allowLandlines) return { ok: false, code: 'phone_landline' };
  return { ok: true, value: { e164: `+32${national}`, display: displayOf(national, kind), kind } };
}

export function validatePhone(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string') return fail('invalid_type');
  const result = parsePhone(value, { allowLandlines: field.allowLandlines ?? false });
  return result.ok ? ok(result.value) : fail(result.code);
}
