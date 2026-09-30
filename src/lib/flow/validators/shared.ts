import type { ErrorCode } from './errors';
import type { FieldConfig, ValidationResult } from './types';

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function fail(code: ErrorCode): { ok: false; code: ErrorCode } {
  return { ok: false, code };
}

/** No answer: `undefined`, `null`, or a string with only whitespace. */
export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

/** The result for an empty field: an error when required, "no answer" otherwise. */
export function empty(field: FieldConfig): ValidationResult<undefined> {
  return field.required ? fail('required') : ok(undefined);
}
