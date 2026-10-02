# Form flows

The questions of the three forms, as built from brief §7.3 (energy, final) and §7.4 (solar
panels and home battery, **DRAFT**). The source of truth is the content in
`src/content/flows/nl/`; this page lists the codes, which are the data contract with n8n, the
lead sheet and the Meta forms (AGENTS.md rule 4: never change a code once live). Decisions:
[ADR 0007](decisions/0007-form-flow-content.md).

## Files

| File                    | Holds                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nl/_shared.json`       | `switches` (`{ "gas": true }`) and the shared steps: `product`, `postcode`, `knows_consumption`, `household`, `appliances`, `contact`                                                                                                                                      |
| `nl/energie.json`       | The energy flow (brief §7.3)                                                                                                                                                                                                                                               |
| `nl/zonnepanelen.json`  | The solar panel flow (§7.4 DRAFT; `pending`, ADR 0010)                                                                                                                                                                                                                     |
| `nl/thuisbatterij.json` | The home battery flow (§7.4 DRAFT; `pending`, ADR 0010)                                                                                                                                                                                                                    |
| `nl/_copy.json`         | The form's interface copy: buttons, reset + undo (`reset`), progress + step labels (`progressJump`), yes/no labels, error messages, e-mail suggestion, send errors (`submitErrors`), `phonePrefix`, `panel` per product, SEO (`pages`); `settings.autoAdvance` (MOTION.md) |

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
   `{total}` from `progress()`. On the steps bar (docs/MOTION.md), each finished step is a button
   back to it named `copy.progressJump` with `{step}` (its number) and `{title}` (its title), from
   `pathSoFar()`.
7. A `consent` field's `links` turn the first occurrence of each `text` in the label into a link
   to `href`.

## The form island (src/components/form)

`/vergelijken` (`entry: "vergelijken"`, all three flows, starts in the energy flow's `product`
step) and `/vergelijken/<product>` (`entry: "<product>"`, that flow only, `preselected`) render
`Form.astro`, which loads the content (`src/lib/form-content.ts`), resolves the icons (masks from
`src/assets/icons`), the panel mascot (AVIF/WebP) and the +32 flag, and renders `FormIsland`
with `client:load`. Both are indexable (brief §11: only the thank-you pages and `/l/*` are
`noindex`).

- **Rendering.** `/vergelijken` is prerendered. `/vergelijken/<product>` renders on demand
  (`prerender = false`) so the server knows `?energie=`; an unknown product is a 404, the
  canonical is `/vergelijken/<product>/` with or without the slash, and `astro.config.ts` lists
  the three pages in the sitemap (`customPages`: the sitemap integration only sees prerendered
  pages). Their images come from the image endpoint (`/_image`), resized on the first request
  and then kept in memory (`cache` + `routeRules` in `astro.config.ts`); the prune integration
  keeps the originals of the images the prerendered pages use, which covers the form pages
  (e2e: "every image on an on-demand form page loads").
- **First render = server render.** `Form.astro` works out the URL preselect
  (`urlPreselects`, so an unknown value or gas with the switch off is dropped) and passes only
  that to the island, never the rest of the query. `serverStart()` (`src/lib/form/initial.ts`)
  renders the first step from the page and that preselect: `/vergelijken/energie?energie=both`
  starts on the postcode, "Stap 1 van 9", in the HTML. `startFlags()` sets
  `energy_preselected` the same way on the server and after hydration. Right after mounting,
  `restoreStart()` runs once with the same preselect and the stored session. Without a stored
  session nothing changes after hydration; with one the step can.
- **Before hydration** the form is inert: "Volgende" has the real `disabled` attribute until
  the session is restored (so Enter in a field doesn't submit either), and an inline script in
  `Form.astro` cancels every native `submit` of the form (capture phase; the island's own handler
  still runs). Nothing typed before hydration ends up in the URL, and the landing query
  (`?energie=`, `utm_*`, click ids, `?test=1`) stays.
- **Flow switching:** on `/vergelijken`, choosing a card whose `product` differs switches to that
  product's flow at once (its progress, its next steps). The answers object is shared; each
  flow's `clearAbandoned` drops what doesn't belong to it.
- **Storage:** `sessionStorage["voordeelvinder:form:<entry>"]` =
  `{ version: 2, product, flow, step, answers, leadId, eventId }`
  (`src/lib/form/storage.ts`). `answers` are the visitor's own answers after `clearAbandoned`,
  without implied answers. `flow` is `flowFingerprint()`: the flow's version plus the switches
  that are on and take options away in it (`"v1+gas"`). A record of another `version` or `flow`
  is ignored, so turning gas off drops the sessions stored with gas on.
- **Restore:** back to the stored step when it is on the visitor's path (else the first open
  step), but never past a step whose stored answers don't validate: the visitor resumes at the
  first such step (`firstInvalidStep`). That catches content tightened without a version bump.
- **Lead ids:** `leadId` and `eventId` are made once per form session (`crypto.randomUUID`) and
  kept until the submit. A step-1 card that switches the flow (on `/vergelijken`) makes new
  ones: a new product is a new lead. So does "Opnieuw beginnen" (its undo brings the old ones
  back). A successful submit clears every form page's record (every `voordeelvinder:form:` key),
  not only its own.
- **Duplicated tabs (known limitation):** browsers copy `sessionStorage` into a duplicated tab,
  so the copy continues with the same `leadId`/`eventId`. When both tabs submit the same
  product, the second lead looks like a double submit to `/api/lead` (idempotent on `lead_id`)
  and Meta dedupes the two events. Switching product in one tab avoids it (new ids);
  telling the tabs apart would need a per-tab token and a BroadcastChannel check.
- **Validation:** text-like fields validate on blur once something is typed; "Volgende" runs
  `validateStep`, shows every error under its field (`aria-describedby`; for cards and chips on
  the group and on each radio, since focus lands on a radio), focuses the first, scrolls it into
  view and announces its message in the `aria-live` region (again on a repeat: `liveText`). A
  valid step focuses the next step's title (h2) and announces "title. Stap X van Y" there.
- **Double click:** a "Volgende" within `STEP_GUARD_MS` (350 ms) of the last step change
  (forward, or back: "Terug", a jump, a reset, an undo), with nothing answered in between, is
  ignored (`isRepeatSubmit`): a double click or double tap moves one step, and never validates or
  submits the next step unseen (nor the fresh one, where "Volgende" takes the reset button's
  place). A card picked within 500 ms of a step change other than "Volgende" is selected but
  never moves the form on (`withinAutoAdvanceGuard`): the second half landed on the new step.
- **Submit:** "Verstuur" validates, builds the submission (`buildSubmission`), locks the button
  and the answers (text inputs read-only, keeping focus; every change is ignored until a failure
  unlocks them, so nothing typed during the send is lost without a word) and posts it to
  `POST /api/lead` (`sendLead` in `src/lib/form/submit.ts`): JSON, the
  submission plus `website` (the honeypot, a hidden text input on the last step, not a flow
  field) and `turnstile_token`; 15 s timeout per attempt; one automatic retry after 1.5 s on a
  503 (or 502/504) or a network failure, with the same `lead_id` and a new Turnstile token (a
  token is good for one check). On `{ ok: true, redirect }` it clears every form session, saves
  `voordeelvinder:lead-safe` = `{ event_id, product }` (brief §9.1 step 9; not after a filled
  honeypot, whose OK is pretend: `honeypotFilled`, the server's own test) and the morph marker,
  and goes to the redirect (`/bedankt/<product>`: same copy for every product, noindex, nothing
  personal on it). The thank-you page celebrates only with that flag for its product and removes
  it (`src/scripts/celebrate.ts`), so a direct visit or a reload doesn't; Phase 6 pushes
  `generate_lead` from the same read. On a failure the button unlocks, the answers stay, and
  `_copy.json` `submitErrors[kind]` shows above the buttons and in the `aria-live` region:
  `invalid` (400/413/415, also a flow changed by a deploy: with a "Pagina vernieuwen" button),
  `turnstile` (403), `rate_limit` (429), `unavailable` (503 after the retry, other server
  errors), `network`. Nothing is logged but the kind. When the submission can't be built (an
  answer on the path no longer validates), the form goes to the first invalid step and shows its
  errors.
- **Turnstile** (`src/lib/turnstile.ts`, shared with the footer newsletter;
  `src/components/form/useTurnstile.ts`): the script (`challenges.cloudflare.com`, explicit
  rendering) loads the first time the last step shows, never on page load; the widget
  (`appearance: interaction-only`, action `lead`) renders above the buttons with
  `PUBLIC_TURNSTILE_SITE_KEY`, else (never on production: the build fails) Cloudflare's test key.
  Each token is taken once, so a retry or a second "Verstuur" gets a fresh one. "Verstuur" waits
  up to 15 s for the widget's first token (the script's 10 s plus the challenge), 5 s for later
  ones. A widget whose script failed to load or took too long renders again, with a new load, on
  the next "Verstuur" (`createRecoveringTurnstileWidget`; a script still loading is waited for
  again, never loaded twice). Without the script (blocked, offline) the lead is sent without a
  token and the server decides.
- **Test mode** (brief §9.4, `src/lib/test-mode.ts`): an inline script in `Base.astro` stores
  `voordeelvinder:test` = `1` in sessionStorage on `?test=1` (removes it on `?test=0`) and shows
  the "TESTMODUS" badge (`site.json` `testMode.badge`) on every page while it is set; the
  submission's `meta.test` is the URL's `?test=` or else that flag.
- **Motion (PR 17, docs/MOTION.md):** step slides, answer-card feedback, revealed questions,
  progress, error shake and the submit spinner; only visual, nothing waits for it. **Auto-advance**
  (`settings.autoAdvance`, on; Tanjil 2026-09-30): a tap or click on a card acts as "Volgende"
  after 300 ms when every visible field of the step is a single-choice or yes/no question and the
  tap leaves them all answered: a one-question step moves on at the first tap, a step with two
  (digital meter + solar, social tariff + budget meter, roof type + orientation, heat pump +
  electric car) once both are answered; back on a complete step, only a new answer to its last
  question moves on (the first can change without leaving the step). A step with any
  other field (postcode, checkbox, select, number, contact) keeps "Volgende". Never on keyboard
  input, never on the last step and never before the session is restored
  (`src/lib/form/navigation.ts` `pickOutcome`, `shouldAutoAdvance`). The double-click guard
  covers it too: an auto-advance and a "Volgende" within `STEP_GUARD_MS` of each other move one
  step, not two. On a phone (below `md`) a tap that leaves a question of the step open scrolls
  that question into view (smoothly, at once with reduced motion); focus stays where it is. A
  tap within 500 ms of that scroll only selects the card that moved under the finger.
- **"Terug"** keeps the answers; on the first shown step it goes to the product page (`/` for
  energy) when preselected, else back in history (same site) or to `/`.
- **Going back from the progress bar:** the steps before the current one on the visitor's path
  (`pathSoFar`) are buttons named "Ga terug naar stap {step}: {title}" (`progressJump`).
  `onJump` goes back to one as if "Terug" was pressed until it showed: answers kept, the step
  slides in from the left, its title takes focus and is announced. Never forward (not even to an
  answered step after going back) and never while sending (`canJumpBack`).
- **"Opnieuw beginnen"** (`src/lib/form/reset.ts`): a round button beside "Terug", shown when
  there is something to reset (a step past the first, or an answer of the visitor's own on it;
  the URL preselect doesn't count). It empties the form at once, without asking: back to the
  entry's first step with the URL preselect (`freshStart`: the server render's start), errors
  cleared, the stored session removed, new `leadId`/`eventId`; the title takes focus and
  "Formulier gewist" is announced. "Ongedaan maken" puts back exactly what was taken (step,
  answers, flow, ids; the session is stored again) for 8 s (`UNDO_MS`), paused while the pointer
  is on it or focus is in it. The message sits above the buttons from `md`; on a phone it is a
  bar at the bottom of the screen, since the reset takes the page up to the first step and a long
  one (the product cards) would push it out of view. Not while sending.

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

### Energy, single page (`energie_vergelijker.json`, Figma 193:2095)

The main energy form on `/vergelijken/energie` since 2026-10-02 (ADR 0012); the step-by-step
`energie` flow stays at `/vergelijken/energie/stappen`. Same product (`energie`), same codes for
every question both ask, sections A to E as steps rendered on one page (`FormPageIsland.tsx`).
The server tells the two apart by `flow_id`.

- **Same fields as `energie`:** `supplier`, `meter_type`, `digital_meter`, `has_solar`,
  `knows_consumption`, `electricity_kwh`, `gas_kwh`,
  `household_size`, `home_type` (same codes; `home_type` and `household_size` are radio rows
  here), `heat_pump`, `electric_car`, the postcode and business fields, contact and call moment.
- **Not asked (as in Figma):** `social_tariff` and `budget_meter` (Tanjil 2026-10-02: removed until
  the client decides), so their no-promo reasons never apply to this form (docs/qualification.md).
- **`energy_type`** is the field itself here (`both`, `electricity`, `gas`), not implied by
  `energy_choice`; `?energie=` preselects it.
- **Checkbox-style yes/no** (`display: "checkbox"`): `digital_meter`, `heat_pump`,
  `electric_car`, `home_battery`. Unticked is `no`, so the payload is the same as the cards'.

New fields (only in this flow):

| Field                 | Type          | Codes / values                                                                                             |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `inverter_kw`         | number        | 0.5–100, one decimal ("3,5"); solar panel owners                                                           |
| `solar_panel_count`   | number        | 1–200, optional; solar panel owners                                                                        |
| `injection_day_kwh`   | number        | 0–100 000; solar + digital meter                                                                           |
| `injection_night_kwh` | number        | 0–100 000; solar + digital meter + a dual meter (`dual`, `dual_excl_night`)                                |
| `home_battery`        | yes/no        | `yes`, `no` (checkbox, "Ik heb een … Thuisbatterij")                                                       |
| `contract_type`       | single choice | `fixed` Vast tarief, `variable` Variabel tarief, `dynamic` Dynamisch tarief, `all` Alle soorten (optional) |
| `compare_promotions`  | yes/no        | `yes`, `no` (optional)                                                                                     |

Schema additions for this layout (ignored by the step form): a step's `panels` (tinted boxes with
an optional note), a field's `panel` and `rowLabel`, a number's `decimals`, a yes/no's `display`.

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
- Send errors (`submitErrors`, CONTENT-TODO 2.29): network "Het versturen lukte niet. Controleer
  je internetverbinding en probeer het opnieuw."; unavailable "Het versturen lukte niet. Probeer
  het over een paar minuten opnieuw."; turnstile "We konden niet bevestigen dat je geen robot
  bent. Probeer het opnieuw."; rate_limit "Je hebt al een paar keer verstuurd. Probeer het over
  een uur opnieuw."; invalid "Er ging iets mis met je gegevens. Vernieuw de pagina en probeer het
  opnieuw."; reload button "Pagina vernieuwen".
- Call moment: slot labels "09:00–10:00" … "15:00–16:00"; group labels "Dag" and "Tijdstip".
- Household sizes (CONTENT-TODO 2.5): "1 persoon", "2 personen", "3 personen", "4 personen",
  "5 of meer".
- Reset and progress bar (`reset`, `progressJump`, CONTENT-TODO 2.31): the reset button's name
  and tooltip "Opnieuw beginnen"; after it, "Formulier gewist" with the button "Ongedaan maken";
  a completed step on the progress bar "Ga terug naar stap {step}: {title}".

Form pages and panel (CONTENT-TODO 2.4, 2.27): page titles "Wat wil je vergelijken?"
(`/vergelijken`), "Vergelijk je energiecontract", "Vergelijk zonnepanelen", "Vergelijk
thuisbatterijen"; every description is the panel body from the design. The solar and battery
panels reuse the energy title and body (`"todo": "2.4"`) with the laptop fox without the energy
bubbles. `phonePrefix` "+32" (Figma 91:11434).

From the design with the brief's §6 "u → je" correction: placeholders "Voer je postcode in",
"Selecteer je huidige leverancier", "Vul hier je voornaam in", "Vul hier je achternaam in";
as designed: "Selecteer het aantal personen", "Selecteer woningtype", "478 12 34 56",
"example@email.com".
