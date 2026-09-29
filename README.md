# VoordeelVinder

Lead-generation site for Belgian households (energy contract, solar panels, home battery).
Astro 7 + TypeScript, a React island for the form, Tailwind CSS 4, served by Astro's Node
adapter behind Nginx on Ploi.

## Getting started

```bash
nvm use            # Node 24 (see .nvmrc)
npm ci
cp .env.example .env
npm run dev        # http://localhost:4321
```

## Commands

| Command                  | What it does                                                  |
| ------------------------ | ------------------------------------------------------------- |
| `npm run dev`            | Dev server                                                    |
| `npm run build`          | Production build into `dist/`                                 |
| `npm start`              | Run the production build (`server.mjs` loads `.env`)          |
| `npm run check`          | `astro check`: Astro/TS diagnostics and content schemas       |
| `npm run typecheck`      | `tsc --noEmit`                                                |
| `npm run lint`           | ESLint and Prettier                                           |
| `npm test`               | Unit tests (Vitest)                                           |
| `npm run test:e2e`       | End-to-end tests (Playwright, against the build; build first) |
| `npm run validate:flows` | Validate the form flows                                       |

## Deploys

Merging to `main` deploys to staging (`voordeelvinder.onlinemarketingbakery.nl`). Ploi pulls
the repo and runs [`scripts/deploy.sh`](scripts/deploy.sh), which builds, reloads the PM2
process from [`ecosystem.config.cjs`](ecosystem.config.cjs) and fails the deploy if
`/api/health` doesn't answer.
