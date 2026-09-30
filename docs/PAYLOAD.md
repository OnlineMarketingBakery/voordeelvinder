# Lead payload contract (`schema_version: 1`)

The JSON the lead endpoint (`POST /api/lead`, Phase 5) sends to n8n. It is the contract with n8n,
the lead sheet and the Meta integration: **change it only with explicit approval in the PR**
(AGENTS.md), and bump `schema_version` for any change that isn't purely additive.

Source: build brief §9.2, transcribed as is. The only additions are the notes under
"Where each part comes from", which describe the implementation.

## Example

```json
{
  "schema_version": 1,
  "brand": "voordeelvinder",
  "lead_id": "uuid-v4",
  "event_id": "uuid-v4",
  "is_test": false,
  "submitted_at": "2026-10-01T09:30:00.000Z",
  "product": "energie",
  "flow_version": 1,
  "outcome": "promo",
  "outcome_reasons": [],
  "answers": {
    "energy_type": "both",
    "is_business": false,
    "supplier": "luminus",
    "meter_type": "dual",
    "digital_meter": "yes",
    "has_solar": "no",
    "social_tariff": "no",
    "budget_meter": "no",
    "knows_consumption": "yes",
    "electricity_kwh": 3500,
    "gas_kwh": 12000
  },
  "labels": { "supplier": "Luminus", "meter_type": "Dag/nachtmeter (tweevoudig tarief)" },
  "derived": { "postcode": "9000", "region": "flanders", "province": "oost-vlaanderen" },
  "contact": {
    "first_name": "…",
    "last_name": "…",
    "phone_e164": "+32475123456",
    "phone_display": "+32 475 12 34 56",
    "email": "…"
  },
  "call_preference": { "day": "wed", "slot": "13-14" },
  "consent": {
    "terms": true,
    "newsletter": false,
    "cookies": { "analytics": true, "marketing": true }
  },
  "tracking": {
    "fbc": "",
    "fbp": "",
    "fbclid": "",
    "gclid": "",
    "gbraid": "",
    "wbraid": "",
    "msclkid": "",
    "ttclid": "",
    "utm_source": "",
    "utm_medium": "",
    "utm_campaign": "",
    "utm_content": "",
    "utm_term": "",
    "ga_client_id": "",
    "ga_session_id": "",
    "landing_page": "",
    "referrer": "",
    "entry_path": "/vergelijken/energie"
  },
  "meta": {
    "page": "/vergelijken/energie",
    "user_agent": "…",
    "ip": "…",
    "site_env": "production"
  }
}
```

## Rules (brief §9.2)

- **`answers`** holds only the codes of the fields that were shown.
- **`labels`** gives the Dutch text for each answer, so the sheet is readable.

## Related rules elsewhere in the brief

- `outcome` is `promo`, `no_promo` or `pending`, with `outcome_reasons[]` such as
  `region_not_flanders` (§8). The visitor never sees it.
- `is_test` is true unless `SITE_ENV=production`, or when the visitor arrived with `?test=1`
  (§9.4, ADR 0004).
- `event_id` is shared by the browser `Lead` event and the server-side Meta events, so each lead
  is counted once (§9.3, §10).
- Option codes never change once live (AGENTS.md rule 4); labels may.

## Where each part comes from

The form sends a **submission** (`buildSubmission` in `src/lib/flow/engine.ts`) with every value
already normalised by the field validators (`src/lib/flow/validators/`); the server re-validates
it against the flow with the same validators, adds what only it can know and forwards the
payload.

| Part                                             | Form submission                                                                                                                                   | Added or recomputed by the server (Phase 5)        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `schema_version`, `lead_id`, `event_id`          | yes (`lead_id` is generated once per form session)                                                                                                |                                                    |
| `submitted_at`                                   | yes                                                                                                                                               | may replace it with its own clock                  |
| `product`, `flow_version`                        | yes (plus `flow_id`, to find the flow)                                                                                                            | checked against the flow                           |
| `answers`                                        | codes of shown fields with payload `answers`, plus implied answers such as `energy_type`; abandoned answers are cleared first                     | re-validated; unknown fields or codes are rejected |
| `labels`                                         | no                                                                                                                                                | from its own copy of the flow (`answerLabels`)     |
| `derived`                                        | `postcode` (the postcode field) and the region/province the form worked out                                                                       | recomputed from the postcode                       |
| `contact`                                        | `first_name`, `last_name` (trimmed), `phone_e164` and `phone_display` (the phone normalised by the field validator), `email` (trimmed, lowercase) | re-validated with the same field validators        |
| `call_preference`                                | the `day_slot` field                                                                                                                              |                                                    |
| `consent`                                        | `terms`, `newsletter` and the cookie banner's `cookies` state                                                                                     |                                                    |
| `tracking`                                       | every key, `""` when unknown                                                                                                                      |                                                    |
| `meta`                                           | `page`, and `test` (the visitor arrived with `?test=1`)                                                                                           | `user_agent`, `ip`, `site_env`                     |
| `brand`, `is_test`, `outcome`, `outcome_reasons` | no                                                                                                                                                | yes                                                |
