# 0003 — Hosting on Ploi: proxy everything, repo-managed PM2

- **Date:** 2026-09-29
- **Status:** Accepted
- **Brief:** §4.5 asked us to choose between Nginx serving `dist/client` and proxying
  everything, to change the web directory from `/public`, and to find out how Ploi runs the
  Node process.

## What we found on sites-prod-02

Checked over SSH as the site user and through the Ploi API:

- **Nginx:** Ploi's Node.js vhost proxies `location /` to the app port, `3001`. The web
  directory isn't used for app traffic.
- **Certbot:** Ploi's certbot uses the web directory as its HTTP-01 webroot. The template's
  acme location pointed at a non-existent `/var/www/html`, so certificate requests failed.
- **Two more template problems:**
  - Exact `location = /robots.txt` and `= /favicon.ico` blocks returned an Nginx 404 and never
    reached the app.
  - No `X-Real-IP` / `X-Forwarded-For` / `X-Forwarded-Proto` headers were sent, so the app
    would see every visitor as 127.0.0.1 and the per-IP rate limit would block real leads.
- **PM2:** PM2 7.0.4 runs as the isolated site user, with no sudo. Ploi's "Restart process
  after deployment" option is reported as unreliable (Ploi roadmap #491, #174), and its NodeJS
  settings can't be read or set through the API.
- **Zero-downtime deploys:** there is an open Ploi bug (#824) for Node sites.

## Decision

1. **Proxy everything to Node.** The Astro standalone server serves `dist/client`, with
   immutable caching on `/_astro/*` and ETags elsewhere.
2. **Keep the web directory at `/public`.** It only serves as certbot's webroot. Changing it
   would break certificate renewals, because the acme location's root points there.
3. **Nginx edits**, made in Ploi. A copy is in [`docs/ops/nginx-staging.conf`](../ops/nginx-staging.conf).
   - The acme location's `root` points at `<site>/public`, with `auth_basic off`.
   - The robots/favicon blocks are removed.
   - `proxy_pass` goes to `127.0.0.1:3001`.
   - The visitor IP (`$remote_addr`, overwritten rather than appended) and the forwarded
     protocol are passed on.
   - `location = /api/health` is exempt from basic auth.
   - HSTS, `Referrer-Policy`, `Permissions-Policy` and `X-Robots-Tag: noindex, nofollow`
     (staging only) are added.
4. **The repo manages the process**, not Ploi's NodeJS tab.
   - Ploi's deploy script only runs `git pull --ff-only origin main` and then
     [`scripts/deploy.sh`](../../scripts/deploy.sh).
   - `scripts/deploy.sh` runs `npm ci` and the build, then
     `pm2 startOrReload ecosystem.config.cjs` and `pm2 save`. It fails the deploy unless
     `/api/health` answers within 30 seconds.
   - [`server.mjs`](../../server.mjs) loads `.env`, because the Astro adapter never does.
   - Nobody clicks "Spawn" in the NodeJS tab.
5. **Reboots:** a Ploi cron job `@reboot /usr/bin/pm2 resurrect`, run as the site user,
   restores the saved process list without root.
6. **Git access:** the server pulls over SSH with a **read-only GitHub deploy key** for this
   repo only. Ploi's GitHub OAuth token was removed from the server's git remote URL: it gave
   whoever controls the site user access to every repo on the account.
7. **Quick deploy is on:** Ploi's GitHub push webhook deploys on pushes to `main`. Pushes to
   other branches don't deploy.

## Consequences

- **Deploys build in place.** While `npm ci` and the build run, staging can return errors for
  about a minute. That's acceptable on staging. Production gets its own decision in Phase 8,
  either zero-downtime releases with a `current` symlink or building in CI.
- **The Nginx edits are made by hand.** Re-check them if Ploi ever regenerates the vhost, for
  example after "Replace NGINX virtual host template" or a web-directory change.
- **Logs:** app logs are in `~/.pm2/logs/` for the site user, and deploy output is in Ploi's
  deploy log.
