# Lead qualification in n8n (handover spec)

> **DRAFT, TO CONFIRM with the client.** Transcribed from the brief's §8 energy draft (based on
> the PromoCheckers rules). **The site does not use this document**: it sends every lead to n8n
> unqualified (ADR 0009). The n8n workflow implements these rules and is their source of truth
> from now on.

## What n8n receives

Every valid lead, as the payload in [PAYLOAD.md](PAYLOAD.md) (`schema_version: 1`). There is no
`outcome` field: n8n works it out from:

- `product`: `energie`, `zonnepanelen` or `thuisbatterij`
- `answers.*`: the answer codes (docs/FLOWS.md). A question that wasn't shown is **absent** from
  `answers`, not empty.
- `derived.region`: `flanders`, `wallonia` or `brussels` (from the postcode, recomputed by the
  server)
- `is_test`: `true` for every lead that isn't from production, or that came with `?test=1`

## Outcomes

n8n assigns each lead one outcome, `promo`, `no_promo` or `pending`, plus a list of reasons
(zero or more of the codes below). The visitor never sees it.

### Energy (`product` = `energie`)

A lead is **`no_promo`** when **any** of these holds, and every one that holds adds its reason.
Otherwise it is **`promo`** with no reasons.

| Reason                | Holds when                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `region_not_flanders` | `derived.region` is not `flanders`                                                                                                         |
| `social_tariff`       | `answers.social_tariff` is `yes`                                                                                                           |
| `budget_meter`        | `answers.budget_meter` is `yes`                                                                                                            |
| `business_over_100k`  | `answers.is_business` is `true` **and** (`answers.business_electricity_band` is `over_100k` or `answers.business_gas_band` is `over_100k`) |

- **The supplier (`answers.supplier`) doesn't matter:** every supplier qualifies (TO CONFIRM).
- **`budget_meter` `unknown` ("Weet ik niet") counts as promo**, following the draft literally:
  only `yes` is no_promo (TO CONFIRM).
- A business under 100,000 kWh is treated like a home and can be promo. The band questions are
  only asked for the energy types chosen, so one of the two band fields may be absent.
- Several reasons can apply at once, e.g. `["region_not_flanders", "social_tariff"]`.

### Solar panels and home battery (`zonnepanelen`, `thuisbatterij`)

No rules yet: every lead is **`pending`** with no reasons. Questions, rules and destination are
still a draft (brief §7.4, §15 item 5).

## What depends on the outcome (brief §9.3, for the n8n side)

- Only `promo` leads go to the telesales partner; `no_promo` leads are stored, not delivered;
  `pending` leads wait.
- The Meta `QualifiedLead` event is sent for `promo` only.
- **Test leads** (`is_test: true`) never reach the partner or Meta, whatever their outcome.
- Store the outcome and reasons in the lead sheet next to the lead.

## Open questions for the client

1. Confirm the four energy rules and the reason codes.
2. Does "Weet ik niet" on the budget meter count as promo?
3. Does the supplier really never matter?
4. Solar panels and home battery: rules and destination.
