import { z } from 'astro/zod';

import { blockBase, copy, imageRef, text, tone } from '../primitives';

/** Step icons: raster masks in src/assets/icons/raster until the designer supplies SVGs (5.5). */
export const stepIcons = ['contract', 'compare', 'decision-making'] as const;

const step = z.strictObject({
  /** The pill above the card, e.g. "Stap 01". */
  label: text,
  /** Pill colour. */
  tone,
  icon: z.enum(stepIcons),
  /** h3 */
  title: text,
  body: text,
});

/**
 * "Hoe het werkt": numbered steps on a purple panel. `start` is the home layout (left header,
 * optional mascot breaking out above the panel); `center` is the product-page layout.
 */
export const stepsBlock = z
  .strictObject({
    type: z.literal('steps'),
    ...blockBase,
    align: z.enum(['start', 'center']),
    /** h2 */
    title: text,
    /** Part of the title shown on the lime chip. */
    highlight: text.optional(),
    intro: copy.optional(),
    /** Only with `align: 'start'`: a centred header leaves no room for it. */
    mascot: imageRef.optional(),
    items: z.array(step).min(2).max(4),
  })
  .superRefine((steps, ctx) => {
    if (steps.highlight !== undefined && !steps.title.includes(steps.highlight)) {
      ctx.addIssue({
        code: 'custom',
        path: ['highlight'],
        message: 'must be part of the title',
      });
    }
    if (steps.mascot !== undefined && steps.align !== 'start') {
      ctx.addIssue({
        code: 'custom',
        path: ['mascot'],
        message: "only with align 'start'",
      });
    }
  });

export type StepsBlock = z.infer<typeof stepsBlock>;
