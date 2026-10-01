# 0010 — The site decides promo / no_promo; n8n routes

- **Date:** 2026-10-01
- **Status:** Accepted
- **Brief:** §8 (qualification rules, server-side), §9.2 (payload: `outcome`, `outcome_reasons`)
- **Supersedes:** ADR 0009 (qualification in n8n)

## Context

ADR 0009 (2026-09-30) moved qualification into n8n. While setting up the n8n pipeline, Tanjil
chose to follow the brief again: "n8n still decides where leads go, just not whether they're
promo." What stays from 0009: the site never filters, so **every** valid lead still reaches n8n.

## Decision

- The server classifies every lead (`src/server/lead/qualify.ts`) with the rules in
  `src/server/rules/<product>.json` (JSONLogic subset, ADR 0006) and sends `outcome` and
  `outcome_reasons` in the payload (`docs/PAYLOAD.md`, additive: `schema_version` stays 1).
- Energy uses the brief's §8 draft (TO CONFIRM); solar panels and home battery are `pending`.
- n8n routes on `outcome` (sheet tab, partner, Mailchimp, Meta) and never re-classifies.

## Consequences

- A rule change is a content change in this repo plus a deploy, not an n8n edit.
- The rules and open questions live in [`docs/qualification.md`](../qualification.md).
