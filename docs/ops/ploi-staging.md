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
# Phase 5: N8N_LEAD_WEBHOOK_URL (mock/test only), N8N_WEBHOOK_SECRET, TURNSTILE_SECRET_KEY, PUBLIC_TURNSTILE_SITE_KEY
# Phase 6: PUBLIC_GTM_ID
```

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
  Added via the API on 2026-09-29; it takes effect at the next Nginx reload, which Ploi
  does, for example, when a basic auth user is added;
- `location = /api/health` is exempt from basic auth;
- HSTS, `Referrer-Policy`, `Permissions-Policy`, and `X-Robots-Tag: noindex, nofollow`
  (staging only).

If Ploi ever regenerates the vhost (for example after "Replace NGINX virtual host template" or
a web-directory change), re-apply the copy.

## Cron jobs (Ploi → server → Cron jobs, user `voordeelvinder-9eyyh`)

| Frequency     | Command                                                                                                                                                 | Purpose                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `@reboot`     | `/usr/bin/pm2 resurrect`                                                                                                                                | Restart the site after a server reboot                     |
| `*/5 * * * *` | `cd /home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl && flock -n /home/voordeelvinder-9eyyh/.leads-retry.lock npm run -s leads:retry` | Resend leads n8n didn't accept (§9.1), stub until Phase 5  |
| `17 3 * * *`  | `cd /home/voordeelvinder-9eyyh/voordeelvinder.onlinemarketingbakery.nl && npm run -s backups:prune`                                                     | Delete lead backups older than 30 days, stub until Phase 5 |

Ploi writes these to `/etc/crontab`. Each job logs to
`/home/voordeelvinder-9eyyh/.ploi/scheduled-<id>.log`.

## Basic auth

Set it up in Ploi (site → basic auth users): one user for the whole site. `/api/health` and
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
