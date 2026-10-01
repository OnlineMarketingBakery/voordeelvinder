import { z } from 'astro/zod';

import { blockBase, copy, link, text } from '../primitives';

/**
 * "Is VoordeelVinder iets voor mij?" (About us 111:895–111:940): persona cards on a purple panel,
 * each with a badge, a description, the occasion, a quote, the benefit and a lime button.
 */
export const personasBlock = z.strictObject({
  type: z.literal('personas'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  items: z
    .array(
      z.strictObject({
        badge: text,
        statement: text,
        occasion: text,
        quote: text,
        benefit: text,
        cta: link,
      }),
    )
    .min(1)
    .max(3),
});

export type PersonasBlock = z.infer<typeof personasBlock>;
