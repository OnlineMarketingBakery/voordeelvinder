// checkbox and consent (Figma 89:7977, 91:11443): a real checkbox in its label, a 34 px box
// and a label row of at least 44 px (the tap area). A consent's `links` turn the first
// occurrence of each text in the label into a link (docs/FLOWS.md step 7).
//
// The answer cards' selection in miniature (docs/MOTION.md): the purple fill sweeps into the
// box from the left, the box pops and the check mark draws in; unticking retracts the fill.
import type { Field } from '../../../lib/flow/schema';
import { consentSegments, domId, fieldLabel } from '../../../lib/form/labels';
import { Pop } from '../motion';
import { cx } from '../ui';
import { describedBy, FieldHint, FieldMessage, type FieldProps } from './shared';

type CheckFieldType = Extract<Field, { type: 'checkbox' | 'consent' }>;

export function CheckField({
  field,
  step,
  value,
  error,
  warning,
  onChange,
}: FieldProps<CheckFieldType>) {
  const label = fieldLabel(step, field);
  const segments =
    field.type === 'consent' ? consentSegments(label.text, field.links) : [{ text: label.text }];

  return (
    <div>
      <label className="flex min-h-11 cursor-pointer items-start gap-[11px] py-[5px] text-body-lg text-ink-600">
        <input
          type="checkbox"
          id={domId.field(field.id)}
          name={field.id}
          className="sr-only"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={describedBy(field, error, warning)}
          aria-invalid={error ? 'true' : undefined}
          aria-required={field.required ? 'true' : undefined}
        />
        <Pop
          selected={value === true}
          className={cx(
            'relative grid size-[34px] shrink-0 place-items-center overflow-clip rounded-sm border bg-lavender-50',
            'transition-[border-color] duration-(--motion-duration-fast) ease-out',
            'pick-hover:border-purple-600 picked:border-purple-600',
            'pick-focus:outline-2 pick-focus:outline-offset-2 pick-focus:outline-purple-500',
            error ? 'border-danger' : 'border-control-border',
          )}
        >
          <span className="sweep bg-purple-600" />
          <svg viewBox="0 0 24 24" className="relative size-5 text-white" fill="none">
            <path
              d="M6 12.5l4 4 8-9"
              pathLength={1}
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="[stroke-dasharray:1] [stroke-dashoffset:1] picked:[stroke-dashoffset:0] motion-safe:picked:transition-[stroke-dashoffset] motion-safe:picked:delay-(--motion-duration-fast) motion-safe:picked:duration-(--motion-duration-base) motion-safe:picked:ease-out"
            />
          </svg>
        </Pop>
        <span className="min-w-0 pt-0.5">
          {segments.map((segment, index) =>
            segment.href ? (
              <a
                key={index}
                href={segment.href}
                className="text-purple-500 underline underline-offset-2 hover:text-purple-700"
              >
                {segment.text}
              </a>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </span>
      </label>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
    </div>
  );
}
