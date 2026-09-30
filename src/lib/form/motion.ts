// The form motion (brief §6.1 "Form motion", docs/MOTION.md): the pure parts, without React or
// Motion, so they can be unit-tested. The island (src/components/form) feeds these values to
// Motion's `m` components and to Web Animations. Every value comes from the motion tokens in
// src/lib/motion.ts.
//
// One language for the whole form: direction means travel (forward moves content to the left,
// back to the right), everything that moves or grows runs on the one spring, fades use `base`
// in and `fast` out, and a selection is a fill that sweeps in from the left.
//
// Reduced motion keeps only short fades: no slides, scales, shakes or rolls. Auto-advance stays.
import type { FieldType } from '../flow/schema';
import { cubicBezier, distance, duration, ease, seconds, spring } from '../motion';

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
// Step change (Web Animations, src/components/form/motion.tsx StepStage): the current step
// slides out of the form card while the next slides in from the other side, at the same time, in
// the direction of travel (forward: out to the left, in from the right; back, a jump on the steps
// bar and a reset: the other way), both on the spring. They travel the card's whole width (the
// card clips them), so the two never overlap. The outgoing step is a visual copy outside the form
// (see isGhostAttribute) that fades at `slow` as it leaves; the new step fades in at `fast`, and
// its title and questions trail it with a short stagger. Reduced motion: the new step fades in at
// `fast`, nothing slides.

/** How far a step slides when the card's width is unknown: twice distance[3]. */
export const STEP_SLIDE_PX = distance[3] * 2;

/**
 * How far a step travels on a step change: the form card's width (`card`, px), so the outgoing
 * step has left the card as the next arrives from the other side. STEP_SLIDE_PX without one.
 */
export function pushDistance(card: number | undefined): number {
  return card !== undefined && card > 0 ? Math.round(card) : STEP_SLIDE_PX;
}

/** How far each item of a new step (title, question, card) trails the step: distance[1]. */
export const ITEM_SLIDE_PX = distance[1];

/** The time between two items of a new step (≤ 40 ms), and how many items get their own. */
export const STAGGER_MS = 30;
export const STAGGER_MAX = 6;

/** The delay of the item at `index` of a new step (0 = the title): capped at STAGGER_MAX. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(0, Math.floor(index)), STAGGER_MAX) * STAGGER_MS;
}

/**
 * The incoming step's slide over `push` px (pushDistance), or null when it doesn't slide
 * (reduced motion, a restore).
 */
export function stepEnterFrames(
  travel: Travel,
  reduced: boolean,
  push = STEP_SLIDE_PX,
): Keyframe[] | null {
  if (reduced || travel === 0) return null;
  return [{ transform: `translateX(${travel * push}px)` }, { transform: 'none' }];
}

/**
 * The outgoing step's slide, from where it is on screen (`from`: its computed transform, which
 * is not `none` when it was still sliding in) to the side it leaves by, `push` px away.
 */
export function stepExitFrames(travel: Travel, from = 'none', push = STEP_SLIDE_PX): Keyframe[] {
  return [{ transform: from }, { transform: `translateX(${-travel * push}px)` }];
}

/** Each item of a new step: fades in and trails the step by ITEM_SLIDE_PX. */
export function itemEnterFrames(travel: Travel): Keyframe[] {
  return [
    { opacity: 0, transform: `translateX(${travel * ITEM_SLIDE_PX}px)` },
    { opacity: 1, transform: 'none' },
  ];
}

/**
 * Attributes the copy of the outgoing step drops: ids and names (never doubled, never
 * submitted), label and form links, ARIA, roles, tab stops, links and data hooks, so no
 * locator, screen reader or form submission finds it.
 */
export function isGhostAttribute(name: string): boolean {
  const attribute = name.toLowerCase();
  return (
    GHOST_ATTRIBUTES.has(attribute) ||
    attribute.startsWith('aria-') ||
    attribute.startsWith('data-')
  );
}

const GHOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'id',
  'name',
  'for',
  'form',
  'href',
  'role',
  'tabindex',
  'autofocus',
  'autocomplete',
]);

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
// an answer card moves on after about 300 ms, as if "Volgende" was pressed, when it completes a
// step of only choice questions: a single-question step at the first tap, a step with two
// questions (digital meter + solar) once both are answered (Tanjil 2026-09-30). Never on
// keyboard input: arrow keys change a radio's value, so they would jump through the steps.

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
  /** The step's visible fields with the pick stored (a pick can reveal or hide a question). */
  fields: readonly { id: string; type: FieldType }[];
  /** The step validates with the pick stored (validateStep): every visible question answered. */
  complete: boolean;
  /**
   * The step already validated before the pick: the visitor came back to change an answer (or
   * tapped the picked card again).
   */
  wasComplete: boolean;
  /** The last step submits: never automatically. */
  isLast: boolean;
  /** Sending: nothing moves. */
  busy: boolean;
};

/**
 * Auto-advance only when the switch is on, the pick was a pointer tap or click, the step isn't
 * the last, every visible field of the step is a single-choice or yes/no question (the picked
 * one among them) and the pick leaves the step complete. So a single-question step moves on at
 * the first tap and a step with two questions once both are answered; a step with any other
 * field (text, number, postcode, select, checkbox, call moment) waits for "Volgende". On a step
 * that was already complete, only a pick on its last question moves on: changing the first of
 * two answers leaves time to change the second.
 */
export function shouldAutoAdvance({
  enabled,
  via,
  fieldId,
  fields,
  complete,
  wasComplete,
  isLast,
  busy,
}: AutoAdvanceInput): boolean {
  if (!enabled || via !== 'pointer' || isLast || busy || !complete) return false;
  if (!fields.some((field) => field.id === fieldId)) return false;
  if (wasComplete && fields.at(-1)?.id !== fieldId) return false;
  return fields.every((field) => AUTO_ADVANCE_TYPES.has(field.type));
}

// ---------------------------------------------------------------------------------------------
// Answer cards: a hover lift (fine pointers), a press give, and the selection: a fill sweeps in
// from the left on the spring (CSS, a scale of a clipped layer), the icon tile pops, the radio
// circle springs into the selected state and its check mark draws in; deselecting retracts the
// fill at `fast`. Chips and checkboxes use the same sweep in miniature. (The press scale is a
// CSS :active scale: Motion's whileTap would make each label a tab stop.)

/** The pop of an icon tile or a checkbox when it is picked (never when it renders picked). */
export const POP_SCALE = 1.12;

export function popVariants(reduced: boolean) {
  return {
    off: { scale: 1, transition: INSTANT },
    on: reduced
      ? { scale: 1, transition: INSTANT }
      : {
          scale: [1, POP_SCALE, 1],
          transition: { duration: seconds(duration.slow), ease: ease.out, times: [0, 0.35, 1] },
        },
  };
}

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
// The steps bar (src/components/form/ProgressCard.tsx): one segment per step of the estimate
// ("Stap X van Y"), the steps behind the visitor filled with a tick, and a lime pill with the
// current step's number riding on the bar (its move and every fill on the spring, CSS). The
// pill drags back only, snapping to the steps behind; each of those is also a button. "Stap X
// van Y" rolls to the new number. Reduced motion: the pill and the fills jump, numbers swap.

export type SegmentState = 'done' | 'current' | 'todo';

/** A segment of the bar: behind the current step (done: a button), the current one, or ahead. */
export function segmentState(index: number, current: number): SegmentState {
  return index < current ? 'done' : index === current ? 'current' : 'todo';
}

/**
 * The centre of segment `index` of `count` equal segments with a fixed gap between them, as a
 * percentage of the track plus a number of gaps: calc(<percent>% + <gaps> * gap). The pill
 * rides there (a translate of a track-wide layer, so the percentage is the track's).
 */
export function segmentCentre(index: number, count: number): { percent: number; gaps: number } {
  const n = Math.max(1, count);
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return { percent: round(((index + 0.5) / n) * 100), gaps: round((index + 0.5 - n / 2) / n) };
}

/** The segment under `x` (px from the track's left edge), clamped to the track. */
export function segmentAt(x: number, width: number, count: number, gap: number): number {
  const n = Math.max(1, count);
  const segment = (width - (n - 1) * gap) / n;
  if (!(segment > 0)) return 0;
  return Math.min(n - 1, Math.max(0, Math.floor((x + gap / 2) / (segment + gap))));
}

/**
 * How far the drag label shifts left, in percent of its own width: 0 over the first segment, 100
 * over the last, in between proportionally. So it always stays over the track.
 */
export function labelShift(index: number, count: number): number {
  return count > 1 ? Math.round((Math.min(Math.max(index, 0), count - 1) / (count - 1)) * 100) : 50;
}

/** A press on the pill becomes a drag after this much sideways movement (distance[1]). */
export const DRAG_THRESHOLD_PX = distance[1];

/**
 * What a move of the pointer by (dx, dy) since the press means: `wait` (still inside the
 * threshold), `drag` (sideways first) or `scroll` (up or down first: the page scrolls, no drag).
 */
export function dragIntent(dx: number, dy: number): 'wait' | 'drag' | 'scroll' {
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return 'wait';
  return Math.abs(dx) > Math.abs(dy) ? 'drag' : 'scroll';
}

/** The pill drags back only: to a step behind the current one, or back onto the current one. */
export function dragTarget(index: number, current: number): number {
  return Math.min(Math.max(index, 0), Math.max(current, 0));
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
// Errors: the field shakes once (about 6 px) when "Volgende" finds an error; the message comes
// in like every new line of the form: it drops in by half of distance[1] on the spring and
// fades in at `base`. Focus moves at once, never after the shake. Reduced motion: no shake, the
// message only fades in (at `fast`).

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

export function messageVariants(reduced: boolean) {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: -distance[1] / 2 },
    shown: {
      opacity: 1,
      y: 0,
      transition: reduced ? fade(true) : { opacity: fade(false), y: spring },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The mascot in the purple panel (whole-image transforms until a split mascot exists, CONTENT-TODO
// 5.8): it hops once when the step changes and nods when an answer is picked, never on the first
// render. Sizes are percentages of the image, so the 80 px mascot of the phone header moves less
// than the 323 px one of the desktop panel. Reduced motion: it stays still.

export const MASCOT_MS = duration.slow;

/** A crouch, a hop of 6 % of its height and a soft landing, from the bottom centre. */
export function mascotHopFrames(): Keyframe[] {
  const out = cubicBezier(ease.out);
  const inOut = cubicBezier(ease.inOut);
  return [
    { transform: 'translateY(0) scale(1, 1)', easing: inOut },
    { transform: 'translateY(0) scale(1.03, 0.96)', offset: 0.18, easing: out },
    { transform: 'translateY(-6%) scale(0.98, 1.03)', offset: 0.5, easing: inOut },
    { transform: 'translateY(0) scale(1.02, 0.98)', offset: 0.8, easing: out },
    { transform: 'translateY(0) scale(1, 1)' },
  ];
}

/** A small nod: forward, a little back, still. */
export function mascotNodFrames(): Keyframe[] {
  return [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-4deg)', offset: 0.3 },
    { transform: 'rotate(2deg)', offset: 0.65 },
    { transform: 'rotate(0deg)' },
  ];
}
