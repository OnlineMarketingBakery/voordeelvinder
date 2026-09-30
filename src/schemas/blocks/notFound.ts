import { z } from 'astro/zod';

import { blockBase, imageRef, link, text } from '../primitives';

/**
 * The 404 page (not designed; proposal in the Phase 3 spec §12): the mascot in a lavender
 * circle, an eyebrow pill, the page's h1, a short text, the comparison CTA and a link home.
 */
export const notFoundBlock = z.strictObject({
  type: z.literal('notFound'),
  ...blockBase,
  /** The pill label, e.g. "404". */
  eyebrow: text,
  /** h1 */
  title: text,
  text,
  /** The lime button, with the arrow icon. */
  primaryCta: link,
  /** A text link below or beside the button. */
  secondaryLink: link,
  /** Drawn for the waving vector fox (mascot/fox-waving); alt "" = decorative. */
  image: imageRef,
});

export type NotFoundBlock = z.infer<typeof notFoundBlock>;
