# form-a: Figma form steps 1–6, verbatim notes (Phase 0, read-only)

File `8bhHL5kRbwYzYPbH6Vgdjn`, Page 1. Frames reviewed (all 1440 x 1652, desktop only):
`84:3972` Step - 1 · `89:7495` Step - 2 · `89:7986` Step - 3 · `89:8489` Step - 4 · `90:8972` Step - 5 · `90:9473` Step - 6

Sources: get_design_context on each whole frame (6 calls, children are flat: no auto-layout groups), one 1440px
get_screenshot of Step 2 (`shots/form-a-step2-1440.png`, crop `shots/form-a-step2-form-crop.png`), page1.xml metadata,
and small SVG assets downloaded to `figma/assets-form-a/` to read colours.
All text below is copied exactly from Figma, typos included.

---

## Shared chrome (identical in all six frames)

### Site header (full site header, same as marketing pages)
- Lime top strip `Rectangle 262` 1440x16, `#c9e260` (e.g. `84:4032`).
- White bar `Rectangle 263` 1440x69 at y=16, shadow `0 13px 31.8px rgba(0,0,0,.13)`.
- Logo group `Group 28` (mascot head in circle + "Voordeelvinder" wordmark vector) at (137,20), 215x54.
- Nav text (single text node, spaces used for spacing), 14px Regular `#151d30`, tracking -0.28px:
  `Hoe het werkt         Veelgestelde vragen         Over ons         Blogs` (`84:4274`)
- CTA pill `Rectangle 152` 170x42, radius 37, `#c9e260`, white 1px border, shadow `0 2px 8.2px rgba(165,202,53,.53)` + inset `0 0 17.4px white`;
  label **"Gratis beginnen"** 16px Medium `#151d30` + 22px arrow icon (`84:4035`).

### Site footer (full footer, same as marketing pages)
- Purple block `#7051ed` 1440x554 at y=1027; white bottom bar 1440x70.
- Logo (large) + tagline: "De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden."
- Newsletter pill 449x60 white radius 41, mail icon, placeholder **"Voer uw e-mailadres in"** (u-form) 16px `rgba(3,8,15,.34)`, button "Abonneren" `#b7e137` 121x46 radius 37.
- Columns: "Snelle links" (Hoe het werkt / Veelgestelde vragen / Over ons), "Juridisch" (Privacybeleid / Cookiebeleid / Algemene voorwaarden),
  "Contact": "E-mail: info@voordeelvinder.com" / "Telefoon: 335 224 654" (placeholders per brief §6).
- Bottom: "© 2026 VoordeelVinder.be" (SemiBold) + " — Alle rechten voorbehouden."
- No "Adres: Nederland" line on the form frames.

### Left panel (purple, identical on steps 1–6)
- `Rectangle 100` (`88:7430` on step 1) at (132,202), **372 x 683**, radius 24, fill `#7051ed`.
  The render shows a **grain/noise texture** on it that the code export does not include (sampled pixels R 87–108, G 63–79, B 184–230 → visibly darker/noisier than flat #7051ed). Same texture visible on the footer.
- Title (`89:7435`): **"Vind je beste energiedeal, zonder gedoe."** Bricolage Grotesque SemiBold 30px / 32px, white, box 325 wide at (165,238) → 3 lines.
- Body (`89:7436`): **"In een paar eenvoudige stappen verzamelen we precies wat nodig is voor een persoonlijke vergelijking."** Regular 16px / 23px, `rgba(255,255,255,.65)`, box 306 wide at (165,357).
- Mascot (`89:7439`) named **"ChatGPT Image Sep 22, 2026, 01_37_15 PM 5"**: a **raster PNG**, 323 x 289 at (157,579) (17px from panel bottom).
  It is a crop of a larger image (img w 310.59%, h 231.58%, left -106.47%, top -11.29%). Fox with green cap on a laptop;
  **lightning bubble and flame bubble are baked into the bitmap** (electricity + gas symbolism). No vector layers, no separable head/eyes/arms.
- Hidden layer `question 1` 42x42 rounded-rect at (699,518) exists in every frame (hidden; content not verified).

### Progress card (identical structure)
- `Rectangle 320` 767 x 91 at (529,202), radius 24, white, border 1px `#ded9f4`, shadow `0 29px 64px rgba(41,32,132,.11)`.
- Label at (566,223): SemiBold 14px / 20px `#6c5ce7`. Text per step: **"Stap 1 van 8"**, **"Stap 2 van 8"**, **"Stap 3 van 8"**, **"Stap 4 van 8"**, **"Stap 5 van 8"**, **"Stap 6 van 8"**.
- Track `Rectangle 321` 693 x 9 at (566,253), radius 24, `rgba(103,75,217,.13)`.
- Fill `Rectangle 322` `#674bd9`, widths 87 / 174 / 261 / 348 / 435 / 522 → exactly X/8 of 693.

### Question card (identical structure)
- `Rectangle 319` 767 x **567 (fixed height on every step)** at (529,318) (25px below progress card), radius 24, white, border `#ded9f4`, shadow `0 29px 64px rgba(41,32,132,.08)`.
- Content column x=577..1248 (**671 wide → 48px side padding**). Step 1 is off by 9px: its divider and Terug button sit at x=568.
- Divider `Vector 21` 671 x 0 at y=730, stroke `#CFCAE4` (absent on Step 5).
- Buttons at y=783, **148 x 52**, radius 12, 50px above card bottom:
  - **"Terug"** (`Group 70`): white, border `#ded9f4`, left chevron 24px (`#03080F`), label Regular 18px `#03080f`.
  - **"Volgende"** (`Rectangle 326`): fill `#b7e137`, label Regular 18px `#03080f`, right chevron 24px.
- Question title style: Bricolage Grotesque SemiBold 34px, tracking -1.02px, colour **#000000** (pure black, while body text is #03080f).
- Answer-card style: bg `#f6f4ff`, border 1px `#ded9f4`, radius 16, width 671. Radio: 24px circle, white fill, stroke **#C4BCE7** (unselected only).
- **No selected, hover, focus, error or disabled states are drawn anywhere in steps 1–6.**

---

## Step 1 · `84:3972` "Step - 1"
- Progress: "Stap 1 van 8" (fill 87px).
- Title (`89:7453`): **"Wat wil je vergelijken?"** at y=366 (leading 27).
- Input as drawn: 3 single-choice cards, **671 x 74**, gap 18 (y=418, 510, 602). Each: 44x44 white icon tile (radius 8, border #ded9f4) inset 15px, label at x=652 (Regular 18px / 30px, tracking -0.36px, `#03080f`), radio 24px at right (x=1199, 25px inset).
  1. **"Elektriciteit"** (`89:7454`), icon `Frame` `89:7470` (lightning, 24px, fill #7051ED)
  2. **"Zonnepaneel"** (`89:7464`), singular, icon `solar-panel 1 [Vectorized]` `89:7475` (22px, #7051ED + white)
  3. **"Thuisbatterij"** (`89:7467`), icon `smarthome 1 [Vectorized]` `89:7479` (26px, #7051ED)
  (Hidden raster duplicates `smarthome 1` `89:7478` and `solar-panel 1` `89:7473`, suggesting icons were vectorised from bitmaps.)
- **No "Gas" card and no "Elektriciteit + gas" card.** The word "gas" appears nowhere in the file's text layers. No gas/flame icon exists as a vector (the flame exists only inside the raster mascot).
- Buttons: "Terug" (shown even on step 1) + "Volgende".

## Step 2 · `89:7495` "Step - 2"
- Progress: "Stap 2 van 8" (fill 174px).
- Title (`89:7945`): **"Wat is uw postcode?"** (u-form) at y=386.
- Text field `Rectangle 323` `89:7941`: 671 x 74 at y=438, bg #f6f4ff, border #ded9f4, radius 16.
  Placeholder (`89:7946`): **"Voer uw postcode in"** (u-form), Regular 18px, `#aea9c6`, inset 24px.
- Checkbox `Rectangle 327` `89:7977`: **34 x 34**, radius 10, bg #f6f4ff, border #ded9f4, at (577,536).
  Label (`89:7975`): **"Dit is een zakelijk adres."** Regular 18px `#3a3c75`, 11px right of the box.
- **Revealed business questions (electricity/gas consumption band < / > 100.000 kWh) are NOT drawn**, in this frame or anywhere in the file (no "zakelijk", "100.000" or "geschat" text elsewhere). The card has empty space y≈570–730 where they could go.
- No postcode error state, no helper text.

## Step 3 · `89:7986` "Step - 3"
- Progress: "Stap 3 van 8" (fill 261px).
- Title (`89:8435`), two lines in a 303px box: **"Wie is uw huidige" / "energieleverancier?"** (u-form), leading 36, at y=377.
- Dropdown (closed) `Rectangle 323` `89:8432`: 671 x 74 at y=475, same style as the input. Placeholder (`89:8436`): **"Selecteer uw huidige leverancier"** (u-form), Regular **16px** (the postcode placeholder is 18px), `#aea9c6`. Chevron-down `89:8452` 24px, fill **#7051ED**, at x=1202.
- **No supplier list drawn** (no open state, no option names). Only supplier names in the whole file are marketing copy on Homepage 1/2/3: "wij vergelijken Luminus, Mega en TotalEnergies" / "We checken Luminus, Mega en TotalEnergies" (e.g. `60:321`, `60:367`), which are the suppliers compared, not a current-supplier list.

## Step 4 · `89:8489` "Step - 4"
- Progress: "Stap 4 van 8" (fill 348px).
- Title (`89:8937`): **"Welk type meter heb je?"** at y=357.
- 4 single-choice cards, **671 x 60**, gap 10 (y=425, 495, 565, 635), **no icons**, label inset 26px (x=603), radio at x=1206:
  1. **"Dag meter (enkelvoudig tarief)"** (`89:8953`)
  2. **"Dag / nacht meter (tweevoudig tarief)"** (`89:8956`)
  3. **"Dag meter (enkelvoudig tarief) + exclusief nacht"** (`89:8958`)
  4. **"Dag / nacht meter (tweevoudig tarief) + exclusief nacht"** (`89:8960`), the longest label, 441px wide at 18px.

## Step 5 · `90:8972` "Step - 5"
- Progress: "Stap 5 van 8" (fill 435px).
- Two questions on one screen, both at title size (34px SemiBold), no separate step heading:
  - Q1 (`90:9419`) **"Heb je een digitale meter?"** at y=357. Cards y=414 "Ja" (`90:9435`), y=484 **"Ne"** (`90:9436`).
  - Q2 (`90:9450`) **"Heb je zonnepanelen?"** at y=566. Cards y=623 "Ja" (`90:9456`), y=693 **"Ne"** (`90:9457`).
- Yes/no drawn as **a vertical pair of full-width cards** (671 x 60, gap 10), each with a 40x40 white icon tile (radius 8) inset 10px, holding a 20px icon:
  Ja = check-circle outline **#6C5CE7**, Ne = x-circle outline **#93B52A**. Label at x=640, radio 24px at x=1206.
- Content runs to y=753, so there is **no divider** on this step (the only step without one); the gap to the buttons is 30px.
- **Typo "Ne" appears 2x** (should be "Nee").
- **Step 5b (social tariff / budget meter) is NOT in the design**: no text containing "sociaal", "budget" or "Weet ik niet" anywhere in the file.

## Step 6 · `90:9473` "Step - 6"
- Progress: "Stap 6 van 8" (fill 522px).
- Heading (`90:9920`): **"Je jaarlijks verbruik"** 34px SemiBold at y=357.
- Question label (`90:10441`): **"Ken je je jaarlijks energieverbruik?"** SemiBold **18px**, tracking -0.54px, at y=420.
- Yes/no pair: "Ja" (`90:10445`) card y=468, **"Ne"** (`90:10446`) card y=540. Cards 671 x 60, but the **gap here is 12px** (10px elsewhere). Same icon tiles and icons as Step 5. Divider at y=730.
- **Typo "Ne" 1x.**
- Possible grammar point (not in the brief's correction list): after "je", Dutch normally inflects the adjective ("je jaarlijkse energieverbruik" / "Je jaarlijkse verbruik"). The brief copies the design's "jaarlijks". Flag for the client; do not change silently.

---

## Order check
Design: 1 product → 2 postcode + business checkbox → 3 supplier → 4 meter type → 5 digital meter + solar → 6 knows consumption → 7 …
Brief §7.3: the same order, plus **5b `tariff_meter`** between 5 and 6 (ADDED). There is no design step 1–6 that the brief lacks.
Static counter "van 8" = the design's yes-path length without 5b. The brief's computed Y: yes 9 / no 10 from step 1. Gas-only skips meter_type (−1); a preselected product skips step 1 (−1).

## Contrast (WCAG 2.x, computed)
| Pair | Ratio | AA? |
|---|---|---|
| Left panel body rgba(255,255,255,.65) on #7051ed (16px regular) | **3.10:1** | fails 4.5:1 |
| Placeholder #aea9c6 on #f6f4ff | **2.08:1** | fails if placeholder counted as text |
| Radio stroke #c4bce7 on #f6f4ff (non-text) | **1.65:1** | fails 3:1 (1.4.11) |
| Checkbox border #ded9f4 on white (non-text); checkbox fill #f6f4ff vs white 1.09:1 | **1.37:1** | fails 3:1 |
| Input/card border #ded9f4 on white | 1.37:1 | input boundary weak |
| "Stap X van 8" #6c5ce7 on white 14px semibold | 4.86:1 | passes |
| Left panel title white on #7051ed 30px | 5.14:1 | passes |
| Option labels #03080f on #f6f4ff | 18.46:1 | passes |
| "Dit is een zakelijk adres." #3a3c75 on white | 10.08:1 | passes |
| Volgende label #03080f on #b7e137 | 13.24:1 | passes |
| Ne icon #93b52a on white (decorative, label present) | 2.36:1 | n/a |
| Progress fill #674bd9 on track | 4.87:1 | passes |

## Layout facts for mobile adaptation
- Desktop grid: content 132→1296 (1164 wide) = left panel 372 + gap 25 + right column 767. Right column = progress card (91 tall) + gap 25 + question card (567, fixed).
- Card inner padding 48px sides; top padding to title 39–48px; buttons 50px from bottom.
- Answer cards: 74px (step 1 product cards), 60px (steps 4–6), text input and select 74px, buttons 52px. **All ≥44px.**
  The checkbox's visible box is 34px, so its label row must provide the ≥44px hit area. Radios (24px) are indicators only; the whole card must be the target.
- Longest label (step 4 #4) is 441px at 18px. On a 375px viewport (16px gutter, reduced card padding, radio) it wraps to 2–3 lines, so cards need min-height, not a fixed 60px.
- Step 5 (4 cards + 2 titles) already fills the fixed 567px desktop card; step 5b adds another screen of the same size or larger (3-option budget meter).
- The desktop card is a fixed 567px on every step. The brief (§6.1) wants the height to animate between steps, so use auto height.
- Form pages carry the **full site header (85px incl. lime strip, nav, "Gratis beginnen" CTA → /vergelijken) and the full footer**. On mobile that stack is header + compact purple panel + progress card before the question.

## Tokens seen in these frames
Font: Bricolage Grotesque (variable; opsz 14, wdth 100), weights 400 / 500 / 600.
Sizes: 34 (question), 30 (panel title), 18 (options, buttons, placeholder, sub-question), 16 (panel body, select placeholder, header CTA), 14 (step label, nav).
Colours: #7051ed panel/primary · #674bd9 progress fill · rgba(103,75,217,.13) track · #6c5ce7 step label + Ja icon · #b7e137 Volgende · #c9e260 top strip + header CTA · #93b52a Ne icon · #f6f4ff card/input bg · #ded9f4 borders · #cfcae4 divider · #c4bce7 radio stroke · #aea9c6 placeholder · #3a3c75 checkbox label · #03080f text · #000000 question titles · #151d30 header text · #ffffff.
Radii: 24 (panel, cards, progress pill) · 16 (answer cards, inputs) · 12 (buttons) · 10 (checkbox) · 8 (icon tiles) · 37 (header CTA pill).
Shadows: progress card `0 29 64 rgba(41,32,132,.11)` · question card `0 29 64 rgba(41,32,132,.08)` · header `0 13 31.8 rgba(0,0,0,.13)`.

## Icon inventory (steps 1–6)
| Use | Node | Size | Colour | Note |
|---|---|---|---|---|
| Elektriciteit | `89:7470` Frame | 24 | #7051ED | lightning |
| Zonnepaneel | `89:7475` solar-panel 1 [Vectorized] | 22 | #7051ED/white | vectorised from a raster (hidden raster copy `89:7473`); the "solar-panel 1" naming looks like a stock-icon download, so check the licence |
| Thuisbatterij | `89:7479` smarthome 1 [Vectorized] | 26 | #7051ED | same as above (`89:7478` hidden) |
| Ja | e.g. `90:9463` | 20 | #6C5CE7 | check-circle outline |
| Nee | e.g. `90:9468` | 20 | #93B52A | x-circle outline |
| Select chevron | `89:8452` | 24 | #7051ED | chevron-down |
| Terug / Volgende chevrons | `89:7984` / `89:7489` | 24 | #03080F | chevron left/right |
| Radio (unselected) | Ellipse 62 | 24 | white + #C4BCE7 stroke | no selected variant drawn |
| Gas, Elektriciteit + gas, Weet ik niet | none | – | – | **not in the design** |
