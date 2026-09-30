// What every field component gets, and the hint / warning / error lines under a field. Error
// lines are linked to their control with aria-describedby (brief §7.6).
import type { Field, Step } from '../../../lib/flow/schema';
import type { AnswerValue } from '../../../lib/flow/types';
import { domId } from '../../../lib/form/labels';
import type { FormCopy } from '../../../lib/form/types';
import { FadeInText } from '../motion';

export type FieldProps<F extends Field = Field> = {
  field: F;
  step: Step;
  /** The step heading's id: labels the field that has no label of its own. */
  titleId: string;
  value: AnswerValue | undefined;
  error: string | undefined;
  warning: string | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  onBlur: () => void;
  icons: Readonly<Record<string, string>>;
  copy: FormCopy;
};

/** aria-describedby for a field's control: its hint, extra ids (the +32 chip), its error. */
export function describedBy(
  field: Field,
  error: string | undefined,
  warning: string | undefined,
  ...extra: (string | undefined)[]
): string | undefined {
  const ids = [
    field.hint ? domId.hint(field.id) : undefined,
    ...extra,
    error ? domId.error(field.id) : warning ? domId.warning(field.id) : undefined,
  ].filter((id): id is string => id !== undefined);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function FieldHint({ field }: { field: Field }) {
  if (!field.hint) return null;
  return (
    <p id={domId.hint(field.id)} className="mt-2 text-body text-ink-600">
      {field.hint}
    </p>
  );
}

/** The error (blocks "Volgende") or else the warning (doesn't) under a field; fades in. */
export function FieldMessage({
  field,
  error,
  warning,
}: {
  field: Field;
  error: string | undefined;
  warning: string | undefined;
}) {
  if (error) {
    return (
      <FadeInText id={domId.error(field.id)} className="mt-2 text-body text-danger">
        {error}
      </FadeInText>
    );
  }
  if (!warning) return null;
  return (
    <FadeInText id={domId.warning(field.id)} className="mt-2 text-body text-ink-600">
      {warning}
    </FadeInText>
  );
}

/** The class of a question placed above its control (Figma 91:11419: 18px SemiBold). */
export const labelClass = 'mb-2 block text-label text-ink-900';

/** A second question on a step reads like the step title (Figma 90:9450, Step 5). */
export const questionClass = 'mb-5 text-title-lg text-ink-900 md:text-h3';
