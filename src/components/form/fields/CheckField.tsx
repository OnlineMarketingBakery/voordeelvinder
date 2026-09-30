// checkbox and consent (Figma 89:7977, 91:11443): a real checkbox in its label, a 34 px box
// and a label row of at least 44 px (the tap area). A consent's `links` turn the first
// occurrence of each text in the label into a link (docs/FLOWS.md step 7).
import type { Field } from '../../../lib/flow/schema';
import { consentSegments, domId, fieldLabel } from '../../../lib/form/labels';
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
      <label className="group flex min-h-11 cursor-pointer items-start gap-[11px] py-[5px] text-body-lg text-ink-600">
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
        <span
          aria-hidden="true"
          className={cx(
            'grid size-[34px] shrink-0 place-items-center rounded-sm border bg-lavender-50',
            'transition-[border-color,background-color] duration-(--motion-duration-fast) ease-out',
            'group-hover:border-purple-600 group-has-checked:border-purple-600 group-has-checked:bg-purple-600',
            'group-has-focus-visible:outline-2 group-has-focus-visible:outline-offset-2 group-has-focus-visible:outline-purple-500',
            error ? 'border-danger' : 'border-control-border',
          )}
        >
          <span className="mb-1 h-3.5 w-2 rotate-45 border-r-2 border-b-2 border-white opacity-0 group-has-checked:opacity-100" />
        </span>
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
