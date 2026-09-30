// select: a native <select> styled like Figma 89:8432 (74 px, chevron #7051ED). Native, so the
// phone's own picker opens, also in in-app browsers (brief §7.6).
import type { Field } from '../../../lib/flow/schema';
import { domId, fieldLabel, UI_ICONS } from '../../../lib/form/labels';
import { cx, MaskIcon } from '../ui';
import { describedBy, FieldHint, FieldMessage, labelClass, type FieldProps } from './shared';

type SelectFieldType = Extract<Field, { type: 'select' }>;

export function SelectField({
  field,
  step,
  titleId,
  value,
  error,
  warning,
  onChange,
  icons,
}: FieldProps<SelectFieldType>) {
  const label = fieldLabel(step, field);
  const id = domId.field(field.id);
  const selected = typeof value === 'string' ? value : '';

  return (
    <div>
      {!label.byTitle && (
        <label htmlFor={id} className={labelClass}>
          {label.text}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          name={field.id}
          value={selected}
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
          aria-labelledby={label.byTitle ? titleId : undefined}
          aria-describedby={describedBy(field, error, warning)}
          aria-invalid={error ? 'true' : undefined}
          aria-required={field.required ? 'true' : undefined}
          className={cx(
            'h-[74px] w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border bg-lavender-50 pr-14 pl-6 text-body-lg',
            error ? 'border-danger' : 'border-control-border',
            selected === '' ? 'text-ink-placeholder' : 'text-ink-900',
          )}
        >
          <option value="" disabled>
            {field.placeholder ?? ''}
          </option>
          {field.options.map((option) => (
            <option key={option.code} value={option.code} className="text-ink-900">
              {option.label}
            </option>
          ))}
        </select>
        <MaskIcon
          src={icons[UI_ICONS.next]}
          className="pointer-events-none absolute top-1/2 right-6 size-6 -translate-y-1/2 rotate-90 text-purple-600"
        />
      </div>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
    </div>
  );
}
