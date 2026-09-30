// day_slot, "Wanneer mogen we je bellen?" (brief §7.5): two linked single-choice groups, the
// days and the time slots, as chips in the answer-card style. Not designed (CONTENT-TODO 5.6):
// a proposal to show on staging.
import type { Field } from '../../../lib/flow/schema';
import type { DaySlotAnswer } from '../../../lib/flow/types';
import { domId, fieldLabel } from '../../../lib/form/labels';
import { cx } from '../ui';
import { describedBy, FieldHint, FieldMessage, labelClass, type FieldProps } from './shared';

type DaySlotFieldType = Extract<Field, { type: 'day_slot' }>;

function Chips({
  field,
  part,
  label,
  options,
  selected,
  described,
  invalid,
  onPick,
  className,
}: {
  field: DaySlotFieldType;
  part: 'day' | 'slot';
  label: string | undefined;
  options: { code: string; label: string }[];
  selected: string | undefined;
  described: string | undefined;
  invalid: boolean;
  onPick: (code: string) => void;
  className: string;
}) {
  const labelId = `${domId.field(field.id)}-${part}`;
  return (
    <div
      role="radiogroup"
      aria-labelledby={label ? `${domId.label(field.id)} ${labelId}` : domId.label(field.id)}
      aria-describedby={described}
      aria-invalid={invalid ? 'true' : undefined}
      aria-required={field.required ? 'true' : undefined}
    >
      {label && (
        <p id={labelId} className="mb-2 text-body text-ink-600">
          {label}
        </p>
      )}
      <div className={className}>
        {options.map((option) => (
          <label
            key={option.code}
            className={cx(
              'relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border bg-lavender-50 px-3 text-center text-body text-ink-900',
              'transition-[border-color,background-color,color] duration-(--motion-duration-fast) ease-out',
              'hover:border-control-border has-checked:border-purple-600 has-checked:bg-purple-600 has-checked:text-white',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-purple-500',
              invalid ? 'border-danger' : 'border-lavender-300',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              id={domId.option(field.id, option.code)}
              name={`${field.id}-${part}`}
              value={option.code}
              checked={selected === option.code}
              onChange={() => onPick(option.code)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function DaySlotField({
  field,
  step,
  value,
  error,
  warning,
  onChange,
}: FieldProps<DaySlotFieldType>) {
  const label = fieldLabel(step, field);
  const answer: DaySlotAnswer =
    typeof value === 'object' && value !== null ? (value as DaySlotAnswer) : {};
  const described = describedBy(field, error, warning);
  const pick = (part: 'day' | 'slot') => (code: string) => onChange({ ...answer, [part]: code });

  return (
    <div>
      <p id={domId.label(field.id)} className={labelClass}>
        {label.text}
      </p>
      <div className="grid gap-4">
        <Chips
          field={field}
          part="day"
          label={field.dayLabel}
          options={field.days}
          selected={answer.day}
          described={described}
          invalid={Boolean(error) && !answer.day}
          onPick={pick('day')}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-5"
        />
        <Chips
          field={field}
          part="slot"
          label={field.slotLabel}
          options={field.slots}
          selected={answer.slot}
          described={described}
          invalid={Boolean(error) && !answer.slot}
          onPick={pick('slot')}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
        />
      </div>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
    </div>
  );
}
