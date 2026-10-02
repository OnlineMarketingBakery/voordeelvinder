# 0014: The energy forms ask only what Figma shows

- **Date:** 2026-10-02
- **Status:** Accepted (Tanjil: "remove what we added that is not in the Figma design")
- **Refines:** brief §7.3/§7.5 (questions), §8 (qualification), ADR 0010, ADR 0012

## Context

Some questions came from the brief, not from the designs: the call moment ("Wanneer mogen we je
bellen?", every form), the tariff step (social tariff + budget meter, step form) and the business
consumption bands under "Dit is een zakelijk adres" (every form). Figma (step form 84:3972–
91:10958, single page 193:2095) has none of them.

## Decision

- Removed from every flow: `call_moment` (shared contact step), `business_electricity_band` and
  `business_gas_band` (shared postcode step), and the `tariff_meter` step (`social_tariff`,
  `budget_meter`) of the step-by-step energy form. Their codes stay reserved.
- Kept although the old step design lacks them, because the newer Figma (Screen 1) has them: the
  gas options and the newsletter checkbox. Kept as mechanics, not questions: the energy-type step
  after a preselect without `?energie=`.
- The payload keeps `call_preference`, now always `null` (docs/PAYLOAD.md).

## Consequences

- **Qualification:** only `region_not_flanders` can hold; every Flemish lead is `promo` (TO
  CONFIRM with the client, docs/qualification.md).
- **Call partner:** no preferred call moment. The sheet's Beldag, Beltijdslot and Belmoment stay
  empty, Adversus gets no `voorkeursmoment`, and the e-mail templates' `*|BELMOMENT|*` has no
  value (docs/PIPELINE.md).
- The step form is one step shorter (8 screens on the "Ja" path, 9 on "Nee").
