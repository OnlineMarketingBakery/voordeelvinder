// The form motion (brief §6.1, docs/MOTION.md) as small React pieces. Motion's `m` components
// run the small state animations (revealed questions, messages, the radio check, the pops, the
// rolling numbers); `LazyMotion` (strict: a full `motion.*` component fails) keeps the bundle
// small: the `m` components ship with the island, the animation features (`domAnimation`,
// ./motion-features.ts) load as a separate chunk right after hydration. Until they are there,
// everything renders in its final state and nothing starts hidden (useMotionReady), so a slow or
// failed chunk only costs the animations. `MotionConfig reducedMotion="user"` is the safety net
// behind the reduced variants in src/lib/form/motion.ts.
//
// The step change is plain Web Animations (StepStage): transforms and opacity on the compositor,
// no Motion needed, so it works from the first tap after hydration.
//
// None of this delays anything: the engine has already moved on when an animation starts, focus
// and aria-live never wait, and every animation can be interrupted by the next tap.
import { AnimatePresence, LazyMotion, m, MotionConfig, useIsPresent } from 'motion/react';
import {
  Component,
  createRef,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';

import {
  animateHeight,
  checkVariants,
  ghostOffset,
  indicatorVariants,
  isGhostAttribute,
  isNewShake,
  itemEnterFrames,
  messageVariants,
  popVariants,
  revealVariants,
  rollVariants,
  SHAKE_MS,
  shakeKeyframes,
  springEasing,
  staggerDelay,
  pushDistance,
  stepEnterFrames,
  stepExitFrames,
  travelBetween,
  type Travel,
} from '../../lib/form/motion';
import { cubicBezier, duration, ease, spring } from '../../lib/motion';

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

/**
 * The token spring as a Web Animation timing: the CSS `linear()` easing of springEasing and the
 * time it takes to settle (the CSS token --ease-spring is the same curve). linear() needs Safari
 * 17.2+; older browsers get the ease-out token over the same time.
 */
let springCurve: { duration: number; easing: string } | undefined;
export function springTiming(): { duration: number; easing: string } {
  if (!springCurve) {
    const curve = springEasing(spring);
    const supported = CSS.supports?.('animation-timing-function', curve.easing) ?? false;
    springCurve = supported ? curve : { duration: curve.duration, easing: cubicBezier(ease.out) };
  }
  return springCurve;
}

const canAnimate = (element: Element | null): element is HTMLElement =>
  element !== null && typeof (element as HTMLElement).animate === 'function';

/** The items of a step that come in one after the other: marked data-stagger, innermost only. */
function staggerItems(step: HTMLElement): HTMLElement[] {
  return [...step.querySelectorAll<HTMLElement>('[data-stagger]')].filter(
    (item) => item.querySelector('[data-stagger]') === null,
  );
}

/** The outgoing step's copy, placed where the step was, and its frame (the step area's clip). */
type Ghost = { frame: HTMLDivElement; copy: HTMLElement; transform: string; opacity: number };

/**
 * A copy of the step that is about to be replaced, for its slide out: visual only. Built while
 * the step is still on screen (getSnapshotBeforeUpdate), so its place, its selected options and
 * a slide-in still under way are what the visitor sees: the copy sits at the step's own place
 * (ghostOffset, without that slide) and starts from the slide's transform. Every id, name, label
 * link, ARIA attribute and data hook is removed (isGhostAttribute) and each <label> becomes a
 * <div> (no input of the copy is labelled by anything), it is inert and aria-hidden, and it goes
 * into a layer outside the <form>: no locator, screen reader or form submission ever finds it.
 */
function captureGhost(step: HTMLElement, box: HTMLElement, layer: HTMLElement): Ghost {
  const boxRect = box.getBoundingClientRect();
  const stepRect = step.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const style = getComputedStyle(step);
  // The step's box on screen includes a slide still running on it; the copy's place doesn't.
  const slide = style.transform === 'none' ? undefined : new DOMMatrixReadOnly(style.transform);
  const place = ghostOffset(stepRect, boxRect, slide);
  const copy = step.cloneNode(true) as HTMLElement;

  // Cloning keeps what was typed and what is checked, not the choice of a <select>.
  const selects = copy.querySelectorAll('select');
  step.querySelectorAll('select').forEach((select, index) => {
    const twin = selects[index];
    if (twin) twin.value = select.value;
  });
  // Items still fading in (the step was left during its stagger): as they are on screen.
  const items = copy.querySelectorAll<HTMLElement>('[data-stagger]');
  step.querySelectorAll<HTMLElement>('[data-stagger]').forEach((item, index) => {
    const twin = items[index];
    if (!twin || (item.getAnimations?.().length ?? 0) === 0) return;
    const current = getComputedStyle(item);
    twin.style.opacity = current.opacity;
    twin.style.transform = current.transform;
  });

  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    for (const { name } of [...element.attributes]) {
      if (isGhostAttribute(name)) element.removeAttribute(name);
    }
  }
  for (const label of copy.querySelectorAll('label')) {
    const plain = document.createElement('div');
    for (const { name, value } of [...label.attributes]) plain.setAttribute(name, value);
    plain.append(...label.childNodes);
    label.replaceWith(plain);
  }
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  Object.assign(copy.style, {
    position: 'absolute',
    left: `${place.left}px`,
    top: `${place.top}px`,
    width: `${stepRect.width}px`,
    margin: '0',
    transform: style.transform,
    opacity: style.opacity,
  });

  // The frame clips the copy like the step area clips the steps: below its (animated) height.
  const frame = document.createElement('div');
  frame.setAttribute('aria-hidden', 'true');
  frame.inert = true;
  Object.assign(frame.style, {
    position: 'absolute',
    left: `${boxRect.left - layerRect.left}px`,
    top: `${boxRect.top - layerRect.top}px`,
    width: `${boxRect.width}px`,
    height: `${boxRect.height}px`,
    overflowX: 'visible',
    overflowY: 'hidden',
  });
  frame.style.overflowY = 'clip'; // no scroll container where clip is supported
  frame.append(copy);
  return { frame, copy, transform: style.transform, opacity: Number(style.opacity) };
}

type StageProps = {
  stepKey: string;
  travel: Travel;
  reduced: boolean;
  ghostLayer: RefObject<HTMLDivElement | null> | undefined;
  children: ReactNode;
};

/**
 * What the step area looked like right before React replaced the step: its height, the copy of
 * the old step, and how far the steps travel (the form card's width, pushDistance).
 */
type Swap = { from: number; ghost: Ghost | null; push: number };

/**
 * The step change as Web Animations. A class for getSnapshotBeforeUpdate, React's hook for
 * reading the DOM right before an update is committed: the old step is still on screen there,
 * so its height and its copy (captureGhost) are exact, also mid-animation. componentDidUpdate
 * then runs before the new step is painted: nothing flashes, and the next change starts from
 * whatever is on screen.
 */
class StepTransition extends Component<StageProps> {
  private readonly box = createRef<HTMLDivElement>();
  private readonly content = createRef<HTMLDivElement>();
  /** The step on screen (kept through React's null call, until the next step replaces it). */
  private step: HTMLDivElement | null = null;
  private ghost: HTMLDivElement | null = null;
  private readonly setStep = (node: HTMLDivElement | null) => {
    if (node) this.step = node;
  };

  override getSnapshotBeforeUpdate(previous: Readonly<StageProps>): Swap | null {
    if (previous.stepKey === this.props.stepKey) return null;
    const box = this.box.current;
    if (!box) return null;
    const layer = this.props.ghostLayer?.current;
    const slides = stepEnterFrames(this.props.travel, this.props.reduced) !== null;
    const step = this.step;
    const ghost =
      slides && layer && step?.isConnected && canAnimate(step)
        ? captureGhost(step, box, layer)
        : null;
    // The layer covers the form card, which clips the steps sideways: they cross its width.
    const push = pushDistance(layer?.getBoundingClientRect().width);
    return { from: box.getBoundingClientRect().height, ghost, push };
  }

  override componentDidUpdate(
    _previous: Readonly<StageProps>,
    _state: unknown,
    swap: Swap | null,
  ): void {
    if (!swap) return;
    const { travel, reduced } = this.props;
    const box = this.box.current;
    const content = this.content.current;
    this.removeGhost();
    if (!box || !content) return;
    const timing = springTiming();
    for (const animation of box.getAnimations?.() ?? []) animation.cancel();
    const to = content.getBoundingClientRect().height;
    const height =
      animateHeight({ reduced, travel, from: swap.from, to }) && canAnimate(box)
        ? [{ height: `${swap.from}px` }, { height: `${to}px` }]
        : null;
    if (height) box.animate(height, timing);
    if (swap.ghost) this.playGhost(swap.ghost, height, timing, swap.push);
    const step = this.step;
    if (travel !== 0 && canAnimate(step)) this.enter(step, timing, swap.push);
  }

  override componentWillUnmount(): void {
    this.removeGhost();
  }

  /**
   * The outgoing copy: slides out of the card on the spring, fading at `slow` as it goes, and is
   * removed once both are done.
   */
  private playGhost(
    ghost: Ghost,
    height: Keyframe[] | null,
    timing: { duration: number; easing: string },
    push: number,
  ) {
    const layer = this.props.ghostLayer?.current;
    if (!layer) return;
    layer.append(ghost.frame);
    this.ghost = ghost.frame;
    if (height) ghost.frame.animate(height, timing);
    const slide = ghost.copy.animate(stepExitFrames(this.props.travel, ghost.transform, push), {
      ...timing,
      fill: 'forwards',
    });
    const fade = ghost.copy.animate([{ opacity: ghost.opacity }, { opacity: 0 }], {
      duration: duration.slow,
      easing: cubicBezier(ease.inOut),
      fill: 'forwards',
    });
    const remove = () => {
      ghost.frame.remove();
      if (this.ghost === ghost.frame) this.ghost = null;
    };
    Promise.all([slide.finished, fade.finished]).then(remove, remove);
  }

  /**
   * The incoming step: slides in on the spring and fades in, its items (title, questions,
   * cards) trailing with a stagger. Reduced motion: a fade at `fast`.
   */
  private enter(step: HTMLElement, timing: { duration: number; easing: string }, push: number) {
    const { travel, reduced } = this.props;
    const out = cubicBezier(ease.out);
    const slide = stepEnterFrames(travel, reduced, push);
    if (!slide) {
      step.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.fast, easing: out });
      return;
    }
    step.animate(slide, timing);
    step.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.fast, easing: out });
    staggerItems(step).forEach((item, index) => {
      item.animate(itemEnterFrames(travel), {
        duration: duration.base,
        easing: out,
        delay: staggerDelay(index),
        fill: 'backwards',
      });
    });
  }

  private removeGhost() {
    this.ghost?.remove();
    this.ghost = null;
  }

  override render() {
    return (
      // -mx-2/-mb-2 + px-2/pb-2: room for focus rings and the error shake inside the clip.
      // The clip is vertical only (overflow-y: clip, never hidden: never a scroll container, so
      // scrollIntoView can't shift it): the height follows the steps, and a step sliding in or
      // out sideways is clipped by the form card (overflow-x: clip), not by this box.
      <div ref={this.box} className="-mx-2 -mb-2 overflow-y-clip">
        <div ref={this.content} className="px-2 pb-2">
          <div key={this.props.stepKey} ref={this.setStep}>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * The step area of the form card (docs/MOTION.md "Form step change"). The current step slides
 * out while the next slides in, in the direction of travel, and the area's height moves from
 * the old step's to the new one's on the spring. Anything else that changes the height (a
 * revealed question, an error line, a restore after hydration) is not animated here.
 *
 * The step itself is keyed and replaced at once: only one real step is ever in the DOM, so ids
 * stay unique and the new title can take focus in the same frame. The outgoing step is a copy
 * in `ghostLayer`, a layer of the form card outside the <form>.
 */
export function StepStage({
  stepKey,
  travel,
  ghostLayer,
  children,
}: {
  stepKey: string;
  travel: Travel;
  /** Where the outgoing step's copy is shown: outside the <form>, over the step area. */
  ghostLayer?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <StepTransition stepKey={stepKey} travel={travel} reduced={reduced} ghostLayer={ghostLayer}>
      {children}
    </StepTransition>
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
 * `data-stagger`: the field comes in after the title when the step appears (answer cards stagger
 * on their own instead).
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
      <div data-field={fieldId} data-stagger="" id={id} className={className}>
        {body}
      </div>
    );
  }
  return (
    <m.div
      data-field={fieldId}
      data-stagger=""
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

/**
 * An error or warning line: drops in by half of distance[1] on the spring and fades in, like
 * every new line of the form (reduced motion: only the fade, shorter).
 */
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
      variants={messageVariants(reduced)}
      initial={ready ? 'hidden' : false}
      animate="shown"
    >
      {children}
    </m.p>
  );
}

/**
 * The pop of a picked answer: an icon tile or a checkbox scales up and back once when it gets
 * picked, never when it renders picked (initial={false}). Decorative.
 */
export function Pop({
  selected,
  className,
  children,
}: {
  selected: boolean;
  className: string;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <m.span
      aria-hidden="true"
      className={className}
      variants={popVariants(reduced)}
      initial={false}
      animate={selected ? 'on' : 'off'}
    >
      {children}
    </m.span>
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
      className="grid size-6 shrink-0 place-items-center rounded-full border border-control-border bg-white transition-[background-color,border-color] duration-(--motion-duration-fast) ease-out picked:border-purple-600 picked:bg-purple-600"
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

/** A number in "Stap X van Y" (and in the steps bar's pill) that rolls to its new value. */
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
