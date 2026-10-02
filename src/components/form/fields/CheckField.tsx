// checkbox and consent (Figma 89:7977, 91:11443): a real checkbox in its label, a 34 px box
// and a label row of at least 44 px (the tap area). A consent's `links` turn the first
// occurrence of each text in the label into a link (docs/FLOWS.md step 7).
//
// The answer cards' selection in miniature (docs/MOTION.md): the purple fill sweeps into the
// box from the left, the box pops and the check mark draws in; unticking retracts the fill.
import type { Field } from '../../../lib/flow/schema';
import { consentSegments, domId, fieldLabel } from '../../../lib/form/labels';
import { useFormLayout } from '../layout';
import { Pop } from '../motion';
import { cx } from '../ui';
import { describedBy, FieldHint, FieldMessage, type FieldProps } from './shared';

type CheckFieldType = Extract<Field, { type: 'checkbox' | 'consent' | 'yes_no' }>;

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
  // A yes/no shown as a checkbox (single-page form) keeps its "yes" / "no" answer.
  const yesNo = field.type === 'yes_no';
  const checked = yesNo ? value === 'yes' : value === true;
  const page = useFormLayout() === 'page';

  return (
    <div>
      <label
        className={cx(
          'flex min-h-11 cursor-pointer items-start py-[5px] text-ink-600',
          page ? 'gap-2.5 text-sm' : 'gap-[11px] text-body-lg',
        )}
      >
        <input
          type="checkbox"
          id={domId.field(field.id)}
          name={field.id}
          className="sr-only"
          checked={checked}
          onChange={(event) =>
            onChange(yesNo ? (event.target.checked ? 'yes' : 'no') : event.target.checked)
          }
          aria-describedby={describedBy(field, error, warning)}
          aria-invalid={error ? 'true' : undefined}
          aria-required={field.required ? 'true' : undefined}
        />
        <Pop
          selected={checked}
          className={cx(
            page ? 'size-6 rounded-xs' : 'size-[34px] rounded-sm',
            'relative grid shrink-0 place-items-center overflow-clip border bg-lavender-50',
            'transition-[border-color] duration-(--motion-duration-fast) ease-out',
            'pick-hover:border-purple-600 picked:border-purple-600',
            'pick-focus:outline-2 pick-focus:outline-offset-2 pick-focus:outline-purple-500',
            error ? 'border-danger' : 'border-control-border',
          )}
        >
          <span className="sweep bg-purple-600" />
          <svg
            viewBox="0 0 24 24"
            className={cx('relative text-white', page ? 'size-4' : 'size-5')}
            fill="none"
          >
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
        <span className={cx('min-w-0', page ? 'pt-0.5 text-ink-900' : 'pt-0.5')}>
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
