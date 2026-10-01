import { z } from 'astro/zod';

import { blockBase, copy, imageRef, text } from '../primitives';

/**
 * "Waar we voor staan" (About us 100:303–104:741): the header and a mascot on the left, cards
 * with a badge (Missie, Visie), an h3 and a body on the right, over the cloud background.
 */
export const valuesBlock = z.strictObject({
  type: z.literal('values'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  image: imageRef,
  items: z
    .array(z.strictObject({ badge: text, title: text, body: text }))
    .min(1)
    .max(3),
});

export type ValuesBlock = z.infer<typeof valuesBlock>;
