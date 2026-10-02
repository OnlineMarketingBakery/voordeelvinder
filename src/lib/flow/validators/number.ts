// Whole numbers such as kWh per year (brief §7.3, §7.5): integers only. Belgian thousands
// separators are accepted: "3500", "3.500", "3 500", "1.000.000" (dots or spaces, groups of
// three, the first without a leading zero). A decimal is rejected, never rounded: "3,5", "3.50",
// "3500,00", "0.500". Units or other text
// ("3500 kWh") are not numbers. `min`/`max` are hard limits; outside `softMin`/`softMax` the
// value is valid with the warning `outside_typical`.
import { empty, fail, isEmpty, ok } from './shared';
import type { FieldConfig, ValidationResult } from './types';

const PLAIN = /^-?\d+$/;
/** Thousands groups; the first group has no leading zero ("0.500" is a decimal, not 500). */
const GROUPED = /^-?[1-9]\d{0,2}(?:[.\s]\d{3})+$/;
const DECIMAL = /^-?\d[\d.\s]*[.,]\d+$/;

export type ParsedNumber =
  { ok: true; value: number } | { ok: false; code: 'number_invalid' | 'number_not_integer' };

/** Reads a typed whole number ("3.500" → 3500) without rounding anything. */
export function parseInteger(raw: string | number): ParsedNumber {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, code: 'number_invalid' };
    if (!Number.isInteger(raw)) return { ok: false, code: 'number_not_integer' };
    return Number.isSafeInteger(raw)
      ? { ok: true, value: raw }
      : { ok: false, code: 'number_invalid' };
  }
  const text = raw.trim();
  if (PLAIN.test(text) || GROUPED.test(text))
    return parseInteger(Number(text.replace(/[.\s]/g, '')));
  return { ok: false, code: DECIMAL.test(text) ? 'number_not_integer' : 'number_invalid' };
}

/**
 * A number with at most `decimals` decimals ("3,5" or "3.5" → 3.5), for fields such as an
 * inverter's kW. No thousands separators: "3.500" with one decimal allowed is 3500, not 3.5.
 */
export function parseDecimal(raw: string | number, decimals: number): ParsedNumber {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, code: 'number_invalid' };
    const scaled = raw * 10 ** decimals;
    return Math.abs(scaled - Math.round(scaled)) < 1e-9
      ? { ok: true, value: raw }
      : { ok: false, code: 'number_not_integer' };
  }
  const text = raw.trim();
  if (new RegExp(`^\\d+(?:[.,]\\d{1,${decimals}})?$`).test(text)) {
    return { ok: true, value: Number(text.replace(',', '.')) };
  }
  return parseInteger(text);
}

export function validateNumber(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string' && typeof value !== 'number') return fail('invalid_type');
  const parsed = field.decimals ? parseDecimal(value, field.decimals) : parseInteger(value);
  if (!parsed.ok) return fail(parsed.code);
  const n = parsed.value;
  if (field.min !== undefined && n < field.min) return fail('number_too_low');
  if (field.max !== undefined && n > field.max) return fail('number_too_high');
  const atypical =
    (field.softMin !== undefined && n < field.softMin) ||
    (field.softMax !== undefined && n > field.softMax);
  return atypical ? { ok: true, value: n, warning: 'outside_typical' } : ok(n);
}
