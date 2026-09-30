// The purple side panel (Figma 88:7430: 372 px, title 30/32, body, mascot 323×289 at the
// bottom). Below lg it becomes a compact header above the progress card: a small mascot beside
// the title, no body (the mobile form is not designed; proposal, brief §6). The title is the
// page's h1; the mascot is decorative.
//
// Motion (docs/MOTION.md "Mascot" and "Ambient light"): the mascot hops once when the step
// changes (`stepKey`) and nods when an answer is picked (`pickKey`), never on the first render
// and, like the rest of the form, not before Motion is ready (a restore after hydration doesn't
// move); whole-image transforms as percentages of the image, so the phone header's small mascot
// moves less. A very slow light drifts across the panel (a pseudo-element's transform, CSS),
// paused while the panel is off screen. Reduced motion: all of it stays still.
import { useEffect, useRef } from 'react';

import { MASCOT_MS, mascotHopFrames, mascotNodFrames } from '../../lib/form/motion';
import type { FormPanel as FormPanelData } from '../../lib/form/types';
import { useMotionReady, useReducedMotion } from './motion';
import { cx } from './ui';

/** Plays one mascot move from the bottom centre, instead of any move still playing. */
function play(image: HTMLElement | null, frames: Keyframe[]) {
  if (!image || typeof image.animate !== 'function') return;
  for (const animation of image.getAnimations()) animation.cancel();
  image.animate(frames, { duration: MASCOT_MS });
}

export function FormPanel({
  panel,
  stepKey,
  pickKey,
}: {
  panel: FormPanelData;
  /** Changes on every step change: the mascot hops. */
  stepKey: string;
  /** Goes up on every picked answer: the mascot nods. */
  pickKey: number;
}) {
  const { image } = panel;
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const moves = ready && !reduced;
  const box = useRef<HTMLDivElement>(null);
  const mascot = useRef<HTMLImageElement>(null);
  // The keys the mascot last reacted to: the first render's never make it move.
  const shown = useRef({ stepKey, pickKey });

  useEffect(() => {
    if (shown.current.stepKey === stepKey) return;
    shown.current.stepKey = stepKey;
    if (moves) play(mascot.current, mascotHopFrames());
  }, [stepKey, moves]);

  useEffect(() => {
    if (shown.current.pickKey === pickKey) return;
    shown.current.pickKey = pickKey;
    if (moves) play(mascot.current, mascotNodFrames());
  }, [pickKey, moves]);

  // The ambient light only moves while the panel is on screen (the browser stops it in a hidden
  // tab by itself).
  useEffect(() => {
    const element = box.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.ambient = entry?.isIntersecting ? 'on' : 'paused';
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={cx(
        'relative isolate flex items-center gap-4 overflow-hidden rounded-2xl bg-purple-600 px-4 py-3 text-white surface-dark lg:flex-col lg:items-stretch lg:gap-0 lg:px-[33px] lg:pt-9 lg:pb-[17px]',
        // The ambient light: a soft white glow, 70 % of the panel wide, drifting for 24 s and
        // back; softer in the phone's compact header. Reduced motion: it stays in the corner.
        'before:pointer-events-none before:absolute before:top-0 before:left-0 before:-z-10 before:aspect-square before:w-[70%] before:rounded-full before:bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)] before:opacity-60 before:will-change-transform lg:before:opacity-100',
        'data-[ambient=paused]:before:[animation-play-state:paused] motion-safe:before:animate-[form-ambient_24s_var(--ease-in-out)_infinite_alternate]',
      )}
    >
      <div className="min-w-0 flex-1 lg:flex-none">
        <h1 className="text-title-sm lg:text-h4">{panel.title}</h1>
        <p className="mt-[23px] hidden text-body text-on-purple-muted lg:block">{panel.body}</p>
      </div>
      <picture
        data-morph="form-mascot"
        className="order-first block w-20 shrink-0 lg:order-none lg:mt-auto lg:w-[min(323px,calc(100%+16px))] lg:self-center lg:pt-8"
      >
        {image.sources.map((source) => (
          <source key={source.type} type={source.type} srcSet={source.srcset} sizes={image.sizes} />
        ))}
        <img
          ref={mascot}
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          loading="eager"
          decoding="async"
          className="h-auto w-full origin-bottom"
        />
      </picture>
    </div>
  );
}
