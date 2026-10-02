# 0011: One n8n workflow for staging and production, routed on `is_test`

- **Date:** 2026-10-02
- **Status:** Accepted (Tanjil, n8n master-sheet brief, 2026-10-01)
- **Refines:** ADR 0008 ("the test webhook" = a separate test workflow)

## Context

ADR 0008 and the staging runbook planned a separate, always-active test workflow for staging,
next to the production workflow. The n8n brief instead routes test leads inside one workflow.

## Decision

- Staging and production post to the same `VoordeelVinder - Leads` and `- Newsletter` webhooks
  (`docs/PIPELINE.md`).
- Each workflow treats anything but an explicit `is_test: false` as a test. A test goes to the
  TEST spreadsheet and stops before every partner stage (Adversus, Mailchimp, Meta).
- The site sets `is_test: true` unless `SITE_ENV=production` (and with `?test=1`), in code.

## Consequences

- Two independent guards keep staging leads away from partners: the site's `is_test` and n8n's
  "not explicitly false" rule.
- Staging tests the real production path, up to the test stop.
- Still never n8n's `/webhook-test/` URL.
