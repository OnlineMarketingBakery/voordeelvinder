# 0004 — Environments and test mode

- **Date:** 2026-09-29
- **Status:** Accepted
- **Brief:** §4.5 (environments), §9.4 (a lead is a test lead when `SITE_ENV=staging` or the
  URL has `?test=1`), §4.3 (`src/server/env.ts` fails fast).

## Decision

- **`SITE_ENV` is one of `local | ci | staging | production`.** It's validated, together with
  every other server setting, by the Zod schema in `src/server/env.ts`. The Astro server,
  `astro.config.ts` and the cron scripts all use this one module.
- **Every lead is a test lead unless `SITE_ENV=production`.** That's stricter than the brief,
  and it means a real lead can never come from local, CI or staging. `?test=1` still marks a
  production lead as a test lead (Phase 5).
- **Only production is indexable.** Every other build gets `robots.txt` `Disallow: /` and
  `<meta name="robots" content="noindex, nofollow">`. Staging also gets `X-Robots-Tag` from
  Nginx.
- **Fail fast.** On `staging` and `production` the schema requires an `https` site URL and an
  absolute `LEAD_BACKUP_DIR`, which must be outside the web root. A bad `.env` fails the
  **build**, so the deploy stops before the running process is replaced.
- **Settings are read at two moments:**
  - `SITE_ENV` and `PUBLIC_*` are fixed at build time, because prerendered pages depend on
    them.
  - Secrets are read at runtime from `process.env`, which `server.mjs` fills from `.env`.
  - `/api/health` returns 503 when the runtime `SITE_ENV` differs from the build's. Changing
    `SITE_ENV` or a `PUBLIC_*` value therefore needs a redeploy.
- **Lint guards:** `process.env` is allowed only in the env module and configs. `import.meta.env`
  is allowed only for `PUBLIC_*` and Astro's built-ins, because Astro inlines those values into
  `dist/`.

## Consequences

- Local development needs a `.env`: copy `.env.example`.
- The n8n and Turnstile variables are optional until the lead endpoint lands (Phase 5); then
  they become required on staging and production.
