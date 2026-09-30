import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { flowCopyFile, flowFile, sharedStepsFile } from './lib/flow/schema';
import { blogCopy, postFrontmatter } from './schemas/blog';
import { legalCopy, legalFrontmatter } from './schemas/legal';
import { landing as landingSchema } from './schemas/landing';
import { page } from './schemas/page';
import { internalHref, link, text, todo } from './schemas/primitives';

/** Header navigation can depend on content existing (e.g. "Blogs" once there is a post). */
const navLink = link.extend({ requires: z.enum(['blogPosts']).optional() });

// Site-wide copy and settings (a single entry: src/content/site.json).
const site = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content' }),
  schema: z.strictObject({
    name: text,
    locale: z.literal('nl-BE'),
    skipLink: text,
    /** The badge on every page while test mode (?test=1) is on (brief §9.4, src/lib/test-mode.ts). */
    testMode: z.strictObject({ badge: text }),
    seo: z.strictObject({
      /** `{title}` is replaced with the page title; the homepage uses the site name alone. */
      titleTemplate: text.includes('{title}'),
      /** Fallback meta description for pages without their own. */
      defaultDescription: text,
      ogImageAlt: text,
    }),
    header: z.strictObject({
      logoLabel: text,
      navLabel: text,
      /** The menu button below lg (screen-reader only) and the drawer's name and eyebrow. */
      menuLabel: text,
      /** The drawer's round close button (screen-reader only). */
      closeLabel: text,
      nav: z.array(navLink).min(1),
      cta: link,
    }),
    footer: z.strictObject({
      logoLabel: text,
      tagline: text,
      newsletter: z.strictObject({
        /** Off: the form renders disabled and sends nothing. */
        enabled: z.boolean(),
        label: text,
        placeholder: text,
        button: text,
        /** The required consent checkbox under the field (brief §7.5, §11 GDPR). */
        consent: z
          .strictObject({
            label: text,
            /** Words of the label rendered as links (the first occurrence), like a form consent. */
            links: z.array(z.strictObject({ text, href: internalHref })).default([]),
          })
          .superRefine((consent, ctx) => {
            for (const [index, link] of consent.links.entries()) {
              if (!consent.label.includes(link.text)) {
                ctx.addIssue({
                  code: 'custom',
                  path: ['links', index, 'text'],
                  message: `"${link.text}" does not occur in the label`,
                });
              }
            }
          }),
        /** Status messages (src/lib/newsletter.ts). `{suggestion}` is the corrected address. */
        messages: z.strictObject({
          sending: text,
          success: text,
          suggestion: text.includes('{suggestion}'),
        }),
        /** One message per error kind (NewsletterError in src/lib/newsletter.ts). */
        errors: z.strictObject({
          email_required: text,
          email_invalid: text,
          consent_required: text,
          invalid_request: text,
          verification_failed: text,
          rate_limited: text,
          unavailable: text,
          network: text,
        }),
        /**
         * When the form's script can't load although the visitor is online, so only a reload
         * helps (src/lib/newsletter-loader.ts): the message, and the button that reloads the
         * page. Offline, `errors.network` shows instead.
         */
        reload: z.strictObject({ message: text, button: text }),
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
    /** Shared FAQ copy; a page's faq block can override the contact card per field. */
    faq: z.strictObject({
      /** The label above every answer ("Antwoord"). */
      answerLabel: text,
      contact: z.strictObject({
        title: text,
        body: text,
        /** Button label; the link is mailto:{contact.email.value}. */
        cta: text,
        /** Visually hidden, after the label: the button opens the mail app. */
        ctaHint: text,
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
    blog: blogCopy,
    legal: legalCopy,
  }),
});

// Structured page copy (src/content/pages/*.json): see src/schemas/page.ts.
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/pages' }),
  schema: page,
});

// Legal pages (src/content/legal/<slug>.md, served at /<slug>): see src/schemas/legal.ts.
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: legalFrontmatter,
});

// Blog posts (src/content/blog/<slug>.md, served at /blog/<slug>): see src/schemas/blog.ts.
// Empty until the first post (CONTENT-TODO 2.14): then no blog route is built.
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: postFrontmatter,
});

// Campaign landing variants (src/content/landing/<slug>.md → /l/<slug>): see src/schemas/landing.ts.
// None ship until there is campaign copy; with no variants there are no /l/ routes. The folder's
// README.md (the field reference) is not a variant.
const landing = defineCollection({
  loader: glob({ pattern: ['*.md', '!README.md'], base: './src/content/landing' }),
  schema: landingSchema,
});

// Form flows (src/content/flows/<locale>/<product>.json, ids such as "nl/energie"), the steps
// they share and the switches (<locale>/_shared.json), and the form's interface copy
// (<locale>/_copy.json): see src/lib/flow/schema.ts. The schema checks each file; validate:flows
// (prebuild) checks references, paths, vars and codes across files.
const flows = defineCollection({
  loader: glob({ pattern: ['*/*.json', '!*/_*.json'], base: './src/content/flows' }),
  schema: flowFile,
});
const flowSteps = defineCollection({
  loader: glob({ pattern: '*/_shared.json', base: './src/content/flows' }),
  schema: sharedStepsFile,
});
const flowCopy = defineCollection({
  loader: glob({ pattern: '*/_copy.json', base: './src/content/flows' }),
  schema: flowCopyFile,
});

export const collections = { site, pages, legal, blog, landing, flows, flowSteps, flowCopy };
