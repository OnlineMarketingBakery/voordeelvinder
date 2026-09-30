import { z } from 'astro/zod';

import { blockBase, copy, imageRef, link, text, todoRef, tone } from '../primitives';

/** The icons designed for benefit cards (src/assets/icons; label and check are raster masks). */
export const benefitIcons = [
  'eye',
  'rocket',
  'charity',
  'fist',
  'advice',
  'label',
  'book',
  'check',
] as const;

const benefitItem = z.strictObject({
  icon: z.enum(benefitIcons),
  /** h3 */
  title: text,
  body: text,
  /** Tile colour, `list` layout only (the grid tiles are all soft purple). */
  tone: tone.optional(),
  /** Left out of the page; the content stays for a JSON-only unhide. */
  hidden: z.boolean().optional(),
  /** CONTENT-TODO row of the claim that keeps this card hidden, e.g. "1.6". */
  claim: todoRef.optional(),
});

/**
 * "Why us" cards next to a mascot. `grid` is the home design (header with a CTA, 2×2 cards,
 * mascot on an energy-icon pattern); `list` the product pages (heading and mascot on the left,
 * stacked cards with coloured tiles on the right).
 */
export const benefitsBlock = z
  .strictObject({
    type: z.literal('benefits'),
    ...blockBase,
    layout: z.enum(['grid', 'list']),
    /** Full-bleed section background (product pages); the clouds photo fades to white at the top. */
    background: z.enum(['clouds']).optional(),
    /** SectionPill label (lime, info icon). */
    eyebrow: text.optional(),
    /** h2 */
    title: text,
    intro: copy.optional(),
    /** Purple button with the hero glow (home: next to the h2). */
    cta: link.optional(),
    /** The mascot: `mascot/fox-euro-documents` (grid), `mascot/fox-cheering` (list). */
    image: imageRef,
    items: z.array(benefitItem).min(2),
  })
  .superRefine((block, ctx) => {
    const visible = block.items.filter((item) => !item.hidden).length;
    if (visible < 2 || visible > 6) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: `2 to 6 visible cards (found ${visible}); hide the whole block instead`,
      });
    }
    block.items.forEach((item, index) => {
      if (block.layout === 'list' && item.tone === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'tone'],
          message: "required with layout 'list' (the tile colour)",
        });
      }
      if (block.layout === 'grid' && item.tone !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'tone'],
          message: "only with layout 'list': the grid tiles are all soft purple",
        });
      }
    });
  });

export type BenefitsBlock = z.infer<typeof benefitsBlock>;
