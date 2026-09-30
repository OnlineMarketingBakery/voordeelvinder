// Campaign landing variants (src/content/landing/<slug>.md, served at /l/<slug>): the
// frontmatter is the copy of the hero, the product preselect and the SEO fields. The rest of
// the page is the product's own page (src/lib/landing.ts), so a new ad angle is a new file.
import { z } from 'astro/zod';

import { copy, imageRef, text } from './primitives';

/** The products a variant can preselect: its CTAs lead to /vergelijken/<product>. */
export const landingProducts = ['energie', 'zonnepanelen', 'thuisbatterij'] as const;
export type LandingProduct = (typeof landingProducts)[number];

export const landing = z.strictObject({
  product: z.enum(landingProducts),
  /** The hero h1 (the headline); "\n" = a forced line break. */
  title: text,
  /** The hero text under the h1 (the subtitle); may hide claims like page copy. */
  subtitle: copy,
  /** The hero button label; defaults to the product page's hero CTA. */
  cta: text.optional(),
  /** Replaces the product page's hero images; each layer defaults to the product page's. */
  heroImage: z
    .strictObject({
      product: imageRef.optional(),
      mascot: imageRef.extend({ mirror: z.boolean().optional() }).optional(),
    })
    .optional(),
  /** Every variant is noindex (brief §11); the title goes through the site's title template. */
  seo: z.strictObject({ title: text, description: text.optional() }),
});

export type LandingData = z.infer<typeof landing>;
