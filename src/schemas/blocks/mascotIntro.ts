import { z } from 'astro/zod';

import { blockBase, imageRef, text } from '../primitives';

/**
 * About us "Maak kennis met Foxy" (client copy 2026-10-02, not designed): the h2 and paragraphs
 * on the left; the mascot and a facts card ("Foxy in het kort": label and value per row) on the
 * right.
 */
export const mascotIntroBlock = z.strictObject({
  type: z.literal('mascotIntro'),
  ...blockBase,
  title: text,
  paragraphs: z.array(text).min(1).max(4),
  image: imageRef,
  facts: z.strictObject({
    title: text,
    items: z
      .array(z.strictObject({ label: text, value: text }))
      .min(1)
      .max(8),
  }),
});

export type MascotIntroBlock = z.infer<typeof mascotIntroBlock>;
