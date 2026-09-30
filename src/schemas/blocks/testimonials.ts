import { z } from 'astro/zod';

import { blockBase, copy, imageRef, text } from '../primitives';

/** The number of stars a rating is out of (the design shows five). */
export const ratingMax = 5;

const testimonial = z.strictObject({
  quote: text,
  /** The reviewer as they want to be shown, e.g. "Sofie V." (not a heading). */
  name: text,
  /** City under the quote, next to the pin. */
  location: text.optional(),
  /** Stars out of five; leave it out for no star row. */
  rating: z.number().int().min(1).max(ratingMax).optional(),
  /** A photo of the reviewer; `null` or left out: no avatar frame. Stock photos never ship. */
  avatar: imageRef.nullable().optional(),
  /** A design dummy (CONTENT-TODO 1.11): a production build fails while it is visible. */
  placeholder: z.boolean().optional(),
});

/**
 * Customer reviews in a horizontal card track under a centred header (home "Wat klanten
 * zeggen", Figma 60:486–60:488 and carousel 60:748). Hidden until real reviews exist.
 */
export const testimonialsBlock = z.strictObject({
  type: z.literal('testimonials'),
  ...blockBase,
  /** SectionPill label (lime, info icon). */
  eyebrow: text.optional(),
  /** h2 */
  title: text,
  intro: copy.optional(),
  /** Interface copy for assistive technology and the carousel buttons. */
  labels: z.strictObject({
    /** Accessible name of the scrollable track. */
    track: text,
    /** Accessible name of the stars; `{rating}` becomes the number, e.g. "{rating} van 5 sterren". */
    rating: text.regex(/\{rating\}/, 'must contain {rating}'),
    previous: text,
    next: text,
  }),
  items: z.array(testimonial).min(1),
});

export type TestimonialsBlock = z.infer<typeof testimonialsBlock>;
export type Testimonial = TestimonialsBlock['items'][number];
