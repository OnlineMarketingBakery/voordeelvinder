# 0009 — Qualification happens in n8n, not on the site

- **Date:** 2026-09-30
- **Status:** Accepted (Tanjil, 2026-09-30)
- **Brief:** §8 (qualification rules, server-side), §9.2 (payload: `outcome`,
  `outcome_reasons`), §9.3 (n8n routing, Meta `QualifiedLead`).
- **Supersedes:** the rules part of ADR 0006 ("Phase 5 qualification rules can use the same
  evaluator on the server").

## Context

Brief §8 puts the qualification rules on the site: the server classifies every lead as
`promo`, `no_promo` or `pending` with `outcome_reasons` (for energy: region not Flanders,
social tariff, budget meter, business over 100,000 kWh), and sends the outcome to n8n in the
payload. n8n then routes on it (only promo goes to the telesales partner) and reports
`QualifiedLead` to Meta.

The client changes these rules often. On the site every change is a code change, a PR and a
deploy, and the rules would sit in a repository that is still public (ADR 0005).

## Decision

Tanjil, 2026-09-30: "send all of the leads (so no filtering in the website) to n8n and setup
the filtering logic in n8n, not in website, website takes the leads and sends them to n8n."

- The site validates, backs up and forwards **every** valid lead to n8n (ADR 0008). It never
  classifies a lead: there is no `src/server/rules/`, no `classify()`, no rules check in
  `validate:flows` and no `docs/RULES.md`.
- n8n implements the qualification and everything that depends on it: routing (promo to the
  partner), the Meta `QualifiedLead` decision and the lead sheet's outcome column. The draft it
  starts from is in [`docs/n8n-qualification.md`](../n8n-qualification.md), written in terms of
  the payload fields n8n receives.

## Consequences

- **Payload:** `outcome` and `outcome_reasons` are removed from the lead payload
  (`docs/PAYLOAD.md`, `src/server/lead/payload.ts`). Everything else is unchanged: answer codes,
  Dutch labels, derived postcode/region/province, contact (incl. `phone_e164` and
  `phone_display`), `call_preference`, consent, tracking, meta (`ip`, `user_agent`,
  `site_env`), `is_test`, `brand`, `schema_version`.
- **`schema_version` stays 1.** Removing fields would normally need a bump, but nothing is live
  yet: no n8n workflow, sheet or Meta integration consumes version 1, so there is nothing to
  stay compatible with.
- **Rule changes happen in n8n**, without a site deploy. This repo holds no rules; the n8n
  workflow is their source of truth and must document them (a change log per product).
- The answers the rules need (`social_tariff`, `budget_meter`, `is_business`, the business
  bands, `derived.region`) are sent as codes like every other answer. Option codes never change
  once live (AGENTS.md rule 4), so the n8n rules can rely on them.
- The visitor still never sees the outcome: every visitor gets the same thank-you page for the
  product, as before.
- n8n receives leads that the site used to mark `no_promo`. n8n must not deliver them to the
  partner by default, and must keep test leads (`is_test: true`) away from the partner and Meta.
- The privacy policy still has to describe the qualification step (design review finding
  `privacy-automated-classification-undisclosed`); it now happens in n8n.
