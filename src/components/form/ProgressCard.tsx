// "Stap X van Y" and the steps bar (Figma 89:7438: a 767×91 card with "Stap X van Y" and a
// #674bd9 bar; the steps bar itself is not designed: a proposal, CONTENT-TODO 5.19). The numbers
// come from the engine's progress() (brief §7.6).
//
// The bar has one segment per step of the estimate (Y): the steps behind the visitor are filled
// and ticked, the current one is half filled, the rest is still to come. A lime pill with the
// current step's number rides on it. The visitor can go back two ways:
// - drag the pill back (plain pointer events: pointer capture, touch-action: pan-y so the page
//   still scrolls up and down, a sideways threshold before a press becomes a drag). It snaps to
//   the steps behind while a label shows the step's title; letting go there jumps back
//   (`onJump`). Never forward: only steps the visitor has passed.
// - tap or click a finished step: each one is a real <button> named by `jumpLabel` (the
//   single-pointer alternative to dragging, WCAG 2.5.7, and the keyboard way). The current and
//   future steps are not buttons. Pointing at (or focusing) a finished step shows its title.
//
// Motion (docs/MOTION.md "Steps bar"): the pill and every fill move on the spring (CSS), a tick
// draws in when a step is finished, the pill's number rolls, the bar glows softly on the last
// step. The server renders everything in place, so nothing moves at hydration, and like the
// rest of the form nothing animates before Motion is ready (useMotionReady): a restored session
// shows its step at once. Reduced motion: the pill and the fills jump, the numbers swap,
// dragging snaps without animation.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import {
  dragIntent,
  dragTarget,
  labelShift,
  progressParts,
  segmentAt,
  segmentCentre,
  segmentState,
  type SegmentState,
} from '../../lib/form/motion';
import { RollingNumber, useMotionReady } from './motion';
import { cx } from './ui';

/** A move of the pill or the label on the spring (CSS); none with reduced motion. */
const ON_SPRING =
  'transition-[translate] duration-(--motion-duration-spring) ease-spring motion-reduce:transition-none';
/**
 * A track-wide layer that ends at the track's left edge: translated by a segment's centre (a
 * percentage of the track), its right edge lands there. Past the left edge it adds no scroll.
 */
const LAYER = 'pointer-events-none absolute inset-y-0 right-full w-full';

/** A step on the visitor's path: its id and title (the drag label, the button's name). */
export type PathStep = { id: string; title: string };

export type ProgressCardProps = {
  /** "Stap {step} van {total}" (_copy.json `progress`). */
  template: string;
  /** The visitor's path so far, the current step included (engine pathSoFar). */
  steps: PathStep[];
  /** The current step's id. */
  current: string;
  step: number;
  total: number;
  /** Back to a step before the current one on the path (FormIsland: keeps the answers). */
  onJump: (stepId: string) => void;
  /** The accessible name of a finished step's button; `index` is its place on the path (0-based). */
  jumpLabel: (step: { id: string; title: string; index: number }) => string;
};

type Drag = {
  pointerId: number;
  /** Where the press started, and how far it was from the pill's centre. */
  x: number;
  y: number;
  offset: number;
  /** The track then: its left edge, width and the gap between segments (px). */
  left: number;
  width: number;
  gap: number;
  dragging: boolean;
  target: number;
};

/** The pill's (and the label's) place: the centre of a segment, as a translate of the track. */
function centre(index: number, count: number): string {
  const { percent, gaps } = segmentCentre(index, count);
  return `calc(${percent}% + var(--gap) * ${gaps}) 0`;
}

/** Keyboard focus (not a click): only then does a focused step show its title. */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

/**
 * One segment: its fill (a scale from the left, like the answer cards' sweep) and a tick that
 * draws in once the step is finished. `pointed`: the finished step pointed at or dragged to.
 */
function Segment({
  state,
  pointed,
  animate,
}: {
  state: SegmentState;
  pointed: boolean;
  animate: boolean;
}) {
  return (
    <span
      className={cx(
        'relative block h-3 min-w-0 flex-1 overflow-clip rounded-full bg-purple-700/13',
        animate && 'transition-[translate] duration-(--motion-duration-fast) ease-out',
        pointed && 'motion-safe:-translate-y-px',
      )}
    >
      <span
        className={cx(
          'absolute inset-0 origin-left',
          animate &&
            'transition-[scale,background-color] duration-(--motion-duration-spring) ease-spring motion-reduce:transition-none',
          state === 'todo' ? 'scale-x-0' : state === 'current' ? 'scale-x-50' : 'scale-x-100',
          pointed ? 'bg-purple-500' : 'bg-purple-700',
        )}
      />
      <svg
        viewBox="0 0 12 12"
        fill="none"
        className="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 text-white"
      >
        <path
          d="M2.5 6.25 4.9 8.6 9.5 3.6"
          pathLength={1}
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cx(
            '[stroke-dasharray:1]',
            state === 'done' ? '[stroke-dashoffset:0]' : '[stroke-dashoffset:1]',
            state === 'done' &&
              animate &&
              'motion-safe:transition-[stroke-dashoffset] motion-safe:delay-(--motion-duration-fast) motion-safe:duration-(--motion-duration-base) motion-safe:ease-out',
          )}
        />
      </svg>
    </span>
  );
}

export function ProgressCard({
  template,
  steps,
  current,
  step,
  total,
  onJump,
  jumpLabel,
}: ProgressCardProps) {
  const count = Math.max(total, steps.length, 1);
  const found = steps.findIndex((entry) => entry.id === current);
  const here = found === -1 ? Math.min(Math.max(step - 1, 0), count - 1) : found;
  const values = { step, total };
  const ready = useMotionReady();
  const track = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);
  // The finished step pointed at or focused, with the step it was on (so it never outlives it).
  const [pointedAt, setPointedAt] = useState<{ index: number; on: string } | null>(null);

  const target = dragTo === null ? null : Math.min(dragTo, here);
  const pill = target ?? here;
  const pointed = pointedAt?.on === current && pointedAt.index < here ? pointedAt.index : null;
  const shown = target ?? pointed;
  const label = shown === null ? undefined : steps[shown];
  const dragging = target !== null;

  // Escape while dragging: the pill goes back, nothing jumps.
  useEffect(() => {
    if (!dragging) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      drag.current = null;
      setDragTo(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dragging]);

  const finish = (jump: boolean) => {
    const state = drag.current;
    drag.current = null;
    setDragTo(null);
    if (!jump || !state?.dragging || state.target >= here) return;
    const destination = steps[state.target];
    if (destination) onJump(destination.id);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Nothing behind the visitor yet: nothing to drag to.
    if (!event.isPrimary || event.button !== 0 || here === 0) return;
    const box = track.current?.getBoundingClientRect();
    const pillBox = event.currentTarget.getBoundingClientRect();
    if (!box || !row.current) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: event.clientX - (pillBox.left + pillBox.width / 2),
      left: box.left,
      width: box.width,
      gap: parseFloat(getComputedStyle(row.current).columnGap) || 0,
      dragging: false,
      target: here,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    if (!state.dragging) {
      const intent = dragIntent(event.clientX - state.x, event.clientY - state.y);
      if (intent === 'wait') return;
      if (intent === 'scroll') {
        finish(false);
        return;
      }
      state.dragging = true;
    }
    const x = event.clientX - state.offset - state.left;
    const next = dragTarget(segmentAt(x, state.width, count, state.gap), here);
    if (next === state.target && dragTo !== null) return;
    state.target = next;
    setDragTo(next);
  };

  // Let go: jump to the step the pill is on (when it is behind the current one).
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) finish(true);
  };

  // The browser took the pointer (the page scrolls) or capture was lost: the pill goes back.
  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) finish(false);
  };

  const point = (index: number) => setPointedAt({ index, on: current });
  const unpoint = (index: number) =>
    setPointedAt((previous) => (previous?.index === index ? null : previous));

  return (
    <div className="rounded-2xl border border-lavender-300 bg-white px-5 pt-4 pb-4 shadow-form md:px-[37px] md:pt-[21px] md:pb-6">
      <p className="text-label-sm text-purple-500">
        {progressParts(template).map((part, index) =>
          'text' in part ? (
            <span key={index}>{part.text}</span>
          ) : (
            <RollingNumber key={part.value} value={values[part.value]} />
          ),
        )}
      </p>
      <div
        ref={track}
        data-steps-bar=""
        className="relative mt-3 h-7 touch-pan-y select-none [--gap:4px] md:[--gap:6px]"
      >
        {/* The last step: the bar glows softly. */}
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full shadow-glow-lime',
            ready && 'transition-opacity duration-(--motion-duration-slow) ease-out',
            step >= total ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div aria-hidden="true" className="absolute inset-0 flex items-center gap-(--gap)">
          {Array.from({ length: count }, (_, index) => (
            <Segment
              key={index}
              state={segmentState(index, here)}
              pointed={pointed === index || (target === index && target < here)}
              animate={ready}
            />
          ))}
        </div>
        {/* The finished steps as buttons, over their segments (the rest are spacers). */}
        <div ref={row} className="absolute inset-0 flex gap-(--gap)">
          {Array.from({ length: count }, (_, index) => {
            const entry = steps[index];
            if (index >= here || !entry) return <span key={index} className="min-w-0 flex-1" />;
            return (
              <button
                key={index}
                type="button"
                aria-label={jumpLabel({ ...entry, index })}
                onClick={() => onJump(entry.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') point(index);
                }}
                onPointerLeave={() => unpoint(index)}
                onFocus={(event) => {
                  if (isFocusVisible(event.currentTarget)) point(index);
                }}
                onBlur={() => unpoint(index)}
                className="min-w-0 flex-1 cursor-pointer rounded-md"
              />
            );
          })}
        </div>
        {/* The pill: aria-hidden, the buttons are its accessible alternative. It rides on the
            right edge of a track-wide layer that starts left of the track (LAYER), so the layer
            never reaches past the track's right edge: no sideways scroll on a phone. */}
        <div
          aria-hidden="true"
          className={cx(LAYER, ready && ON_SPRING)}
          style={{ translate: centre(pill, count) }}
        >
          <div
            data-steps-pill=""
            data-dragging={dragging ? '' : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}
            className={cx(
              'pointer-events-auto absolute top-1/2 left-full grid h-7 min-w-7 -translate-1/2 touch-pan-y place-items-center rounded-full bg-lime-400 px-2 text-label-sm text-ink-900 shadow-glow-lime inset-shadow-gloss',
              // A bigger hit area than the pill itself: taller, and a little wider (the finished
              // steps next to it stay tappable).
              'before:absolute before:-inset-x-1 before:-inset-y-2',
              'transition-[scale] duration-(--motion-duration-fast) ease-out motion-safe:data-dragging:scale-110',
              here > 0 &&
                'cursor-grab data-dragging:cursor-grabbing motion-safe:pointer-fine:hover:scale-105',
            )}
          >
            <RollingNumber value={pill + 1} />
          </div>
        </div>
        {label && shown !== null && (
          <div
            aria-hidden="true"
            className={cx(LAYER, ready && ON_SPRING)}
            style={{ translate: centre(shown, count) }}
          >
            <div
              className="absolute bottom-full left-full mb-1.5 max-w-[calc(100%-2rem)] truncate rounded-md bg-ink-900 px-2.5 py-1 text-sm whitespace-nowrap text-white shadow-card motion-safe:animate-[form-label-in_var(--motion-duration-fast)_var(--ease-out)]"
              style={{ translate: `-${labelShift(shown, count)}% 0` }}
            >
              {label.title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
