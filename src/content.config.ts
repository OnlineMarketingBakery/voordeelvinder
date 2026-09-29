import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Site-wide copy and settings (a single entry: src/content/site.json).
const site = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content' }),
  schema: z.strictObject({
    name: z.string().min(1),
    locale: z.literal('nl-BE'),
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
