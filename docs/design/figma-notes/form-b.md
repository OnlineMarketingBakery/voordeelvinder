# Slice form-b: form steps 7A / 7B-1 / 7B-2 / 8 and Thank you (Phase 0, read-only)

File key `8bhHL5kRbwYzYPbH6Vgdjn`, Page 1. All frames 1440x1652 desktop.
Sources: page1.xml metadata, get_design_context on 90:10462, 91:10958, 91:12392, 91:13857;
get_screenshot on 91:11921, 91:13376, 91:14645, 91:11448 (PNGs in `figma/shots/formb_*`).
Copy is quoted exactly as drawn, typos included.

## 0. Canvas layout, labels and connectors

Two rows. Top row y=0 is the YES branch. Bottom row y=2107 is the NO branch.

| Row | Frame (node) | canvas x |
|---|---|---|
| top | Step - 6 `90:9473` | 28542 |
| top | Step - 7- If user select yes `90:10462` (7A) | 31637 |
| top | Step 8 `91:10958` | 34210 |
| top | Thank you page `91:13857` | 36783 |
| bottom | Step - 7 - if user selct No `91:11921` (7B-1) | 31637 |
| bottom | Step - 7 -slide 2 `91:12392` (7B-2) | 34210 |
| bottom | Step 8 `91:13376` (second copy) | 36783 |
| bottom | Thank you page `91:14645` (second copy) | 39356 |

- Text "If Yes" `90:10458` (30668, 687) sits above Vector 22 `90:10457`: a horizontal arrow at y=826, x 30282→31337, going Step 6 → 7A.
- Text "If NO" `91:11447` (30028, 2821), next to Vector 30 `91:11448`. That vector is L-shaped, bbox 29262..31053 x 2993..4154, with arrowheads at both ends (one pointing up at the top of the vertical, one pointing right at the end of the horizontal). It is loosely placed: it touches neither Step 6 (whose bottom is at y=1652) nor 7B-1 (y 2107–3759). Read as Step 6 → NO row.
- Straight arrows, all y=826 in the top row and y=2933 in the bottom row:
  - Vector 31 `91:12386`: 7A → Step 8 `91:10958`
  - Vector 33 `91:12898`: Step 8 → Thank you `91:13857`
  - Vector 32 `91:12858`: 7B-1 → 7B-2
  - Vector 34 `91:13853`: 7B-2 → Step 8 copy `91:13376`
  - Vector 35 `91:15100`: Step 8 copy → Thank you copy `91:14645`
- Arcs above the top row (y=-477, h=360), which belong to steps 1–6: Vector 25 `91:10954` (1→2), 24 `91:10953` (2→3), 26 `91:10955` (3→4), 27 `91:10956` (4→5), 28 `91:10957` (5→6).
- Conclusion: `91:10958` and `91:13857` are the yes-branch frames. `91:13376` and `91:14645` are the no-branch duplicates. The duplicated Step 8 and Thank you exist only to draw the no row. They are not a different design.

## 1. Shared chrome on the step frames (7A, 7B-1, 7B-2, both Step 8)

- Left panel `Rectangle 100`: #7051ed, radius 24, 372x683 at (132,202).
  - Title (30px SemiBold, lh 32, white): "Vind je beste energiedeal, zonder gedoe."
  - Body (16px Regular, lh 23, rgba(255,255,255,0.65)): "In een paar eenvoudige stappen verzamelen we precies wat nodig is voor een persoonlijke vergelijking."
  - Mascot: raster layer "ChatGPT Image Sep 22, 2026, 01_37_15 PM 5" (323x289 at 157,579). It is a PNG crop of a sprite sheet (img w 310.59%, h 231.58%, left -106.47%, top -11.29%). It shows the fox with a laptop, a lightning bubble and a flame bubble. It is not layered, so there is no SVG.
- Progress card (Rectangle 320): 767x91, radius 24, border #ded9f4, shadow 0 29 64 rgba(41,32,132,0.11).
  - Counter: 14px SemiBold #6c5ce7, lh 20.
  - Track: 693x9, rgba(103,75,217,0.13), radius 24. Fill: #674bd9.
- Question card (Rectangle 319): 767x567, radius 24, border #ded9f4, shadow 0 29 64 rgba(41,32,132,0.08).
  - Divider Vector 21 at y=730, 671 wide. Present on every frame except 7B-2.
  - "Terug" button: white, border #ded9f4, radius 12, 148x52, chevron-left, 18px Regular #03080f.
  - Next button: #b7e137, radius 12, 148x52, chevron-right, 18px Regular #03080f.
- Question heading: 34px SemiBold, tracking -1.02, black.
- Field: bg #f6f4ff, border #ded9f4, radius 16.
- Hidden leftovers in every frame: "question 1", "smarthome 1", "solar-panel 1".
- Header and footer are the same as the other pages. Only 7B-2's footer adds a third contact line, "Adres: Nederland" (ellipse `91:12824`, icon `91:12829`, text inside `91:12795`).

## 2. 7A: Step - 7- If user select yes `90:10462`

- Counter `90:10907`: "Stap 7 van 8". Bar fill `90:10467` is 608/693 (7/8).
- Heading `90:10938`: "Elektriciteitsverbruik".
- One input `90:10935`: 671x74, #f6f4ff, radius 16, with the unit suffix "kWh" `90:10939` right-aligned inside it (18px Regular #03080f).
- No field label, no placeholder, no hint text, no gas field. Nothing sits between the input (bottom at y=492) and the divider (y=730).
- Buttons: "Terug" `90:10946`, "Volgende" `90:10940`.
- Brief §7.3/§7.5 expects:
  - step title "Je jaarverbruik";
  - field labels "Elektriciteit (kWh per jaar)" and/or "Gas (kWh per jaar)";
  - hint "Een gemiddeld gezin verbruikt ±3.500 kWh elektriciteit.";
  - range 100–100 000 for electricity and 100–150 000 for gas.
  None of these are drawn.

## 3. 7B-1: Step - 7 - if user selct No `91:11921`

- Counter `91:12366`: "Stap 3 van 8" (wrong). Bar fill `91:13855` is 608/693, which is 7/8 and contradicts the text.
- Q1 `91:12369`: "Wat is het aantal bewoners? " (the layer text ends with a space).
  - Select `91:12367`: 671x74, chevron-down `91:12382`.
  - Placeholder `91:12370`: "Selecteer het aantal personen".
- Q2 `91:12388`: "Wat is het type woning?"
  - Select `91:12387`: 671x74, chevron `91:12390`.
  - Placeholder `91:12389`: "Selecteer woningtype".
- No option lists are drawn (the dropdowns are closed), so Figma has no source for household sizes or dwelling types.
- Buttons: "Terug" `91:12379`, "Volgende" `91:12371`.
- Brief §7.3:
  - Questions: "Hoeveel personen wonen er in je woning?" / "Wat voor woning heb je?"
  - Household codes: `1`,`2`,`3`,`4`,`5_plus`. The brief gives no Dutch labels for these.
  - Dwelling options: `apartment` Appartement, `terraced` Rijwoning (gesloten bebouwing), `semi_detached` Halfopen bebouwing, `detached` Open bebouwing.

## 4. 7B-2: Step - 7 -slide 2 `91:12392`

- Counter `91:12837`: "Stap 7 van 8". It is the same as 7A, so it is wrong for this branch. Bar fill `91:12397` is 608/693.
- Heading 1 `91:12861`: "Warmtepomp". Heading 2 `91:12862`: "Elektrisch voertuig". These are nouns, not questions.
- Each heading has 2 option cards (671x60, #f6f4ff, radius 16). Each card has:
  - a 40x40 white icon tile on the left (radius 8, border #ded9f4);
  - the icon: check-circle for Ja, x-circle for Ne;
  - the label, 18px Regular;
  - a 24px radio circle (Ellipse 62) on the right.
  - Warmtepomp: "Ja" `91:12877` / "Ne" `91:12879`
  - Elektrisch voertuig: "Ja" `91:12878` / "Ne" `91:12880`
- Nothing is selected, and all 4 radios use the same asset.
- The cards run down to y=753. No divider is drawn.
- Buttons: "Terug" `91:12868`, "Volgende" `91:14334`.
- Brief: "Heb je een warmtepomp?" / "Heb je een elektrische wagen?", as 2 × yes/no. "Ne" becomes "Nee".

## 5. Step 8 `91:10958` (canonical, yes row)

- Counter `91:11402`: "Stap 8 van 8". Bar fill `91:10963` is 693/693 (full).
- Title `91:11408`: "Jouw gegevens".
- 2x2 grid of fields, each 326x60, #f6f4ff, radius 16. Labels are 18px SemiBold. Placeholders are 16px Regular #aea9c6.
  - "Voornaam" `91:11419`: placeholder "Vul hier uw voornaam in" `91:11431`
  - "Achternaam" `91:11422`: placeholder "Vul hier uw achternaam in" `91:11433`
  - "Telefoonnummer" `91:11427`:
    - inner white chip `91:11440` (92x40, radius 8) holding the Belgian flag image "flag (2) 1" `113:1919` (32x22, PNG), the text "+32" `91:11434` (#03080f) and a chevron-down `91:11438`, which suggests a country picker;
    - placeholder "478 12 34 56" `91:11442`.
  - "E-mail" `91:11428`: placeholder "example@email.com" `91:11441`
- Checkbox `91:11443`: 34x34, radius 10, #f6f4ff with border #ded9f4.
  - Text `91:11444` (18px, #3a3c75): "Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be". "algemene voorwaarden" is in link colour #6c5ce7.
- Divider at y=730. "Terug" `91:11416`. Submit "Indienen" `91:11410`, lime, with chevron-right.
- Not drawn:
  - call moment (days or slots), so there is no 13–14 slot to keep or drop;
  - newsletter checkbox;
  - privacy policy link;
  - partner-contact consent;
  - Turnstile;
  - error, focus and loading states.

## 6. Step 8 `91:13376` (second copy, no row): diff against `91:10958`

- Counter `91:13820`: "Stap 6 van 8" instead of "Stap 8 van 8". The bar is still full (693).
- Phone prefix:
  - "+31" `91:13844` instead of "+32";
  - Dutch flag "flag (1) 1" `91:13845` instead of the BE flag `113:1919`;
  - chip `91:13840` is 90 wide (92 on the canonical);
  - chevron `91:13849` sits at x=652 (657 on the canonical).
- Everything else is identical: title, labels, placeholders, consent text and "Indienen".
- Verdict: a stale duplicate. The Dutch flag and +31 that the brief warns about are on this frame. Build from `91:10958`.

## 7. Thank you page `91:13857` (canonical) vs `91:14645` (copy)

- Metadata is structurally identical, apart from ids and canvas position, and the screenshots look the same. `91:14645` is only a duplicate for the no row.
- Layout:
  - Centred card: white 767x636 (`91:14644`, border #ded9f4, radius 24) over a purple #7051ed 767x644 base (`91:14304`), which leaves an 8px purple lip at the bottom.
  - No progress card and no left panel.
  - Header ("Gratis beginnen" CTA) and standard footer, with no "Adres" line.
- Mascot group `91:14643`:
  - Purple circle (Ellipse 11), 146 px.
  - Fox giving a **thumbs up**, with "spark" lines next to the thumb: raster PNG crops "Group 21 1" `91:14640` (masked to the circle) and "Group 21 2" `91:14642`.
  - The fox has no laptop. The pose differs from the form-panel mascot.
- Hidden: "check-circle 1" `91:14337` (124x124).
- Heading `91:14306`: "Bedankt! We gaan voor je aan de slag." (34px SemiBold, centred, lh 41, drawn on 2 lines: "Bedankt! We gaan voor" / "je aan de slag.")
- Body `91:14343`: "We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op." (18px Regular #3a3c75, centred, lh 30)
- Button group `91:14349`: "Terug naar de startpagina" `91:14347` (20px Medium white) on a #7051ed pill (352x62, radius 37, shadow 0 2 8.2 rgba(108,92,231,0.36), inner white glow), with an arrow-up-right icon `91:14345`.
- There is no time claim such as "binnen X uur", and no mention of the chosen call moment.
- Claim to flag: "We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op" promises a callback to every visitor. That includes no_promo leads, which are stored but never delivered (§1, §8), and pending solar or battery leads, for which no destination exists yet. "We vergelijken" also implies a comparison is being run.

## 8. Step counters: drawn vs correct (§7.6, with the brief's 5b tariff_meter step included)

Assumes the path starts at step 1 and electricity is involved. The yes path has 9 screens and the no path has 10.

| Frame | Drawn | Bar | Correct (from step 1) | Correct (preselected `/vergelijken/energie`) |
|---|---|---|---|---|
| 7A `90:10462` | Stap 7 van 8 | 7/8 | Stap 8 van 9 | Stap 7 van 8 |
| Step 8 `91:10958` (yes) | Stap 8 van 8 | full | Stap 9 van 9 | Stap 8 van 8 |
| 7B-1 `91:11921` | Stap 3 van 8 | 7/8 | Stap 8 van 10 | Stap 7 van 9 |
| 7B-2 `91:12392` | Stap 7 van 8 | 7/8 | Stap 9 van 10 | Stap 8 van 9 |
| Step 8 `91:13376` (no) | Stap 6 van 8 | full | Stap 10 van 10 | Stap 9 van 9 |

- With `energy_type=gas`, the meter_type step is skipped, so X and Y each drop by 1 more.
- The design's own totals: yes path 8 screens, which matches "van 8"; no path 9 screens, so every no-row "van 8" is wrong even by the design's own logic.
- The brief's 9/10 equals the design's paths plus 5b. That is consistent.

## 9. Contrast (WCAG) spot checks

- #6c5ce7 on white: 4.86:1. AA passes for the counter and the consent link.
- #3a3c75 on white: 10.1:1.
- #03080f on #b7e137: 13.2:1.
- White on #7051ed: 5.14:1.
- Left-panel body text, rgba(255,255,255,0.65) on #7051ed (about #cdc2f9): **3.1:1**. That fails AA for 16px text.
  - The opacity needed for 4.5:1: 0.9 gives 4.48 and 0.95 gives 4.8, so use at least 0.92, or plain white (5.14).
- Placeholder #aea9c6 on #f6f4ff: 2.08:1. Placeholders only, and labels exist, but these will look faint.

## 10. Inconsistencies and gaps worth knowing

- Field heights differ: 74 (7A input, 7B-1 selects) and 60 (Step 8 inputs, 7B-2 cards).
- No selected, error, focus, disabled or loading states are drawn in this slice.
- The left-panel copy ("energiedeal") and the mascot (lightning and flame) are energy-specific. The contact step is shared with the solar and battery flows.
- The mascot is raster: a ChatGPT sprite on the form, and a different thumbs-up raster on the thank-you page. A layered SVG is not possible from these layers, and the §6.1 "mascot moves" morph would have to go between two different images.
- The form card sits in the right column (x=529). The thank-you card is centred (x=336). A morph is possible, but it moves and resizes the card.
