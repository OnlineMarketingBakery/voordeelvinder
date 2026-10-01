import { z } from 'astro/zod';

import { blockBase, copy, text } from '../primitives';

const side = z.strictObject({ title: text, items: z.array(text).min(1).max(8) });

/**
 * "Niet zomaar een vergelijker" (About us 113:1009–113:1066): two panels side by side, what
 * others do (purple tint, crosses) and what we do (lime tint, ticks).
 */
export const versusBlock = z.strictObject({
  type: z.literal('versus'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  others: side,
  us: side,
});

export type VersusBlock = z.infer<typeof versusBlock>;
