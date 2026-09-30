// single_choice and yes_no: answer cards (Figma 89:7452 product cards, 89:8953 plain cards,
// 90:10442 yes/no cards). Each card is a real radio input inside its label, so the whole card is
// clickable, arrow keys move through the group and screen readers announce a radio group
// (brief §7.6). The radio circle and the selected, focus and error states are not designed:
// derived from the palette (CONTENT-TODO 5.1).
//
// Motion (brief §6.1, docs/MOTION.md "Answer cards"): the label is a still hit area (so a
// lifted card never slides out from under the pointer); inside it the card lifts on hover with
// fine pointers and its shadow fades in, the label gives on press (a CSS scale: Motion's
// whileTap would make each label a tab stop). A pick sweeps a purple tint in from the left (the
// `sweep` layer), pops the icon tile, springs the radio circle and draws its check mark;
// another pick retracts it. A pointerdown on a card and every click on a radio are reported, so
// the island can tell a tap from the keyboard for auto-advance.
import type { Field } from '../../../lib/flow/schema';
import { choiceOptions, domId, fieldLabel } from '../../../lib/form/labels';
import { ChoiceIndicator, Pop } from '../motion';
import { cx, MaskIcon } from '../ui';
import { describedBy, FieldHint, FieldMessage, questionClass, type FieldProps } from './shared';

type ChoiceFieldType = Extract<Field, { type: 'single_choice' | 'yes_no' }>;

type Props = FieldProps<ChoiceFieldType> & {
  /** A primary pointer went down on the card of `code` (tap or click, not yet a change). */
  onPointerPick?: ((code: string) => void) | undefined;
  /** A radio was clicked: by the pointer, Space or an arrow key, also when already chosen. */
  onPick?: ((code: string) => void) | undefined;
};

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
  onPointerPick,
  onPick,
}: Props) {
  const label = fieldLabel(step, field);
  const options = choiceOptions(field, copy);
  // Product cards (step 1) are taller, with a larger icon tile (Figma 74 vs 60 px).
  const large = options.some((option) => option.icon !== undefined && option.tone === undefined);
  const labelId = label.byTitle ? titleId : domId.label(field.id);
  const described = describedBy(field, error, warning);

  return (
    <div>
      {!label.byTitle && (
        <p id={labelId} data-stagger="" className={questionClass}>
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
        {options.map((option) => {
          const selected = value === option.code;
          return (
            <label
              key={option.code}
              data-stagger=""
              onPointerDown={(event) => {
                if (event.isPrimary && event.button === 0) onPointerPick?.(option.code);
              }}
              className="relative block cursor-pointer rounded-lg transition-[scale] duration-(--motion-duration-fast) ease-out select-none motion-safe:active:scale-[0.98]"
            >
              <input
                type="radio"
                className="sr-only"
                id={domId.option(field.id, option.code)}
                name={field.id}
                value={option.code}
                checked={selected}
                onChange={() => onChange(option.code)}
                // On each radio too: focus lands on a radio, and most screen readers don't read
                // the group's description then. (aria-invalid stays on the group: ARIA doesn't
                // support it on a radio.)
                aria-describedby={described}
                onClick={() => onPick?.(option.code)}
              />
              <span
                className={cx(
                  'relative isolate flex items-center text-ink-900',
                  // The lift (fine pointers only) and the hover shadow, a layer that only fades.
                  'transition-[translate] duration-(--motion-duration-base) ease-out motion-safe:pointer-fine:pick-hover:-translate-y-0.5',
                  'before:absolute before:inset-0 before:-z-20 before:rounded-lg before:opacity-0 before:shadow-row before:transition-opacity before:duration-(--motion-duration-base) pointer-fine:pick-hover:before:opacity-100',
                  large
                    ? 'min-h-[74px] gap-4 py-[15px] pr-4 pl-[15px] md:pr-[25px]'
                    : option.icon
                      ? 'min-h-[60px] gap-[13px] py-2.5 pr-4 pl-2.5 md:pr-[25px]'
                      : 'min-h-[60px] gap-4 py-3 pr-4 pl-5 md:pr-[25px] md:pl-[26px]',
                )}
              >
                {/* The card's face: border, fill, ring, focus ring; it clips the sweep. */}
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute inset-0 -z-10 overflow-clip rounded-lg border bg-lavender-50',
                    'transition-[border-color] duration-(--motion-duration-fast) ease-out',
                    'pick-hover:border-control-border picked:border-purple-600 picked:ring-1 picked:ring-purple-600',
                    'pick-focus:outline-2 pick-focus:outline-offset-2 pick-focus:outline-purple-500',
                    error ? 'border-danger' : 'border-lavender-300',
                  )}
                >
                  <span className="sweep bg-purple-600/10" />
                </span>
                {option.icon && (
                  <Pop
                    selected={selected}
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
                  </Pop>
                )}
                <span className="min-w-0 flex-1 text-body-lg">{option.label}</span>
                <ChoiceIndicator selected={selected} />
              </span>
            </label>
          );
        })}
      </div>
      <FieldHint field={field} />
      <FieldMessage field={field} error={error} warning={warning} />
    </div>
  );
}
