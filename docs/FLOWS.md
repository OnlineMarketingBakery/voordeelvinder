# Form flows

The questions of the three forms, as built from brief §7.3 (energy, final) and §7.4 (solar
panels and home battery, **DRAFT**). The source of truth is the content in
`src/content/flows/nl/`; this page lists the codes, which are the data contract with n8n, the
lead sheet and the Meta forms (AGENTS.md rule 4: never change a code once live). Decisions:
[ADR 0007](decisions/0007-form-flow-content.md).

## Files

| File                    | Holds                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nl/_shared.json`       | `switches` (`{ "gas": true }`) and the shared steps: `product`, `postcode`, `knows_consumption`, `household`, `appliances`, `contact`                                         |
| `nl/energie.json`       | The energy flow (brief §7.3)                                                                                                                                                  |
| `nl/zonnepanelen.json`  | The solar panel flow (§7.4 DRAFT, outcome `pending`)                                                                                                                          |
| `nl/thuisbatterij.json` | The home battery flow (§7.4 DRAFT, outcome `pending`)                                                                                                                         |
| `nl/_copy.json`         | The form's interface copy: buttons, progress, yes/no labels, error messages, e-mail suggestion, `phonePrefix`, the side `panel` per product and the form pages' SEO (`pages`) |

## How the form island reads them

1. At build time the page loads the flow (`flows` collection, e.g. `nl/energie`), the shared
   steps (`flowSteps`) and the copy (`flowCopy`), and calls `resolveFlow(file, shared)`
   (`src/lib/flow/resolve.ts`). That applies the switches. The island gets the resolved flow and
   the copy as props and never reads the switches itself.
2. `derived.preselected` is always a boolean: `true` on `/vergelijken/<product>` and landing
   variants, `false` when the visitor chose on step 1. It is set once, when the form mounts.
3. `?energie=<electricity|gas|both>` becomes the initial answer `energy_type`. Run the initial
   answers through `clearAbandoned(flow, answers, derived)`: an unknown value, or `gas`/`both`
   while the gas switch is off, is dropped. `derived.energy_preselected` is `true` only when a
   valid `energy_type` survives that; it is also set once, when the form mounts, and never
   changes during the session. Drop a stored `energy_choice` when a new `?energie=` arrives.
4. Store only the visitor's own answers (`product_choice`, `energy_choice`, …). The engine
   derives the implied `energy_type` from the visible chosen card (`sets`), so don't write it
   next to the choice. A card whose `product` differs from the flow's switches to that
   product's flow.
5. A field without `label` is labelled by the step title (only a step's first field omits it).
   Steps with two questions use the first question as the title and the second as its field's
   label, so gas-only visitors never see a title about a hidden question.
6. `yes_no` cards use `copy.yesNo` unless the field has `labels`. Error messages:
   `copy.requiredByType[field.type]` for `required` when given, else `copy.errors[code]`, with
   `{min}`, `{max}`, `{unit}` and `{maxLength}` filled in from the field. The e-mail suggestion is
   `copy.emailSuggestion` with `{suggestion}`. Progress is `copy.progress` with `{step}` and
   `{total}` from `progress()`.
7. A `consent` field's `links` turn the first occurrence of each `text` in the label into a link
   to `href`.

## The form island (src/components/form)

`/vergelijken` (`entry: "vergelijken"`, all three flows, starts in the energy flow's `product`
step) and `/vergelijken/<product>` (`entry: "<product>"`, that flow only, `preselected`) render
`Form.astro`, which loads the content (`src/lib/form-content.ts`), resolves the icons (masks from
`src/assets/icons`), the panel mascot (AVIF/WebP) and the +32 flag, and renders `FormIsland`
with `client:load`. The pages are prerendered and indexable (brief §11: only the thank-you pages
and `/l/*` are `noindex`).

- **First render = server render.** `serverStart()` (`src/lib/form/initial.ts`) uses only the
  page: no query, no storage. Right after mounting, `restoreStart()` runs once: it fixes
  `preselected` / `energy_preselected`, applies `?energie=` and restores the stored session.
  With `?energie=` or a stored session the step can change right after hydration.
- **Flow switching:** on `/vergelijken`, choosing a card whose `product` differs switches to that
  product's flow at once (its progress, its next steps). The answers object is shared; each
  flow's `clearAbandoned` drops what doesn't belong to it.
- **Storage:** `sessionStorage["voordeelvinder:form:<entry>"]` =
  `{ version: 1, product, flowVersion, step, answers, leadId, eventId }`
  (`src/lib/form/storage.ts`). `answers` are the visitor's own answers after `clearAbandoned`,
  without implied answers. A record of another `version` or `flowVersion` is ignored. `leadId`
  and `eventId` are made once per form session (`crypto.randomUUID`) and kept until the submit,
  which clears the record.
- **Validation:** text-like fields validate on blur once something is typed; "Volgende" runs
  `validateStep`, shows every error under its field (`aria-describedby`), focuses the first and
  scrolls it into view. A valid step focuses the next step's title (h2) and announces "title.
  Stap X van Y" in an `aria-live` region.
- **Submit (Phase 4):** "Verstuur" validates, builds the submission (`buildSubmission`), locks
  the button, clears the session and goes to `/bedankt/<product>`. Nothing is sent
  (`sendLead` in `src/lib/form/submit.ts` is a stub until Phase 5) and nothing is logged.
- **"Terug"** keeps the answers; on the first shown step it goes to the product page (`/` for
  energy) when preselected, else back in history (same site) or to `/`.

## Preselect without an energy type

`/vergelijken/energie` without `?energie=` still asks the energy type: the energy flow's own
step `energy_choice` ("Wat wil je vergelijken?" with only the three energy cards) is shown when
`derived.preselected` is true and `derived.energy_preselected` is false. Both flags are fixed for
the session, so the step stays on the path once answered: "Terug" and "Stap X van Y" work as on
step 1. With a valid `?energie=` it is skipped, as the brief says.

| Arrival                                 | First step      | "Ja" path | "Nee" path |
| --------------------------------------- | --------------- | --------- | ---------- |
| Home page, step 1                       | `product`       | 9         | 10         |
| `/vergelijken/energie`                  | `energy_choice` | 9         | 10         |
| `/vergelijken/energie?energie=both`     | `postcode`      | 8         | 9          |
| Gas only (any arrival): no `meter_type` |                 | −1        | −1         |

## The gas switch

`_shared.json` `"switches": { "gas": true }`. The Gas and Elektriciteit + gas cards (on
`product` and `energy_choice`) have `"requires": "gas"`; with `false` they are left out when the
flow is resolved, so no visitor can get `energy_type` gas or both and the gas questions never
show. validate:flows checks the flows with every switch on (conditions may name gas codes) and
checks that the switches as set leave every choice answerable. With gas off, `/vergelijken/energie`
without `?energie=` shows a single "Elektriciteit" card.

## Codes

`answers` keys are field ids. `product_choice` and `energy_choice` are not sent
(`payload: none`); the chosen card's `energy_type` is.

### Shared steps

| Field                                       | Type          | Codes                                                                                 |
| ------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| `product_choice`                            | single choice | `electricity`, `gas`, `both` (→ `energy_type`), `zonnepanelen`, `thuisbatterij`       |
| `postcode`                                  | postcode      | sent as `derived.postcode`                                                            |
| `is_business`                               | checkbox      | `true` / `false`                                                                      |
| `business_electricity_band`                 | single choice | `under_100k`, `over_100k` (energy only: `is_business` and electricity or both)        |
| `business_gas_band`                         | single choice | `under_100k`, `over_100k` (energy only: `is_business` and gas or both)                |
| `knows_consumption`                         | yes/no        | `yes`, `no`                                                                           |
| `household_size`                            | select        | `1`, `2`, `3`, `4`, `5_plus`                                                          |
| `home_type`                                 | select        | `apartment`, `terraced`, `semi_detached`, `detached`                                  |
| `heat_pump`, `electric_car`                 | yes/no        | `yes`, `no`                                                                           |
| `first_name`, `last_name`, `phone`, `email` | contact       | `contact.first_name`, `last_name`, `phone_e164`, `phone_display`, `email`             |
| `call_moment`                               | day + slot    | days `mon`…`fri`, slots `09-10`, `10-11`, `11-12`, `12-13`, `13-14`, `14-15`, `15-16` |
| `terms`, `newsletter`                       | consent       | `consent.terms`, `consent.newsletter`                                                 |

### Energy (brief §7.3)

| Field                        | Type          | Codes                                                                                                                                                          |
| ---------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `energy_choice`              | single choice | `electricity`, `gas`, `both` (→ `energy_type`; only after a preselect without `?energie=`)                                                                     |
| `supplier`                   | select        | `engie`, `luminus`, `totalenergies`, `mega`, `eneco`, `octa-plus`, `bolt`, `ecopower`, `elegant`, `energie-be`, `dats-24`, `frank-energie`, `other`, `unknown` |
| `meter_type`                 | single choice | `single`, `dual`, `single_excl_night`, `dual_excl_night` (electricity or both)                                                                                 |
| `digital_meter`, `has_solar` | yes/no        | `yes`, `no` (`has_solar`: electricity or both)                                                                                                                 |
| `social_tariff`              | yes/no        | `yes`, `no`                                                                                                                                                    |
| `budget_meter`               | single choice | `yes`, `no`, `unknown`                                                                                                                                         |
| `electricity_kwh`, `gas_kwh` | number        | integers 100–100 000 and 100–150 000                                                                                                                           |

The brief says "codes = slugs" for suppliers: brand names are slugged (`Octa+` → `octa-plus`,
`Energie.be` → `energie-be`, `DATS 24` → `dats-24`); "Andere" and "Weet ik niet" use `other`
and `unknown`, like `budget_meter`.

### Solar panels (§7.4 DRAFT, codes proposed)

| Field              | Type          | Codes                                                                                                   |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------- |
| `ownership`        | single choice | `owner` Eigenaar, `tenant` Huurder                                                                      |
| `roof_type`        | single choice | `pitched` Hellend dak, `flat` Plat dak, `unknown` Weet ik niet                                          |
| `roof_orientation` | single choice | `south` Zuid, `east_west` Oost-West, `east_or_west` Oost of West, `north` Noord, `unknown` Weet ik niet |
| `electricity_kwh`  | number        | 100–100 000 (electricity only)                                                                          |
| `battery_interest` | single choice | `yes` Ja, `no` Nee, `maybe_later` Misschien later                                                       |

### Home battery (§7.4 DRAFT, codes proposed)

| Field             | Type          | Codes                                                                                                        |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `has_solar`       | single choice | `yes` Ja, `no` Nee, nog niet, `planned` Gepland                                                              |
| `solar_size`      | single choice | `under_10` Minder dan 10, `10_to_20` 10–20, `over_20` Meer dan 20, `unknown` Weet ik niet (only after `yes`) |
| `digital_meter`   | yes/no        | `yes`, `no`                                                                                                  |
| `electricity_kwh` | number        | 100–100 000                                                                                                  |

Both also use the shared `knows_consumption` → `household` + `appliances` branch.

## Proposed copy (CONTENT-TODO 2.23)

Not in the brief or the design, written for the form (informal, neutral, no claims):

- Error messages (`_copy.json` `errors`): required "Vul dit veld in."; invalid_type "Er ging iets
  mis met dit antwoord. Probeer het opnieuw."; postcode_invalid "Geef een geldige postcode van 4
  cijfers in, bijvoorbeeld 9000."; email_invalid "Geef een geldig e-mailadres in.";
  number_invalid "Geef alleen cijfers in, bijvoorbeeld 3500."; number_not_integer "Geef een
  geheel getal in, zonder komma."; number_too_low "Geef minstens {min} {unit} in.";
  number_too_high "Geef hoogstens {max} {unit} in."; text_too_long "Gebruik hoogstens
  {maxLength} tekens."; text_invalid "Dit veld bevat tekens die niet zijn toegestaan.";
  option_unknown "Kies een van de mogelijkheden."; day_required "Kies een dag.";
  slot_required "Kies een tijdstip."; day_unknown "Kies een van de dagen."; slot_unknown "Kies
  een van de tijdstippen.". phone_invalid and phone_landline are the brief's sentence (§7.5).
- Required per field type (`requiredByType`): cards and yes/no "Kies een antwoord."; select
  "Kies een antwoord uit de lijst."; consent "Vink dit vakje aan om verder te gaan."; call moment
  "Kies een dag en een tijdstip.".
- E-mail suggestion: "Bedoel je {suggestion}?".
- Call moment: slot labels "09:00–10:00" … "15:00–16:00"; group labels "Dag" and "Tijdstip".
- Household sizes (CONTENT-TODO 2.5): "1 persoon", "2 personen", "3 personen", "4 personen",
  "5 of meer".

Form pages and panel (CONTENT-TODO 2.4, 2.27): page titles "Wat wil je vergelijken?"
(`/vergelijken`), "Vergelijk je energiecontract", "Vergelijk zonnepanelen", "Vergelijk
thuisbatterijen"; every description is the panel body from the design. The solar and battery
panels reuse the energy title and body (`"todo": "2.4"`) with the laptop fox without the energy
bubbles. `phonePrefix` "+32" (Figma 91:11434).

From the design with the brief's §6 "u → je" correction: placeholders "Voer je postcode in",
"Selecteer je huidige leverancier", "Vul hier je voornaam in", "Vul hier je achternaam in";
as designed: "Selecteer het aantal personen", "Selecteer woningtype", "478 12 34 56",
"example@email.com".
