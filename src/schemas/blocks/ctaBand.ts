import { z } from 'astro/zod';

import { blockBase, copy, link, text, tone } from '../primitives';

/**
 * A centred call to action on a rounded band with rings behind it. `purple` is the homepage
 * band (white text, lime button); `lime` the product pages (dark text, white button).
 */
export const ctaBandBlock = z
  .strictObject({
    type: z.literal('ctaBand'),
    ...blockBase,
    tone,
    /** h2 */
    title: text,
    body: copy.optional(),
    /** The button, with the arrow icon. */
    cta: link,
    /**
     * The band reaches into the top of the footer (product pages). Only on the page's last
     * visible block (page schema); the route then gives the footer its overlap padding.
     */
    overlapFooter: z.boolean().optional(),
  })
  .superRefine((block, ctx) => {
    // A purple band on the purple footer would have no visible edge.
    if (block.overlapFooter && block.tone !== 'lime') {
      ctx.addIssue({
        code: 'custom',
        path: ['overlapFooter'],
        message: "only with tone 'lime' (a purple band disappears into the purple footer)",
      });
    }
  });

export type CtaBandBlock = z.infer<typeof ctaBandBlock>;
