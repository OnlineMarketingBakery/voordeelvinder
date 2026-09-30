// Page content (src/content/pages/*.json): SEO fields and an ordered list of typed section
// blocks. Each block type has one component in src/components/sections and one schema in
// src/schemas/blocks; add new types to the union below and to AGENTS.md.
import { z } from 'astro/zod';

import { comparisonTableBlock } from './blocks/comparisonTable';
import { featuresBlock } from './blocks/features';
import { heroBlock } from './blocks/hero';
import { stepsBlock } from './blocks/steps';
import { text } from './primitives';

export const section = z.discriminatedUnion('type', [
  heroBlock,
  featuresBlock,
  stepsBlock,
  comparisonTableBlock,
]);

export type Section = z.infer<typeof section>;

export const page = z
  .strictObject({
    seo: z.strictObject({ title: text, description: text.optional() }),
    sections: z.array(section).min(1),
  })
  .superRefine((value, ctx) => {
    // The hero holds the page's only h1, so it can't be hidden.
    const heroes = value.sections.filter((s) => s.type === 'hero');
    const first = value.sections[0];
    if (heroes.length !== 1 || first?.type !== 'hero' || first.hidden) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: 'exactly one visible hero, as the first block',
      });
    }
    const ids = value.sections.map((s) => s.id).filter((id): id is string => id !== undefined);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: `duplicate block id "${duplicate}"`,
      });
    }
  });
