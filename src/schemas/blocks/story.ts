import { z } from 'astro/zod';

import { blockBase, copy, iconKey, text, tone } from '../primitives';

/**
 * Two story cards under a centred header (About us "Hoe VoordeelVinder ontstond", Figma
 * 100:11–104:717): an icon tile, an h3, paragraphs and one paragraph in the card's accent colour.
 */
export const storyBlock = z.strictObject({
  type: z.literal('story'),
  ...blockBase,
  title: text,
  intro: copy.optional(),
  items: z
    .array(
      z.strictObject({
        icon: iconKey,
        /** The card tint and accent: purple or lime. */
        tone,
        title: text,
        paragraphs: z.array(text).min(1),
        /** The coloured paragraph (after the others). */
        accent: text.optional(),
      }),
    )
    .min(1)
    .max(2),
});

export type StoryBlock = z.infer<typeof storyBlock>;
