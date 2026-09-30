// The purple side panel (Figma 88:7430: 372 px, title 30/32, body, mascot 323×289 at the
// bottom). Below lg it becomes a compact header above the progress card: a small mascot beside
// the title, no body (the mobile form is not designed; proposal, brief §6). The title is the
// page's h1; the mascot is decorative.
//
// Motion (docs/MOTION.md "Mascot" and "Ambient light"): the mascot hops once when the step
// changes (`stepKey`) and nods when an answer is picked (`pickKey`), never on the first render
// and, like the rest of the form, not before Motion is ready (a restore after hydration doesn't
// move); whole-image transforms as percentages of the image, so the phone header's small mascot
// moves less. A move that interrupts another starts where that one has the mascot. A soft light
// rests behind the mascot, never behind the title or the body copy (their contrast), and glides
// to its next place when the step changes (a pseudo-element's translate, CSS): no loop. Reduced
// motion: all of it stays still.
import { useEffect, useRef } from 'react';

import {
  AMBIENT_PLACES,
  MASCOT_MS,
  mascotFramesFrom,
  mascotHopFrames,
  mascotNodFrames,
} from '../../lib/form/motion';
import type { FormPanel as FormPanelData } from '../../lib/form/types';
import { useMotionReady, useReducedMotion } from './motion';
import { cx } from './ui';

/**
 * Plays one mascot move from the bottom centre, instead of any move still playing: from where
 * that move has the mascot now (read before it is cancelled), so nothing jumps.
 */
function play(image: HTMLElement | null, frames: Keyframe[]) {
  if (!image || typeof image.animate !== 'function') return;
  const playing = image.getAnimations();
  const from = playing.length > 0 ? getComputedStyle(image).transform : 'none';
  for (const animation of playing) animation.cancel();
  image.animate(mascotFramesFrom(frames, from), { duration: MASCOT_MS });
}

/** The ambient light glides on to its next resting place (`data-light`, the CSS below). */
function glide(picture: HTMLElement | null) {
  if (!picture) return;
  picture.dataset.light = String((Number(picture.dataset.light ?? 0) + 1) % AMBIENT_PLACES);
}

export function FormPanel({
  panel,
  stepKey,
  pickKey,
}: {
  panel: FormPanelData;
  /** Changes on every step change: the mascot hops and the light glides on. */
  stepKey: string;
  /** Goes up on every picked answer: the mascot nods. */
  pickKey: number;
}) {
  const { image } = panel;
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const moves = ready && !reduced;
  const picture = useRef<HTMLPictureElement>(null);
  const mascot = useRef<HTMLImageElement>(null);
  // The keys the mascot last reacted to: the first render's never make it move.
  const shown = useRef({ stepKey, pickKey });

  useEffect(() => {
    if (shown.current.stepKey === stepKey) return;
    shown.current.stepKey = stepKey;
    if (!moves) return;
    play(mascot.current, mascotHopFrames());
    glide(picture.current);
  }, [stepKey, moves]);

  useEffect(() => {
    if (shown.current.pickKey === pickKey) return;
    shown.current.pickKey = pickKey;
    if (moves) play(mascot.current, mascotNodFrames());
  }, [pickKey, moves]);

  return (
    <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-2xl bg-purple-600 px-4 py-3 text-white surface-dark lg:flex-col lg:items-stretch lg:gap-0 lg:px-[33px] lg:pt-9 lg:pb-[17px]">
      <div className="min-w-0 flex-1 lg:flex-none">
        <h1 className="text-title-sm lg:text-h4">{panel.title}</h1>
        <p className="mt-[23px] hidden text-body text-on-purple-muted lg:block">{panel.body}</p>
      </div>
      <picture
        ref={picture}
        data-morph="form-mascot"
        className={cx(
          'relative order-first block w-20 shrink-0 lg:order-none lg:mt-auto lg:w-[min(323px,calc(100%+16px))] lg:self-center lg:pt-8',
          // The ambient light: a soft white glow behind the mascot, inside the picture's box on
          // the panel (80 % of its height; the title and body copy are above it) and clear of the
          // title beside the phone header's small mascot (120 % of its width, softer), at each of
          // its places. It starts centred and stays there with reduced motion.
          'before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:-z-10 before:aspect-square before:w-[120%] before:[translate:-50%_-50%] before:rounded-full before:bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)] before:opacity-60 lg:before:h-[80%] lg:before:w-auto lg:before:opacity-100',
          // On a step change it glides to its next place (glide) over 4 × `slow`, then rests.
          'motion-safe:before:transition-[translate] motion-safe:before:duration-[calc(var(--motion-duration-slow)*4)] motion-safe:before:ease-in-out motion-safe:data-[light=1]:before:[translate:-62%_-40%] motion-safe:data-[light=2]:before:[translate:-44%_-60%]',
        )}
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
