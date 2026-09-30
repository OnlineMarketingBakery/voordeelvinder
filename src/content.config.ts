import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().min(1);

/** Internal paths or in-page anchors only; external links don't belong in navigation. */
const internalHref = z
  .string()
  .regex(/^\/[^/]/, 'must be a site path such as /vergelijken')
  .or(z.literal('/'));

const link = z.strictObject({ label: text, href: internalHref });

/** Header navigation can depend on content existing (e.g. "Blogs" once there is a post). */
const navLink = link.extend({ requires: z.enum(['blogPosts']).optional() });

/** A value that is still a placeholder: shown on staging, fails a production build. */
const todo = z.boolean().default(false);

// Site-wide copy and settings (a single entry: src/content/site.json).
const site = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content' }),
  schema: z.strictObject({
    name: text,
    locale: z.literal('nl-BE'),
    skipLink: text,
    header: z.strictObject({
      logoLabel: text,
      navLabel: text,
      menuLabel: text,
      nav: z.array(navLink).min(1),
      cta: link,
    }),
    footer: z.strictObject({
      logoLabel: text,
      tagline: text,
      newsletter: z.strictObject({
        /** Off until POST /api/newsletter exists (Phase 5): the form renders disabled. */
        enabled: z.boolean(),
        label: text,
        placeholder: text,
        button: text,
      }),
      links: z.strictObject({ heading: text, items: z.array(link).min(1) }),
      legal: z.strictObject({ heading: text, items: z.array(link).min(1) }),
      contact: z.strictObject({ heading: text, emailLabel: text, phoneLabel: text }),
      copyright: z.strictObject({
        /** `{year}` is replaced with the build year. */
        holder: text,
        rights: text,
      }),
    }),
    contact: z.strictObject({
      email: z.strictObject({ value: z.email(), todo }),
      phone: z.strictObject({
        display: text,
        /** E.164 for the tel: link, e.g. +3293001234. Omitted while the number is a placeholder. */
        e164: z
          .string()
          .regex(/^\+32\d{8,9}$/)
          .optional(),
        todo,
      }),
    }),
  }),
});

// Schemas are strict: an unknown or misspelled key fails the build instead of being dropped.

// Section blocks. Each block type has one component in src/components/sections
// and one schema here. Add new types to the union below.
const heroSection = z.strictObject({
  type: z.literal('hero'),
  title: z.string().min(1),
});

const section = z.discriminatedUnion('type', [heroSection]);

// Structured page copy (src/content/pages/*.json): an ordered list of section blocks.
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/pages' }),
  schema: z.strictObject({
    seo: z.strictObject({
      title: z.string().min(1),
      description: z.string().min(1).optional(),
    }),
    sections: z.array(section).min(1),
  }),
});

export const collections = { site, pages };
