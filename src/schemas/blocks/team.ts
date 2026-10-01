import { z } from 'astro/zod';

import { blockBase, copy, imageRef, text } from '../primitives';

/**
 * "De mensen achter VoordeelVinder" (About us 113:944–113:1006): photo cards with a name and a
 * role. `placeholder: true` (the designer's sample people) fails a production build.
 */
export const teamBlock = z.strictObject({
  type: z.literal('team'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  members: z
    .array(z.strictObject({ name: text, role: text, photo: imageRef }))
    .min(1)
    .max(4),
  placeholder: z.boolean().optional(),
});

export type TeamBlock = z.infer<typeof teamBlock>;
