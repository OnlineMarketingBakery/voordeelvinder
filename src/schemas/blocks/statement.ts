import { z } from 'astro/zod';

import { blockBase, text } from '../primitives';

/**
 * A big statement on a purple band with rings (About us 104:718–104:724): two to four lines,
 * one of them on a tilted lime chip, and a line of body text. The lines are the section's h2.
 */
export const statementBlock = z
  .strictObject({
    type: z.literal('statement'),
    ...blockBase,
    lines: z.array(text).min(2).max(4),
    /** Must equal one of the lines. */
    highlight: text,
    body: text.optional(),
  })
  .superRefine((block, ctx) => {
    if (!block.lines.includes(block.highlight)) {
      ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'must equal one of the lines' });
    }
  });

export type StatementBlock = z.infer<typeof statementBlock>;
