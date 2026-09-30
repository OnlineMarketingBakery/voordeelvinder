# Staging on Ploi — runbook

The background and reasoning are in [decision 0003](../decisions/0003-ploi-hosting.md).

## The site

| Setting        | Value                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| URL            | https://voordeelvinder.onlinemarketingbakery.nl                                                                       |
| Ploi           | server `sites-prod-02` (id 121179, 62.238.104.110), site id 412321, type Node.js                                      |
| System user    | `voordeelvinder-9eyyh` (isolated, no sudo)                                                                            |
| Site directory | `/home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl`                                                  |
| Web directory  | `/public`: certbot's webroot only (Nginx proxies everything to Node)                                                  |
| Node / PM2     | Node 24 (server-wide), PM2 7 under the site user, process `voordeelvinder`                                            |
| App port       | `127.0.0.1:3001` (`PORT` in `.env`)                                                                                   |
| Git            | `git@github.com:OnlineMarketingBakery/voordeelvinder.git`, read-only deploy key `~/.ssh/github_deploy_voordeelvinder` |
| SSL            | Let's Encrypt, renewed by Ploi                                                                                        |

## Deploys

- **Trigger:** Quick deploy is on. A push to `main` (a merged PR) triggers Ploi's deploy
  script. A manual deploy is Ploi → site → **Deploy now**.
- **Ploi's deploy script** (Site → General):
  ```bash
  set -e
  cd /home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl
  git pull --ff-only origin main
  # Build, PM2 reload and health check are versioned in the repo:
  bash scripts/deploy.sh
  ```
- **What `scripts/deploy.sh` does** (one deploy at a time: a lock in
  `~/.voordeelvinder-deploy.lock` makes a second deploy wait, because Ploi starts one per push):
  1. Checks `.env` and reads `PORT` with Node's parser.
  2. Runs `npm ci` only when `package-lock.json` or the Node version changed.
  3. Runs `npm run build -- --outDir dist.next`. That validates the flows, `.env` and
     content first, and fails the deploy if any of them is invalid; the live site isn't
     touched.
  4. Swaps `dist.next` → `dist`, keeping the old build as `dist.prev`.
  5. Runs `pm2 startOrReload ecosystem.config.cjs --update-env`.
  6. Waits up to 30 seconds for `/api/health` to report the new commit. If it doesn't, it
     prints the last log lines, restores `dist.prev` and fails.
- **Don't** click "Spawn" in Ploi's NodeJS tab: the repo manages the process.
- **Check a deploy:** `curl -s https://voordeelvinder.onlinemarketingbakery.nl/api/health`
  returns `{"ok":true,"commit":"<short sha>","env":"staging"}`.

## Environment (`.env`, Ploi → Edit environment)

```
SITE_ENV=staging
HOST=127.0.0.1
PORT=3001
PUBLIC_SITE_URL=https://voordeelvinder.onlinemarketingbakery.nl
LEAD_BACKUP_DIR=/home/voordeelvinder-9eyyh/lead-backups
RATE_LIMIT_PER_HOUR=10
# n8n: staging points at a separate, always-active TEST WORKFLOW (writes only to the test tab;
# never the partner, Mailchimp journeys or Meta), through that workflow's production URL
# /webhook/<path>. Never the /webhook-test/ URL, never the production workflow.
N8N_LEAD_WEBHOOK_URL=https://<n8n>/webhook/<staging-test-workflow-path>
N8N_NEWSLETTER_WEBHOOK_URL=            # optional; defaults to the lead webhook
N8N_WEBHOOK_SECRET=<at least 16 characters, same value as in n8n>
TURNSTILE_SECRET_KEY=                  # empty: Cloudflare's always-passing test secret
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
# Phase 6: PUBLIC_GTM_ID
```

Lead pipeline settings (`src/server/env.ts`, brief §9.1):

| Variable                     | Staging                                                                                                                  | Production                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `N8N_LEAD_WEBHOOK_URL`       | optional, https, **the test workflow's `/webhook/…` URL only** (below); empty = leads are only backed up (`backup_only`) | required, https                          |
| `N8N_NEWSLETTER_WEBHOOK_URL` | optional (default: the lead webhook)                                                                                     | optional                                 |
| `N8N_WEBHOOK_SECRET`         | required when a webhook is set; sent as `X-VV-Secret`                                                                    | required                                 |
| `TURNSTILE_SECRET_KEY`       | optional; empty = test secret `1x0000000000000000000000000000000AA` (always passes)                                      | required; Cloudflare's test keys refused |
| `PUBLIC_TURNSTILE_SITE_KEY`  | optional; empty = test site key `1x00000000000000000000AA` (build time: redeploy)                                        | required; Cloudflare's test keys refused |
| `TURNSTILE_VERIFY_URL`       | refused (local and CI only: the e2e siteverify stand-in)                                                                 | refused                                  |
| `LEAD_BACKUP_DIR`            | absolute, outside the site directory; created with mode 700, files 600                                                   | same                                     |
| `RATE_LIMIT_PER_HOUR`        | requests per visitor IP per hour on `/api/lead` and `/api/newsletter` (each its own)                                     | same                                     |

**Why not n8n's `/webhook-test/…` URL:** n8n only registers it while someone has "Listen for
test event" open in the workflow editor, for about two minutes and a single call; the rest of
the time it answers 404. Every staging forward would then fail (a 404 is not retried),
`leads:retry` would alert on every run, and the staging checklist ("the lead arrives in n8n")
could never pass reliably. So staging uses a **separate test workflow that stays active**,
through its production-style `/webhook/<path>` URL, with its own path and the staging secret.
That workflow writes only to the test tab of the lead sheet and never reaches the telesales
partner, Mailchimp journeys or Meta (brief §9.4). It is still a test workflow: never point
staging at the production workflow's URL.

Every lead from staging is a test lead (`is_test: true`) whatever the webhook. The secrets are
read at runtime: after changing one, `pm2 reload voordeelvinder --update-env` is enough.

- Don't set `NODE_ENV` (PM2 sets it for the process).
- `SITE_ENV` and `PUBLIC_*` are fixed at build time. After changing them, **redeploy**.
- Secrets are read at runtime. After changing only a secret, a PM2 reload is enough:
  `pm2 reload voordeelvinder --update-env`.

## Nginx

The live vhost is edited in Ploi → site → Manage → Edit NGINX configuration, or through the
API. A copy is kept in [`nginx-staging.conf`](nginx-staging.conf); update the copy whenever you
change the live file. It contains these changes compared with Ploi's template:

- the acme-challenge root is `<site>/public`, with `auth_basic off`;
- the `robots.txt` / `favicon.ico` blocks are removed;
- `proxy_pass http://127.0.0.1:3001`;
- the visitor IP is passed as `$remote_addr`, plus the forwarded protocol and
  `X-Forwarded-Host $host`. Astro only trusts the visitor IP with a valid forwarded host.
  Added via the API on 2026-09-29 and reloaded on 2026-09-30 (Tanjil's OK); X-Forwarded-Host
  is active. The lead endpoint's rate limiter keys on this IP (`src/server/lead/rate-limit.ts`):
  without it every visitor would be `127.0.0.1` and share one bucket;
- `location = /api/health` is exempt from basic auth;
- HSTS, `Referrer-Policy`, `Permissions-Policy`, and `X-Robots-Tag: noindex, nofollow`
  (staging only).

If Ploi ever regenerates the vhost (for example after "Replace NGINX virtual host template" or
a web-directory change), re-apply the copy.

## Cron jobs (Ploi → server → Cron jobs, user `voordeelvinder-9eyyh`)

| Frequency     | Command                                                                                                                                                 | Purpose                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@reboot`     | `/usr/bin/pm2 resurrect`                                                                                                                                | Restart the site after a server reboot                    |
| `*/5 * * * *` | `cd /home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl && flock -n /home/voordeelvinder-9eyyh/.leads-retry.lock npm run -s leads:retry` | Resend leads n8n didn't accept (§9.1)                     |
| `17 3 * * *`  | `cd /home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl && npm run -s backups:prune`                                                     | Delete lead backups older than 30 days, compact the files |

Ploi writes these to `/etc/crontab`. Each job logs to
`/home/voordeelvinder-9eyyh/.ploi/scheduled-<id>.log`.

- **`leads:retry`** resends backup records still `pending_forward` (older than 2 minutes, at
  most one attempt each per run). Each record counts its own failed attempts and waits 5, 10,
  20, 40, then 60 minutes before the next one; records with the fewest failures go first, so
  one that keeps failing never holds back newer ones. A webhook that fails 3 times in a row
  (network, timeout, 5xx, 408, 429) is left alone for the rest of that run; a refusal (other
  4xx, a redirect) only concerns its own record. When a record has been pending for more than
  30 minutes it logs an `"event":"alert"` line and exits with code 1.
  Check it with `grep '"alert"' ~/.ploi/scheduled-*.log`. The alert e-mail of brief §13 isn't
  wired yet (see ADR 0008).
- **`backups:prune`** deletes records older than 30 days (a `"removedPending"` above 0 in its
  log means a lead was never forwarded) and folds the status updates and failed attempts into
  the records. It also deletes `*.tmp` files older than an hour (a rewrite that died halfway
  leaves a full copy of a month's personal data; `"tempFilesDeleted"` in its log) and old lock
  leftovers.

## Lead backups

`$LEAD_BACKUP_DIR/YYYY-MM.jsonl` (UTC month), one JSON line per record (format in
`src/server/lead/backup.ts`, ADR 0008). Every write takes the lock in that directory: a
directory `.lock` holding an `owner` token, refreshed while held. A lock older than a minute
was left by a crashed process and is taken over (moved to a `.lock.<inode>.stale` tombstone
that prune removes after an hour). Every append is fsynced before the visitor gets an answer.
Look without printing personal data:

```bash
cd /home/voordeelvinder-9eyyh/lead-backups
# pending records per month file (ids only)
node -e 'for (const f of require("fs").readdirSync(".").filter(f=>/^\d{4}-\d{2}\.jsonl$/.test(f))) { const s=new Map(); for (const l of require("fs").readFileSync(f,"utf8").split("\n").filter(Boolean)) { try { const r=JSON.parse(l); s.set(r.id, r.status) } catch {} } console.log(f, [...s].filter(([,v])=>v==="pending_forward").map(([k])=>k)) }'
```

## Basic auth

Not used for now (Tanjil, 2026-09-30): staging is open, and search engines are kept out by
`noindex` (robots.txt, meta tag and `X-Robots-Tag`). If it is added later, set it up in Ploi
(site → basic auth users): one user for the whole site. `/api/health` and
`/.well-known/acme-challenge/` stay reachable without it. Share the password outside the repo.

## Logs and diagnostics (SSH as the site user)

```bash
ssh voordeelvinder-9eyyh@62.238.104.110
pm2 ls                      # process status
pm2 logs voordeelvinder     # app output (~/.pm2/logs/)
curl -s http://127.0.0.1:3001/api/health
tail -f /var/log/nginx/voordeelvinder.onlinemarketingbakery.nl-error.log
```

## Rollback

Revert the bad PR on GitHub (a revert PR, then merge); Quick deploy redeploys `main`. In an
emergency, on the server:

```bash
cd ~/voordeelvinder.onlinemarketingbakery.nl
git checkout <good-sha>
bash scripts/deploy.sh
# then fix main; the next deploy's `git pull` needs the branch back:
git checkout main
```

## Third-party origins and CSP

The site loads nothing from other origins except the ones below. There is **no
Content-Security-Policy yet** (neither Nginx nor `Base.astro` sends one); the CSP of brief §11
comes with the tag setup (Phase 6) and must allow every origin in this table.

| Origin                              | What                                                                                                                                      | Where                                          | CSP directives                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `https://challenges.cloudflare.com` | Cloudflare Turnstile: the script `turnstile/v0/api.js?render=explicit` and its iframe (brief §9.1 step 4). The server calls `siteverify`. | The form's last (contact) step only, on demand | `script-src`, `frame-src`, `connect-src` |

Turnstile needs `PUBLIC_TURNSTILE_SITE_KEY` (public, fixed at build time: redeploy after a
change) and `TURNSTILE_SECRET_KEY` (runtime). Without a site key, local, CI and staging render
Cloudflare's always-passing test key `1x00000000000000000000AA`; a production build fails
without a real one. In Cloudflare, the widget's hostnames must include every domain that serves
the form (`voordeelvinder.be`, `www.voordeelvinder.be`; staging uses the test key).
