// Text-like fields: text, number (unit inside the field, Figma 90:10935), postcode, phone (fixed
// +32 chip, Figma 91:11440 without the picker chevron, brief §6) and email (with the "Bedoel je
// …?" suggestion, which applies the address on click). The raw text is kept as typed and
// validated on blur and on "Volgende" (brief §7.5: never reformatted while typing).
import type { Field } from '../../../lib/flow/schema';
import { domId, fieldLabel } from '../../../lib/form/labels';
import { suggestionLabel } from '../../../lib/form/messages';
import { cx } from '../ui';
import { describedBy, FieldHint, FieldMessage, labelClass, type FieldProps } from './shared';

type InputFieldType = Extract<Field, { type: 'text' | 'number' | 'postcode' | 'phone' | 'email' }>;

type Props = FieldProps<InputFieldType> & {
  /** The e-mail typo suggestion ("jan@gmail.com"), shown as a button that applies it. */
  suggestion: string | undefined;
  onApplySuggestion: (value: string) => void;
  flag: { src: string; width: number; height: number } | undefined;
  /** While the lead is being sent (read-only, not disabled: focus stays in the field). */
  readOnly?: boolean;
};

/** Mobile keyboards and autofill per type (brief §7.5); the form validates, not the browser. */
function inputAttributes(field: InputFieldType) {
  switch (field.type) {
    case 'number':
      return { type: 'text', inputMode: 'numeric', autoComplete: 'off' } as const;
    case 'postcode':
      return { type: 'text', inputMode: 'numeric', autoComplete: 'postal-code' } as const;
    case 'phone':
      return { type: 'tel', inputMode: 'tel', autoComplete: 'tel' } as const;
    case 'email':
      return {
        // type="text": an email input trims and rewrites its value while typing, which
        // fights React's controlled value; inputMode still brings up the e-mail keyboard.
        type: 'text',
        inputMode: 'email',
        autoComplete: 'email',
        autoCapitalize: 'none',
        spellCheck: false,
      } as const;
    case 'text':
      return { type: 'text', autoComplete: field.autocomplete ?? 'on' } as const;
  }
}

export function InputField({
  field,
  step,
  titleId,
  value,
  error,
  warning,
  onChange,
  onBlur,
  copy,
  suggestion,
  onApplySuggestion,
  flag,
  readOnly = false,
}: Props) {
  const label = fieldLabel(step, field);
  const id = domId.field(field.id);
  const chipId = `${id}-prefix`;
  const suggestionId = `${id}-suggestie`;
  const isPhone = field.type === 'phone';
  // Single inputs are 74 px high (postcode, kWh), the contact grid 60 px (Figma 89:7941, 91:11420).
  const tall = field.type === 'postcode' || field.type === 'number';
  const unit = field.type === 'number' ? field.unit : undefined;

  return (
    <div>
      {!label.byTitle && (
        <label htmlFor={id} className={labelClass}>
          {label.text}
        </label>
      )}
      <div className="relative">
        {isPhone && (
          <span
            id={chipId}
            className="pointer-events-none absolute top-1/2 left-2.5 flex h-10 -translate-y-1/2 items-center gap-2 rounded-xs border border-lavender-300 bg-white px-2.5 text-body text-ink-900"
          >
            {flag && (
              <img
                src={flag.src}
                width={32}
                height={22}
                alt=""
                className="h-[22px] w-8 rounded-[3px] object-cover"
              />
            )}
            {copy.phonePrefix}
          </span>
        )}
        <input
          id={id}
          name={field.id}
          {...inputAttributes(field)}
          value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
          placeholder={field.placeholder}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
          onBlur={onBlur}
          aria-labelledby={label.byTitle ? titleId : undefined}
          aria-describedby={describedBy(
            field,
            error,
            warning,
            isPhone ? chipId : undefined,
            suggestion ? suggestionId : undefined,
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-required={field.required ? 'true' : undefined}
          className={cx(
            'w-full min-w-0 rounded-lg border bg-lavender-50 text-ink-900 placeholder:text-ink-placeholder',
            'transition-[border-color] duration-(--motion-duration-fast) ease-out',
            error ? 'border-danger' : 'border-control-border',
            tall ? 'h-[74px] px-6 text-body-lg' : 'h-[60px] px-5 text-body',
            isPhone && 'pl-[112px]',
            unit && 'pr-20',
          )}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-body-lg text-ink-900"
          >
            {unit}
          </span>
        )}
      </div>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
      {suggestion && (
        <p id={suggestionId} className="mt-2">
          <button
            type="button"
            onClick={() => onApplySuggestion(suggestion)}
            className="min-h-11 text-left text-body text-purple-500 underline underline-offset-2 hover:text-purple-700"
          >
            {suggestionLabel(copy, suggestion)}
          </button>
        </p>
      )}
    </div>
  );
}
