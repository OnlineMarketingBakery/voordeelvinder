# Lead qualification

> **DRAFT, TO CONFIRM with the client.** The brief's §8 energy draft (based on the PromoCheckers
> rules). Since ADR 0010 (2026-10-01) **the site decides** the outcome and n8n routes on it:
> `src/server/lead/qualify.ts` applies the rules in `src/server/rules/<product>.json` and sends
> `outcome` and `outcome_reasons` with **every** lead (nothing is filtered on the site).

## Outcomes

Each lead gets one outcome, `promo`, `no_promo` or `pending`, plus a list of reasons (zero or
more of the codes below). The visitor never sees it.

### Energy (`product` = `energie`, `src/server/rules/energie.json`)

A lead is **`no_promo`** when **any** of these holds, and every one that holds adds its reason
(in this order). Otherwise it is **`promo`** with no reasons.

| Reason                | Holds when                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `region_not_flanders` | `derived.region` is not `flanders`                                                                                                         |
| `social_tariff`       | `answers.social_tariff` is `yes`                                                                                                           |
| `budget_meter`        | `answers.budget_meter` is `yes`                                                                                                            |
| `business_over_100k`  | `answers.is_business` is `true` **and** (`answers.business_electricity_band` is `over_100k` or `answers.business_gas_band` is `over_100k`) |

- **The supplier (`answers.supplier`) doesn't matter:** every supplier qualifies (TO CONFIRM).
  A supplier rule (e.g. only Engie / Luminus / TotalEnergies, as PromoCheckers decided on
  29 Sep) would be one more entry in `energie.json`.
- **`budget_meter` `unknown` ("Weet ik niet") counts as promo**, following the draft literally:
  only `yes` is no_promo (TO CONFIRM).
- A business under 100,000 kWh is treated like a home and can be promo. The band questions are
  only asked for the energy types chosen, so one of the two band fields may be absent.
- **Changing a rule** is a content change: edit `energie.json` (conditions use the form's
  JSONLogic subset, ADR 0006, on `{ answers, derived }`), update this table and
  `tests/unit/server/qualify.test.ts`.

### Solar panels and home battery (`zonnepanelen`, `thuisbatterij`)

No rules yet: every lead is **`pending`** with no reasons. Questions, rules and destination are
still a draft (brief §7.4, §15 item 5).

## What n8n does with it (brief §9.3)

- **Route, never re-classify.** n8n reads `outcome` from the payload.
- **Deduplicate on `lead_id`** (newsletter sign-ups: `signup_id`) as the first step: the site
  delivers at least once (PAYLOAD.md, "Delivery: at least once").
- **Treat every visitor string as untrusted:** write the sheet so a value starting with `=`,
  `+`, `-`, `@`, a tab or a carriage return never becomes a formula (PAYLOAD.md, "Untrusted
  fields").
- Only `promo` leads go to the telesales partner; `no_promo` leads are stored, not delivered;
  `pending` leads wait.
- The Meta `QualifiedLead` event is sent for `promo` only; `Lead` and `QualifiedLead` only with
  marketing consent (`consent.cookies.marketing: true`) and only for non-test leads.
- **Test leads** (`is_test: true`) never reach the partner, Mailchimp or Meta, whatever their
  outcome.

## Open questions for the client

1. Confirm the four energy rules and the reason codes.
2. Does "Weet ik niet" on the budget meter count as promo?
3. Does the supplier really never matter?
4. Solar panels and home battery: rules and destination.
