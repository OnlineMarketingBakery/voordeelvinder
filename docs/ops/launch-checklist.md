# Launch checklist (Phase 8)

One list of everything production needs. Tick an item when it is done. Going live is Tanjil's
call. A production build (`SITE_ENV=production`) refuses to finish while any **[gate]** item is
still a placeholder, so nothing below can slip through by accident.

Last checked: 2026-10-01 (staging `c289b31`).

## 1. From the client

| Done | Item                                                                                    | Where it goes                     | Gate                               |
| ---- | --------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| [ ]  | Company details: legal name, KBO/BTW, address, phone (CONTENT-TODO 2.10)                | `src/content/site.json` `contact` | **[gate]**                         |
| [ ]  | Which mailboxes exist: info@ / contact@ / privacy@ (2.11)                               | `site.json`, legal texts          | **[gate]** (via contact)           |
| [ ]  | Lawyer's terms, privacy and cookie texts (3.1, 3.2); set `placeholder: false`           | `src/content/legal/*.md`          | **[gate]**                         |
| [ ]  | The real About us team: names, roles, photos (1.15); remove `placeholder`               | `src/content/pages/over-ons.json` | **[gate]**                         |
| [ ]  | Sign-off or rewrite of the claims (section 1, incl. About us 1.15)                      | page JSON files                   | review                             |
| [ ]  | FAQ answers (only answered questions show)                                              | page JSON files                   | review                             |
| [ ]  | Approval of the PROPOSED interface copy (2.8, 2.9, 2.23, 2.27–2.32)                     | `_copy.json`, `site.json`         | review                             |
| [ ]  | Real blog posts, or none (the four sample posts are drafts: production leaves them out) | `src/content/blog/`               | **[gate]** for `placeholder: true` |
| [ ]  | Solar sentence "Subsidies zijn beschikbaar." shown or hidden (1.8)                      | `zonnepanelen.json`               | review                             |

## 2. Accounts and keys (set in Ploi's "Edit environment" for production, never in git)

| Done | Item                                                                                                                                                              | Gate                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [ ]  | `N8N_LEAD_WEBHOOK_URL` / `N8N_NEWSLETTER_WEBHOOK_URL`: the Leads / Newsletter webhooks (same as staging, ADR 0011); a first real lead must land in the LIVE sheet | **[gate]**                |
| [ ]  | `N8N_NEWSLETTER_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` (a new secret, not staging's)                                                                               | **[gate]** with a webhook |
| [ ]  | Cloudflare Turnstile: `PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` for the production domain (test keys are refused)                                      | **[gate]**                |
| [ ]  | `LEAD_BACKUP_DIR`: an absolute path outside the site directory                                                                                                    | **[gate]**                |
| [ ]  | `PUBLIC_SITE_URL`: the final domain (canonical URLs, sitemap)                                                                                                     | review                    |
| [ ]  | n8n: dedupe on `lead_id`, write sheet values as RAW, qualification rules set up (ADR 0009, `docs/qualification.md`)                                               | review                    |
| [ ]  | An alert channel for leads stuck in `pending_forward` (the `leads:retry` cron)                                                                                    | review                    |

## 3. Server and domain

| Done | Item                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ ]  | Production site in Ploi (separate from staging), deploying from the `production` branch                                                               |
| [ ]  | DNS for the domain points at the server; SSL certificate issued                                                                                       |
| [ ]  | Nginx: proxy to the app port with `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For $remote_addr` (see `docs/ops/nginx-staging.conf`) |
| [ ]  | PM2 process running; cron jobs `leads:retry` and `backups:prune` installed                                                                            |
| [ ]  | `SITE_ENV=production` set before the first build                                                                                                      |

## 4. Go-live checks (right after the first production deploy)

- [ ] `/api/health` reports the release commit and `env: production`.
- [ ] The pages are indexable (no `noindex`), `robots.txt` allows crawling, the sitemap lists only public pages.
- [ ] One real test lead through the form (marked `?test=1`): it reaches n8n as a test, the backup file is written.
- [ ] Newsletter sign-up with `?test=1` reaches n8n as a test.
- [ ] Spot-check on a phone: home, a product page, the form to the thank-you page, the menu.
- [ ] Rollback known: Ploi redeploys the previous commit; `deploy.sh` keeps the previous build and restores it if `/api/health` fails.

## 5. After launch

- [ ] Phase 6: tracking (GTM, GA4, Meta) and cookie consent (CookieConfirm), deferred until the site is approved and live.

## Phase 8 test results (2026-10-01)

- **Automated tests:** 1,191 unit tests, and the full e2e suite on Chromium and WebKit, desktop and phone.
- **Accessibility:** axe on all 15 visitor-facing pages on all four projects (`tests/e2e/a11y-sweep.spec.ts`): no serious or critical violations.
- **Speed:** measured on a throttled phone (4× slower CPU, slow 4G: 150 ms latency, 1.6 Mbps):
  - main content (LCP) appears in 1.4–2.2 s ("good" is under 2.5 s);
  - no layout shift (CLS 0);
  - no long blocking scripts;
  - the marketing pages load about 5 kB of JavaScript.
- **Staging:**
  - pages, CSS and JS are gzip-compressed;
  - hashed assets are cached for a year;
  - a crawl of all 13 pages and 46 assets found no broken links.
