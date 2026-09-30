# AGENTS.md — rules for AI agents working in this repo

VoordeelVinder is a Dutch-language (Flanders) lead-generation site: energy contract, solar
panels, home battery. The build brief (`docs/BRIEF.md`) is the source of truth; decisions that
deviate from it are recorded in `docs/decisions/`.

## Repo map

| Path                                   | What lives there                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content.config.ts`                | Every content collection and its Zod schema                                                                                                        |
| `src/content/site.json`                | Site-wide copy and settings                                                                                                                        |
| `src/content/pages/*.json`             | Page copy as an ordered list of typed section blocks                                                                                               |
| `src/content/flows/nl/*.json`          | Form flows (codes: `docs/FLOWS.md`); `_shared.json`: shared steps and switches (gas); `_copy.json`: the form's interface copy                      |
| `src/content/legal`, `blog`, `landing` | Markdown: legal pages, blog posts, campaign landing variants (Phase 3)                                                                             |
| `src/components/sections/`             | One Astro component per section block type; `Sections.astro` maps type → component                                                                 |
| `src/components/site/`, `ui/`          | Header/Footer (copy from `site.json`); Button, SectionPill, Logo, Container, Prose                                                                 |
| `src/components/blog/`, `legal/`       | Blog listing/post parts (cards, pagination, post nav); legal title band and table of contents                                                      |
| `src/components/form/`                 | The form island (React): `Form.astro` resolves content, icons and images; `FormIsland.tsx` runs the engine; `fields/` one component per field type |
| `src/lib/form/`                        | The island's framework-free helpers: session storage, start state (URL preselect, restore), messages, labels, submit stub                          |
| `src/layouts/Page.astro`               | Standard page: header, `<main id="main">`, footer                                                                                                  |
| `src/layouts/`                         | Layouts: `Base.astro` (`<head>`, robots, canonical), `ContentPage.astro` (pages/*.json route), `LegalPage.astro`, `BlogPost.astro`                 |
| `src/pages/`                           | Routes; `api/*` are on-demand (`export const prerender = false`)                                                                                   |
| `src/server/env.ts`                    | Typed, validated server environment. The only reader of `process.env`                                                                              |
| `src/server/rules/`                    | Qualification rules — server-only, never shipped to the browser (Phase 5)                                                                          |
| `src/server/lead/`                     | Lead pipeline: validate, derive, classify, backup, forward, rate limit (Phase 5)                                                                   |
| `src/lib/`                             | Framework-free logic (`seo/`, `flow/` engine, JSONLogic subset and flow validation, `motion.ts`)                                                   |
| `src/styles/global.css`                | Tailwind entry and design tokens (`@theme`)                                                                                                        |
| `scripts/`                             | `deploy.sh` (run by Ploi), `validate-flows.ts`, cron jobs `leads-retry.ts`, `backups-prune.ts`                                                     |
| `tests/unit`, `tests/e2e`              | Vitest and Playwright (+ axe)                                                                                                                      |
| `server.mjs`, `ecosystem.config.cjs`   | Production entry (loads `.env`) and its PM2 definition                                                                                             |
| `docs/`                                | Brief, decisions (ADRs), content to-do list, design review, ops runbook                                                                            |

## Commands

Node 24 (`.nvmrc`). Copy `.env.example` to `.env` first: the config fails fast without it.

| Command                  | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `npm run dev`            | Dev server on http://localhost:4321                                 |
| `npm run build`          | Production build (also validates env and content)                   |
| `npm run check`          | `astro check`: diagnostics and content schemas                      |
| `npm run typecheck`      | `tsc --noEmit`                                                      |
| `npm run lint`           | ESLint + Prettier (`npm run format` fixes formatting)               |
| `npm test`               | Unit tests                                                          |
| `npm run test:e2e`       | Playwright against the production build (run `npm run build` first) |
| `npm run validate:flows` | Flow graph validation                                               |

Run all of them before opening a PR; CI runs the same set.

## Editing rules (brief §4.4)

1. **Never hardcode user-facing text in components.** All copy comes from content files.
2. **A copy change is a content-file change only.** No component edits.
3. **A new section type** needs its component, its schema and a line in this file, together.
4. **Option `code`s in flows never change once live.** Labels may change freely; codes are the
   data contract with n8n, the lead sheet and the Meta forms.
5. **The build must fail on invalid content** (schema errors, unknown section types, broken flows).
6. **Informal Dutch, "je" everywhere.** Never "u"/"uw".
7. **Never invent content**: no reviews, testimonials, numbers, savings figures or legal text.
   Missing copy goes into `docs/CONTENT-TODO.md`.

## Section block types

Each type has one component in `src/components/sections/` and one schema in
`src/schemas/blocks/` (registered in the union in `src/schemas/page.ts`). Images and icons are
referenced by key (`mascot/fox-waving`, `money`): files in `src/assets/images` and
`src/assets/icons`; an unknown key fails the build. Copy fields can hide single sentences
(claims waiting for sign-off) with `{ "text", "hidden": true, "claim": "1.8" }`.

| Type               | Component                                            | Purpose                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero`             | `Hero.astro` (+ `parts/HeroArt`, `parts/UspBar`)     | Page intro with the only `h1` (`\n` in `title` = line break); `variant` home (eyebrow, USP bar) or product; `art.preset` home/solar/battery                                                                                |
| `features`         | `Features.astro`                                     | Centred header and 1–4 value cards on plates; `cardStyle` translucent (home) or solid (product pages); cards can be hidden                                                                                                 |
| `steps`            | `Steps.astro` (+ `parts/StepPill`)                   | "Hoe het werkt": 2–4 numbered steps (`<ol>`, pills on a timeline) on a purple panel; `align` start (home: optional `mascot` above the panel, `highlight` chip) or center (product pages)                                   |
| `comparisonTable`  | `ComparisonTable.astro` (+ `parts/CloudsBackground`) | Other comparison sites vs VoordeelVinder as a real `<table>` (hidden caption, row headers); 1–8 `rows`, stacked below md; `background` clouds (default) or none                                                            |
| `productSpotlight` | `ProductSpotlight.astro`                             | Home product card: pill + CTA row, h2, body, 1–4 feature cards on accent plates, corner illustration; `product` zonnepanelen/thuisbatterij (pill icon; CTA must lead to `/vergelijken/<product>`), `tone` lime or lavender |
| `benefits`         | `Benefits.astro` (+ `parts/CloudsBackground`)        | "Why us" cards beside a mascot; `layout` grid (home: pill, h2 + `cta`, 2×2 cards) or list (product pages: stacked cards, `tone` tile per item); 2–6 visible; `background` clouds                                           |
| `ctaBand`          | `CtaBand.astro`                                      | Centred h2, optional `body`, one `cta` button on a rounded band with rings; `tone` purple (home: white text, lime button) or lime (product pages); `overlapFooter` (lime, last block) reaches into the footer              |
| `faq`              | `Faq.astro` (+ `parts/AccordionItem`, `ContactCard`) | Native `<details>` questions (not headings) beside a contact card (`site.json faq`); only answered items render and feed FAQPage JSON-LD; `tone` lavender (home) or white                                                  |
| `testimonials`     | `Testimonials.astro` (+ `ui/Rating`)                 | Reviews in a swipe track (`li > figure > blockquote`), prev/next buttons from md; `labels` for a11y; a visible `placeholder` item or "[X]" fails a production build                                                        |
| `ctaMascot`        | `CtaMascot.astro`                                    | Final CTA (home, last block): mascot in a white/lime ring beside a multi-line `h2` (`\n` = new line); `highlight` must equal one line (tilted lime chip + sparkle); `body`, purple `cta` button                            |
| `notFound`         | `NotFound.astro`                                     | The 404 page (`pages/404.json`, not designed): fox in a lavender circle, `eyebrow` pill, the page's `h1` (instead of a hero), `text`, lime `primaryCta` and a `secondaryLink`; `seo.noindex`                               |

## How to…

- **Add a section type:** add a schema with `type: z.literal('<name>')` and `...blockBase` in
  `src/schemas/blocks/<name>.ts`, register it in the `section` union in `src/schemas/page.ts`,
  create `src/components/sections/<Name>.astro`, add the case to `Sections.astro`, and add a
  row to the table above.
- **Add a flow step:** flows live in `src/content/flows/nl/<product>.json` (schema:
  `src/lib/flow/schema.ts`, engine: `src/lib/flow/engine.ts`). Steps several flows share
  (product choice, postcode + business, the consumption branch, contact) are defined once in
  `nl/_shared.json` and used with `{ "use": "<id>", "next": [...] }`. A step is `{ id, title, subtitle?, hint?, visibleIf?,
fields, next }`; `next` is an ordered list of `{ if?, goto }` whose last entry has no `if`.
  Add the step, point the previous step's `next` at it, give every option a new, unique `code`
  (never reuse or rename one), and use only the JSONLogic operators in
  `src/lib/flow/logic.ts` (ADR 0006); conditions read answers by field id and `derived.<key>`.
  Field ids are payload keys: the field's `payload` (default `answers`) says where its value
  goes (docs/PAYLOAD.md). A field without `label` is named by the step title, so only a step's
  first field may omit it. An option with `"requires": "<switch>"` is only offered while that
  switch in `_shared.json` is on (the gas cards: `"switches": { "gas": true }`). New error or
  warning codes need a message in `nl/_copy.json`. Update the code tables in `docs/FLOWS.md`,
  then run `npm run validate:flows` (also run before every build) and add e2e coverage for the
  new path.
- **Add a product** (Phase 4/5): a flow file, a page JSON (its route `src/pages/<product>.astro`
  renders `<ContentPage id="<product>" />`), a `/vergelijken/<product>` and
  `/bedankt/<product>` route, and either a rules file in `src/server/rules/` or nothing (the
  outcome is then `pending`).
- **Add a blog post:** a Markdown file `src/content/blog/<slug>.md`, served at `/blog/<slug>`
  (frontmatter schema: `src/schemas/blog.ts`). Required: `title`, `excerpt` (card text and
  meta description), `date` (`2026-09-29`). Optional: `cover` (`{ src: <image key>, alt }`;
  without it the placeholder box shows), `updated`, `author`, `tags`, `featured`, `related` (up
  to 3 slugs), `seo`. Start the body at `##`: the title is the h1. `draft: true` builds
  everywhere except production; `placeholder: true` fails a production build. The first
  published post also builds `/blog` and shows "Blogs" in the header; blog labels live in
  `site.json` `blog`.
- **Legal texts** (privacybeleid, cookiebeleid, algemene voorwaarden) live in
  `src/content/legal/<slug>.md`, served at `/<slug>`; every footer legal link needs one (the
  build fails otherwise). `##` headings make the table of contents. They are neutral
  placeholders (`placeholder: true`): staging shows a notice and a production build fails until
  the lawyer's final text replaces them and the flag is set to `false` (CONTENT-TODO 3.1). Never
  write legal text yourself.
- **Add a campaign landing variant:** a Markdown file `src/content/landing/<slug>.md`, served at
  `/l/<slug>` (fields: `src/content/landing/README.md`, schema `src/schemas/landing.ts`). The
  frontmatter holds `product` (`energie` | `zonnepanelen` | `thuisbatterij`: the preselect),
  the hero copy (`title`, `subtitle`, optional `cta` and `heroImage`) and `seo`; the rest of the
  page is the product's own page (home sections for `energie`), so a variant is copy-only. Every
  CTA to the form goes to `/vergelijken/<product>` and keeps the ad's query string
  (`src/scripts/keep-query.ts`). Variants are always `noindex` and stay out of the sitemap.
  Leave the body empty (not rendered yet; the build fails on one). Never invent campaign copy.

## Environment and secrets

- Secrets live only in Ploi's "Edit environment" (`.env` on the server). Never commit them;
  `.env*` is gitignored except `.env.example`.
- Read settings through `serverEnv()` / `parseServerEnv()` from `src/server/env.ts`. Lint blocks
  `process.env` elsewhere, and `import.meta.env` except `PUBLIC_*` and Astro built-ins, because
  Astro inlines `import.meta.env` into the build output.
- `SITE_ENV` is `local | ci | staging | production`. **Every lead is a test lead unless
  `SITE_ENV=production`.** Only production is indexable.
- `SITE_ENV` and `PUBLIC_*` are baked in at build time: change them, then redeploy.
  `/api/health` returns 503 if the running `SITE_ENV` differs from the build's.

## Never, without explicit approval in the PR

- Change option codes, the lead payload contract (`docs/PAYLOAD.md`), qualification rules
  (`src/server/rules/`, `docs/RULES.md`) or tracking.
- Send a real lead from local, CI or staging, or point any non-production environment at a
  real n8n webhook.
- Push directly to `main` or `production` (the ruleset blocks it anyway), or merge anything into
  `production`. Promoting a release to production is Tanjil's call.
- Add `<ClientRouter />` or Speculation Rules `prerender` (brief §6.1).

## Pull requests

Branches `feat/*`, `fix/*`, `content/*` → PR → `main`. Every PR has: a plain-English summary,
a staging checklist, desktop + mobile screenshots of changed pages or steps, the DRAFT / TO
CONFIRM items it touches, the assumptions made, and all CI checks green (`ci-ok`). Keep PRs
reviewable in about 10 minutes.

**Merging:** the agent may merge its own PRs into `main` once `ci-ok` is green (Tanjil,
2026-09-29). Merging to `main` deploys to staging; after merging, check that `/api/health` on
staging reports the merge commit.

## Deploys (staging)

Ploi site `voordeelvinder.onlinemarketingbakery.nl` (server sites-prod-02, system user
`voordeelvinder-9eyyh`). On a push to `main`, Ploi runs `git pull` and then
`scripts/deploy.sh`. The deploy script:

- runs `npm ci` only when `package-lock.json` or the Node version changed;
- builds into `dist.next` (flows are validated first) and swaps it in only on success;
- reloads PM2 (`ecosystem.config.cjs`, port from `.env`);
- succeeds only when `/api/health` reports the new commit, and restores the previous build
  otherwise.

Nginx proxies everything to `127.0.0.1:3001` and must send `Host`, `X-Forwarded-Host`,
`X-Forwarded-Proto` and `X-Forwarded-For $remote_addr`. Astro only trusts the visitor IP when
it can validate `X-Forwarded-Host`; the Phase 5 rate limiter depends on this. The Ploi web
directory `/public` is only certbot's webroot. Don't click "Spawn" in Ploi's NodeJS tab: the
repo manages the process.
