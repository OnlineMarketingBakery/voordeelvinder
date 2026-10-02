import { z } from 'astro/zod';

import { blockBase, text } from '../primitives';

const faqItem = z.strictObject({
  /** Plain text in the summary row (not a heading: the summary's button role flattens it). */
  question: text,
  /** null = no signed-off answer yet (CONTENT-TODO 2.1–2.3): not rendered, not in the JSON-LD. */
  answer: text.nullable(),
  /** Rendered open on load (the designed default is the answered item). */
  open: z.boolean().optional(),
});

/** Per-page override of the contact card; missing fields come from site.json `faq.contact`. */
const contact = z
  .strictObject({ title: text, body: text, cta: text, ctaHint: text })
  .partial()
  .optional();

/**
 * Questions and answers next to a contact card (home "Veelgestelde vraag", product pages).
 * `lavender`: the home design, a tinted panel with white items; `white`: the product pages,
 * lavender-50 items on white. `extendsBehindPrevious` starts the panel under the CTA band above.
 */
export const faqBlock = z
  .strictObject({
    type: z.literal('faq'),
    ...blockBase,
    tone: z.enum(['lavender', 'white']),
    extendsBehindPrevious: z.boolean().optional(),
    /** SectionPill label (purple). */
    eyebrow: text.optional(),
    /** h2 */
    title: text,
    items: z.array(faqItem).min(1),
    contact,
    /**
     * false: no contact card, the questions under the heading at full width (the FAQ page's
     * groups; its last group keeps the card). Default true.
     */
    card: z.boolean().optional(),
  })
  .superRefine((block, ctx) => {
    if (!block.hidden && !block.items.some((item) => item.answer !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'a visible FAQ needs at least one answered question; hide the block instead',
      });
    }
    block.items.forEach((item, index) => {
      if (item.open && item.answer === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'open'],
          message: 'only an answered question can be open (unanswered ones are not rendered)',
        });
      }
    });
    const questions = block.items.map((item) => item.question.trim().toLowerCase());
    questions.forEach((question, index) => {
      if (questions.indexOf(question) !== index) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'question'],
          message: `duplicate question "${block.items[index]!.question}"`,
        });
      }
    });
    if (block.extendsBehindPrevious && block.tone !== 'lavender') {
      ctx.addIssue({
        code: 'custom',
        path: ['extendsBehindPrevious'],
        message: "only with tone 'lavender' (the white FAQ has no panel)",
      });
    }
  });

export type FaqBlock = z.infer<typeof faqBlock>;
