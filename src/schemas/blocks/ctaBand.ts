import { z } from 'astro/zod';

import { blockBase, copy, link, text, tone } from '../primitives';

/**
 * A centred call to action on a rounded band with rings behind it. `purple` is the homepage
 * band (white text, lime button); `lime` the product pages (dark text, white button).
 */
export const ctaBandBlock = z.strictObject({
  type: z.literal('ctaBand'),
  ...blockBase,
  tone,
  /** h2 */
  title: text,
  body: copy.optional(),
  /** The button, with the arrow icon. */
  cta: link,
});

export type CtaBandBlock = z.infer<typeof ctaBandBlock>;
