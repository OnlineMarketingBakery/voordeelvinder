// The form motion (brief §6.1 "Form motion", docs/MOTION.md): the pure parts, without React or
// Motion, so they can be unit-tested. The island (src/components/form) feeds these values to
// Motion's `m` components. Every value comes from the motion tokens in src/lib/motion.ts.
//
// Reduced motion keeps only short fades: no slides, scales, shakes or rolls. Auto-advance stays.
import type { FieldType } from '../flow/schema';
import { distance, duration, ease, seconds, spring } from '../motion';

/** Direction of travel of a step change: forward (Volgende), back (Terug) or none (restore). */
export type Travel = -1 | 0 | 1;

export const TRAVEL = { forward: 1, back: -1, none: 0 } as const satisfies Record<string, Travel>;

/** Direction between two positions on the visitor's path ("Stap X"): the sign of the move. */
export function travelBetween(from: number, to: number): Travel {
  return to > from ? 1 : to < from ? -1 : 0;
}

/** The tween for fades: `base`, or `fast` with reduced motion. */
export function fade(reduced: boolean) {
  return { duration: seconds(reduced ? duration.fast : duration.base), ease: ease.out };
}

/** No animation: the value jumps (reduced motion, restores). */
export const INSTANT = { duration: 0 } as const;

// ---------------------------------------------------------------------------------------------
// Step change: the new step slides in from the direction of travel (forward from the right,
// Terug from the left) on the spring and fades in; reduced motion fades only.

export function stepVariants(reduced: boolean) {
  return {
    enter: (travel: Travel) => ({ opacity: 0, x: reduced ? 0 : travel * distance[3] }),
    center: {
      opacity: 1,
      x: 0,
      transition: reduced ? fade(true) : { x: spring, opacity: fade(false) },
    },
  };
}

/**
 * Whether the card height animates for a step change (on the spring): only when the visitor
 * moved (not after a restore), without reduced motion, and when the height really changes.
 */
export function animateHeight({
  reduced,
  travel,
  from,
  to,
}: {
  reduced: boolean;
  travel: Travel;
  from: number | null;
  to: number;
}): boolean {
  return !reduced && travel !== 0 && from !== null && Math.abs(from - to) >= 1;
}

/**
 * A spring (stiffness, damping, mass 1) from rest at 0 to rest at 1 as a CSS `linear()` easing
 * and the time it takes to settle within 0.1 %: the same curve Motion runs for the spring token,
 * for a Web Animation (the card height). 400/32 settles in about 460 ms, most of it by 250 ms.
 */
export function springEasing(
  { stiffness, damping }: { stiffness: number; damping: number },
  samples = 24,
): { duration: number; easing: string } {
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  let position: (t: number) => number;
  let settle: number;
  if (zeta < 1) {
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    const ratio = (zeta * omega) / damped;
    position = (t) =>
      1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + ratio * Math.sin(damped * t));
    settle = Math.log(1000 * Math.sqrt(1 + ratio * ratio)) / (zeta * omega);
  } else {
    // No overshoot: approximated by the critically damped curve (the token spring is underdamped).
    position = (t) => 1 - Math.exp(-omega * t) * (1 + omega * t);
    settle = Math.log(1000 * 10) / omega;
  }
  const points = Array.from({ length: samples + 1 }, (_, index) =>
    index === samples ? 1 : Math.round(position((settle * index) / samples) * 10000) / 10000,
  );
  return { duration: Math.round(settle * 1000), easing: `linear(${points.join(', ')})` };
}

// ---------------------------------------------------------------------------------------------
// Auto-advance (brief §6.1: recommended, Tanjil approves on staging): a pointer tap or click on
// an answer card of a single-question choice step moves on after about 300 ms, as if
// "Volgende" was pressed. Never on keyboard input: arrow keys change a radio's value, so they
// would jump through the steps.

export const AUTO_ADVANCE_DELAY_MS = 300;

/**
 * How long after an auto-advance a pick on the new step doesn't schedule another one. The
 * step changes 300 ms after the tap, inside a double click (up to 500 ms) or a double tap: the
 * second half then lands on a card of the new step, which the visitor hasn't read yet. The
 * pick still selects that card (visible, nothing silent); only "Volgende" moves on.
 */
export const AUTO_ADVANCE_GUARD_MS = 500;

/**
 * Whether a pick at `now` falls in the guard after the last auto-advance (`autoAdvancedAt`,
 * performance.now(), or null when there was none or the visitor went back since).
 */
export function withinAutoAdvanceGuard(autoAdvancedAt: number | null, now: number): boolean {
  if (autoAdvancedAt === null) return false;
  const age = now - autoAdvancedAt;
  return age >= 0 && age < AUTO_ADVANCE_GUARD_MS;
}

/** A pointerdown on a card counts for the change that follows it within this time. */
export const POINTER_PICK_WINDOW_MS = 1000;

/** The last pointerdown on an answer card. */
export type PointerPick = { fieldId: string; code: string; at: number };

export type PickVia = 'pointer' | 'keyboard';

/**
 * How a card was picked: `pointer` when the change follows a pointerdown on that same card
 * (tap or click on the label), else `keyboard` (Space, arrow keys, or anything else without a
 * pointer on that card).
 */
export function pickVia(
  last: PointerPick | null,
  fieldId: string,
  code: string,
  now: number,
): PickVia {
  if (!last || last.fieldId !== fieldId || last.code !== code) return 'keyboard';
  const age = now - last.at;
  return age >= 0 && age <= POINTER_PICK_WINDOW_MS ? 'pointer' : 'keyboard';
}

const AUTO_ADVANCE_TYPES: ReadonlySet<FieldType> = new Set(['single_choice', 'yes_no']);

export type AutoAdvanceInput = {
  /** The switch in _copy.json `settings.autoAdvance`. */
  enabled: boolean;
  via: PickVia;
  /** The field that was picked. */
  fieldId: string;
  /** The step's visible fields. */
  fields: readonly { id: string; type: FieldType }[];
  /** The last step submits: never automatically. */
  isLast: boolean;
  /** Sending: nothing moves. */
  busy: boolean;
};

/**
 * Auto-advance only when the switch is on, the pick was a pointer tap or click, and the picked
 * field is the step's only visible field and a single-choice or yes/no question. Steps with
 * two questions (digital meter + solar) wait for "Volgende".
 */
export function shouldAutoAdvance({
  enabled,
  via,
  fieldId,
  fields,
  isLast,
  busy,
}: AutoAdvanceInput): boolean {
  if (!enabled || via !== 'pointer' || isLast || busy) return false;
  if (fields.length !== 1) return false;
  const [only] = fields;
  return only !== undefined && only.id === fieldId && AUTO_ADVANCE_TYPES.has(only.type);
}

// ---------------------------------------------------------------------------------------------
// Answer cards: the radio circle springs into the selected state and a check mark draws in.
// (The press scale is a CSS :active scale: Motion's whileTap would make each label a tab stop.)

export function indicatorVariants(reduced: boolean) {
  return {
    off: { scale: 1, transition: INSTANT },
    on: reduced ? { scale: 1, transition: INSTANT } : { scale: [0.8, 1], transition: spring },
  };
}

export function checkVariants(reduced: boolean) {
  return {
    off: { pathLength: 0, opacity: 0, transition: INSTANT },
    on: {
      pathLength: 1,
      opacity: 1,
      transition: reduced
        ? INSTANT
        : {
            pathLength: { duration: seconds(duration.base), ease: ease.out },
            opacity: { duration: seconds(duration.fast), ease: ease.out },
          },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Revealed questions (fields with visibleIf, e.g. the business bands): expand and collapse.
// Reduced motion: instant.

export function revealVariants(reduced: boolean) {
  const transition = reduced ? INSTANT : { height: spring, opacity: fade(false) };
  return {
    // clip, not hidden: never a scroll container (scrollIntoView can't shift the content).
    collapsed: { height: 0, opacity: 0, overflow: 'clip', transition },
    open: {
      height: 'auto',
      opacity: 1,
      transition,
      // Focus rings and the error shake may leave the box once it is open.
      transitionEnd: { overflow: 'visible' },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Progress: the bar fills on the spring (a translate, not a width), "Stap X van Y" rolls to the
// new number. Reduced motion: the bar jumps and the numbers change in place.

/** The bar's fill in percent (one decimal). */
export function progressPercent(step: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, Math.round((step / total) * 1000) / 10)) : 0;
}

/** The fill as a translate of a full-width bar: 30 % filled is translateX(-70%). */
export function progressOffset(step: number, total: number): string {
  return `${progressPercent(step, total) - 100}%`;
}

export function progressTransition(reduced: boolean) {
  return reduced ? INSTANT : spring;
}

export type ProgressPart = { text: string } | { value: 'step' | 'total' };

/** "Stap {step} van {total}" as text and number parts, so the numbers can roll on their own. */
export function progressParts(template: string): ProgressPart[] {
  const parts: ProgressPart[] = [];
  let rest = template;
  for (;;) {
    const match = /\{(step|total)\}/.exec(rest);
    if (!match) break;
    if (match.index > 0) parts.push({ text: rest.slice(0, match.index) });
    parts.push({ value: match[1] as 'step' | 'total' });
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest !== '') parts.push({ text: rest });
  return parts;
}

/** A number rolls up when it grows, down when it shrinks. */
export function rollVariants() {
  return {
    enter: (travel: Travel) => ({ y: `${travel >= 0 ? 100 : -100}%`, opacity: 0 }),
    center: { y: '0%', opacity: 1, transition: { y: spring, opacity: fade(false) } },
    exit: (travel: Travel) => ({
      y: `${travel >= 0 ? -100 : 100}%`,
      opacity: 0,
      transition: { y: spring, opacity: fade(false) },
    }),
  };
}

// ---------------------------------------------------------------------------------------------
// Errors: the field shakes once (about 6 px) when "Volgende" finds an error; the message fades
// in. Focus moves at once, never after the shake. Reduced motion: no shake, the fade stays.

export const SHAKE_PX = (distance[1] * 3) / 4;

/** translateX keyframes of the shake, or null with reduced motion. */
export function shakeKeyframes(reduced: boolean): string[] | null {
  if (reduced) return null;
  return [0, -SHAKE_PX, SHAKE_PX, -SHAKE_PX / 2, 0].map((px) => `translateX(${px}px)`);
}

export const SHAKE_MS = duration.slow;

/**
 * Whether a field plays the shake for `pulse` ("Volgende" found an error in it), given the
 * last pulse it played (`played`, kept across mounts of the field on the same step). A field
 * that collapses and comes back mounts with the old pulse: that one already played.
 */
export function isNewShake(pulse: number, played: number | undefined): boolean {
  return pulse !== 0 && pulse !== played;
}

export function messageTransition(reduced: boolean) {
  return fade(reduced);
}
