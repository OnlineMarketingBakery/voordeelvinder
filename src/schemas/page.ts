// Page content (src/content/pages/*.json): SEO fields and an ordered list of typed section
// blocks. Each block type has one component in src/components/sections and one schema in
// src/schemas/blocks; add new types to the union below and to AGENTS.md.
import { z } from 'astro/zod';

import { benefitsBlock } from './blocks/benefits';
import { comparisonTableBlock } from './blocks/comparisonTable';
import { ctaBandBlock } from './blocks/ctaBand';
import { ctaMascotBlock } from './blocks/ctaMascot';
import { faqBlock } from './blocks/faq';
import { featuresBlock } from './blocks/features';
import { heroBlock } from './blocks/hero';
import { notFoundBlock } from './blocks/notFound';
import { productSpotlightBlock } from './blocks/productSpotlight';
import { stepsBlock } from './blocks/steps';
import { testimonialsBlock } from './blocks/testimonials';
import { text } from './primitives';

export const section = z.discriminatedUnion('type', [
  heroBlock,
  featuresBlock,
  stepsBlock,
  comparisonTableBlock,
  productSpotlightBlock,
  benefitsBlock,
  ctaBandBlock,
  faqBlock,
  testimonialsBlock,
  ctaMascotBlock,
  notFoundBlock,
]);

export type Section = z.infer<typeof section>;

/** Blocks that hold the page's only h1: every page starts with exactly one of them. */
const h1Types: ReadonlySet<Section['type']> = new Set(['hero', 'notFound']);

export const page = z
  .strictObject({
    seo: z.strictObject({
      title: text,
      description: text.optional(),
      /** Keep the page out of search results even in production (the 404). */
      noindex: z.boolean().optional(),
    }),
    sections: z.array(section).min(1),
  })
  .superRefine((value, ctx) => {
    // The hero (or the 404 block) holds the page's only h1, so it can't be hidden.
    const heroes = value.sections.filter((s) => h1Types.has(s.type));
    const first = value.sections[0];
    if (heroes.length !== 1 || !first || !h1Types.has(first.type) || first.hidden) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: 'exactly one visible hero (or notFound), as the first block',
      });
    }
    const ids = value.sections.map((s) => s.id).filter((id): id is string => id !== undefined);
    const reserved = ids.find((id) => /^[a-z][a-zA-Z]*-\d+$/.test(id));
    if (reserved) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: `block id "${reserved}" looks like a generated one (<type>-<n>); pick another`,
      });
    }
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: `duplicate block id "${duplicate}"`,
      });
    }
    // A band that reaches into the footer must be the last thing on the page.
    const lastVisible = value.sections.findLastIndex((s) => !s.hidden);
    value.sections.forEach((s, index) => {
      if (s.type === 'ctaBand' && s.overlapFooter && !s.hidden && index !== lastVisible) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', index, 'overlapFooter'],
          message: 'only on the last visible block (it overlaps the footer)',
        });
      }
    });
  });
