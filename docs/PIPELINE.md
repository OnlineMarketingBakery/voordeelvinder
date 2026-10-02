# Lead pipeline (n8n)

What happens to a lead or newsletter sign-up after the site sends it (`docs/PAYLOAD.md`). The site
validates, classifies (ADR 0010), backs up and forwards; **n8n deduplicates, stores and routes**.
Built 2026-10-01/02 from the n8n master-sheet brief, with the deviations listed at the end.

> This repo is public: webhook paths, spreadsheet IDs and secrets are **not** in this file. They
> live in n8n (the workflows), Ploi (staging `.env`) and `~/.config/omb/n8n.env` (Tanjil's
> machine). Never paste them into the repo.

## The rules (shared n8n instance)

- The instance also runs other clients' workflows, including the live PromoCheckers ones. Only
  workflows named `VoordeelVinder - …` belong to this project; never edit, activate or delete
  anything else, and never change an existing credential.
- **Test leads never reach a partner.** Every partner stage is **disabled until Tanjil approves
  it in chat**.
- Tests use fake data only: first name `TEST`, a last name ending in `- niet bellen`, the
  `tanjil+vvtest@` address.

## Workflows

| Workflow                                                    | ID                 | State    | What it does                                                                                      |
| ----------------------------------------------------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `VoordeelVinder - Leads`                                    | `KrEuNcLVmA6u6Og7` | active   | Webhook for leads: validate, dedupe, answer, write the sheet, then (live leads only) the partners |
| `VoordeelVinder - Newsletter`                               | `JFaO1kPzpH9iKmv2` | active   | Webhook for footer sign-ups: validate, dedupe, answer, Nieuwsbrief tab, (live only) Mailchimp     |
| `VoordeelVinder - Error handler`                            | `7XlPIwDbX8VizFVf` | n/a      | Error workflow of the three others: an alert with ids only (the send node is disabled, see below) |
| `VoordeelVinder - Daily check`                              | `3sD5KrTcLr2OHC7r` | inactive | 09:00 Brussels: alerts when `vv_leads` has no live lead in the last 24 h. Activate at launch      |
| `VoordeelVinder - SETUP sheets (one-off)`                   | `U2fdmQgLXz7xBinV` | archived | Created the spreadsheets' tabs, headers and formats once                                          |
| `VoordeelVinder - SETUP columns single-page form (one-off)` | `r4y6DKKI4kSXU5jc` | archived | Inserted the single-page form's 7 columns in both Energie tabs once                               |

n8n data tables (dedupe memory): `vv_leads` (`lead_id`, `received_at`, `is_test`, `product`,
`outcome`) and `vv_signups` (`signup_id`, `received_at`, `is_test`).

Both webhooks use the header-auth credential **VoordeelVinder webhook secret** (`X-VV-Secret`,
the same value as `N8N_WEBHOOK_SECRET` on the site). A wrong or missing secret gets a 403 and
no execution.

## Staging and production use the same workflows (ADR 0011)

Test routing happens **inside** each workflow, on `is_test`:

- The site sets `is_test: true` on every lead unless `SITE_ENV=production` (and on production
  with `?test=1`), in code (`src/server/lead/payload.ts`).
- n8n treats **anything but an explicit `is_test: false`** as a test: it writes to the
  **TEST spreadsheet** and stops at `Test lead: stop here` / `Test sign-up: stop here`, before
  every partner stage.

So staging points at the real `/webhook/<path>` URLs, and production will use the same ones.
Never n8n's `/webhook-test/` URL (it only answers while someone listens in the editor).

## Leads workflow

```
Webhook → Validate & Normalise → Is valid?
  ├─ no  → Respond 400 → Write sheet (Fouten)
  └─ yes → Seen before (vv_leads) → Respond 200 duplicate
         → New lead → Remember lead_id → Respond 200 → Write sheet ─(fails)→ Wait 45 s → Write sheet (retry)
                                                          └→ Is test?
                                                               ├─ test → Test lead: stop here
                                                               └─ live → Prepare partner data → Adversus / Mailchimp / Meta → Check partners
```

- **Validate & Normalise** (Code) refuses: a body that isn't an object, a newsletter payload,
  `schema_version` ≠ 1, `brand` ≠ `voordeelvinder`, a `lead_id` that isn't a UUID, an unknown
  `product`, or an `outcome` that isn't `promo` / `no_promo` / `pending`. It never
  re-classifies: the tab follows the site's outcome.
- **Deduplication:** the site delivers at least once. A `lead_id` already in `vv_leads` gets
  `200 {"ok":true,"duplicate":true}` and nothing else happens.
- **The answer comes before the sheet write** (about 1 s round trip), so a slow Google API never
  makes the site retry. Known risk: if every sheet retry fails after the 200, the lead is marked
  seen but not in the sheet. The execution then fails, the Error handler alerts, and the lead
  is replayed from the execution data or the site's backup (`LEAD_BACKUP_DIR`).
- **Answers:** `200 {"ok":true}`, `200 {"ok":true,"duplicate":true}`, `400 {"ok":false,"error":…}`
  (the site treats 4xx as permanent), 403 for a bad secret.

### The spreadsheets

Two Google spreadsheets in the Drive folder `VoordeelVinder` (owner: OMB Tanjil):
**`VoordeelVinder - Leads`** (live) and **`VoordeelVinder - Leads (TEST)`**. Same tabs in both:

| gid | Tab                  | Gets                                                                                             |
| --- | -------------------- | ------------------------------------------------------------------------------------------------ |
| 0   | `Backup`             | Every valid lead: Ontvangen, Lead ID, Product, Outcome, Test, Site env, Payload (JSON)           |
| 1   | `Energie - Promo`    | `energie` + `promo`                                                                              |
| 2   | `Energie - No promo` | `energie` + `no_promo`                                                                           |
| 3   | `Zonnepanelen`       | every solar panel lead                                                                           |
| 4   | `Thuisbatterij`      | every home battery lead                                                                          |
| 5   | `Nieuwsbrief`        | sign-ups: Datum, Signup ID, E-mail, Consent, Pagina, Test                                        |
| 6   | `Fouten`             | refused payloads and leads without a tab (e.g. `energie` + `pending`): Ontvangen, Reden, Payload |

Product tabs, in order (energy: 69 columns, solar: 58, battery: 57):

- **Lead:** Datum, Lead ID, Event ID, Product, Outcome, Redenen, Flow versie
- **Contact:** Voornaam, Achternaam, Telefoon, Telefoon (weergave), E-mail, Postcode, Regio, Provincie
- **Answers** (labels from the payload, Ja/Nee for booleans): Zakelijk adres, Verbruik
  elektriciteit (zakelijk), Verbruik gas (zakelijk), then per product:
  - energie: Energietype, Leverancier, Metertype, Digitale meter, Zonnepanelen, Sociaal tarief,
    Budgetmeter, Kent verbruik, Elektriciteit (kWh), Gas (kWh), Personen, Woningtype, Warmtepomp,
    Elektrische wagen, then from the single-page form (ADR 0012): Omvormer (kW),
    Aantal zonnepanelen, Injectie dag (kWh), Injectie nacht (kWh), Thuisbatterij, Contracttype,
    Promoties vergelijken (empty for the step form)
  - zonnepanelen: Eigenaar/huurder, Daktype, Dakrichting, Kent verbruik, Elektriciteit (kWh),
    Personen, Woningtype, Warmtepomp, Elektrische wagen, Interesse thuisbatterij
  - thuisbatterij: Zonnepanelen, Aantal panelen, Digitale meter, Kent verbruik, Elektriciteit
    (kWh), Personen, Woningtype, Warmtepomp, Elektrische wagen
- **Call:** Beldag, Beltijdslot, Belmoment (the next matching slot, ISO with the Brussels offset)
- **Consent:** Voorwaarden, Nieuwsbrief, Cookies analytics, Cookies marketing
- **Attribution:** Entry path, Landing page, Referrer, utm_source … utm_term, fbclid, fbc, fbp,
  gclid, gbraid, wbraid, msclkid, ttclid, GA client ID, GA session ID
- **Technical:** Pagina, IP, User agent, Site env, Schema versie

Column → answer id mapping: the `FIELD` map in Validate & Normalise (e.g. `Leverancier` →
`supplier`). Adding a question means adding a column to both spreadsheets **and** to that map.

**How rows are written:** one `spreadsheets.batchUpdate` with `appendCells` per lead (Backup row
plus product-tab row), with typed cells. Visitor text is always a literal string and never
becomes a formula (PAYLOAD.md "Untrusted fields"), so `+32…` stays text. kWh are numbers. Dates
are real date values in Brussels time. Spreadsheet locale nl_NL, time zone Europe/Brussels.

## Newsletter workflow

`Webhook → Validate → Is valid? → Seen before / New sign-up (vv_signups) → Remember → Respond 200
→ Write sheet (Nieuwsbrief, with the same 45 s retry) → Is test? → stop | Mailchimp double opt-in`.
It refuses anything that isn't `type: "newsletter"`, `schema_version` 1, our brand, a UUID
`signup_id`, a valid e-mail and `consent.newsletter: true`. A refused sign-up's Fouten row holds
the reason and the `signup_id` only (no e-mail address).

## Partner stages (all disabled)

Live leads only, after `Prepare partner data` (Code), which builds what each partner gets.
A failing partner doesn't stop the others: its error output is noted, and `Check partners`
(the last node) fails the execution so the Error handler alerts, with the lead_id only.

| Stage                                           | Which live leads                                                                                      | To enable                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Adversus: send lead`                           | `energie` + `promo`                                                                                   | Adversus endpoint (replace `NEEDS-ADVERSUS-ENDPOINT`), their field mapping (`adversus.body` is a proposal; `voorkeursmoment` = Belmoment), credential **Adversus Journeys**                                                                                                                |
| `Mailchimp: add to journey`                     | every live lead with an e-mail: `transactional`, or `pending` (double opt-in) with newsletter consent | VoordeelVinder's own Mailchimp account and credential, the data centre and audience ID (replace `NEEDS_DC`, `NEEDS_AUDIENCE_ID`), merge fields FNAME, PRODUCT, PRODUCT_CODE, OUTCOME, BELMOMENT (templates: `docs/email-templates/`). TO CONFIRM: journey mails without newsletter consent |
| `Meta CAPI: Lead / QualifiedLead`               | only with `consent.cookies.marketing: true`                                                           | Pixel ID (replace `NEEDS_PIXEL_ID`) and a CAPI access token in a credential (not in the URL). `Lead` for every lead, `QualifiedLead` for promo, with the site's `event_id`; `Hash user data` SHA-256 hashes e-mail, phone, names, postcode, country, external_id                           |
| Newsletter `Mailchimp: double opt-in`           | live sign-ups                                                                                         | Same Mailchimp account; audience ID (replace `NEEDS_AUDIENCE_ID`)                                                                                                                                                                                                                          |
| Error handler / Daily check `Send alert e-mail` | n/a                                                                                                   | A mail credential (Gmail or SMTP) Tanjil chooses                                                                                                                                                                                                                                           |

**Enabling a stage:**

1. Get Tanjil's OK in chat.
2. Fill in the placeholders and bind the credential.
3. Enable the node.
4. Test with one `is_test: false` lead using pinned data, or one agreed real lead.
5. Note the execution ID in the change log below.

## Testing

- Direct POSTs to the webhook with the secret, test data only. Check each execution:
  ```bash
  set -a; . ~/.config/omb/n8n.env; set +a
  curl -s "$N8N_BASE_URL/api/v1/executions?workflowId=KrEuNcLVmA6u6Og7&limit=5" -H "X-N8N-API-KEY: $N8N_API_KEY"
  ```
- **Partner routing** for live leads: run the workflow with pinned data (Webhook, the data-table
  nodes, the sheet and partner HTTP nodes pinned), so nothing is written or sent.
- **Staging:** a form submission on staging must arrive with `is_test: true`, land in the TEST
  spreadsheet and stop before the partners.

## Change log

| Date       | Change                                                                                                              | Executions           |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 2026-10-01 | Spreadsheets (LIVE, TEST) set up; Leads workflow with test routing; tests 1–9 by direct POSTs                       | 22807–22816          |
| 2026-10-01 | Staging env set (`N8N_LEAD_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`); test 10: one staging lead per path, TEST only       | 22818–22821          |
| 2026-10-02 | Newsletter, Error handler, Daily check; staging `N8N_NEWSLETTER_WEBHOOK_URL`; Leads' error workflow set             | 22835–22843          |
| 2026-10-02 | Partner stages added to Leads, all disabled; routing tested with pinned data; a real test lead still stops          | 22846–22850          |
| 2026-10-02 | Energie tabs (TEST and LIVE): 7 columns for the single-page form after Elektrische wagen; `FIELD`/`COLUMNS` updated | 22853 (setup), 22854 |

## Deviations from the brief

- **Spreadsheet locale nl_NL**, not nl_BE (Google Sheets refuses nl_BE). Dates and numbers look
  the same.
- **appendCells over HTTP instead of the Google Sheets node:** the node reads the header row on
  every append, which hit the per-minute quota the instance shares with PromoCheckers (429s). The
  typed cells also make the formula protection exact.
- **No Switch node:** the tab (or Fouten) is chosen in Validate & Normalise.
- **A `Signup ID` column** in Nieuwsbrief (dedupe and support).
- **The outcome comes from the site** (ADR 0010); n8n only routes.
- **One workflow for staging and production**, routed on `is_test` (ADR 0011), instead of a
  separate staging test workflow.
- **No webhook paths or spreadsheet IDs in this file**, because the repo is public.
