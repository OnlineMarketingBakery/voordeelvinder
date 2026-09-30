// Field validators and normalisers for the flow engine (brief §7.1, §7.5). Pure and
// framework-free: the React island validates on blur and "Volgende", the server re-validates
// the submission with the same functions.
import { validateBoolean, validateChoice, validateText, validateYesNo } from './choice';
import { validateDaySlot } from './day-slot';
import { validateEmail } from './email';
import { validateNumber } from './number';
import { validatePhone } from './phone';
import { validatePostcode } from './postcode';
import type { FieldConfig, FieldType, ValidationResult, Validator } from './types';

/** One validator per field type. Each returns the normalised value or an error code. */
export const validators: Record<FieldType, Validator> = {
  postcode: validatePostcode,
  phone: validatePhone,
  email: validateEmail,
  number: validateNumber,
  text: validateText,
  select: validateChoice,
  single_choice: validateChoice,
  yes_no: validateYesNo,
  checkbox: validateBoolean,
  consent: validateBoolean,
  day_slot: validateDaySlot,
};

/** Validates one answer with the validator for its field's type. */
export function validateField(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  return validators[field.type](value, field);
}

export * from './choice';
export * from './day-slot';
export * from './email';
export * from './errors';
export * from './number';
export * from './phone';
export * from './postcode';
export * from './types';
