# Lead payload contract (`schema_version: 1`)

> **Tanjil, 2026-10-01 (ADR 0010, superseding 0009):** the site decides each lead's outcome
> (`promo` / `no_promo` / `pending`, with `outcome_reasons`) and still sends **every** lead; n8n
> routes on the outcome and never re-classifies. The rules: [qualification.md](qualification.md).

The JSON the lead endpoint (`POST /api/lead`, Phase 5) sends to n8n. It is the contract with n8n,
the lead sheet and the Meta integration: **change it only with explicit approval in the PR**
(AGENTS.md), and bump `schema_version` for any change that isn't purely additive.

Source: build brief §9.2, transcribed as is. The only additions are the notes under "Where each
part comes from", which describe the implementation.

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
  "call_preference": null,
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

- `outcome` / `outcome_reasons` (§8) are decided on the site from the rules in
  `src/server/rules/<product>.json` ([qualification.md](qualification.md), ADR 0010). Every lead
  is sent, whatever its outcome. The visitor never sees it.
- `is_test` is true unless `SITE_ENV=production`, or when the visitor arrived with `?test=1`
  (§9.4, ADR 0004).
- `event_id` is shared by the browser `Lead` event and the server-side Meta events, so each lead
  is counted once (§9.3, §10).
- **Meta Conversions API events from n8n** (`Lead` for every lead, `QualifiedLead` for promo)
  are sent **only when `consent.cookies.marketing` is `true`** and `is_test` is `false`
  (brief §9.3), both with the lead's `event_id`.
- Option codes never change once live (AGENTS.md rule 4); labels may.

## Two energy forms

`/vergelijken/energie` (the single-page form, flow `energie_vergelijker`) and
`/vergelijken/energie/stappen` (the step form, flow `energie`) send the same payload. The
single-page form's `answers` can also hold `inverter_kw` (a number with one decimal),
`solar_panel_count`, `injection_day_kwh`, `injection_night_kwh`, `home_battery`,
`contract_type` and `compare_promotions` (docs/FLOWS.md); additive, so `schema_version` stays 1.
`meta.page` says which form it came from.

## Delivery: at least once

The site forwards a lead **at least once**, not exactly once: a crash between n8n's answer and
the site recording it, a status that can't be written, or a very slow n8n make `leads:retry`
send the same payload again. **n8n must deduplicate on `lead_id`** (and newsletter sign-ups on
`signup_id`) before the lead reaches the partner, the lead sheet, Mailchimp or Meta.

A resend from the browser with the same `lead_id` (after a lost response or a 503) is never
forwarded twice: when the lead is already backed up, the endpoint answers the same success
without storing, forwarding or checking Turnstile again (the first token is spent).

## Untrusted fields

**Every string in the payload is visitor-controlled** except `schema_version`, `brand`,
`lead_id`/`event_id` (UUIDs), `is_test`, `submitted_at`, `product`, `outcome`,
`outcome_reasons`, `labels` (the site's own
copy), the option codes in `answers`, `derived` and `meta.site_env`. That includes
`contact.first_name`/`last_name`, `contact.email`, every `tracking.*` value, `meta.page` and
`meta.user_agent`. A value starting with `=`, `+`, `-`, `@`, a tab or a carriage return can
become a live formula in a spreadsheet.

- **The n8n Google Sheets node must write values RAW** ("Let n8n format" / `valueInputOption:
RAW`, not "Let Google Sheets format" / `USER_ENTERED`), or prefix an apostrophe to every
  value that starts with one of those characters. RAW also keeps `+32…` phone numbers as text.
- **The same applies to every CSV or spreadsheet export** of the lead sheet or of n8n data
  (e.g. for the call centre): escape or quote such values before anyone opens the file.
- The site adds defence in depth, but it is not a substitute: names are refused when they start
  with `=` or `@` (`text_invalid`), and tracking values are cleaned (see below). Phone numbers
  and e-mail addresses are validated by their own rules and not changed.

## Where each part comes from

The form sends a **submission** (`buildSubmission` in `src/lib/flow/engine.ts`) with every value
already normalised by the field validators (`src/lib/flow/validators/`); the server re-validates
it against the flow with the same validators, adds what only it can know and forwards the
payload.

On "Verstuur" the browser posts it as JSON to `POST /api/lead` (`sendLead` in
`src/lib/form/submit.ts`, docs/FLOWS.md "Submit"): the submission plus `website` (the honeypot,
`""` for people) and `turnstile_token` (from the contact step's Turnstile widget,
`src/lib/turnstile.ts`; left out when the script could not load, and the server decides). A 503,
502, 504 or network failure is retried once with the same `lead_id` and a fresh token. The
request body's extra keys never reach n8n: the payload below is built by the server.

| Part                                    | Form submission                                                                                                                                                                   | Added or recomputed by the server (Phase 5)                                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`, `lead_id`, `event_id` | yes (`lead_id` is generated once per form session)                                                                                                                                |                                                                                                                                                                                                                      |
| `submitted_at`                          | yes (ignored)                                                                                                                                                                     | set by the server when the lead is received (its own clock, ISO 8601 UTC): a device clock can be days off                                                                                                            |
| `product`, `flow_version`               | yes (plus `flow_id`, to find the flow)                                                                                                                                            | checked against the flow                                                                                                                                                                                             |
| `answers`                               | codes of shown fields with payload `answers`, plus implied answers such as `energy_type`; abandoned answers are cleared first                                                     | re-validated; unknown fields or codes are rejected                                                                                                                                                                   |
| `labels`                                | no                                                                                                                                                                                | from its own copy of the flow (`answerLabels`)                                                                                                                                                                       |
| `derived`                               | `postcode` (the postcode field) and the region/province the form worked out                                                                                                       | recomputed from the postcode                                                                                                                                                                                         |
| `contact`                               | `first_name`, `last_name` (trimmed; never starting with `=` or `@`), `phone_e164` and `phone_display` (the phone normalised by the field validator), `email` (trimmed, lowercase) | re-validated with the same field validators                                                                                                                                                                          |
| `call_preference`                       | `null`: no form asks a call moment since 2026-10-02 (not in Figma); kept for a later `day_slot` field                                                                             |                                                                                                                                                                                                                      |
| `consent`                               | `terms`, `newsletter` and the cookie banner's `cookies` state                                                                                                                     |                                                                                                                                                                                                                      |
| `tracking`                              | every key, `""` when unknown                                                                                                                                                      | cleaned: trimmed, cut to 512 characters, `""` when it starts with `=` or `@` or has a character outside letters, digits, dashes, the space and URL punctuation (no quotes, parentheses, angle brackets, backslashes) |
| `meta`                                  | `page`, and `test` (the visitor arrived with `?test=1`)                                                                                                                           | `user_agent`, `ip`, `site_env`                                                                                                                                                                                       |
| `outcome`, `outcome_reasons`            | no                                                                                                                                                                                | from the answers and `derived` (`qualify` in `src/server/lead/qualify.ts`, rules in `src/server/rules/`)                                                                                                             |
| `brand`, `is_test`                      | no                                                                                                                                                                                | yes                                                                                                                                                                                                                  |

# Newsletter sign-up (`type: "newsletter"`, `schema_version: 1`)

What `POST /api/newsletter` (the footer form, brief §5 and §9.1) sends to n8n, which runs the
Mailchimp double opt-in. It is a **separate payload**, not part of the lead contract above: it
goes to `N8N_NEWSLETTER_WEBHOOK_URL`, or to the lead webhook when that isn't set, and its
`type` tells the two apart (a lead has no `type`). Same `X-VV-Secret` header, same backup and
retry as a lead. Change it only with approval in the PR, like the lead contract.

```json
{
  "type": "newsletter",
  "schema_version": 1,
  "brand": "voordeelvinder",
  "signup_id": "uuid-v4",
  "is_test": false,
  "submitted_at": "2026-10-01T09:30:00.000Z",
  "email": "jan@example.be",
  "consent": { "newsletter": true },
  "meta": { "page": "/", "user_agent": "…", "ip": "…", "site_env": "production" }
}
```

- The footer form (`src/scripts/newsletter-form.ts`) posts
  `{ email, consent: true, website: "", turnstile_token, page, test }`; unknown keys are refused.
  `email` is trimmed and lowercased by the form's own e-mail validator. The token comes from the
  same Turnstile module as the lead form's (`src/lib/turnstile.ts`), loaded when the e-mail
  field gets focus; without one the form shows its `verification_failed` error and sends nothing.
- `signup_id` and `submitted_at` come from the server. There is no client id, so a double
  submit gives two sign-ups; Mailchimp keys on the e-mail address. Delivery is at least once
  here too: deduplicate on `signup_id`. `email`, `meta.page` and `meta.user_agent` are
  visitor-controlled (see "Untrusted fields").
- `is_test` follows the lead rule: true unless `SITE_ENV=production`, or when the visitor
  arrived with `?test=1` (`test: true`).
