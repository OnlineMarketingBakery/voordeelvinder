// Choice fields (single_choice, select, yes_no), booleans (checkbox, consent) and free text.
import { empty, fail, isEmpty, ok } from './shared';
import type { FieldConfig, FieldOption, ValidationResult } from './types';

/** yes_no fields without their own options (brief §7.2: `"yes"` / `"no"`). */
export const YES_NO_OPTIONS: readonly FieldOption[] = [{ code: 'yes' }, { code: 'no' }];

/** text: the maximum length when the field sets none (a safety limit, not a content rule). */
export const TEXT_MAX_LENGTH = 100;

// C0 and C1 control characters, which whitespace normalisation doesn't already turn into spaces.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
// A spreadsheet reads a cell starting with these as a formula (the names go into the lead
// sheet). Tab and CR are trimmed off anyway; `+` and `-` stay allowed.
const FORMULA_START = /^[=@\t\r]/;

function validateCode(
  value: unknown,
  field: FieldConfig,
  options: readonly FieldOption[],
): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string') return fail('invalid_type');
  return options.some((option) => option.code === value) ? ok(value) : fail('option_unknown');
}

/** single_choice and select: the answer must be one of the field's option codes. */
export function validateChoice(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  return validateCode(value, field, field.options ?? []);
}

/** yes_no: `yes` / `no`, or the field's own options (e.g. with a "Weet ik niet" code). */
export function validateYesNo(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  return validateCode(value, field, field.options ?? YES_NO_OPTIONS);
}

/**
 * checkbox and consent: a boolean. Unchecked (or never touched) is `false`, not "no answer", so
 * the payload always has it (`is_business: false`, `newsletter: false`). A required one must be
 * checked (the terms consent).
 */
export function validateBoolean(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (value === undefined || value === null) return field.required ? fail('required') : ok(false);
  if (typeof value !== 'boolean') return fail('invalid_type');
  return field.required && !value ? fail('required') : ok(value);
}

/**
 * text: trimmed, runs of whitespace collapsed to one space, no control characters, and not
 * starting with `=` or `@` (a formula in the lead sheet).
 */
export function validateText(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string') return fail('invalid_type');
  const text = value.trim().replace(/\s+/g, ' ');
  if (CONTROL.test(text) || FORMULA_START.test(text)) return fail('text_invalid');
  return text.length > (field.maxLength ?? TEXT_MAX_LENGTH) ? fail('text_too_long') : ok(text);
}
