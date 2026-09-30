import { z } from 'astro/zod';

import { blockBase, copy, imageRef, link, text, todo } from '../primitives';

const usp = z.strictObject({
  icon: z.enum(['no-call', 'eye-off', 'file-check']),
  /** Two parts break onto two lines from md up; one part stays on one line. */
  label: z.union([z.tuple([text]), z.tuple([text, text])]),
  /** The lime highlight (at most one). */
  highlight: z.boolean().optional(),
});

/** Page hero: the page's only h1. `home` adds the eyebrow, USP bar and (hidden) social proof. */
export const heroBlock = z
  .strictObject({
    type: z.literal('hero'),
    ...blockBase,
    variant: z.enum(['home', 'product']),
    eyebrow: z.strictObject({ emoji: z.string().optional(), text }).optional(),
    title: text,
    body: copy,
    cta: link,
    art: z.strictObject({
      /** Layer geometry per preset lives in HeroArt.astro. */
      preset: z.enum(['home', 'solar', 'battery']),
      product: imageRef,
      mascot: imageRef.extend({ mirror: z.boolean().optional(), todo }),
    }),
    /** Hidden until real numbers exist (brief §2, CONTENT-TODO 1.10); never rendered yet. */
    socialProof: z
      .strictObject({
        hidden: z.literal(true),
        text,
        rating: z.number().int().min(1).max(5).optional(),
      })
      .optional(),
    usps: z.array(usp).min(1).max(4).optional(),
  })
  .superRefine((hero, ctx) => {
    if (hero.variant === 'product') {
      for (const field of ['eyebrow', 'usps', 'socialProof'] as const) {
        if (hero[field] !== undefined) {
          ctx.addIssue({ code: 'custom', path: [field], message: 'only for the home hero' });
        }
      }
    }
    if ((hero.usps ?? []).filter((u) => u.highlight).length > 1) {
      ctx.addIssue({ code: 'custom', path: ['usps'], message: 'at most one highlighted USP' });
    }
  });
