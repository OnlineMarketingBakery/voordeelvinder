import { z } from 'astro/zod';

import { blockBase, copy, imageRef, link, text } from '../primitives';

/**
 * The thank-you card (brief §5; Figma "Thank you page" 91:13857): the thumbs-up badge, the
 * page's h1, a short text and a button home. One content file serves /bedankt/energie,
 * /bedankt/zonnepanelen and /bedankt/thuisbatterij (same copy, separate URLs for tracking).
 * Nothing on it depends on the visitor's answers: a direct visit shows the same page.
 */
export const thankYouBlock = z.strictObject({
  type: z.literal('thankYou'),
  ...blockBase,
  /** h1 */
  title: text,
  /** Sentences that wait for sign-off carry their CONTENT-TODO row (claim 1.12). */
  body: copy,
  /** The purple button, with the arrow icon. */
  cta: link,
  /**
   * The badge fox (mascot/fox-thumbsup, Figma 91:14643): drawn inside the purple circle, with
   * its head and thumb breaking out of it. alt "" = decorative.
   */
  image: imageRef,
});

export type ThankYouBlock = z.infer<typeof thankYouBlock>;
