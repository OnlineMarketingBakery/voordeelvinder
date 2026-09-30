// The form motion (brief §6.1, docs/MOTION.md) as small React pieces around Motion's `m`
// components. `LazyMotion` (strict: a full `motion.*` component fails) keeps the bundle small:
// the `m` components ship with the island, the animation features (`domAnimation`,
// ./motion-features.ts) load as a separate chunk right after hydration. Until they are there,
// everything renders in its final state and nothing starts hidden (useMotionReady), so a slow or
// failed chunk only costs the animations. `MotionConfig reducedMotion="user"` is the safety net
// behind the reduced variants in src/lib/form/motion.ts.
//
// None of this delays anything: the engine has already moved on when an animation starts, focus
// and aria-live never wait, and every animation can be interrupted by the next tap.
import { AnimatePresence, LazyMotion, m, MotionConfig, useIsPresent } from 'motion/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  animateHeight,
  checkVariants,
  indicatorVariants,
  isNewShake,
  messageTransition,
  revealVariants,
  rollVariants,
  SHAKE_MS,
  shakeKeyframes,
  springEasing,
  stepVariants,
  travelBetween,
  type Travel,
} from '../../lib/form/motion';
import { cubicBezier, ease, spring } from '../../lib/motion';

let featuresReady = false;
const readyListeners = new Set<() => void>();

async function loadFeatures() {
  const { default: features } = await import('./motion-features');
  featuresReady = true;
  for (const listener of readyListeners) listener();
  return features;
}

function subscribeReady(onChange: () => void) {
  readyListeners.add(onChange);
  return () => {
    readyListeners.delete(onChange);
  };
}

/**
 * True once Motion's animation features have loaded. Before that (and on the server) the `m`
 * components can't animate, so nothing may start from a hidden `initial` state.
 */
export function useMotionReady(): boolean {
  return useSyncExternalStore(
    subscribeReady,
    () => featuresReady,
    () => false,
  );
}

export function FormMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/**
 * True when the visitor asked for reduced motion. False on the server and during hydration
 * (the server snapshot), so the first client render matches the server HTML.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia?.(REDUCED).matches ?? false,
    () => false,
  );
}

// useLayoutEffect warns on the server; the effects below only matter in the browser.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * The token spring as a CSS `linear()` easing, for the one animation Motion doesn't run here:
 * the card height (a Web Animation, see StepStage). linear() needs Safari 17.2+; older browsers
 * get the ease-out token over the same time.
 */
let heightCurve: { duration: number; easing: string } | undefined;
function heightEasing() {
  if (!heightCurve) {
    const curve = springEasing(spring);
    const supported = CSS.supports?.('animation-timing-function', curve.easing) ?? false;
    heightCurve = supported ? curve : { duration: curve.duration, easing: cubicBezier(ease.out) };
  }
  return heightCurve;
}

/**
 * The step area of the form card. The new step slides in from the direction of travel, and the
 * area's height moves from the old step's to the new one's on the spring. Anything else that
 * changes the height (a revealed question, an error line, a restore after hydration) is not
 * animated here: the area is `height: auto` except while it follows a step change.
 *
 * The step itself is keyed and replaced at once: only one step is ever in the DOM, so ids stay
 * unique and the new title can take focus in the same frame. The height is a Web Animation
 * started before the first paint of the new step (a layout effect), so nothing flashes, and a
 * quick second step change continues from the height on screen.
 */
export function StepStage({
  stepKey,
  travel,
  children,
}: {
  stepKey: string;
  travel: Travel;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const lastHeight = useRef<number | null>(null);
  const shownKey = useRef(stepKey);

  // The height as it changes, so a step change knows where it starts from.
  useBrowserLayoutEffect(() => {
    const element = inner.current;
    if (!element) return;
    lastHeight.current = element.getBoundingClientRect().height;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      lastHeight.current = entry?.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useBrowserLayoutEffect(() => {
    if (shownKey.current === stepKey) return;
    shownKey.current = stepKey;
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const running = box.getAnimations?.() ?? [];
    // Mid-animation the box shows an in-between height: start from there.
    const from = running.length > 0 ? box.getBoundingClientRect().height : lastHeight.current;
    const to = content.getBoundingClientRect().height;
    lastHeight.current = to;
    for (const animation of running) animation.cancel();
    if (!animateHeight({ reduced, travel, from, to }) || typeof box.animate !== 'function') return;
    const { duration, easing } = heightEasing();
    box.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration, easing });
  }, [stepKey, travel, reduced]);

  return (
    // -mx-2/-mb-2 + px-2/pb-2: room for focus rings and the error shake inside the clip.
    // overflow: clip, not hidden: never a scroll container, so scrollIntoView can't shift it.
    <div ref={outer} className="-mx-2 -mb-2 overflow-clip">
      <div ref={inner} className="px-2 pb-2">
        <m.div
          key={stepKey}
          custom={travel}
          variants={stepVariants(reduced)}
          initial={travel === 0 || !ready ? false : 'enter'}
          animate="center"
        >
          {children}
        </m.div>
      </div>
    </div>
  );
}

/** Wraps a step's fields: questions revealed after the step appeared expand, hidden ones collapse. */
export function FieldList({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

/**
 * One field in the step's grid. `reveal` (fields with visibleIf) expands and collapses;
 * `shake` changes each time "Volgende" finds an error in this field, which shakes it once;
 * `shakesPlayed` (shared by the step's fields) remembers it across a collapse and a reveal.
 * The bottom padding replaces the grid's row gap, so a collapsing field takes its gap along.
 */
export function FieldCell({
  id,
  fieldId,
  reveal,
  shake,
  shakesPlayed,
  className,
  children,
}: {
  id: string;
  fieldId: string;
  reveal: boolean;
  shake: number;
  shakesPlayed: Map<string, number>;
  className: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const present = useIsPresent();
  const shaker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNewShake(shake, shakesPlayed.get(fieldId))) return;
    shakesPlayed.set(fieldId, shake);
    const frames = shakeKeyframes(reduced);
    if (!frames) return;
    shaker.current?.animate?.(
      frames.map((transform) => ({ transform })),
      { duration: SHAKE_MS, easing: cubicBezier(ease.out) },
    );
  }, [shake, shakesPlayed, fieldId, reduced]);

  const body = (
    <div ref={shaker} className="pb-6">
      {children}
    </div>
  );
  if (!reveal) {
    return (
      <div data-field={fieldId} id={id} className={className}>
        {body}
      </div>
    );
  }
  return (
    <m.div
      data-field={fieldId}
      id={id}
      className={className}
      variants={revealVariants(reduced)}
      initial={reduced || !ready ? false : 'collapsed'}
      animate="open"
      exit="collapsed"
      // A collapsing question can't be used any more.
      inert={!present}
      aria-hidden={present ? undefined : true}
    >
      {body}
    </m.div>
  );
}

/** An error or warning line: fades in (also with reduced motion, then shorter). */
export function FadeInText({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: string;
}) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  return (
    <m.p
      key={children}
      id={id}
      className={className}
      initial={ready ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={messageTransition(reduced)}
    >
      {children}
    </m.p>
  );
}

/**
 * The radio circle of an answer card: springs into the selected state, and its check mark
 * draws in. Decorative (the real radio is the sr-only input).
 */
export function ChoiceIndicator({ selected }: { selected: boolean }) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const state = selected ? 'on' : 'off';
  return (
    <m.span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full border border-control-border bg-white group-has-checked:border-purple-600 group-has-checked:bg-purple-600"
      variants={indicatorVariants(reduced)}
      initial={false}
      animate={state}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <m.path
          // Until Motion can animate, a new key renders each state as it is.
          key={ready ? 'motion' : state}
          d="M6 12.5l4 4 8-9"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
          variants={checkVariants(reduced)}
          initial={false}
          animate={state}
        />
      </svg>
    </m.span>
  );
}

function RollingDigit({ value, travel }: { value: number; travel: Travel }) {
  const present = useIsPresent();
  return (
    <m.span
      custom={travel}
      variants={rollVariants()}
      initial="enter"
      animate="center"
      exit="exit"
      aria-hidden={present ? undefined : true}
      className="col-start-1 row-start-1"
    >
      {value}
    </m.span>
  );
}

/** A number in "Stap X van Y" that rolls to its new value (up when it grows). */
export function RollingNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const [previous, setPrevious] = useState(value);
  const [travel, setTravel] = useState<Travel>(0);
  // Adjusting state while rendering (React's pattern for "state from the previous props").
  if (value !== previous) {
    setPrevious(value);
    setTravel(travelBetween(previous, value));
  }
  if (reduced || !ready) return <span>{value}</span>;
  return (
    <span className="inline-grid overflow-clip">
      <AnimatePresence initial={false} custom={travel}>
        <RollingDigit key={value} value={value} travel={travel} />
      </AnimatePresence>
    </span>
  );
}
