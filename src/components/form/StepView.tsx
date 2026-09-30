// One step: its title (h2, focused on every step change), optional subtitle and hint, and its
// visible fields. A field's type picks its component; short inputs pair up from md (the contact
// step's 2×2 grid).
import type { Ref } from 'react';

import type { Field, Step } from '../../lib/flow/schema';
import type { AnswerValue, Answers } from '../../lib/flow/types';
import { domId, fieldSpan } from '../../lib/form/labels';
import type { FormCopy } from '../../lib/form/types';
import { CheckField } from './fields/CheckField';
import { ChoiceField } from './fields/ChoiceField';
import { DaySlotField } from './fields/DaySlotField';
import { InputField } from './fields/InputField';
import { SelectField } from './fields/SelectField';
import type { FieldProps } from './fields/shared';
import { cx } from './ui';

export type StepViewProps = {
  step: Step;
  fields: Field[];
  answers: Answers;
  errors: Readonly<Record<string, string>>;
  warnings: Readonly<Record<string, string>>;
  suggestions: Readonly<Record<string, string>>;
  onChange: (field: Field, value: AnswerValue | undefined) => void;
  onBlur: (field: Field) => void;
  onApplySuggestion: (field: Field, value: string) => void;
  icons: Readonly<Record<string, string>>;
  flag: { src: string; width: number; height: number } | undefined;
  copy: FormCopy;
  headingRef: Ref<HTMLHeadingElement>;
};

export const STEP_TITLE_ID = 'formulier-stap-titel';

export function StepView({
  step,
  fields,
  answers,
  errors,
  warnings,
  suggestions,
  onChange,
  onBlur,
  onApplySuggestion,
  icons,
  flag,
  copy,
  headingRef,
}: StepViewProps) {
  const render = (field: Field) => {
    const common: Omit<FieldProps, 'field'> = {
      step,
      titleId: STEP_TITLE_ID,
      value: answers[field.id],
      error: errors[field.id],
      warning: warnings[field.id],
      onChange: (value) => onChange(field, value),
      onBlur: () => onBlur(field),
      icons,
      copy,
    };
    switch (field.type) {
      case 'single_choice':
      case 'yes_no':
        return <ChoiceField field={field} {...common} />;
      case 'select':
        return <SelectField field={field} {...common} />;
      case 'checkbox':
      case 'consent':
        return <CheckField field={field} {...common} />;
      case 'day_slot':
        return <DaySlotField field={field} {...common} />;
      default:
        return (
          <InputField
            field={field}
            {...common}
            suggestion={suggestions[field.id]}
            onApplySuggestion={(value) => onApplySuggestion(field, value)}
            flag={flag}
          />
        );
    }
  };

  return (
    <div>
      <h2
        id={STEP_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
        className="text-title-lg text-ink-900 focus:outline-none md:text-h3"
      >
        {step.title}
      </h2>
      {step.subtitle && <p className="mt-2 text-body-lg text-ink-600">{step.subtitle}</p>}
      {step.hint && <p className="mt-2 text-body text-ink-600">{step.hint}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-x-5">
        {fields.map((field) => (
          <div
            key={field.id}
            data-field={field.id}
            id={`${domId.field(field.id)}-vak`}
            className={cx(
              'min-w-0',
              fieldSpan(field) === 'half' ? 'md:col-span-1' : 'md:col-span-2',
            )}
          >
            {render(field)}
          </div>
        ))}
      </div>
    </div>
  );
}
