import { z } from 'astro/zod';

import { blockBase, copy, imageRef, text } from '../primitives';

/**
 * "Wat we nooit doen." (About us 108:754–109:799): rows with the same lime badge ("Nooit"), an
 * h3 and a body, beside a purple card with the waving fox.
 */
export const promisesBlock = z.strictObject({
  type: z.literal('promises'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  /** The badge on every row. */
  badge: text,
  items: z
    .array(z.strictObject({ title: text, body: text }))
    .min(1)
    .max(6),
  image: imageRef,
});

export type PromisesBlock = z.infer<typeof promisesBlock>;
