// single_choice and yes_no: answer cards (Figma 89:7452 product cards, 89:8953 plain cards,
// 90:10442 yes/no cards). Each card is a real radio input inside its label, so the whole card is
// clickable, arrow keys move through the group and screen readers announce a radio group
// (brief §7.6). The radio circle and the selected, focus and error states are not designed:
// derived from the palette (CONTENT-TODO 5.1).
import type { Field } from '../../../lib/flow/schema';
import { choiceOptions, domId, fieldLabel } from '../../../lib/form/labels';
import { cx, MaskIcon } from '../ui';
import { describedBy, FieldHint, FieldMessage, questionClass, type FieldProps } from './shared';

type ChoiceFieldType = Extract<Field, { type: 'single_choice' | 'yes_no' }>;

export function ChoiceField({
  field,
  step,
  titleId,
  value,
  error,
  warning,
  onChange,
  icons,
  copy,
}: FieldProps<ChoiceFieldType>) {
  const label = fieldLabel(step, field);
  const options = choiceOptions(field, copy);
  // Product cards (step 1) are taller, with a larger icon tile (Figma 74 vs 60 px).
  const large = options.some((option) => option.icon !== undefined && option.tone === undefined);
  const labelId = label.byTitle ? titleId : domId.label(field.id);
  const described = describedBy(field, error, warning);

  return (
    <div>
      {!label.byTitle && (
        <p id={labelId} className={questionClass}>
          {label.text}
        </p>
      )}
      <div
        role="radiogroup"
        id={domId.field(field.id)}
        aria-labelledby={labelId}
        aria-describedby={described}
        aria-invalid={error ? 'true' : undefined}
        aria-required={field.required ? 'true' : undefined}
        className={cx('grid', large ? 'gap-[18px]' : 'gap-2.5')}
      >
        {options.map((option) => (
          <label
            key={option.code}
            className={cx(
              'group relative flex cursor-pointer items-center rounded-lg border bg-lavender-50 text-ink-900',
              'transition-[border-color,background-color,box-shadow] duration-(--motion-duration-fast) ease-out',
              'hover:border-control-border has-checked:border-purple-600 has-checked:bg-white has-checked:ring-1 has-checked:ring-purple-600',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-purple-500',
              error ? 'border-danger' : 'border-lavender-300',
              large
                ? 'min-h-[74px] gap-4 py-[15px] pr-4 pl-[15px] md:pr-[25px]'
                : option.icon
                  ? 'min-h-[60px] gap-[13px] py-2.5 pr-4 pl-2.5 md:pr-[25px]'
                  : 'min-h-[60px] gap-4 py-3 pr-4 pl-5 md:pr-[25px] md:pl-[26px]',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              id={domId.option(field.id, option.code)}
              name={field.id}
              value={option.code}
              checked={value === option.code}
              onChange={() => onChange(option.code)}
            />
            {option.icon && (
              <span
                className={cx(
                  'grid shrink-0 place-items-center rounded-xs border border-lavender-300 bg-white',
                  large ? 'size-11' : 'size-10',
                )}
              >
                <MaskIcon
                  src={icons[option.icon]}
                  className={cx(
                    large ? 'size-6' : 'size-5',
                    option.tone === 'no'
                      ? 'text-lime-600'
                      : option.tone === 'yes'
                        ? 'text-purple-500'
                        : 'text-purple-600',
                  )}
                />
              </span>
            )}
            <span className="min-w-0 flex-1 text-body-lg">{option.label}</span>
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full border border-control-border bg-white group-has-checked:border-purple-600 group-has-checked:bg-purple-600"
            >
              <span className="size-2.5 rounded-full bg-white opacity-0 group-has-checked:opacity-100" />
            </span>
          </label>
        ))}
      </div>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
    </div>
  );
}
