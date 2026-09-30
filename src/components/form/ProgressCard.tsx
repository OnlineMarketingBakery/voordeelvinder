// "Stap X van Y" and the bar (Figma 89:7438: 767×91 card, 9 px track, #674bd9 fill). The numbers
// come from the engine's progress() (brief §7.6); the bar is decorative next to the text.
//
// Motion (brief §6.1): the bar fills on the spring (a full-width fill moved with translateX, so
// only the transform animates) and each number rolls to its new value. The server renders the
// final position, so nothing moves at hydration. Reduced motion: the bar jumps, numbers swap.
import { m } from 'motion/react';

import { progressOffset, progressParts, progressTransition } from '../../lib/form/motion';
import { RollingNumber, useMotionReady, useReducedMotion } from './motion';

export function ProgressCard({
  template,
  step,
  total,
}: {
  /** "Stap {step} van {total}" (_copy.json `progress`). */
  template: string;
  step: number;
  total: number;
}) {
  const reduced = useReducedMotion();
  const ready = useMotionReady();
  const offset = progressOffset(step, total);
  const values = { step, total };
  return (
    <div className="rounded-2xl border border-lavender-300 bg-white px-5 pt-4 pb-5 shadow-form md:px-[37px] md:pt-[21px] md:pb-[31px]">
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
        aria-hidden="true"
        className="mt-2.5 h-[9px] overflow-hidden rounded-full bg-purple-700/13"
      >
        <m.div
          // Until Motion can animate, a new key renders each position as it is.
          key={ready ? 'motion' : offset}
          className="h-full w-full rounded-full bg-purple-700"
          initial={false}
          animate={{ x: offset }}
          transition={progressTransition(reduced)}
        />
      </div>
    </div>
  );
}
