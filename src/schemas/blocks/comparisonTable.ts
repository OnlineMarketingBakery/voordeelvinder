import { z } from 'astro/zod';

import { blockBase, copy, text } from '../primitives';

const row = z.strictObject({
  /** The row header: what is being compared. */
  label: text,
  /** Value in the "other comparison sites" column (lime). */
  others: text,
  /** Value in the VoordeelVinder column (purple). */
  us: text,
});

/** VoordeelVinder against other comparison sites, row by row (home "Niet zomaar een vergelijker"). */
export const comparisonTableBlock = z
  .strictObject({
    type: z.literal('comparisonTable'),
    ...blockBase,
    /** SectionPill (lime, info icon). */
    eyebrow: text,
    title: text,
    intro: copy.optional(),
    /** Visually hidden <caption>: the table's accessible name. */
    caption: text,
    columns: z.strictObject({
      /** Visually hidden header of the row-label column (the design leaves the cell empty). */
      feature: text,
      others: text,
      us: text,
    }),
    rows: z.array(row).min(1).max(8),
    /** Full-bleed section background; the clouds photo fades to white at the top. */
    background: z.enum(['clouds', 'none']).default('clouds'),
  })
  .superRefine((block, ctx) => {
    const labels = block.rows.map((r) => r.label.trim().toLowerCase());
    labels.forEach((label, index) => {
      if (labels.indexOf(label) !== index) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'label'],
          message: `duplicate row "${block.rows[index]!.label}"`,
        });
      }
    });
  });
