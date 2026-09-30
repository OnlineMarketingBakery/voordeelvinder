# 0008 — The lead pipeline: endpoint, backups, forwarding, retry

- **Date:** 2026-09-30
- **Status:** Proposed
- **Brief:** §9.1 (endpoint order), §9.4 (test mode), §11 (security), §13 (monitoring).
- **Code:** `src/server/lead/` (`handler.ts`, `rate-limit.ts`, `turnstile.ts`, `backup.ts`,
  `forward.ts`, `deliver.ts`, `retry.ts`), `src/server/newsletter.ts`, `src/pages/api/lead.ts`,
  `src/pages/api/newsletter.ts`, `scripts/leads-retry.ts`, `scripts/backups-prune.ts`.

## Decision

- **Order (§9.1):** rate limit → parse and validate (the server rebuilds the submission from
  the answers with its own flows: `parseLeadRequest`) → honeypot (`website`: pretend success,
  store nothing) → Turnstile → payload → backup → forward → respond
  `{ ok: true, redirect: "/bedankt/<product>" }`. `is_test` is decided on the server:
  `SITE_ENV !== "production"` or the submission's `meta.test` (`?test=1`). There is no
  classify step: every valid lead goes to n8n, which qualifies it (ADR 0009).
- **Responses to the browser** are `{ ok: false, error: <code> }` with a stable code the form
  maps to copy: `invalid_request` 400, `verification_failed` 403, `method_not_allowed` 405,
  `payload_too_large` 413, `unsupported_media_type` 415 (JSON only), `rate_limited` 429 (with
  `Retry-After` in seconds), `server_error` 500, `unavailable` 503. Never an internal message.
- **Rate limit:** in memory (one PM2 fork process), a sliding window of
  `RATE_LIMIT_PER_HOUR` requests per IP per endpoint, counting every request (also rejected
  ones); at most 10 000 IPs are remembered. The IP is Astro's `clientAddress`: behind Nginx
  that is the visitor's only because Nginx overwrites `X-Forwarded-For` with `$remote_addr`
  and sends `X-Forwarded-Host`, which `security.allowedDomains` in `astro.config.ts` accepts
  (Astro ignores X-Forwarded-For otherwise and reports `127.0.0.1`). A restart resets the
  counts.
- **Turnstile:** siteverify with `remoteip` and a 5 s timeout. Without `TURNSTILE_SECRET_KEY`,
  local, CI and staging use Cloudflare's always-passing test secret
  `1x0000000000000000000000000000000AA`; production requires a real key and refuses the test
  keys. **Deviation:** when siteverify is unreachable (network error, timeout, 5xx) the lead
  is accepted and the event logged, instead of answering 403: a Cloudflare outage must not
  cost leads, and the honeypot and rate limit still apply. A rejected token is always 403.
- **Backups:** `LEAD_BACKUP_DIR/YYYY-MM.jsonl` (UTC month), dir 700 and files 600, written
  **before** forwarding. A record line holds the full payload and a `status`; a forward that
  succeeds appends a small status line (`{"id","status":"forwarded","at"}`) instead of
  rewriting the record, so the request path only appends. Statuses: `pending_forward`,
  `forwarded`, and `backup_only` (**addition**: no webhook configured, so never forwarded and
  never retried or alerted on). Idempotent by `lead_id`: a second submit with the same id
  (this or last month's file) is neither stored nor forwarded again, and gets the same success
  response. Every write (endpoint, retry, prune) holds a lock: an in-process queue plus an
  exclusive lock file `.lock`, taken over after 60 s (a crashed writer). Prune rewrites a file
  with temp + fsync + rename.
- **Forwarding:** POST JSON with `X-VV-Secret`, 8 s timeout per attempt, 2 retries with 0.5 s
  and 1.5 s backoff on network errors, timeouts, 5xx, 408 and 429; other 4xx are not retried
  (bad secret or URL). If it still fails the record stays `pending_forward` and the visitor
  gets success. Only when a lead is neither backed up nor accepted by n8n does the endpoint
  answer 503 (the form can retry with the same `lead_id`).
- **Retry job** (`leads:retry`, every 5 minutes): one attempt per pending record, oldest
  first, skipping records younger than 2 minutes (their request may still be forwarding); it
  stops after 3 failures in a row. Records pending for more than 30 minutes produce an
  `"event":"alert"` log line and exit code 1. **Open:** brief §13 asks for an alert e-mail;
  there is no mail transport on the server yet. Options: an n8n alert webhook, or Ploi's cron
  output mail. Until then, check the cron log.
- **Prune job** (`backups:prune`, daily): deletes records older than 30 days, including
  records never forwarded (logged as `removedPending`), and compacts the files.
- **Newsletter:** the same steps, with its own payload (`docs/PAYLOAD.md`,
  "Newsletter sign-up") and an optional `N8N_NEWSLETTER_WEBHOOK_URL` (**addition**; default:
  the lead webhook, told apart by `type`).
- **Environment** (`src/server/env.ts`): the brief's names are kept (`N8N_LEAD_WEBHOOK_URL`,
  not `N8N_WEBHOOK_URL`). On staging the webhook is optional (no webhook = backup only), must
  be https, and needs `N8N_WEBHOOK_SECRET` (16+ characters) with it; production requires the
  webhook, the secret and a real Turnstile key. This refines ADR 0004's "required on staging
  and production": staging may run without n8n. The code can't tell n8n's test webhook from
  the production one; pointing staging at the test webhook is an ops rule (runbook, AGENTS.md).
  `TURNSTILE_VERIFY_URL` (local and CI only) points siteverify at the e2e stand-in.
- **Logs** are JSON lines (`src/server/log.ts`) with the `lead_id`, product, `is_test` and
  delivery status only: never an answer, a name, an e-mail address, a phone number or an IP.

## Consequences

- n8n should deduplicate on `lead_id` (and `signup_id`): a crash between a successful forward
  and its status line, or a very slow n8n, can make the retry job send a record twice.
- A record's status is spread over lines until the next prune compacts the file; readers use
  `foldLines`.
- The e2e run (`playwright.config.ts`) starts `tests/support/mock-n8n.ts` as webhook and
  siteverify stand-in, with backups in `.cache/e2e/lead-backups`.
