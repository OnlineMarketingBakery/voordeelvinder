// day_slot, "Wanneer mogen we je bellen?" (brief §7.5): two linked single-choice groups, the
// days and the time slots, as chips in the answer-card style. Not designed (CONTENT-TODO 5.6):
// a proposal to show on staging. The answer cards' selection in miniature (docs/MOTION.md): the
// purple fill sweeps in from the left and the text turns white; the chip gives on press.
import type { Field } from '../../../lib/flow/schema';
import type { DaySlotAnswer } from '../../../lib/flow/types';
import { domId, fieldLabel } from '../../../lib/form/labels';
import { cx } from '../ui';
import { useFormLayout } from '../layout';
import { describedBy, FieldHint, FieldMessage, useLabelClass, type FieldProps } from './shared';

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
            className="relative block cursor-pointer rounded-lg transition-[scale] duration-(--motion-duration-fast) ease-out select-none motion-safe:active:scale-[0.96]"
          >
            <input
              type="radio"
              className="sr-only"
              id={domId.option(field.id, option.code)}
              name={`${field.id}-${part}`}
              value={option.code}
              checked={selected === option.code}
              onChange={() => onPick(option.code)}
              // On each chip too: focus lands on a radio (see ChoiceField).
              aria-describedby={described}
            />
            {/* The chip's face: border, focus ring and the sweep it clips. */}
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-0 overflow-clip rounded-lg border bg-lavender-50',
                'transition-[border-color] duration-(--motion-duration-fast) ease-out',
                'pick-hover:border-control-border picked:border-purple-600',
                'pick-focus:outline-2 pick-focus:outline-offset-2 pick-focus:outline-purple-500',
                invalid ? 'border-danger' : 'border-lavender-300',
              )}
            >
              <span className="sweep bg-purple-600" />
            </span>
            <span className="relative flex min-h-11 items-center justify-center px-3 text-center text-body text-ink-900 transition-[color] duration-(--motion-duration-fast) ease-out picked:text-white">
              {option.label}
            </span>
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
  const labelClass = useLabelClass();
  const page = useFormLayout() === 'page';
  const answer: DaySlotAnswer =
    typeof value === 'object' && value !== null ? (value as DaySlotAnswer) : {};
  const described = describedBy(field, error, warning);
  const pick = (part: 'day' | 'slot') => (code: string) => onChange({ ...answer, [part]: code });

  return (
    <div>
      <p id={domId.label(field.id)} className={labelClass}>
        {label.text}
        {page && field.required && <span aria-hidden="true"> *</span>}
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
