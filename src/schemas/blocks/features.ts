import { z } from 'astro/zod';

import { blockBase, copy, text, todoRef, tone } from '../primitives';

/** The icons designed for feature cards (src/assets/icons). */
export const featureIcons = [
  'money',
  'send',
  'wallet',
  'time',
  'home',
  'renewable-energy',
  'home-bolt',
  'shield-bolt',
] as const;

const featureItem = z.strictObject({
  icon: z.enum(featureIcons),
  /** Icon tile and plate colour (and the lime card surface). */
  tone,
  /** h3; "\n" forces a line break. */
  title: text,
  body: text,
  /** Left out of the page; the content stays for a JSON-only unhide. */
  hidden: z.boolean().optional(),
  /** CONTENT-TODO row of the claim that keeps this card hidden, e.g. "1.7". */
  claim: todoRef.optional(),
});

/**
 * Value cards on coloured plates under a centred header (home "Waarom VoordeelVinder bestaat",
 * product pages). `translucent` is the home design (6 px lip, the plate tints the card);
 * `solid` the product pages (flat cards, 9 px lip).
 */
export const featuresBlock = z
  .strictObject({
    type: z.literal('features'),
    ...blockBase,
    /** SectionPill label (lime, info icon). */
    eyebrow: text.optional(),
    title: text,
    intro: copy.optional(),
    cardStyle: z.enum(['translucent', 'solid']),
    items: z.array(featureItem).min(1),
  })
  .superRefine((block, ctx) => {
    const visible = block.items.filter((item) => !item.hidden).length;
    if (visible < 1 || visible > 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: `1 to 4 visible cards (found ${visible}); hide the whole block instead`,
      });
    }
  });

export type FeaturesBlock = z.infer<typeof featuresBlock>;
