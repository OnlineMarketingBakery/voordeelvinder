// "Opnieuw beginnen" (Tanjil's form feedback 2026-09-30, src/lib/form/reset.ts): the round
// button beside "Terug" and the message with "Ongedaan maken" that follows it. FormIsland owns
// what they do; these only draw them and time the undo.
//
// Motion (docs/MOTION.md): the button fades and scales in when there is something to reset
// (CSS @starting-style), its arrow tilts back on hover, and on a click it spins counter-clockwise
// once, then the button fades out (it has nothing left to reset). The message rises in and a
// thin bar runs down over UNDO_MS. Transform and opacity only, and nothing waits for them: the
// form resets in the same click. Reduced motion: no spin, tilt, scale, rise or bar; the button
// goes at once, the message fades.
import { useEffect, useRef, useState } from 'react';

import { UNDO_MS } from '../../lib/form/reset';
import { cubicBezier, duration, ease } from '../../lib/motion';
import { useReducedMotion } from './motion';
import { cx } from './ui';

/**
 * The reset button: shown while `visible` (there is something to reset). After a click that
 * reset the form it stays for its spin (`slow`), inert, and fades out at the end of it.
 */
export function ResetButton({
  visible,
  label,
  onReset,
}: {
  visible: boolean;
  /** Its name and tooltip (_copy.json `reset.button`). */
  label: string;
  /** Resets the form; false when it didn't (while sending). */
  onReset: () => boolean;
}) {
  const reduced = useReducedMotion();
  const button = useRef<HTMLButtonElement>(null);
  const icon = useRef<SVGSVGElement>(null);
  const exit = useRef<Animation | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setTimeout(() => setSpinning(false), duration.slow);
    return () => window.clearTimeout(timer);
  }, [spinning]);

  // Something to reset again during the spin (an undo right away): the button stays as it was.
  useEffect(() => {
    if (!visible) return;
    exit.current?.cancel();
    exit.current = null;
  }, [visible]);

  const leaving = spinning && !visible;
  if (!visible && !spinning) return null;

  const onClick = () => {
    if (leaving || !onReset() || reduced) return;
    const timing = { duration: duration.slow, easing: cubicBezier(ease.inOut) };
    icon.current?.animate?.(
      [{ transform: 'rotate(0turn)' }, { transform: 'rotate(-1turn)' }],
      timing,
    );
    exit.current =
      button.current?.animate?.(
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 1, transform: 'scale(1)', offset: 0.6 },
          { opacity: 0, transform: 'scale(0.8)' },
        ],
        { ...timing, fill: 'forwards' },
      ) ?? null;
    setSpinning(true);
  };

  return (
    <button
      ref={button}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      inert={leaving}
      className={cx(
        'group grid size-12 shrink-0 place-items-center rounded-full border border-control-border bg-white text-ink-900 select-none md:size-[52px]',
        'transition-[translate,scale,opacity] duration-(--motion-duration-fast) ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97]',
        'starting:opacity-0 motion-safe:starting:scale-75',
      )}
    >
      {/* A counter-clockwise arrow (rotate-ccw), drawn here so it can spin. */}
      <svg
        ref={icon}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 transition-[rotate] duration-(--motion-duration-base) ease-out motion-safe:group-hover:-rotate-45"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12a8 8 0 1 0 8-8 8.6 8.6 0 0 0-6 2.5L4 8.5" />
        <path d="M4 3.5v5h5" />
      </svg>
    </button>
  );
}

/**
 * "Formulier gewist" with "Ongedaan maken", for UNDO_MS: paused while the pointer is on it or
 * focus is in it, so reaching the button never races the clock. Then it fades out and calls
 * `onExpire`. Keyed per reset by FormIsland, so a second reset starts a new one. Inline above
 * the buttons from md; on a phone a bar at the bottom of the screen (the reset scrolls up to the
 * first step, and a long one such as the product cards would push an inline message out of view).
 */
export function UndoNotice({
  message,
  action,
  onUndo,
  onExpire,
}: {
  message: string;
  action: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const expire = useRef(onExpire);

  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let remaining = UNDO_MS;
    let since = performance.now();
    let timer: number | undefined;
    let done = false;
    let hovered = false;
    let focused = false;
    const countdown = reduced
      ? undefined
      : bar.current?.animate?.([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
          duration: UNDO_MS,
          easing: 'linear',
          fill: 'forwards',
        });
    const finish = () => {
      timer = undefined;
      const fade = element.animate?.([{ opacity: 1 }, { opacity: 0 }], {
        duration: duration.fast,
        easing: cubicBezier(ease.out),
        fill: 'forwards',
      });
      const end = () => {
        if (!done) expire.current();
      };
      if (fade) fade.finished.then(end, end);
      else end();
    };
    const sync = () => {
      const hold = hovered || focused;
      if (hold && timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
        remaining -= performance.now() - since;
        countdown?.pause();
      } else if (!hold && timer === undefined && remaining > 0) {
        since = performance.now();
        timer = window.setTimeout(finish, remaining);
        countdown?.play();
      }
    };
    const onEnter = () => {
      hovered = true;
      sync();
    };
    const onLeave = () => {
      hovered = false;
      sync();
    };
    const onFocusIn = () => {
      focused = true;
      sync();
    };
    const onFocusOut = (event: FocusEvent) => {
      focused = element.contains(event.relatedTarget as Node | null);
      sync();
    };
    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('focusin', onFocusIn);
    element.addEventListener('focusout', onFocusOut);
    timer = window.setTimeout(finish, remaining);
    return () => {
      done = true;
      window.clearTimeout(timer);
      countdown?.cancel();
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('focusin', onFocusIn);
      element.removeEventListener('focusout', onFocusOut);
    };
  }, [reduced]);

  return (
    <div
      ref={root}
      className={cx(
        'flex items-center justify-between gap-3 overflow-clip rounded-lg border border-lavender-300 bg-lavender-50 py-1 pr-1 pl-4',
        // Phones: at the bottom of the screen, where it can't be out of view after the reset
        // took the page up to the first step. From md: inline above the buttons.
        'fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 shadow-card-lg md:relative md:inset-auto md:z-auto md:mb-6 md:shadow-none',
        'transition-[opacity,translate] duration-(--motion-duration-base) ease-out starting:opacity-0 motion-safe:starting:translate-y-2',
      )}
    >
      <p className="text-body text-ink-900">{message}</p>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 rounded-md px-3 text-body font-semibold text-purple-500 underline underline-offset-2 hover:text-purple-700"
      >
        {action}
      </button>
      <span
        ref={bar}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-purple-500/40 motion-reduce:hidden"
      />
    </div>
  );
}
