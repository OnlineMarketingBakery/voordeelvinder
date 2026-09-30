import { z } from 'astro/zod';

import { blockBase, copy, imageRef, link, text } from '../primitives';

/** Lines with nothing visible in them, such as Figma's U+200B spacer line (60:500). */
const blankLine = /^[\s\u200B-\u200D\u2060\uFEFF]*$/;

/**
 * Final call to action with the cheering mascot in a ring (home 60:500, the last block):
 * a short statement as the h2, one line of it on the tilted lime chip, a sub line and a button.
 */
export const ctaMascotBlock = z
  .strictObject({
    type: z.literal('ctaMascot'),
    ...blockBase,
    /** h2; each line ("\n") is its own line on screen (3 designed). */
    title: text,
    /** Equals one line of the title: that line sits on the tilted lime chip with a sparkle. */
    highlight: text.optional(),
    body: copy.optional(),
    cta: link,
    /** The mascot in the ring; alt "" = decorative (the heading says it all). */
    image: imageRef,
  })
  .superRefine((block, ctx) => {
    const lines = block.title.split('\n');
    if (lines.some((line) => blankLine.test(line))) {
      ctx.addIssue({
        code: 'custom',
        path: ['title'],
        message: 'every line needs visible text (no empty or zero-width lines)',
      });
    }
    if (block.highlight !== undefined && !lines.includes(block.highlight)) {
      ctx.addIssue({
        code: 'custom',
        path: ['highlight'],
        message: 'must equal one line of the title',
      });
    }
  });

export type CtaMascotBlock = z.infer<typeof ctaMascotBlock>;
