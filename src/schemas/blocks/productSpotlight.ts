import { z } from 'astro/zod';

import { blockBase, copy, imageRef, link, text } from '../primitives';

/** The products with a spotlight card; each has its own form at /vergelijken/<product>. */
export const spotlightProducts = ['zonnepanelen', 'thuisbatterij'] as const;

const feature = z.strictObject({
  /** h3 */
  title: text,
  body: text,
});

/**
 * A product card on the homepage (Figma 66:861 zonnepanelen, 67:893 thuisbatterij): eyebrow
 * pill with the product icon, h2, body, a CTA to the product's form, 1–4 feature cards and an
 * illustration in the bottom-right corner. `tone` sets the card colour, accent bar, feature
 * plates, pill and button (lime, or lavender with a purple button).
 */
export const productSpotlightBlock = z
  .strictObject({
    type: z.literal('productSpotlight'),
    ...blockBase,
    /** Picks the pill icon (solar-panel | car-battery) and the form the CTA must lead to. */
    product: z.enum(spotlightProducts),
    tone: z.enum(['lime', 'lavender']),
    /** SectionPill label. */
    eyebrow: text,
    /** h2 */
    title: text,
    body: copy,
    /** Button to /vergelijken/<product>. */
    cta: link,
    items: z.array(feature).min(1).max(4),
    /** Decorative illustration in the bottom-right corner (alt "" in the design). */
    image: imageRef,
  })
  .superRefine((block, ctx) => {
    // The CTA leads to this product's form (the card morphs into that form card, brief §6.1).
    const form = `/vergelijken/${block.product}`;
    if (!new RegExp(`^${form}(?:[?#]|$)`).test(block.cta.href)) {
      ctx.addIssue({
        code: 'custom',
        path: ['cta', 'href'],
        message: `must lead to ${form}`,
      });
    }
  });

export type ProductSpotlightBlock = z.infer<typeof productSpotlightBlock>;
