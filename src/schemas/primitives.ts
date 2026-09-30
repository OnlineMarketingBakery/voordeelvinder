// Shared schema building blocks for content files. Every object is strict: an unknown or
// misspelled key fails the build instead of being silently dropped (brief §4.4 rule 5).
import { z } from 'astro/zod';

import { iconKeys, imageKeys } from '../lib/asset-keys';

export const text = z.string().min(1);

/** Internal paths or in-page anchors only; external links don't belong in navigation. */
export const internalHref = z
  .string()
  .regex(/^\/[^/]/, 'must be a site path such as /vergelijken')
  .or(z.literal('/'));

export const link = z.strictObject({ label: text, href: internalHref });

/** A value that is still a placeholder: shown on staging, fails a production build. */
export const todo = z.boolean().default(false);

/** CONTENT-TODO row that explains why something is hidden, e.g. "1.8". */
export const todoRef = z
  .string()
  .regex(/^\d+\.\d+[a-z]?$/, 'a docs/CONTENT-TODO.md row such as 1.8');

/**
 * Copy that may contain claims waiting for sign-off: either a string, or sentences of which the
 * hidden ones are left out (they stay in the file, so unhiding is a JSON-only change).
 */
export const sentence = z.union([
  text,
  z.strictObject({ text, hidden: z.boolean(), claim: todoRef.optional() }),
]);
export const copy = z.union([text, z.array(sentence).min(1)]);

export const tone = z.enum(['purple', 'lime']);

/** Anchor ids for in-page links, e.g. "over-ons". */
export const anchorId = z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes');

export const imageKey = z.enum(imageKeys);
export const iconKey = z.enum(iconKeys);

/** An image from src/assets/images; alt "" marks it decorative (the default in this design). */
export const imageRef = z.strictObject({ src: imageKey, alt: z.string() });

/** Fields every section block has. */
export const blockBase = {
  id: anchorId.optional(),
  /** Leaves the block out of the page; the content stays for a JSON-only unhide. */
  hidden: z.boolean().optional(),
};
