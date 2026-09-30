// The form's messages from _copy.json (docs/FLOWS.md step 6): errors, warnings, the e-mail
// suggestion and "Stap X van Y". No copy lives here, only the lookup rules.
import { fill } from '../copy';
import type { ErrorCode, WarningCode } from '../flow/engine';
import type { Field } from '../flow/schema';
import { TEXT_MAX_LENGTH } from '../flow/validators/choice';
import type { FormCopy } from './types';

/** Numbers in messages as Belgians write them: 100000 → "100.000". */
const numbers = new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 0 });

/** {min}, {max} and {unit} of a number field, {maxLength} of a text field. */
function placeholders(field: Field): Record<string, string> {
  if (field.type === 'number') {
    return { min: numbers.format(field.min), max: numbers.format(field.max), unit: field.unit };
  }
  if (field.type === 'text') return { maxLength: String(field.maxLength ?? TEXT_MAX_LENGTH) };
  return {};
}

/**
 * The message for an error code: `requiredByType[field.type]` for `required` when the copy has
 * one, else `errors[code]`, with the field's placeholders filled in.
 */
export function errorMessage(
  copy: Pick<FormCopy, 'errors' | 'requiredByType'>,
  field: Field,
  code: ErrorCode,
): string {
  const byType = code === 'required' ? copy.requiredByType?.[field.type] : undefined;
  return fill(byType ?? copy.errors[code], placeholders(field));
}

/** The message for a warning code, when the copy has one (needed once a field has soft limits). */
export function warningMessage(
  copy: Pick<FormCopy, 'warnings'>,
  field: Field,
  code: WarningCode,
): string | undefined {
  const template = copy.warnings?.[code];
  return template === undefined ? undefined : fill(template, placeholders(field));
}

/** "Stap 2 van 9". */
export function progressLabel(
  copy: Pick<FormCopy, 'progress'>,
  { step, total }: { step: number; total: number },
): string {
  return fill(copy.progress, { step, total });
}

/** "Bedoel je jan@gmail.com?". */
export function suggestionLabel(
  copy: Pick<FormCopy, 'emailSuggestion'>,
  suggestion: string,
): string {
  return fill(copy.emailSuggestion, { suggestion });
}

/**
 * The text for the aria-live region. A region only speaks when its text changes, so the same
 * message twice in a row (a second "Volgende" with the same error) gets a trailing no-break
 * space to be read again.
 */
export function liveText(previous: string, text: string): string {
  return previous === text ? `${text}\u00a0` : text;
}
