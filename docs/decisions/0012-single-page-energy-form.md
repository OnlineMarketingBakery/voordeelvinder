# 0012: Single-page energy form; the step form stays

- **Date:** 2026-10-02
- **Status:** Accepted (Tanjil)
- **Design:** Figma 193:2095 "Screen 1 – Comparison form"

## Context

The new Figma file designs energy as one long form (sections A to E) followed by a results page
and an online order (Screens 2–6). There are no supplier tariffs yet, so only Screen 1 can be
built now. Tanjil asked to add the call moment, which the design leaves out. The qualification
questions (social tariff, budget meter) were added first and then removed until the client
decides (2026-10-02).

## Decision

- `/vergelijken/energie` renders the single-page form (`energie_vergelijker` flow,
  `FormPageIsland.tsx`); the step-by-step form moves to `/vergelijken/energie/stappen`
  (noindex, canonical to the main form) for testing or later use.
- Both use the same engine, validators, field components (a `page` layout) and submission; the
  server picks the flow by `flow_id`. "Vergelijken" sends the lead and opens the thank-you page.
- Shared questions keep their codes; new questions get new codes (docs/FLOWS.md). The payload
  change is additive (docs/PAYLOAD.md).
- Solar panels and home battery keep the step form.

## Consequences

- Two energy forms to maintain until one is retired; `meta.page` tells them apart in the sheet.
- The lead sheet needs columns for the new answers (n8n `FIELD` map); until then they are in
  the Backup tab's payload.
- Screens 2–6 (results, ordering) wait for tariff data and a business decision.
