// One step: its title (h2, focused on every step change), optional subtitle and hint, and its
// visible fields. A field's type picks its component; short inputs pair up from md (the contact
// step's 2×2 grid). Fields with visibleIf expand and collapse, and a field shakes once when
// "Volgende" finds an error in it (FieldCell, brief §6.1). `data-stagger` marks what comes in
// one after the other when the step appears: the title, subtitle and hint, then each field (or
// each answer card, ChoiceField) (StepStage, docs/MOTION.md).
import { useState, type Ref } from 'react';

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
import { FieldCell, FieldList } from './motion';
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
  /**
   * The last "Volgende" that found errors: its count and the fields it flagged. Each flagged
   * field shakes once per count (a later error from a blur doesn't shake).
   */
  shake?: { pulse: number; fields: readonly string[] };
  /** Answer cards: a pointer went down on a card, and a radio was clicked (auto-advance). */
  onPointerPick?: (field: Field, code: string) => void;
  onPick?: (field: Field, code: string) => void;
  /**
   * While the lead is being sent: text inputs are read-only (focus stays where it is); the
   * island ignores every change then, also of cards, chips, checkboxes and selects.
   */
  readOnly?: boolean;
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
  shake,
  onPointerPick,
  onPick,
  readOnly = false,
}: StepViewProps) {
  // The last shake each field played on this step (the step view mounts again for every step),
  // so a revealed field that collapses and comes back doesn't replay it. One mutable map for
  // the life of the step, written only by the fields' effects.
  const [shakesPlayed] = useState(() => new Map<string, number>());
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
        return (
          <ChoiceField
            field={field}
            {...common}
            onPointerPick={onPointerPick && ((code) => onPointerPick(field, code))}
            onPick={onPick && ((code) => onPick(field, code))}
          />
        );
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
            readOnly={readOnly}
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
        data-stagger=""
        className="text-title-lg text-ink-900 focus:outline-none md:text-h3"
      >
        {step.title}
      </h2>
      {step.subtitle && (
        <p data-stagger="" className="mt-2 text-body-lg text-ink-600">
          {step.subtitle}
        </p>
      )}
      {step.hint && (
        <p data-stagger="" className="mt-2 text-body text-ink-600">
          {step.hint}
        </p>
      )}
      {/* The rows' gap is each cell's bottom padding (FieldCell), taken back by -mb-6. */}
      <FieldList className="mt-6 -mb-6 grid md:grid-cols-2 md:gap-x-5">
        {fields.map((field) => (
          <FieldCell
            key={field.id}
            fieldId={field.id}
            id={`${domId.field(field.id)}-vak`}
            reveal={field.visibleIf !== undefined}
            shake={shake?.fields.includes(field.id) ? shake.pulse : 0}
            shakesPlayed={shakesPlayed}
            className={cx(
              'min-w-0',
              fieldSpan(field) === 'half' ? 'md:col-span-1' : 'md:col-span-2',
            )}
          >
            {render(field)}
          </FieldCell>
        ))}
      </FieldList>
    </div>
  );
}
