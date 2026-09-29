# AGENTS.md — rules for AI agents working in this repo

VoordeelVinder is a Dutch-language (Flanders) lead-generation site: energy contract, solar
panels, home battery. The build brief (`docs/BRIEF.md`) is the source of truth; decisions that
deviate from it are recorded in `docs/decisions/`.

## Repo map

| Path                                   | What lives there                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/content.config.ts`                | Every content collection and its Zod schema                                                    |
| `src/content/site.json`                | Site-wide copy and settings                                                                    |
| `src/content/pages/*.json`             | Page copy as an ordered list of typed section blocks                                           |
| `src/content/flows/nl/*.json`          | Form flows: questions, options, conditions (Phase 4)                                           |
| `src/content/legal`, `blog`, `landing` | Markdown: legal pages, blog posts, campaign landing variants (Phase 3)                         |
| `src/components/sections/`             | One Astro component per section block type; `Sections.astro` maps type → component             |
| `src/layouts/`                         | Page layouts (`Base.astro`: `<head>`, robots, canonical)                                       |
| `src/pages/`                           | Routes; `api/*` are on-demand (`export const prerender = false`)                               |
| `src/server/env.ts`                    | Typed, validated server environment. The only reader of `process.env`                          |
| `src/server/rules/`                    | Qualification rules — server-only, never shipped to the browser (Phase 5)                      |
| `src/server/lead/`                     | Lead pipeline: validate, derive, classify, backup, forward, rate limit (Phase 5)               |
| `src/lib/`                             | Framework-free logic (`seo/`, later `flow/` engine, `motion.ts`)                               |
| `src/styles/global.css`                | Tailwind entry and design tokens (`@theme`)                                                    |
| `scripts/`                             | `deploy.sh` (run by Ploi), `validate-flows.ts`, cron jobs `leads-retry.ts`, `backups-prune.ts` |
| `tests/unit`, `tests/e2e`              | Vitest and Playwright (+ axe)                                                                  |
| `server.mjs`, `ecosystem.config.cjs`   | Production entry (loads `.env`) and its PM2 definition                                         |
| `docs/`                                | Brief, decisions (ADRs), content to-do list, design review, ops runbook                        |

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
`src/content.config.ts`.

| Type   | Component    | Purpose                  |
| ------ | ------------ | ------------------------ |
| `hero` | `Hero.astro` | Page intro with the `h1` |

## How to…

- **Add a section type:** add a Zod object with `type: z.literal('<name>')` to the `section`
  union in `src/content.config.ts`, create `src/components/sections/<Name>.astro`, add the case to
  `Sections.astro`, and add a row to the table above.
- **Add a flow step** (Phase 4): add the step to `src/content/flows/nl/<product>.json`, wire it
  into `next` of the previous step, give every option a new, unique `code`, then run
  `npm run validate:flows` and add e2e coverage for the new path.
- **Add a product** (Phase 4/5): a flow file, a page JSON, a `/vergelijken/<product>` and
  `/bedankt/<product>` route, and either a rules file in `src/server/rules/` or nothing (the
  outcome is then `pending`).
- **Add a campaign landing variant** (Phase 3): a Markdown file in `src/content/landing/`;
  frontmatter holds the copy, product preselect and SEO; it is served at `/l/<slug>`.

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
- Push to `main` or `production`, merge a PR, or deploy. Tanjil merges; merging to `main`
  deploys to staging.
- Add `<ClientRouter />` or Speculation Rules `prerender` (brief §6.1).

## Pull requests

Branches `feat/*`, `fix/*`, `content/*` → PR → `main`. Every PR has: a plain-English summary,
a staging checklist, desktop + mobile screenshots of changed pages or steps, the DRAFT / TO
CONFIRM items it touches, the assumptions made, and all CI checks green (`ci-ok`). Keep PRs
reviewable in about 10 minutes.

## Deploys (staging)

Ploi site `voordeelvinder.onlinemarketingbakery.nl` (server sites-prod-02, system user
`voordeelvinder-9eyyh`). On a push to `main` Ploi runs `git pull` and `scripts/deploy.sh`,
which runs `npm ci`, builds, reloads PM2 (`ecosystem.config.cjs`, port from `.env`) and fails
unless `/api/health` answers. Nginx proxies everything to `127.0.0.1:3001`; the Ploi web
directory `/public` is only certbot's webroot. Don't click "Spawn" in Ploi's NodeJS tab: the
repo manages the process.
