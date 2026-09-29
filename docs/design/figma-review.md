# Figma vs build brief — Phase 0 review

*29 Sep 2026 · Figma file `8bhHL5kRbwYzYPbH6Vgdjn` (Page 1) vs `VoordeelVinder-build-brief.md` v1.1*

Seven reviewers each checked one slice of the file against the brief. A separate verifier then re-checked every major finding and a sample of minor ones directly in Figma, merged duplicates, and looked for anything the brief says that nobody had checked. Severity: **major** = needs a decision or sign-off, or changes scope/UX · **minor** = small copy/visual fix · **info** = worth knowing. No blockers were found. `Verified` shows the verifier's verdict where one exists.

**Totals:** 122 findings — 31 major, 48 minor, 43 info. 44 re-verified: confirmed 36, partly 8. Many findings overlap across slices — see *Duplicates* at the end.

## Contents

- [Tokens, fonts, contrast, motion](#tokens)
- [Assets (mascot, icons, images)](#assets)
- [Homepage 3 (60:2)](#home)
- [Product pages (69:931, 80:2867)](#products)
- [Form steps 1–6](#form-a)
- [Form steps 7–8 and thank-you](#form-b)
- [Unlisted frames and file-level checks](#other)
- [Verifier: coverage gaps, extra findings, duplicates](#verifier)


---

<a id="tokens"></a>
## Tokens, fonts, contrast, motion

**Frames reviewed:** 60:2 Homepage 3: whole frame too large for get_design_context (sparse); I sampled about 55 sub-nodes, plus pixel-sampled a 1:1 full-frame PNG; 84:3972 Step - 1 (full get_design_context + get_variable_defs + get_motion_context recursive); 91:10958 Step 8 yes-row (full get_design_context); 69:931 Solar Panel Page (get_variable_defs; too large as a whole; I sampled 12 nodes, plus a full-frame pixel sample); 80:2867 Home Battery (pixel sample of the full frame only); 118:2067 Read Blog Page (full get_design_context, fonts/colours only); 89:7495 Step - 2, 90:9473 Step - 6, 90:10462 Step - 7 yes (text nodes 89:7946, 89:7975, 90:10441, 90:10939); 91:11921 Step - 7 No and 91:13376 Step 8 no-row (pixel samples from existing screenshots); 60:2 and 84:3972 get_motion_context recursive

**Summary.** The Figma file has no variables, no local styles, no components or instances and no drawn interaction states. The only libraries attached are community kits, and none of them is used. So every token has to be sampled, as §6 expects. The palette matches §2 (purple + lime, rounded cards), but it is loose: 3 brand purples (#7051ed, #6c5ce7, #674bd9), 2 limes used for the same primary-button role (#c9e260 on marketing CTAs, #b7e137 on the form buttons), 3 near-black inks (#03080f, #151d30, #000), near-duplicate lavender and lime tints (ΔE < 2), and a few one-off greys (#ededed, #e6e6e6, #d9d9d9). I also count 20+ radii and about 13 shadows. Purple surfaces carry a Figma Noise effect. It only shows up in the hero SVG export (an feTurbulence filter) and in the rendered pixels; get_design_context reports those rectangles as flat #7051ed. Typography is a single family, Bricolage Grotesque, in weights 400/500/600. Letter-spacing is consistent: -3% on headings and -2% on body. Line-heights, by contrast, vary a lot for the same size, and the 34px question titles have a 27px line-height. The font is OFL-1.1 and on both Google Fonts and Fontsource, so self-hosting with swap is fine. Every node pins opsz 14, which is the font's default. The wght-only variable file (41 KB latin) therefore matches Figma exactly; the full-axis file with the default font-optical-sizing would not. On contrast, the main text pairs pass AA. White on #7051ed is 5.14:1, white on #6c5ce7 is 4.86:1, dark ink on lime is at least 11.6:1, and lime is never used as text on white, so the PromoCheckers failure is avoided. The form has real AA failures, though. Placeholders are 2.08:1 and 2.30:1. The radio, checkbox and input boundaries are 1.37–1.65:1, which fails WCAG 1.4.11. The 65%-white panel body text is 3.10:1. get_motion_context returns {"nodes":[]} for both 60:2 and 84:3972, which confirms §6.1. Error, focus, selected, hover and disabled colours have to be proposed, because none exist in the palette.

### Confirmed against the brief

- §2: Figma uses a purple (#7051ed / #6c5ce7) and lime (#c9e260 / #b7e137) palette with rounded cards (radius 16–40) and the fox mascot with the green cap (bitmap).
- §6 Tokens: no Figma variables. get_variable_defs returns {} on 60:2, 84:3972 and 69:931. search_design_system finds no styles or variables. The subscribed libraries are community kits only (Material 3, Simple Design System, Apple OS kits), and no node uses them. Sampling is the route the brief prescribes.
- §6.1: get_motion_context(recursive) returns {"nodes":[]} for both Homepage 3 (60:2) and Step 1 (84:3972). The Figma file contains no animation.
- §6/§0: every frame is a 1440px desktop frame. There are no mobile frames.
- §11 fonts: one family, Bricolage Grotesque (designer Mathieu Triay), SIL OFL 1.1, on Google Fonts and Fontsource (@fontsource-variable/bricolage-grotesque v5.3.0, font-display: swap built in). Self-hosting is allowed. The weights used are only 400, 500 and 600.
- §11: the Dutch glyphs the copy needs (ë é ï ’ — €) are all in the latin subset. The wordmark 'Voordeelvinder' is a vector, so it needs no font.
- §7.6 AA, main text pairs pass: white on #7051ed 5.14:1, white on #6c5ce7 4.86:1, #6c5ce7 on white 4.86:1, #03080f/#151d30 on #c9e260 13.90/11.62:1, #03080f on #b7e137 13.24:1, #3a3c75 on white/#f6f4ff/#f8fceb/#f2f0ff 8.97–10.08:1, #3a3c75 on #b7e137 6.64:1, progress fill #674bd9 against its track 4.87:1.
- §7.6 PromoCheckers lesson: no sampled node uses lime/yellow as text or icon colour on white. Lime is only ever a background behind dark ink.
- §6 mobile: answer cards are 74px tall (above the 44px minimum), form buttons 52px, inputs 60px. Input text is at least 16px, so iOS will not zoom on focus.
- Letter-spacing is systematic and can be tokenised as it is: -0.03em on all SemiBold headings (80, 60, 48, 34, 24, 22, 20, 18 labels) and -0.02em on Regular body (24, 20, 18, 16, 14). Medium button labels have 0 tracking.

### Findings

#### [major] `tokens-contrast-placeholders`
- **Brief:** §7.6 Accessibility (contrast AA); §11 WCAG 2.1 AA — Contrast meets WCAG AA; on PromoCheckers, yellow text on white failed.
- **Figma:** `91:11431, 91:11433, 91:11441, 91:11442 (Step 8 placeholders), 89:7946 'Voer uw postcode in', 84:4532 / 60:716 newsletter placeholder` — The form placeholders are #aea9c6 on the #f6f4ff input fill, which is 2.08:1. The newsletter placeholder is rgba(3,8,15,0.34) on white, which is 2.30:1. Placeholder size is also inconsistent: 16px in Step 8 and 18px in Step 2. Some placeholders carry format information ('478 12 34 56', 'example@email.com').
- **Recommendation:** Add a placeholder token of at least 4.5:1, for example #6b6790 (4.86:1 on #f6f4ff, 5.29:1 on white), or #3a3c75 at 75% (4.69:1). Use one size (16px). Put format hints in visible hint text, not only in the placeholder. Rewrite 'uw' to 'je' (content slice). The visual change needs designer sign-off.
- **Verified:** confirmed

#### [major] `tokens-contrast-control-boundaries`
- **Brief:** §7.6 Accessibility (real radio/checkbox inputs, visible focus, AA); §12 axe in CI — Answer cards are real radio/checkbox inputs with labels. Contrast meets WCAG AA.
- **Figma:** `90:8968/90:8970/90:8971 radio ring SVG (stroke #C4BCE7), 91:11443 checkbox (#f6f4ff + 1px #ded9f4), inputs 91:11420 etc. and answer cards 89:7452 (#f6f4ff + 1px #ded9f4) on the white card 84:4682` — Radio ring on the answer card is 1.65:1. Checkbox border on white is 1.37:1. Input fill against the white card is 1.09:1 and the input border 1.37:1. All of these are below the 3:1 non-text contrast required by WCAG 1.4.11 for the parts that identify a control.
- **Recommendation:** Add a --color-control-border token for radio rings, checkbox borders and input borders: purple-500 at 80% on white = #897dec (3.38:1 on white, 3.11:1 on #f6f4ff), or #674bd9. Keep #ded9f4 only for decorative card borders. The selected state is purple-500 fill/ring. Show the designer on staging.
- **Verified:** partly — The unselected radio ring, checkbox and input borders are 1.1–1.8:1. That is a 1.4.11 risk, not a certain failure, because labels identify the controls, and axe CI will not flag it. The hard requirement is that the selected and checked state indicators, which are not designed yet, and the focus ring reach at least 3:1. Darkening the checkbox and radio border (for example to #897dec) is still recommended, as a proposal for the designer.

#### [major] `tokens-no-interaction-states`
- **Brief:** §6 'No off-palette colours'; §6.1 answer-card selected spring, errors shake; §7.3 soft kWh warning; §7.6 inline errors, visible focus; §9.4 TESTMODUS badge — Inline errors under each question, a visible focus state, a selected state on answer cards, a loading state on submit, a soft warning outside typical kWh ranges, and a TESTMODUS badge. No off-palette colours.
- **Figma:** `Whole file: 0 components/instances/variants in the page XML. No hover, focus, selected, error, disabled or loading states in any Step frame (84:3972 … 91:13376).` — Only default states are drawn. The palette has no red, amber or green, so an error message cannot be built without adding a colour.
- **Recommendation:** Propose these on staging and list them in the PR as TO CONFIRM. Danger #c62828 (5.62:1 on white, 5.17:1 on #f6f4ff). Warning text in ink-600 with an icon, or #8a5a00 (5.93:1). Focus ring: 2px purple-500 with a 2px offset on light surfaces (4.86:1), and white (5.14:1) or lime-300 (3.55:1) on purple. Selected answer card: purple-500 border + ring. Hover: lighten via color-mix. Disabled/loading: 60% opacity plus a spinner. Get the designer's approval before Phase 3.
- **Verified:** confirmed

#### [minor] `tokens-contrast-form-panel-body`
- **Brief:** §7.6 Accessibility (contrast AA) — Contrast meets WCAG AA.
- **Figma:** `89:7436 / 91:11400 (and the same node on every Step frame) 'In een paar eenvoudige stappen verzamelen we…'` — Regular 16px text in rgba(255,255,255,0.65) on the #7051ed panel is 3.10:1 (3.66:1 against the average rendered noise colour #6247cf). It fails 4.5:1.
- **Recommendation:** Use white at 90% or more (4.50:1 on flat #7051ed) or solid white (5.14:1). Visually this is almost identical to the design.

#### [minor] `tokens-noise-texture`
- **Brief:** §6 Tokens (sample styles and document them); §11 performance — Read colours, typography, radii and shadows from Figma.
- **Figma:** `60:4 'Subtract' hero SVG (filter feTurbulence fractalNoise baseFrequency 2, black specks at rgba(0,0,0,0.25)). Pixel variance on 60:9, 60:49, 88:7430 (blue-channel standard deviation ≈ 8, average #6247cf) and a lighter version on the footer 60:496 (average #694cdf).` — Purple surfaces carry a Figma Noise/grain effect. get_design_context drops it on rectangles (it reports flat #7051ed), and only the hero SVG export contains it. The rendered purple therefore looks darker than the token.
- **Recommendation:** Ask the designer whether the grain stays. If it does, make it one reusable utility (a tiny tiled 1–3 KB PNG/WebP layered over bg-purple-600), not a live SVG feTurbulence filter, which is expensive to paint on mid-range Android. Check contrast against flat #7051ed, the worst case (the grain only darkens).

#### [minor] `tokens-purple-variants`
- **Brief:** §6 Tokens ('No off-palette colours'); §2 brand — Purple and lime-green palette; no off-palette colours.
- **Figma:** `#7051ed: 60:4, 60:9, 60:49, 60:427, 60:496, 60:503, 88:7430, 75:2832. #6c5ce7: 60:359, 60:429, 69:922, 60:111, 89:7443, 91:11444, 81:3842, 67:894. #674bd9: 89:7442 and 91:10963 (progress fill) + rgba(103,75,217,0.13) track 89:7441.` — Three distinguishable brand purples (ΔE 6.9–10.6) with overlapping roles. For example, the comparison header row is #7051ed while the highlight column is #6c5ce7. The final CTA button is #7051ed while the battery CTA is #6c5ce7. #674bd9 appears only in the progress bar.
- **Recommendation:** Token roles: purple-600 #7051ed for surfaces, purple-500 #6c5ce7 for accents, text and icons, and purple-700 #674bd9 for the progress fill and for small purple text on lavender (5.38:1). Don't let components pick a purple ad hoc. Ask the designer whether #674bd9 can collapse into purple-500.

#### [minor] `tokens-lime-button-inconsistency`
- **Brief:** §6 Tokens; §6.1 (one consistent system) — Put the tokens in @theme; one design system.
- **Figma:** `#c9e260: header CTA 84:4034, hero CTA 60:324, 69:917, 60:82, 60:87, top strip 84:4032. #b7e137: form 'Volgende' 89:7461, 'Indienen' 91:11407, newsletter 'Abonneren' 84:4534, and the accents 60:383, 60:430, 67:892, 66:862.` — Primary buttons use two limes (ΔE 16). Marketing pill CTAs are #c9e260 with a white inset gloss and glow; form and newsletter buttons are #b7e137, flat. Button shapes differ too: pill radius 37 versus 12, and label Medium 16/20 versus Regular 18.
- **Recommendation:** Define one --color-cta (my working assumption: lime-300 #c9e260 everywhere, with lime-400 kept for accents and strips). Define two button variants on purpose: pill for marketing, 12px-radius for the form. Confirm with the designer.

#### [minor] `tokens-near-duplicate-surfaces`
- **Brief:** §6 Tokens ('No off-palette colours') — No off-palette colours.
- **Figma:** `#f6f4ff (89:7452, 91:11420, 69:951) vs #f5f4ff (69:990–993, 69:983, 80:2907–2911) ΔE 0.35. #f8fceb (66:861) vs #f8fbeb (75:2835, 80:2884) ΔE 0.67. #f2f0ff (67:893) vs #f0edff (USP ellipse SVG 60:387) ΔE 1.84. Badge fill rgba(183,225,55,0.28) (60:22) vs 0.19 (60:421, 66:866).` — Pairs of values that look identical but are different hex/alpha values, used for the same roles.
- **Recommendation:** Merge them: lavender-50 #f6f4ff, lavender-100 #f2f0ff, lime-50 #f8fceb, and a single badge fill of lime-400 at 20%. Record the mapping in docs/decisions.

#### [minor] `tokens-ink-variants`
- **Brief:** §6 Tokens — Read colours from Figma and put them in @theme.
- **Figma:** `H2 60:15 #151d30 vs H2 60:378 / 60:13 #03080f. Card titles 60:42 #151d30 vs 60:67 #03080f vs 67:883 #000. Form question titles 89:7453 and field labels 91:11419 #000. USP text 60:384 #000 vs 60:385 #03080f.` — Three near-black ink colours used interchangeably within the same text styles.
- **Recommendation:** ink-900 #03080f for all headings and labels (replacing #000, ΔE 3.97), ink-800 #151d30 for nav and badges only (or merge after designer OK), ink-600 #3a3c75 for body.

#### [minor] `tokens-offpalette-greys`
- **Brief:** §6 Tokens ('No off-palette colours') — No off-palette colours.
- **Figma:** `60:382 USP bar border #ededed; 60:429 highlight-column cell border #e6e6e6; 118:2587 blog hero placeholder #d9d9d9 (Figma default)` — Neutral greys that appear nowhere else. Everything else is lavender-tinted.
- **Recommendation:** Map the borders to lavender-300 #ded9f4 (or drop the white border on the purple cell). Never ship #d9d9d9; it is an image placeholder.

#### [minor] `tokens-type-scale-inconsistent`
- **Brief:** §6 Tokens (typography); §6 mobile-first — Sample the typography and document it as tokens.
- **Figma:** `48px H2 line-heights: 76 (60:15), 65 (60:12, 60:378, 60:13), 62 (60:11), 56 (69:1309), 54 (60:79), 52 (118:2588). 34px: 27 (89:7453, 91:11408), 38 (60:495), 43 (69:1441), 65 (84:4526). 16px body: 22/23/24/26/27/39.` — The same size and weight carries 4–6 different line-heights. The form question title has a line-height (27px) smaller than its font size (34px), so it will overlap when it wraps on mobile. Many nodes also use text-box-trim (cap/alphabetic), which makes Figma spacing cap-height based.
- **Recommendation:** Normalise to the proposed scale (h2 1.2, h3 1.15, body 1.5, body-lg 1.667, etc.; see extra_data). Accept small drift from Figma for multi-line text. Optionally use CSS text-box-trim as a progressive enhancement for pixel-closeness.

#### [minor] `tokens-radius-shadow-sprawl`
- **Brief:** §6 Tokens (radii and shadows) — Read radii and shadows from Figma and put them in @theme.
- **Figma:** `Radii 7, 8, 10, 12, 16, 18, 18.5, 19.5, 20, 23, 24, 25, 26, 30, 34, 35, 36, 37, 40, 41. Shadows: header 84:4033 (0 13 31.8 rgba(0,0,0,.13)) vs 118:2069 (0 10 31.8 rgba(0,0,0,.25)); step cards 60:347 (0 11 29.2 rgba(0,0,0,.53)); 67:876 (rgba(68,85,15,.06)); and so on.` — About 20 radii and 13 shadows with no system behind them. The header shadow differs between pages. The step-card shadow is very heavy (53% black).
- **Recommendation:** Consolidate to 8 radii (8, 12, 16, 20, 24, 30, 40, pill) and 7 shadows plus 2 glows (see extra_data). Use the Step 1 header shadow everywhere. Confirm the heavy step-card shadow with the designer.

#### [info] `tokens-font-optical-size`
- **Brief:** §11 (self-host fonts, font-display: swap) — Self-host the fonts with font-display: swap and check the licence.
- **Figma:** `Every text node: fontVariationSettings "opsz" 14, "wdth" 100 (e.g. 60:320 at 60px, 60:500 at 80px)` — Optical size is pinned at 14 at every size. That is the font's default (confirmed: the Google Fonts wght-only file is identical to the opsz=14 file).
- **Recommendation:** Self-host @fontsource-variable/bricolage-grotesque wght.css/index.css (latin 41 KB + latin-ext 19 KB), which has no opsz axis and so matches Figma. Don't use opsz.css or standard.css; with them, font-optical-sizing:auto would set opsz = font-size and change the headings. If they are ever needed, set font-optical-sizing: none. Preload the latin woff2 and add a metric-matched fallback for CLS. Run GSAP SplitText after document.fonts.ready. Licence: OFL-1.1, noted for docs/decisions.

#### [info] `tokens-no-figma-variables`
- **Brief:** §6 Tokens ('Use variables if they exist; otherwise sample the styles and document them') — Use variables if they exist; otherwise sample.
- **Figma:** `get_variable_defs 60:2 / 84:3972 / 69:931 = {}. search_design_system style/variable = []. get_libraries: community kits only.` — No variables, styles, components or Code Connect. The layout is absolute and flat (no auto-layout). Whole-page get_design_context is too large for Homepage 3 and the product pages.
- **Recommendation:** Use the sampled token table as the source (figma/tokens.md). Future syncs have to be per-node. Suggest the designer turns the agreed tokens into Figma variables, so later get_variable_defs calls return them.

#### [info] `tokens-emoji-eyebrow`
- **Brief:** §11 fonts — Self-host the fonts.
- **Figma:** `60:322 '👋 Welkom bij voordeelvinder' (emoji 28px)` — The eyebrow uses a system emoji, rendered as Apple emoji in Figma.
- **Recommendation:** Accept that it renders differently per OS, or export the hand as an SVG icon for a consistent look. Decorative, so aria-hidden.

### Open questions

- Which lime is the primary button: #c9e260 (all marketing CTAs) or #b7e137 (form 'Volgende'/'Indienen', newsletter)? Working assumption: #c9e260 for all CTAs, #b7e137 for accents only.
- Should the grain/noise effect on purple surfaces (hero, 'Hoe het werkt', CTA band, form panel, footer) be kept? If yes, it becomes one tiled-image utility; if no, surfaces are flat #7051ed.
- Designer/client sign-off on the colours the design lacks: danger #c62828, placeholder #6b6790, control border #897dec (radio, checkbox, input), focus ring (purple-500 on light; white or lime on purple), selected answer-card style, and the TESTMODUS badge colour.
- Can #674bd9 (progress bar only) collapse into #6c5ce7, and #151d30 into #03080f? Or are these deliberate?
- Is the heavy step-card shadow (0 11 29 rgba(0,0,0,.53), 60:347) intentional? And should the header shadow be the Step 1 version (α.13) or the Read Blog version (α.25)?
- Cross-slice, for the content/assets reviewers: the hero illustration bitmap (around 63:860 '54544 1') has '€ 52 /maand' and 'BESTE DEAL' baked into the artwork. That is a savings figure, which §2 says never to invent or show without real data. Confirm with the client or crop/replace the asset.
- Cross-slice, for the pages reviewers: Figma contains designed 'About us' (100:2), 'Blogs overview' (113:1135) and 'Read Blog Page' (118:2067) frames. §5 says the blog is 'not designed' and 'Over ons' is a homepage anchor. The tokens I sampled there (header, footer, Bricolage) match the system; the blog page uses a #d9d9d9 image placeholder.

### Detail

### A. Colour inventory
Hex values are exact from get_design_context unless marked px (pixel-sampled from a 1:1 render). The node counts are the nodes I sampled, not an exhaustive census.

| Hex / value | Where used (node ids) | ~n | Proposed token |
|---|---|---|---|
| #7051ed | hero bg 60:4/75:2832, footer 60:496/84:4326/91:11163/118:2269, form panel 88:7430/91:11398, "Hoe het werkt" 60:9, CTA band 60:49, table header 60:427, value-card plates 60:5/60:7, final CTA btn 60:503, answer icons (svg) | 15+ | purple-600 |
| #6c5ce7 | "Stap X van Y" 89:7443, step pills 60:359, VV column 60:429(×6), battery CTA 69:922, 60:51, FAQ icon circles (×5/page), icon tiles 60:402/81:3842, "Antwoord" 60:111, consent link 91:11444, blog date 118:2589, bar 67:894, quote/row icons (svg) | 35+ | purple-500 |
| #674bd9 · rgba(103,75,217,.13) | progress fill 89:7442/91:10963 · track 89:7441 | 4 | purple-700 · track = purple-700/13 |
| rgba(108,92,231,.06 / .14 / .15 / .23 / .36 / .56) | icon tiles 60:113, 60:770 · row shadow · FAQ gradient end 60:3 · row border 60:428/69:1374 · CTA glows 60:503/60:324 | 20+ | purple-500/α |
| rgba(198,185,248,.56) 3px | icon-tile border 60:113, 60:770 | 9 | lavender-300 (merge) |
| #f6f4ff (+#f5f4ff, px #f6f6fe) | answer cards 89:7452, inputs 91:11420, checkbox 91:11443, value cards 60:18/69:951, purple badge 60:37, product FAQ items 69:990/80:2908, side card 69:983 | 30+ | lavender-50 |
| #f2f0ff (+#f0edff) | battery block 67:893, USP circles (svg) | 3 | lavender-100 |
| #ded9f4 | 1px borders: form/progress cards, answer cards, icon tiles, back btn, inputs, checkbox, prefix chip | 20+ | lavender-300 |
| #cfcae4 · #c4bce7 | form divider (svg 89:7469) · radio ring (svg 90:8968) | 2 · 3/step | lavender-400 · replace with control-border |
| rgba(240,236,255,.4) to rgba(108,92,231,.15) | FAQ section gradient 60:3 | 1 | gradient-faq |
| #c9e260 | top strip 84:4032/60:118, header CTA 84:4034, hero CTA 60:324, 69:917, CTA btns 60:82/60:87, highlight chip 60:10/60:499, icon tiles 60:410/69:1343, plate 60:6 (px), solar CTA band 81:3582/81:3830 | 20+ | lime-300 |
| #b7e137 | form btns 89:7461/91:11407, newsletter btn 84:4534, USP blob 60:383, "Andere" column 60:430(×6), accent plates 67:892, bar 66:862, border 60:19, footer icon circles 60:736 (px), icon tiles 81:3843 | 25+ | lime-400 |
| rgba(183,225,55,.28 / .19) | badges 60:22 · 60:421/66:866 | 4+ | lime-400/20 |
| #f8fceb (+#f8fbeb) | solar block 66:861 · middle value card 75:2835/80:2884 | 3 | lime-50 |
| rgba(165,202,53,.53) | lime pill glow 84:4034/60:82 | 5+ | shadow-glow-lime |
| #ffffff | page, header, cards, text on purple | many | white |
| #03080f | H2 60:378/60:13/69:1309, titles 60:67, labels, btn text 60:327/89:7488, FAQ Q 60:91, final CTA 60:500 | 40+ | ink-900 |
| #000000 | question titles 89:7453/91:11408, field labels 91:11419, step titles 60:366, USP 60:384, 67:883 | 20+ | → ink-900 |
| #151d30 | nav 84:4274, header CTA label 84:4037, H2 60:15, card title 60:42, badges 60:25/60:424/60:39, 60:85, 60:90 | 12+ | ink-800 |
| #3a3c75 | intros 60:16/60:379, card body 60:45/60:365, FAQ answers 60:109, table labels 60:438/60:439, consent 91:11444, testimonials, 60:502 | 40+ | ink-600 |
| #aea9c6 · rgba(3,8,15,.34) | placeholders 91:11431/89:7946 · newsletter 84:4532 | 6+ | → ink-placeholder (NEW #6b6790) |
| rgba(255,255,255,.65) · white 34% | form panel body 89:7436 · footer dividers (svg) | 11 · 3 | white/90 · white/35 (decorative) |
| #ededed · #e6e6e6 · #d9d9d9 | USP border 60:382 · VV cell border 60:429 · blog placeholder 118:2587 | 1 · 6 · 1 | one-offs → lavender-300 / drop |
| #ffad15 | stars 60:337, 60:757 (hidden blocks only) | 2 | star (only if ratings come back) |
| #fe9d19, #563cec … | logo and mascot artwork only (inside assets) | — | not a CSS token |

Near-duplicates (ΔE): f6f4ff/f5f4ff 0.35 · f8fceb/f8fbeb 0.67 · f2f0ff/f0edff 1.84 · f6f4ff/f6f6fe 1.76 · 03080f/000 3.97 · ededed/e6e6e6 2.46. Purples: 7051ed/6c5ce7 10.6, 6c5ce7/674bd9 6.9. Limes: c9e260/b7e137 16.2.

### B. Typography
Every style is Bricolage Grotesque with opsz 14 and wdth 100.

| Role → token | Weight | Size / line-height (Figma) | Tracking | Sample nodes |
|---|---|---|---|---|
| text-display | 600 | 80 / 104 | −2.4 (−3%) | 60:500, 60:501 |
| text-h1 | 600 | 60 / 70 | −1.8 | 60:320, 69:1252 |
| text-h2 | 600 | 48 / 52–76 → 1.2 | −1.44 | 60:15, 60:12, 60:378, 60:13, 60:79, 69:1309 |
| text-h3 | 600 | 34 / 27–65 → 1.15 | −1.02 | 89:7453, 91:11408, 60:495, 69:1441, footer 84:4526 |
| text-h4 | 600 | 30 / 32 | 0 | 89:7435 |
| text-title-lg | 600 | 24 / 27 | −0.72 | 60:366 |
| text-title | 600 | 22 / 27 | −0.66 | 60:42, 60:67, 60:773 |
| text-title-sm | 600 | 20 / 27–30 | −0.6 / −0.4 | 67:883, 60:439, 60:440 |
| text-lead | 400 | 24 / 30–32 | −0.48 | 60:322, 60:25, 60:502 |
| text-body-xl | 400 / 500 | 20 / 30 (USP 20/20) | −0.4 / −0.6 | 60:436, 60:438, 60:91 (Medium), 60:384 |
| text-body-lg | 400 | 18 / 30 (60:80: 28) | −0.36 | 60:16, 60:48, 89:7454, 89:7975, 91:11444, 89:7488 |
| text-body | 400 | 16 / 24 (22–27, footer 39) | −0.32 | 60:45, 60:109, 60:321 (26), 89:7436 (23), 60:772 (22) |
| text-sm | 400 | 14 / 20 (nav 36) | −0.28 | 67:882, 84:4274 |
| text-label | 600 | 18 / 36 | −0.54 | 91:11419, 90:10441, 60:845 (18/37) |
| text-label-sm | 600 | 14 / 20 | 0 | 89:7443 |
| text-button / -lg | 500 | 16 / normal · 20 / normal | 0 | 60:327, 84:4037, 69:920 · 60:85, 60:506 |
| placeholder | 400 | 16 or 18 / 30 | −0.48 / −0.36 | 91:11431, 89:7946 |

### C. Radii, borders, shadows, layout
- Radii found: 3 (flag), 7, 8, 10, 12, 16, 18, 18.5/19.5, 20, 23, 24, 25, 26, 30, 34, 35, 36, 37, 40, 41. Proposed: xs 8 · sm 12 · md 16 · lg 20 · xl 24 · 2xl 30 · 3xl 40 · pill 9999.
- Borders: 1px almost everywhere; 3px on icon tiles (60:113, 60:770); 2px SVG stroke on the USP circles; 1px white on pill CTAs.
- Shadows found: header 0 13 31.8 α.13 (blog 0 10 31.8 α.25); form card 0 29 64 rgba(41,32,132,.08) (progress .11); cards/FAQ-open 12 12 48 rgba(40,34,88,.07); testimonials 0 15 50 rgba(40,34,88,.15); rows 0 4 22.1 rgba(108,92,231,.14); USP 0 18 27 α.05; step cards 0 11 29.2 α.53; solar features 0 13 24 rgba(68,85,15,.06); lime glow 0 2 8.2 rgba(165,202,53,.53); hero CTA 0 7 19 rgba(108,92,231,.56); final CTA 0 2 8.2 rgba(108,92,231,.36). All pill buttons also carry an inset 0 0 17.4 white gloss (100% or 70%).
- Texture: Figma Noise effect on purple surfaces (60:4 svg: feTurbulence fractalNoise 2, black 25% specks).
- Layout at 1440: content x135–1305 = 1170px (135 side padding); header x137–1307, 16px lime strip + 69px bar = 85px; form x132–1296 = 1164px (panel 372 + gap 24 + card 767; card padding 48); wide panels 1378 (x30, r40) and 1391 (x25); product blocks 1168; solar CTA band 1184 (x128). Proposed mobile: 16px gutter (brief), 24px on tablet.
- Vertical rhythm: badge→H2 17–19 · H2→intro 16–19 · intro→content 46–51 · gaps between sections 90–224 (90/107/123/128/155/160/202/224). Proposed tokens: section clamp(64px, 8vw, 120px); stack gaps 16 / 48.

### D. Contrast (WCAG 2.x; computed in figma/contrast.py)
| Pair | Ratio | Use | Result |
|---|---|---|---|
| #fff on #7051ed | 5.14 | hero, footer, panel, CTA band, table header | PASS |
| #fff on #6c5ce7 | 4.86 | VV column SB20, battery CTA M16, "Stap 01" SB18 | PASS |
| #6c5ce7 on #fff | 4.86 | "Stap X van Y" SB14, "Antwoord" 16, links | PASS |
| #6c5ce7 on #f6f4ff | 4.47 | (avoid for small text) | FAIL, borderline |
| rgba(255,255,255,.65) on #7051ed | 3.10 | form panel body R16 | FAIL (needs ≥90% white) |
| #03080f / #151d30 on #c9e260 | 13.90 / 11.62 | CTA labels | PASS |
| #03080f on #b7e137 | 13.24 | Volgende / Indienen / Abonneren | PASS |
| #3a3c75 on #b7e137 | 6.64 | table "Vaak/Zelden" SB20 | PASS |
| #3a3c75 on #fff / #f6f4ff / #f8fceb / #f2f0ff | 10.08 / 9.27 / 9.66 / 8.97 | body | PASS |
| #151d30 / #03080f on #fff | 16.80 / 20.09 | nav, headings | PASS |
| #aea9c6 on #f6f4ff | 2.08 | placeholders | FAIL |
| rgba(3,8,15,.34) on #fff | 2.30 | newsletter placeholder | FAIL |
| #c4bce7 ring on #f6f4ff | 1.65 | radio (1.4.11, needs 3:1) | FAIL |
| #ded9f4 on #fff | 1.37 | checkbox / input border (1.4.11) | FAIL |
| #f6f4ff fill on #fff | 1.09 | input boundary | FAIL |
| #674bd9 fill vs track #ebe8fa | 4.87 | progress (UI) | PASS |
| #c9e260 / #b7e137 on #7051ed | 3.55 / 3.38 | lime shapes on purple (UI) | PASS |
| #fff on #c9e260 / #b7e137 | 1.45 / 1.52 | not used; forbid | FAIL (guard rule) |
| Fixes | #6b6790 placeholder 4.86 · #897dec control border 3.38/3.11 · #c62828 danger 5.62/5.17 · white/90 on #7051ed 4.50 | | |

### E. Fonts
- The only family is Bricolage Grotesque (Mathieu Triay), SIL OFL-1.1, Google Fonts (added 2023-06-15). Axes: opsz 12–96 (default 14), wdth 75–100, wght 200–800. Subsets: latin, latin-ext, vietnamese.
- Weights used: 400, 500, 600. No italics.
- Package: @fontsource-variable/bricolage-grotesque 5.3.0, family 'Bricolage Grotesque Variable'. Files: index/wght.css (latin 41,344 B + latin-ext 18,668 B), opsz.css (76,888 B), standard.css (131,548 B, all axes). font-display: swap is built in.
- Use the wght-only file: it matches Figma (opsz 14). Preload the latin woff2, add a size-adjusted fallback font, and apply no font-variation-settings.

### F. Motion
- get_motion_context recursive on 60:2 and on 84:3972 → {"nodes":[]}. Use the brief's defaults: fast 150 / base 250 / slow 400 ms; ease-out cubic-bezier(0.22,1,0.36,1); in-out cubic-bezier(0.65,0,0.35,1); spring 400/32; distances 8/16/24.

### G. Proposed @theme
The full block is in the notes file, section 11. Colours: purple-600 #7051ed, purple-500 #6c5ce7, purple-700 #674bd9, lavender-50 #f6f4ff, lavender-100 #f2f0ff, lavender-300 #ded9f4, lavender-400 #cfcae4, lime-300 #c9e260, lime-400 #b7e137, lime-50 #f8fceb, ink-900 #03080f, ink-800 #151d30, ink-600 #3a3c75, plus NEW: ink-placeholder #6b6790, control-border #897dec, danger #c62828. Also: font-sans 'Bricolage Grotesque Variable'; the --text-* scale in B with its --line-height, --letter-spacing and --font-weight sub-tokens; the radii, shadows and containers in C; the motion tokens in F.

---

<a id="assets"></a>
## Assets (mascot, icons, images)

**Frames reviewed:** 60:2 Homepage 3; 69:931 Solar Panel Page; 80:2867 Home Battery; 100:2 About us (assets only); 113:1135 Blogs overview (assets only); 118:2067 Read Blog Page (assets only); 84:3972 Step - 1 (plus the mascot and logo nodes on all 12 step frames, via metadata); 91:11921 Step - 7 No, 91:13376 Step 8 copy (sibling screenshots); 91:13857 Thank you page; 91:14645 Thank you page copy

**Summary.** The layered mascot the brief asks for can't be built from the current Figma layers.
- **Raster poses:** nine of the ten mascot poses are raster PNGs. Their layer names ("ChatGPT Image Sep 22, 2026, 01_37_15 PM 5/9") mark them as AI-generated.
- **Vector pose:** the one vector pose, "Group 21" (the waving fox), appears in the logo on every frame and in the solar, battery and About us heroes. It is one flat group of 92 auto-traced paths, and the whole black outline is a single path under all the colour fills.
- **What we can animate now:** the eye paths can be regrouped by hand for a blink, and any pose can move as a whole. Moving the head or an arm needs the designer to split the outline, or to supply a Rive file.

The §6.1 morph goes between two different raster drawings:
- **Form panel:** a sprite crop of the fox with a laptop and energy bubbles (89:7439).
- **Thank-you page:** a thumbs-up fox inside a circle badge (91:14643).

So the morph will look like a crossfade, not the same fox moving. The thank-you fox gives a static thumbs-up and doesn't cheer, although cheering poses exist as rasters elsewhere in the file (60:723, 78:2856).

The homepage hero image (63:860) has "€ 52 /maand" and "BESTE DEAL" drawn into the picture. That is an invented price and a results claim, and it can't be hidden through content.

Several rasters are below 2x at 1440 px desktop width:

| Asset | Node | Density |
|---|---|---|
| Hero fox | 63:860 | 1.0x |
| Final-CTA cheering fox | 60:723 | 0.88x |
| Solar bulb | 67:875 | 1.1x |
| House and batteries | 69:929 | 1.3x |
| Cheering fox, fists up | 78:2856 | 1.5x |
| Product hero images | 72:2733, 81:3860 | 1.6–1.8x |

The AI sprite sheets are also upscales of a 1536x1024 original, so each pose has only about 512 px of real detail.

The icons are a mixed set:
- **UI icons:** one vector family (the "Frame" icons).
- **Vectorised downloads:** "[Vectorized]" icons traced from stock-style PNGs. One is a "$" money icon on a euro site.
- **Raster icons:** seven kinds of icon that are still black 512 px PNGs.
- **Flags:** a Belgian and a Dutch flag PNG, which aren't needed because the phone prefix is a fixed +32.

The logo is fully vector, with an outlined wordmark. Because the fox is duplicated for the head-over-circle effect, the logo is about 116 KB of unoptimised SVG. There is no favicon, OG image or social icon anywhere in the file.

### Confirmed against the brief

- §2: the fox mascot with a green (lime, checked) cap is consistent in every pose. The purple jacket and lime shirt match the purple and lime-green palette.
- §6 'SVG where possible': the logo lockup (badge 60:125 + outlined wordmark 60:317 / 60:704) is fully vector, with no raster fills, so it can ship as SVG.
- One true vector mascot exists: 'Group 21' (waving fox, 92 paths, clean at any size). It is used in the logo badge on all 19 visible frames, the solar hero 72:2734, the battery hero 81:3863 and About us 109:799.
- Most icons are vector: the UI icon family ('Frame' > 'Vector': arrows, info, plus, chevrons, mail, phone, pin, eye, rocket), the '[Vectorized]' feature icons, the Step 1 product-card icons (89:7470, 89:7475, 89:7479), the yes/no check-circle and x-circle, the comparison-row lightning icons, the stars and the quote marks.
- Rasters with at least 2x density at desktop size: form-panel mascot 89:7439 (2.9x from the 2922x1948 sheet), thank-you mascot 91:14643 (3.9x), hero solar + battery 62:858 (3.1x), magnifier fox 60:345 (9.7x), documents fox 60:849 (2.7x), FAQ laptop fox 60:747 (11x), icon-pattern mask 60:73 (2.0x). All work with Astro <Image> as AVIF/WebP.
- All mascot and illustration rasters are transparent PNGs (RGBA with 45–78% transparent pixels), so they sit cleanly on the purple panels.
- §6.1 'Figma file contains no animation' is consistent with the assets: there are no Rive or Lottie files and no animated layers.
- The mascot appears in both slots §6.1 names for the morph: the form panel (all 12 step frames, same crop and position 157,579, 323x289) and the thank-you card (91:14643).

### Findings

#### [major] `assets-mascot-not-layered`
- **Brief:** §6 Assets (layered SVG: head, eyes, arms as separate groups) + §6.1 mascot motion — Export the mascot as a layered SVG, with head, eyes and arms as separate groups if the Figma layers allow it, so parts can move.
- **Figma:** `89:7439 'ChatGPT Image Sep 22, 2026, 01_37_15 PM 5' (raster), 91:14640/91:14642 'Group 21 1/2' (raster), 63:860, 60:345, 60:723, 60:747, 60:849, 78:2856 (raster); 72:2734 / 81:3863 / 109:799 / logo 'Group 21' (vector)` — Nine of the ten poses are raster PNGs (AI-generated), so no layers exist. The only vector pose, the waving 'Group 21', is one <g> of 92 unnamed auto-traced paths. Its entire black outline is ONE path ('Vector', #03080F, a single M..Z subpath) under all the colour fills. Rotating the head or arm would leave a black silhouette behind. The eye, pupil, nose and mouth paths are separate (Vector_2, 5, 6, 7, 12, 13, 14, 23, 28, 29), so an eyes group can be rebuilt by hand.
- **Recommendation:** Working assumption: whole-mascot transforms (hop, tilt, scale) on any pose, plus a hand-built #eyes group on the vector waving fox for a blink. Ask the designer, before Phase 7, for a part-split vector mascot: separate outlines per head, torso, each arm, tail and legs, named groups, pivot points. A Rive file would also do (§6.1 allows it). Ideally also vector versions of the laptop, thumbs-up and cheer poses.
- **Verified:** partly — Eight of the nine mascot poses are raster image fills. The only vector pose, the waving fox 'Group 21' (72:2734, 81:3863, 109:799 and the logo), is one flat group of 92 unnamed vectors. Its first vector covers the full bounding box, most likely the outline, so the head and arms cannot be moved without a part-split source from the designer. Hand-grouping the eyes for a blink is feasible.

#### [major] `assets-morph-two-different-images`
- **Brief:** §6.1 Signature morphs: 'The mascot moves from the form panel to its place on the thank-you page' — The mascot moves from the form panel to its place on the thank-you page.
- **Figma:** `89:7439 (form panel, all steps) vs 91:14643 'Group 72' (Thank you page 91:13857)` — The source is a raster sprite crop (sitting fox with laptop, lightning and flame bubbles, 323x289, bottom-left of the purple panel). The target is a different raster pose (thumbs-up, 174x180) inside a circle badge, where the head breaks out through a mask trick. A view transition will animate the box but cross-fade two different drawings.
- **Recommendation:** Default: build the morph as a box morph plus crossfade, and show it on staging. For a true 'same fox moves' effect, use one asset in both slots, e.g. the vector waving fox or the same raster pose. That is a design change, so Tanjil and the designer need to approve it.
- **Verified:** confirmed

#### [major] `assets-hero-baked-price`
- **Brief:** §2 claims ('never invent savings figures', 'Direct resultaat' needs sign-off), §3 (no on-screen results), §17 (never invent content) — Savings figures such as '€[X]' are never invented, and blocks containing them stay hidden until the client sends real content. The MVP shows no on-screen results.
- **Figma:** `63:860 '54544 1' (Homepage 3 hero, 615x604 raster)` — The hero mascot holds a card reading "€ 52 /maand" and "✓ BESTE DEAL", drawn into the PNG. It can't be hidden or edited through content JSON, and it is part of the likely LCP area. The source sprite sheet also contains "€ 68 /maand" and "€ 52 /maand" cards and the list 'Vergelijk eenvoudig / Bespaar geld / Slimme keuze' (not used elsewhere).
- **Recommendation:** List it in docs/CONTENT-TODO.md and ask the designer for a version without the figure. Working assumption until then: build the homepage hero with the product-page pattern (vector waving fox 'Group 21' + raster 62:858 solar/battery). Keep 63:860 behind a content flag, off by default.
- **Verified:** confirmed

#### [major] `assets-licence-provenance`
- **Brief:** §6 Assets / §17 (never invent content); §6 fonts licence note, by analogy — The brief doesn't cover asset licences. It only asks for a licence check on the fonts.
- **Figma:** `Icons named 'money 1', 'check (2) 1', 'compare 1', 'decision-making 1', 'car-battery 1', 'label 1', 'X 1 [Vectorized]'; rasters '54544 1', '564654 1', '5874891 1', '6548 1', 'Asset 1 2/3'; 'ChatGPT Image …'; stock avatars 60:330–336, 60:754 etc.; team photos 113:991/113:1018/113:1022` — The names point to downloaded stock icons (Flaticon-style, which need attribution unless Premium-licensed) and stock illustrations and photos. The mascot art is AI-generated (ChatGPT) and was auto-traced for the vector fox and icons. The About-us team uses the same male photo for two different names.
- **Recommendation:** Add an asset-licence line to docs/CONTENT-TODO.md: confirm the icon pack licence or attribution and the stock illustration licences. Never ship the stock avatars or team photos (they are hidden per §2 or outside the MVP).
- **Verified:** partly — The layer names suggest AI-generated mascot art and stock-downloaded icons and illustrations. The licence cannot be determined from Figma, so ask the designer and client to confirm the sources and any attribution duty for the icons and illustrations that will ship. The duplicated team photo is confirmed, but that block is outside the MVP.

#### [minor] `assets-low-res-rasters`
- **Brief:** §6 Assets (WebP/AVIF via <Image>), §11 performance (responsive images) — Use raster exports via Astro <Image>. This implies retina-quality responsive images.
- **Figma:** `63:860 (615 px native / 615 displayed), 60:723 (1584-wide sheet at 1794 displayed), 67:875 (835 / 762), 69:929 (1024 / 788), 78:2856 (957 / 639), 72:2733 (1024 / 581), 81:3860 (1024 / 648)` — Effective density at 1440 desktop: hero fox 1.0x, final-CTA cheering fox 0.88x, solar bulb 1.1x, house and batteries 1.3x, cheering fox 1.5x, product heroes 1.6–1.8x. The sprite sheets are upscales of a 1536x1024 original, so each pose has about 512 px of real detail. Mobile sizes are mostly fine.
- **Recommendation:** Crop the final-CTA cheer from the 2922x1948 sheet instead of the 1584 one (gets 1.63x). Ask the designer for at least 2x sources, or vector originals: the solar bulb 67:875 looks like flat stock vector art. Accept 1x on desktop for now and note it in the PR.

#### [minor] `assets-raster-icons`
- **Brief:** §6 Assets ('export as SVG where possible') — Icons should be SVG where possible.
- **Figma:** `'contract 1' 60:848/69:1789/80:3459, 'compare 1' 60:370/69:1301/80:3172, 'decision-making 1' 60:372/69:1303/80:3174, 'solar-panel 1' 67:878, 'car-battery 1' 69:926, 'label 1' 81:3847/81:3966, 'check (2) 1' 81:3849/81:3971` — Seven icon types are still visible raster PNGs: 512x512, pure black on transparent. The other icons from the same kind of source were vectorised ('[Vectorized]'). The whole icon set mixes three sources and fill colours (black, #6C5CE7, #7051ED, white).
- **Recommendation:** Ask the designer to vectorise these like the others, or swap in the matching SVG from the same pack (licence permitting). Interim: 512 px PNG via <Image>. Export every SVG icon with currentColor.

#### [minor] `assets-dollar-icon`
- **Brief:** §1/§2 (Belgian audience), §6 design fixes — The site targets Belgian households, who pay in euro.
- **Figma:** `'money 1 [Vectorized]' 60:403 (Homepage 3, 'Waarom VoordeelVinder bestaat' card 1), 69:1336 (Solar), 100:307 (About us)` — The invoice icon shows a US dollar sign '$'.
- **Recommendation:** Use a euro variant of the icon (same style) and note it in the PR as a design fix.
- **Verified:** confirmed

#### [minor] `assets-no-favicon-og`
- **Brief:** §4.3 public/ (favicons, og images), §11 SEO (OG image per page) — public/ holds favicons and OG images, and every page has an OG image.
- **Figma:** `none (closest source: logo badge 'Group 27' 60:125)` — There is no favicon, app icon or OG image design. The only candidate is the 51x54 logo badge, whose full-body fox with the head breaking out of the circle is unreadable at 16–32 px.
- **Recommendation:** Working assumption: favicon.svg plus PNG sizes 32/180/192/512 from the badge cropped to its circle, and a default 1200x630 OG image composed from the logo and the vector fox on purple, with per-page overrides from content JSON. Ask the designer for a simplified fox-head mark.

#### [minor] `assets-thankyou-not-cheering`
- **Brief:** §6.1 Submit: 'Celebrate on the thank-you page (the mascot cheers)' — The mascot cheers on the thank-you page.
- **Figma:** `91:14643 (Thank you page); cheering rasters 60:723 (Homepage final CTA) and 78:2856/80:3568 (Solar/Battery)` — The thank-you mascot gives a static thumbs-up. Cheering poses exist only as separate rasters on other pages.
- **Recommendation:** Default: animate the thank-you badge as a whole (a hop, CSS/Motion confetti, reduced-motion fallback) and keep the designed pose. Offer the 78:2856 cheer pose as an alternative on staging.

#### [info] `assets-logo-svg-weight`
- **Brief:** §11 performance (LCP, Lighthouse ≥ 90) — Meet the performance targets on mobile.
- **Figma:** `Group 28 60:124 (header), Group 60 60:512 (footer), on every frame` — The logo is fully vector, but the 92-path fox is duplicated (masked copy + overflow copy). The export is ~116 KB of unoptimised SVG (52.1 + 50.8 + 12.5 KB) for a 51 px badge, repeated in the header and footer.
- **Recommendation:** Run SVGO, define the fox once as a <symbol>/<use> clipped twice, and cut path precision. Target under 30 KB, or ship the badge as a 2x/3x WebP next to the SVG wordmark.

#### [info] `assets-mirrored-vector-mascot`
- **Brief:** §6 Design implementation (pixel-close) — Build pixel-close to the design.
- **Figma:** `72:2734, 81:3863, 109:799 'Group 21'` — On the product pages and About us, the vector fox is flipped horizontally in Figma (it waves on the viewer's left). The MCP SVG export comes out un-mirrored (it waves on the right, as in the logo).
- **Recommendation:** Export once and apply transform: scaleX(-1) where the design mirrors it.

#### [info] `assets-form-mascot-energy-specific`
- **Brief:** §5 (one form per product), §7.4 solar/battery flows — The form serves the energy, solar and battery flows.
- **Figma:** `89:7439 (all step frames) vs 60:747 'Group 3 1'` — The form-panel mascot has lightning and flame bubbles drawn in (electricity and gas). The same laptop pose without bubbles exists as 60:747 (4096 px source).
- **Recommendation:** Make the panel mascot configurable per flow. Use 89:7439 for energy and 60:747 for solar and battery, as a working assumption.

#### [info] `assets-flags-unused`
- **Brief:** §6 design fixes (fixed +32 prefix, no country picker, no Dutch flag) — The phone field has a fixed +32 prefix and no flag.
- **Figma:** `'flag (2) 1' 113:1919 (BE PNG, Step 8 91:10958), 'flag (1) 1' 91:13845 (NL PNG, stale copy 91:13376)` — Raster flag images (512x512 PNG shown at 32x22).
- **Recommendation:** Don't export the flags.

#### [info] `assets-emoji-eyebrow`
- **Brief:** §6 Assets / §11 accessibility — The brief says nothing specific about emoji.
- **Figma:** `60:322 text '👋 Welkom bij voordeelvinder'` — A text emoji, drawn with Apple's glyph in the design. It renders differently per OS.
- **Recommendation:** Keep it as a text emoji with aria-hidden, or swap in a small SVG if the look must match across platforms.

#### [info] `assets-wordmark-casing`
- **Brief:** §2 Brand 'VoordeelVinder' — The brand is written 'VoordeelVinder'.
- **Figma:** `60:317 / 60:704 'Voordeelvinder' (outlined vector wordmark)` — The logo wordmark reads 'Voordeelvinder', with a lower-case v.
- **Recommendation:** Ship the logo as designed (it is artwork). Note the difference for the client.

#### [info] `assets-no-social-or-blog-imagery`
- **Brief:** §4.3 site.json (social links), §5 blog — site.json holds social links, and the blog has listing and post templates.
- **Figma:** `footer on every frame; Blogs overview 113:1135 / Read Blog 118:2067` — The footer has no social icons. The blog cards use grey placeholder rectangles with no imagery.
- **Recommendation:** Keep social links in site.json with no rendering until icons are designed. Blog images come from each post's frontmatter via <Image>.

#### [info] `assets-stacked-hidden-fills`
- **Brief:** §6 Assets (exports) — Export the assets.
- **Figma:** `89:7439 (6 image fills), 91:14640/91:14642 (4 fills), 60:330/60:754 (2 fills)` — Mascot and avatar nodes carry stacked image fills: the original 1536x1024 white-background version, a background-removed version, an upscale and thumbnails. download_assets returns all of them, and its 'export' render comes back flattened and opaque.
- **Recommendation:** Export only the visible fill (the URL from get_design_context), not the node export.

### Open questions

- Can the designer supply a part-split vector mascot (separate outlines for head, torso, each arm, tail and legs, named groups, pivot points), or a Rive file, before Phase 7? Or do we limit Phase 7 to whole-mascot motion plus an eye blink?
- Should the mascot morph use the same asset in both slots (e.g. the vector waving fox on the form panel and the thank-you card), or do we accept a crossfade between the laptop pose and the thumbs-up badge?
- Homepage hero 63:860 has '€ 52 /maand' and 'BESTE DEAL' drawn into the image. Should we ask the designer for a clean version, or use the vector fox + 62:858 composition until then (my working assumption)?
- Asset licences: are the Flaticon-style icons and stock illustrations ('Asset 1 2/3', numeric-named PNGs) Premium-licensed, or do they need attribution? Are the stock avatar and team photos placeholders only?
- Can the designer provide at least 2x (or vector) sources for the hero fox 63:860, the solar bulb 67:875 (looks like flat vector stock art), the house 69:929 and the cheer poses, and SVGs for the seven remaining raster icons?
- Favicon: is a simplified fox-head mark wanted, or should we derive it from the logo badge (my working assumption)?
- Solar and battery flows: can we use the bubble-free laptop pose 60:747 in the form panel, since 89:7439 has energy-specific lightning and flame bubbles drawn in?

### Detail

### Mascot inventory (non-hidden frames)
| Pose | Node(s) | Where | Size | Type | Visible fill / density |
|---|---|---|---|---|---|
| Waving (vector "Group 21", 92 paths, 1 group, single black outline path) | logo badges (header Group 27 e.g. 60:125, 84:4039, 91:13868; footer Group 60 e.g. 60:512, 84:4328, all 19 frames); 72:2734 Solar hero (mirrored); 81:3863 Battery hero (mirrored); 109:799 About us | header, footer, product heroes | 51x54 / 82x87 / 319x347 / 264x287 | VECTOR | n/a |
| Laptop + lightning + flame bubbles | 89:7439 + same node on all 12 step frames; 113:1133 About us | form panel | 323x289 | RASTER crop of a 2922x1948 sprite sheet | 2.9x (6 stacked fills; original 1536x1024) |
| Thumbs-up in circle badge (head overflow via mask) | 91:14643 (91:14640 + 91:14642), copy 91:14851/52 | thank-you | 174x180 | RASTER 1024x994 used twice | 3.9x |
| Wink + thumbs-up + "€ 52 /maand" "BESTE DEAL" | 63:860 | Home hero | 615x604 | RASTER 615x604 | 1.0x |
| Magnifier | 60:345 | Home "Zo werkt" | 333x323 | RASTER 4096x3846 | 9.7x |
| Documents + € bubble | 60:849, 104:749 | Home "Waarom kiezen", About | 584x581 | RASTER 1560x1553 | 2.7x |
| Laptop, no bubbles | 60:747, 69:1688, 80:3455 | FAQ side card | 285x226 | RASTER 4096x3664 | 11x |
| Cheering with document | 60:723 | Home final CTA | 598x598 | RASTER crop of a 1584x1056 sheet | 0.88x (1.63x from the 2922 sheet) |
| Cheering, fists up + confetti | 78:2856, 80:3568 | Solar/Battery benefits | 442x482 | RASTER 957x1024 | 1.5x |

### Illustrations and photos
| Asset | Node | Native | Density |
|---|---|---|---|
| Hero solar + battery | 62:858 | 1509x923 | 3.1x |
| Solar + bulb (flat stock style) | 67:875 | 835x465 | 1.1x |
| House + batteries | 69:929 | 1024x830 | 1.3x |
| Solar hero panel | 72:2733 | 1024x830 | 1.76x |
| Battery hero units | 81:3860 | 1024x830 | 1.58x |
| Line-icon pattern (alpha mask) | 60:73 in 60:71 | 1086x1102 | 2.0x |
| Cloud texture + #6c5ce7 colour blend | 60:376/60:377 (also 69:1307, 80:3178, 100:301) | 2880x1790 RGB | 1.8x |
| Stock avatars (hidden per §2) | 60:330–336, 60:754 etc. | 736x1104 / 736x1308 | – |
| Team photos (not in the MVP; one photo reused for two names) | 113:991, 113:1018, 113:1022 | 834x1493 (113:1022) | 2.0x |
| Blog images | – | grey placeholders | – |

### Icons
- **Vector:** the UI "Frame" family (CTA arrows, info, chevrons, plus, mail, phone, pin, eye 60:835, rocket 60:837), all "[Vectorized]" icons, Step 1 card icons, yes/no check/x circles, lightning rows, stars 60:337 (#FFAD15), quote marks 60:752.
- **Raster PNG 512 px, black:** contract, compare, decision-making, solar-panel 67:878, car-battery 69:926, label, check (2).
- **Raster, not needed:** flags 113:1919 (BE) and 91:13845 (NL).
- **Other:** the emoji 👋 is text (60:322). There are no social icons.
- **Style:** mixed; one icon shows a "$".

### Export plan (short)
| Asset | Format | Notes |
|---|---|---|
| Logo lockup 60:124 / 60:512 + 60:704 | SVG | SVGO + symbol/use dedupe (~116 KB → under 30 KB) |
| Waving fox 72:2734 | SVG | scaleX(-1) where mirrored; hand-built #eyes group; whole-body motion only |
| Form-panel mascot 89:7439 | AVIF/WebP via <Image>, cropped from the 2922 sheet | view-transition-name set on click; solar/battery use 60:747 |
| Thank-you badge 91:14643 | CSS/SVG circles + WebP/AVIF ≥522 px, two layers or clip-path | cheer = animation |
| Hero 63:860 | AVIF/WebP, fetchpriority high | pending €52 sign-off; fallback: vector fox + 62:858 |
| Other illustrations (62:858, 60:345, 60:849, 60:747, 60:723 from the 2922 sheet, 78:2856, 67:875, 69:929, 72:2733, 81:3860) | AVIF/WebP via <Image> | |
| Cloud bg | pre-tinted AVIF/WebP, or CSS mix-blend | |
| Pattern 60:73 | PNG/WebP mask-image | |
| UI and "[Vectorized]" icons | SVG, currentColor | € instead of $ |
| 7 raster icons | SVG needed (designer, or same pack) | interim PNG |
| Flags, avatars, team photos | not exported | |
| Favicon | favicon.svg + 32/180/192/512 PNG from badge 60:125 | simplified head mark from the designer |
| OG default | 1200x630 | composed |

### Layered-mascot verdict
Not feasible from the current layers; it needs the designer.
- **What engineering can do now:** whole-mascot motion on any pose, and an eye blink on the vector fox.
- **What needs the designer:** head and arm motion needs a part-split outline (a layered SVG or a Rive file).

---

<a id="home"></a>
## Homepage 3 (60:2)

**Frames reviewed:** 60:2 Homepage 3 (1440x10083): full-frame screenshot at 1:1, cut into 11 section crops; Sub-nodes read with get_design_context: 60:381, 60:380, 60:321, 60:748, 60:320, 60:328, 60:500, 60:708, 60:705, 60:12, 60:120, 69:922, 60:427, 60:430, 60:107, 60:21, 60:368, 60:322, 60:80; Cross-frame text grep in page1.xml: 'Adres: Nederland', 'uw' forms, FAQ answers

**Summary.** Homepage 3 is a flat frame: 294 loose layers, no section frames, no auto-layout, and no hidden layers. By y-position it splits into 13 sections: header, hero, USP bar, "Over ons", "Hoe het werkt" steps, comparison table, solar and battery product sections, why-us, CTA banner, FAQ, testimonials, final CTA, and footer. The header nav and CTA match §5 exactly, and all three anchor targets exist. Nine of the ten §6 copy corrections occur on this frame. "Ne" does not, and the only "u" form is "Voer uw e-mailadres in". The main problems are the claims. The brief lists one "no seller" claim and one "direct result" claim; the design repeats each family about 8 to 12 times, including the FAQ answer "Nee" to "Word ik daarna opgebeld door een verkoper?". The hero mascot image itself carries "€ 52 /maand" and "BESTE DEAL", so the brief's hide rule cannot handle it. Only 1 of 5 FAQ answers is designed. The newsletter has no consent line. The product-section CTAs have no target in the brief, and nothing on the page links to /zonnepanelen or /thuisbatterij. The footer on this frame has the .com email and phone placeholders but not "Adres: Nederland". The font is Bricolage Grotesque (OFL), and every mascot and illustration is a raster image.

### Confirmed against the brief

- Nav 60:380 reads exactly 'Hoe het werkt', 'Veelgestelde vragen', 'Over ons', 'Blogs' (one text node spaced with runs of spaces), matching §5.
- Header CTA 60:123 reads 'Gratis beginnen' (lime button 60:120 with arrow icon), matching §5.
- 'Over ons' anchor target exists: pill 60:21 'Over ons' with H2 60:15 'Waarom VoordeelVinder bestaat' and 3 cards.
- 'Hoe het werkt' anchor target exists: steps section 60:9, H2 60:12 + 60:11 'Zo werkt het vergelijken van je energiecontract', 3 steps 'Stap 01/02/03'. The section itself has no 'Hoe het werkt' label.
- 'Veelgestelde vragen' anchor target exists: FAQ section with pill 60:35 'Faqs' and H2 60:14 'Veelgestelde vraag'.
- FAQ button 60:90 'Stel een vraag' exists, as §5 describes (to become a mailto).
- Footer newsletter exists (60:715: input + 'Abonneren'), as §5 describes.
- §6 corrections present on this frame: 'oordeligst' 60:321, 'e ziet meteen' 60:368, 'Geen erplichtingen' 60:80, 'Neem gerust contact op met ons op' 60:110, 'Heb nog steeds een vraag?' 60:495, 'Voor Vinder versus anderen' 60:424, 'Faqs' 60:39, 'Trusted by over 300+ customers.' 60:328, and the 'u' form 'Voer uw e-mailadres in' 60:716.
- 'Ne' does not occur on this frame. Only the correct 'Nee' (60:460) and 'Nee.' (60:109) appear.
- §2 claims present as the brief describes: 'Direct resultaat, geen wachttijd' (60:455, VoordeelVinder = 'Ja'), 'je ziet meteen welk contract het oordeligst is' (60:321), 'Doorgestuurd naar een verkoper' / 'Nooit' (60:438/60:440), 'Trusted by over 300+ customers.' (60:328), and testimonials with '€[X]' (60:748, 5 cards).
- Footer placeholders 'E-mail: info@voordeelvinder.com' and 'Telefoon: 335 224 654' present (60:708).
- No hidden layers anywhere inside 60:2. Two testimonial cards sit partly off-canvas, clipped by mask 60:748 (a carousel).
- There are no partner or supplier logos on the homepage.
- Product sections exist for Zonnepanelen (66:861) and Thuisbatterij (67:893), each with a pill label, H2, body, 3 feature items, an illustration and a CTA. These are the source for the §6.1 product-card morph.
- Typeface: Bricolage Grotesque Regular and SemiBold (opsz 14, wdth 100). It is OFL/Google Fonts, so self-hosting is fine.
- The copyright line uses the .be domain: '© 2026 VoordeelVinder.be — Alle rechten voorbehouden.' (60:722), consistent with §15 #12.

### Findings

#### [major] `home-claim-no-seller-family`
- **Brief:** §2 (Doorgestuurd naar een verkoper: Nooit), §9.3 step 4 — Only 'Doorgestuurd naar een verkoper: Nooit' is listed for sign-off. Promo leads are called by a partner, and the copy must say that clearly.
- **Figma:** `60:384, 60:44, 60:47, 60:379, 60:438/60:440, 60:66, 60:112/60:109` — The same promise appears at least 7 times: 'Geen verkoopgesprekken.' (60:384); 'Bestaande vergelijkers sturen je door naar een verkoper. Wij niet.' (60:44); 'Zonder afspraak. Zonder wachtrij. Zonder druk.' (60:47); 'De meeste sturen je door naar een verkoper, tonen niet alle opties, of bellen je daarna op. Dat doen wij niet.' (60:379); 'Doorgestuurd naar een verkoper' / 'Nooit' (60:438/60:440); 'Geen verkoopgesprekken, geen onverwachte telefoontjes.' (60:66); and FAQ Q 'Word ik daarna opgebeld door een verkoper?' with answer 'Nee. Jij bepaalt zelf of en wanneer we contact opnemen. We bellen je alleen als jij daar bewust voor kiest.' (60:112/60:109).
- **Recommendation:** Build as designed, but list every instance (not only the table row) in docs/CONTENT-TODO.md as one claim family and propose replacement copy for client sign-off. The FAQ 'Nee.' answer is the most exposed one, because it contradicts the partner callback directly.
- **Verified:** confirmed

#### [major] `home-claim-direct-result-family`
- **Brief:** §2 (Direct resultaat / je ziet meteen), §3 Later (on-screen results/calculator) — The MVP is callback-only with no on-screen results. Two phrasings are listed for replacement copy.
- **Figma:** `60:321, 60:368, 60:455/60:465, 60:65, 60:64, 60:453, 60:79/60:80, 60:502, 60:48, 60:47, 67:886/67:885, 67:907, 69:920` — Result and calculator promises appear throughout: hero 'en je ziet meteen welk contract het oordeligst is' (60:321); 'e ziet meteen wie het voordeligst is voor jou.' (60:368); 'Direct resultaat, geen wachttijd' = 'Ja' (60:455/60:465); 'Van je eerste klik tot een helder resultaat in enkele minuten' (60:65); 'We tonen de resultaten zoals ze zijn' (60:64); 'Klaar om te zien wat jij betaalt?' / 'In een paar minuten weet je of je te veel betaalt' (60:79/60:80); 'je weet meteen waar je staat' (60:502); 'Bij VoordeelVinder vergelijk je zelf' (60:47). Solar: 'Bereken je terugverdientijd' / 'tonen we hoeveel je maandelijks bespaart — en wanneer de panelen zichzelf terugverdienen' (67:886/67:885) and CTA 'Bereken je besparing' (69:920). Battery: 'We berekenen het gecombineerde voordeel in één overzicht' (67:907).
- **Recommendation:** Treat all of these as one §2 claim family in CONTENT-TODO.md with proposed callback-honest replacements, including the solar and battery calculator lines and the 'Bereken je besparing' CTA label, which promise the 'Later' calculator.
- **Verified:** confirmed

#### [major] `home-hero-image-savings-figure`
- **Brief:** §2 (savings figures such as €[X]: never invent, hide until real) — Savings figures must not be invented. Hide those blocks until the client sends real content.
- **Figma:** `63:860 '54544 1' (hero raster)` — The hero mascot illustration has '€ 52 /maand' and '✓ BESTE DEAL' baked into the raster, on the card the fox holds. It cannot be hidden through content.
- **Recommendation:** Ask the designer for a hero export without the figure (a blank card or a lightning icon only), or get the client to sign off on '€ 52'. Until then, use a cropped or alternative mascot, or ship the image with a TODO flag that is not allowed in production. List it in CONTENT-TODO.md.
- **Verified:** confirmed

#### [major] `home-callback-permission-gap`
- **Brief:** §2 ('call-permission and call-moment questions (§7.3) support that'), §7.3 step 8, §7.5 day_slot required — §2 says call-permission and call-moment questions support 'jij bepaalt of en wanneer we bellen'.
- **Figma:** `60:451/60:461, 60:109` — Row 'Jij bepaalt of en wanneer we bellen' = 'Altijd', and the FAQ says 'We bellen je alleen als jij daar bewust voor kiest.' But §7.3 and §7.5 define only a REQUIRED call moment ('Wanneer mogen we je bellen?'). There is no call-permission question, so the visitor cannot choose 'of' (whether).
- **Recommendation:** Brief owner to decide: either add an explicit call-permission field (TO CONFIRM, and it affects the flow and the payload), or change the copy to 'wanneer' only. Record the decision in CONTENT-TODO.md or an ADR.
- **Verified:** partly — The brief has an internal inconsistency. §2 cites 'call-permission and call-moment questions', but the only permission is the required §7.5 consent, so 'of en wanneer' and the FAQ answer are true only in the sense that submitting the form is voluntary. Either make the copy say 'wanneer' only, or add an optional permission field (changes the payload; TO CONFIRM). This belongs to the same claim family as home-claim-no-seller-family.

#### [major] `home-faq-answers-missing`
- **Brief:** §4.4 (faq block), §11 (FAQPage structured data), §17 (never invent content) — Build a faq block and emit FAQPage structured data on pages with FAQs.
- **Figma:** `60:91, 60:92, 60:93, 60:94 (only 60:112 has answer 60:109)` — 5 questions, only 1 answered: 'Moet ik mijn factuur bij de hand hebben?', 'Is VoordeelVinder gratis?', 'Met welke leveranciers vergelijken jullie?' and 'Zit ik ergens aan vast na de vergelijking?' have no answer text anywhere in the file (the hidden Homepage 1/2 have the same single answer). The open item also has no open-state icon (it still shows '+').
- **Recommendation:** Make the faq schema require an answer. Render and emit schema only for items that have one, and list the 4 missing answers in CONTENT-TODO.md for the client. Do not write answers ourselves. Derive the open/close icon state in code.
- **Verified:** confirmed

#### [major] `home-product-cta-targets-and-orphaned-product-pages`
- **Brief:** §5 (site map, nav), §6.1 (product card morphs into /vergelijken/<product> form card) — §5 defines homepage CTAs → /vergelijken, and product pages → /vergelijken/<product>. It does not say where the homepage product-section CTAs go. §6.1 implies the homepage product card morphs into /vergelijken/<product>.
- **Figma:** `69:917/69:920 'Bereken je besparing', 69:922/69:925 'Ontdek jouw voordeel', header 60:380, footer 60:705` — The product sections carry CTAs 'Bereken je besparing' (solar) and 'Ontdek jouw voordeel' (battery). Neither the header nav nor the footer 'Snelle links' links to /zonnepanelen or /thuisbatterij, so the product landing pages are not reachable from the homepage.
- **Recommendation:** Default: the product CTA goes to /vergelijken/<product> (this enables the morph), and the pill or H2 of each product section links to /zonnepanelen or /thuisbatterij. Also propose adding the product pages (and Blogs, once live) to the footer 'Snelle links'. Both need designer/Tanjil OK; note the assumption in the PR.
- **Verified:** partly — The target is not undefined. §6.1 implies that the homepage product sections go to /vergelijken/<product>, which is compatible with §5's 'homepage CTAs link here'. The real finding is that no designed link reaches the product landing pages. Propose linking the section pill or H2, or the footer, to them (needs designer/Tanjil OK). Severity is closer to minor/info than major.

#### [major] `home-newsletter-no-consent`
- **Brief:** §5 (footer newsletter), §9.1 (newsletter: email + consent → Mailchimp double opt-in), §7.5 newsletter text — The newsletter posts email + consent to /api/newsletter, with double opt-in.
- **Figma:** `60:715, 60:716, 60:718/60:721` — Only an email pill with placeholder 'Voer uw e-mailadres in' and the button 'Abonneren'. There is no heading, visible label, consent checkbox or privacy link.
- **Recommendation:** Add an accessible label and a consent line under the input, reusing the brief's existing text 'Ik wil tips en aanbiedingen via e-mail ontvangen.' plus a privacybeleid link as a TO CONFIRM placeholder. Change the placeholder to 'Voer je e-mailadres in'. List it in CONTENT-TODO.md.
- **Verified:** partly — The Figma facts are correct. The fix is already decided by the brief: add a visible label and a consent line reusing the §7.5 text plus a privacy link, as a TO CONFIRM for the lawyer. This is a site-wide footer change (19 frames). Minor rather than major, but it must be in the PR.

#### [major] `home-supplier-installer-claims`
- **Brief:** §2 (claims need sign-off), §7.3 supplier list TO CONFIRM, §7.4/§8 (solar/battery pending, no destination), §15 #6 — Not listed as a claim.
- **Figma:** `60:321, 60:367, 60:452/60:462, 60:93, 66:872, 67:882, 67:888, 60:368` — 'wij vergelijken Luminus, Mega en TotalEnergies' (60:321); 'We checken Luminus, Mega en TotalEnergies op basis van jouw gegevens. Transparant, zonder verborgen voorkeur.' (60:367); 'Open over welke leveranciers we vergelijken' = 'Ja' (60:452/60:462); 'wij regelen dan de rest. Je zit nooit zonder stroom.' (60:368). Solar: 'VoordeelVinder vergelijkt de beste installateurs en formules voor jouw dak, zonder verborgen kosten.' (66:872), 'Wij werken niet voor één installateur.' (67:882), 'Wij begeleiden je van vergelijking tot plaatsing.' (67:888). Solar and battery have no partner or destination yet.
- **Recommendation:** Add these to CONTENT-TODO.md as claims that need client confirmation: which suppliers or installers are really compared, and who handles switching and installation. Keep the supplier names in content JSON so they can be changed quickly.
- **Verified:** confirmed

#### [major] `home-over-ons-about-page-exists`
- **Brief:** §5 (Over ons is an anchor, no separate page; blog 'not designed') — 'Over ons' is an anchor to a homepage section. There are no separate pages, and the blog is not designed.
- **Figma:** `60:21 (homepage section) vs frame 100:2 'About us' (1440x7904); also 113:1135 'Blogs overview', 118:2067 'Read Blog Page'` — The homepage does have an 'Over ons' section (so the anchor works), but the file also contains a full 'About us' page frame, plus designed blog overview and blog post frames that the brief doesn't mention.
- **Recommendation:** Ask Tanjil whether 'Over ons' stays an anchor (brief default, which works with 60:21) or becomes an /over-ons page built from 100:2. Use the blog frames instead of deriving the blog design. The other slices will detail 100:2, 113:1135 and 118:2067.
- **Verified:** confirmed

#### [minor] `home-social-proof-row-scope`
- **Brief:** §2, §6 ('Trusted by over 300+ customers.' → hidden) — Hide the 'Trusted by over 300+ customers.' text.
- **Figma:** `60:328 + avatars 60:329–60:336 + stars 60:337` — The text sits in a row with 4 stock-photo avatars and a 5-star rating graphic. Those imply the same unproven claim (customers and a rating).
- **Recommendation:** Hide the whole social-proof row (avatars, stars and text) as one block behind a config flag, and check that the hero spacing still works without it.

#### [minor] `home-footer-placeholders-no-address`
- **Brief:** §6 design fixes (footer 'Adres: Nederland', '335 224 654', .com email) — The footer contact details 'Adres: Nederland', '335 224 654' and the .com email are placeholders.
- **Figma:** `60:708 vs 91:12795 (Step - 7 -slide 2), 40:2453/43:3325 (hidden Homepage 1/2)` — Homepage 3's footer has only 'E-mail: info@voordeelvinder.com' and 'Telefoon: 335 224 654'. The 'Adres: Nederland' line appears only in the footer of 'Step - 7 -slide 2' and the hidden old homepages, so the footer designs differ between frames.
- **Recommendation:** Use one footer from site.json, with the address as an optional TODO field that is not rendered while it's a placeholder, and never ship the placeholders to production. The FAQ mailto must use the site.json email, so it points at a placeholder until the real .be address arrives.

#### [minor] `home-u-form-newsletter`
- **Brief:** §2 tone, §6 ('u' forms → 'je') — Replace every 'u' with 'je'.
- **Figma:** `60:716` — 'Voer uw e-mailadres in' is the only u-form on the homepage. The same placeholder repeats in every frame's footer.
- **Recommendation:** In site.json: 'Voer je e-mailadres in'.

#### [minor] `home-extra-typos`
- **Brief:** §6 copy corrections (additional, not listed) — Not listed.
- **Figma:** `60:368, 60:45, 67:910, 60:322, 60:385, 60:14` — 60:368 'Kies zelf of je overschakelt  wij regelen dan de rest.' has a double space and a missing separator. 60:45 'Niet omdat ze het niet willen weten maar omdat…' is missing the '—' that 60:16 has. 67:910 'Wij helpen je de juiste keuze maken' needs 'te maken'. 60:322 'Welkom bij voordeelvinder' has the brand in lower case. 60:385 'Geen kleine lettertjes' has no full stop, unlike 60:384 and 60:386. 60:14 'Veelgestelde vraag' is singular; after 'Faqs' becomes 'Veelgestelde vragen', the pill and H2 nearly duplicate.
- **Recommendation:** Apply the punctuation and grammar fixes in content JSON and list them in the PR. Ask the designer about the FAQ pill/H2 wording rather than inventing a new label.
- **Verified:** partly — 60:368 is missing a separator ('Kies zelf of je overschakelt wij regelen dan de rest.'). A double space could not be confirmed. The other listed typos stand.

#### [info] `home-testimonials-placeholder-data`
- **Brief:** §2, §15 #10 (testimonials hidden) — Hide testimonials until real content arrives.
- **Figma:** `60:486, 60:487, 60:488, 60:748 (cards 60:751, 60:767, 60:801, 60:784, 60:818)` — 5 carousel cards with identical placeholder quotes containing '€[X]', stock photos, 5-star rows, and names that contradict themselves ('Sofie V., Gent' with location pin 'Antwerpen'). The subtitle 60:487 duplicates 60:17.
- **Recommendation:** Hide the entire section (pill 'Ervaringen', H2 'Wat klanten zeggen', subtitle and carousel). Build the testimonials block and schema anyway (name, location, rating, quote, photo) so real content only needs a JSON edit. Carousel behaviour is still undecided (the cards run past both edges).

#### [info] `home-duplicate-copy`
- **Brief:** §4.4 content model — Not covered.
- **Figma:** `60:16 vs 60:42 + 60:45; 60:17 vs 60:487; 60:43 vs final CTA 60:500/60:501` — The first 'Over ons' card (60:42/60:45) repeats the section intro 60:16 almost word for word. The why-us subtitle and the testimonials subtitle are identical. Card 3 '60:43' repeats the final CTA line.
- **Recommendation:** Build as designed, and flag to the client that the copy is repetitive.

#### [info] `home-raster-mascots`
- **Brief:** §6 assets (layered SVG mascot), §6.1 mascot moments — Export the mascot as a layered SVG (head, eyes and arms as groups) if the layers allow it.
- **Figma:** `63:860, 60:345, 60:849, 60:747, 60:723 'ChatGPT Image Sep 22, 2026, 01_37_15 PM 9', 62:858, 67:875, 69:929, 60:73` — Every mascot and illustration on the homepage is a flat raster image fill. One is named 'ChatGPT Image …', which suggests AI-generated art. Only the logo badges (60:125, 60:512) are vector groups.
- **Recommendation:** Export as WebP/AVIF via <Image>. Layered mascot animation needs new source files from the designer (the Phase 7 motion pass). Confirm image rights with the client. The assets slice should confirm this.

#### [info] `home-new-block-types`
- **Brief:** §4.4 (typed section blocks; new type = component + schema + AGENTS.md line) — Example blocks are hero, features, steps, comparisonTable, faq, testimonials, cta.
- **Figma:** `60:381, 66:861, 67:893, 60:21/60:420/60:28/60:35/60:488 pills, 60:10/60:11 and 60:499/60:501 highlights, 60:748` — The design has several things those examples don't cover: a USP bar that overlaps the hero, two product showcase sections (pill + CTA + 3 items + illustration + colour theme), an 'eyebrow' pill above almost every H2, lime highlight boxes on parts of headings, a testimonials carousel, a FAQ block that includes a contact card, and a final CTA with a mascot and a 3-line display heading.
- **Recommendation:** Add block types uspBar and productShowcase (theme: lime|purple). Add optional eyebrow and highlighted-heading fields to the shared heading schema, a contactCard field on faq, and a 'split' variant with mascot image on cta. See extra_data for the mapping.

#### [info] `home-stray-font-aeonik`
- **Brief:** §6 tokens (self-host fonts, check licence) — Self-host the fonts and check the licence.
- **Figma:** `60:328` — 60:328 has a root text style 'Aeonik:Medium' (a commercial font). Its spans override it with Bricolage Grotesque SemiBold, so Aeonik never renders. Everything else uses Bricolage Grotesque.
- **Recommendation:** Ship Bricolage Grotesque only (OFL). Do not license or ship Aeonik. The node is hidden anyway, per §2.

### Open questions

- Where do the homepage product-section CTAs go: /vergelijken/<product> (enables the §6.1 morph) or the /zonnepanelen and /thuisbatterij landing pages? Nothing else on the homepage links to the product pages. Can we add product links to the footer 'Snelle links' and link the pill or H2 of each product section?
- 'Over ons': keep it as a homepage anchor (the brief default, which works with 60:21) or build an /over-ons page from the 'About us' frame 100:2?
- Can the designer supply the hero mascot (63:860) without the '€ 52 /maand' / 'BESTE DEAL' card, or will the client sign off on that figure?
- Should the flow gain an explicit call-permission question so that 'Jij bepaalt of en wanneer we bellen' and the FAQ answer are true? Right now only a required call moment exists (§7.5).
- Answers are missing for 4 FAQ questions ('Moet ik mijn factuur bij de hand hebben?', 'Is VoordeelVinder gratis?', 'Met welke leveranciers vergelijken jullie?', 'Zit ik ergens aan vast na de vergelijking?'). Hide those items until the client sends answers?
- Newsletter consent text: may the §7.5 line 'Ik wil tips en aanbiedingen via e-mail ontvangen.' be reused as the footer placeholder until the lawyer's text arrives?
- Which suppliers or installers does the partner actually cover? The copy names 'Luminus, Mega en TotalEnergies' and promises installer comparison and guidance 'van vergelijking tot plaatsing' for solar, which has no partner or destination yet.
- The FAQ pill 'Faqs' becomes 'Veelgestelde vragen' next to the H2 'Veelgestelde vraag'. Which wording does the designer want for each?
- The testimonials carousel runs past both edges. When real reviews arrive, should it be a draggable or auto-scrolling carousel, or a static 3-card grid on desktop?

### Detail

### Homepage 3 → proposed `home.json` blocks (top → bottom)

The header and footer live in `site.json`, not in page blocks.

| # | y-range | Block type | Key nodes | Notes |
|---|---|---|---|---|
| – | 0–85 | header (site.json) | 60:124 logo, 60:380 nav, 60:123 CTA | CTA 'Gratis beginnen' → /vergelijken. 'Blogs' hidden until ≥1 post. 16px lime strip 60:118 on top |
| 1 | 85–800 | `hero` | 60:322 kicker, 60:320 H1, 60:321 body, 60:327 CTA, 63:860 + 62:858 images | Optional `socialProof` sub-block (60:328 + avatars + stars 60:337), hidden by flag. CTA 'Vergelijk nu gratis' → /vergelijken |
| 2 | 863–967 | **`uspBar` (new)** | 60:381 | 3 items: icon + text. The middle item is highlighted. It overlaps the bottom edge of the hero |
| 3 | 1090–1758 | `features` (id `over-ons`) | 60:21 eyebrow, 60:15, 60:16, cards 60:42/44/43 | 3 cards with icon, title and body. The middle card has the accent (lime) theme |
| 4 | 1920–2725 | `steps` (id `hoe-het-werkt`) | 60:12 + highlight 60:11, 60:48, 60:845–847, 60:365–371, mascot 60:345 | Heading highlight field ('energiecontract'). Pinned-scroll candidate (§6.1) |
| 5 | 2832–3813 | `comparisonTable` | 60:420 eyebrow, 60:378, 60:379, 60:427 header, rows 60:438…60:465 | 6 rows × (label, others, us). Values are text. Row 'Direct resultaat' and row 'Doorgestuurd…' are §2 claims |
| 6 | 3941–4756 | **`productShowcase` (new)**, theme lime, product `zonnepanelen` | 66:869, 69:920, 66:863, 66:872, 67:883–889, 67:875 | Morph source for /vergelijken/zonnepanelen |
| 7 | 4846–5661 | **`productShowcase` (new)**, theme purple, product `thuisbatterij` | 67:899, 69:925, 67:895, 69:916, 67:908–914, 69:929 | Morph source for /vergelijken/thuisbatterij |
| 8 | 5816–6683 | `features` (variant grid-2x2 + image + CTA) | 60:28 eyebrow, 60:13, 60:17, 60:54 CTA, 60:63–70, 60:849 | CTA 'Vergelijk nu gratis' → /vergelijken |
| 9 | 6812–7178 | `cta` (variant banner) | 60:79, 60:80, 60:85 | 'Start je vergelijking' → /vergelijken |
| 10 | 7286–7880 | `faq` (id `veelgestelde-vragen`) + `contactCard` | 60:35 eyebrow, 60:14, 60:495/60:110/60:90, Q 60:91/112/92/93/94, A 60:109 | 'Stel een vraag' → mailto from site.json. Only 1 of 5 answers exists |
| 11 | 8104–8742 | `testimonials` (hidden) | 60:488, 60:486, 60:487, 60:748 | 5 placeholder cards. Hidden by flag (§2) |
| 12 | 8818–9420 | `cta` (variant split + mascot) | 60:500/60:501 (+highlight 60:499), 60:502, 60:506, 60:723 | 'Start je vergelijking' → /vergelijken |
| – | 9474–10083 | footer (site.json) | 60:707, 60:715–721, 60:705, 60:706, 60:708, 60:722 | Newsletter → /api/newsletter. Contact values are TODO placeholders |

### Shared schema fields this page needs
- `eyebrow`: {icon, label} pill. Used on sections 3, 5, 6, 7, 8, 10 and 11.
- `heading` with an optional highlighted span (60:11 'energiecontract', 60:501 'Wij vergelijken.').
- `theme`: default | lime | purple.
- `cta`: {label, href}.

### CTA inventory
- Header: 'Gratis beginnen'
- Hero and why-us: 'Vergelijk nu gratis'
- CTA banner and final CTA: 'Start je vergelijking'
- Solar section: 'Bereken je besparing'
- Battery section: 'Ont­dek jouw voordeel' ('Ontdek jouw voordeel')
- FAQ: 'Stel een vraag'
- Footer newsletter: 'Abonneren'

### §6 check summary
- Found on this frame: 'oordeligst' 60:321, 'e ziet meteen' 60:368, 'erplichtingen' 60:80, 'contact op met ons op' 60:110, 'Heb nog steeds een vraag?' 60:495, 'Voor Vinder versus anderen' 60:424, 'Faqs' 60:39, 'Trusted by over 300+ customers.' 60:328, 'uw' 60:716.
- Not found: 'Ne', and 'Adres: Nederland'.

### Sampled tokens (no Figma variables)
- Colours:
  - lime #c9e260 (CTA), #b7e137 (table cell), rgba(183,225,55,.28) (pill bg)
  - purple #6c5ce7 (CTA), #7051ed (table header)
  - ink #03080f / #151d30, body #3a3c75, border #ededed
- Shadows: rgba(40,34,88,.07–.15)
- Radii: 37 (buttons), 34 (pills), 25 (USP bar), 24 (testimonial card), 20 (FAQ card), 18 (table cell)
- Type (Bricolage Grotesque):
  - H1 60/70 SemiBold, -3% tracking
  - H2 48/65 SemiBold
  - display 80/104
  - body 16/26
  - pill 24/30
  - nav 14

---

<a id="products"></a>
## Product pages (69:931, 80:2867)

**Frames reviewed:** 69:931 Solar Panel Page (1440x5270): full screenshot, sparse metadata, get_design_context on 10 sub-nodes; 80:2867 Home Battery (1440x5221): full screenshot, metadata, get_design_context on 2 sub-nodes; 60:2 Homepage 3: used only to compare shared sections (screenshot crops and text list from page1.xml)

**Summary.** Both product frames exist at the node ids in §5 and are desktop-only. Each frame is flat: about 290 loose children with no section frames and no auto-layout, so I worked out the sections from their y-positions. The two pages use the same eight-section layout: header, hero, 3 feature cards, "Zo werkt het" steps, "Wat je van ons mag verwachten" benefits, FAQ, CTA band and footer. The header and footer are identical to Homepage 3. Features, steps, FAQ and CTA are colour or layout variants of homepage blocks. Only the benefits section needs a new block type. The §6 typos that appear here are "Faqs", "Heb nog steeds een vraag?" and "Neem gerust contact op met ons op." The only "u" form is "Voer uw e-mailadres in". Neither page has testimonials, ratings, "300+", logos or premium amounts. The copy has the same problems §2 names for the homepage, in more places. About 13 lines promise an on-screen calculation or overview. The CTAs read "Bereken je besparing" and "Start je berekening". The battery CTA says "zonder verkoopgesprek", which conflicts with the callback model. Several lines promise "van offerte tot installatie" guidance, but solar and battery have no delivery partner yet. There is a "€[X] jaar" payback placeholder. "Subsidies zijn beschikbaar." is an unqualified claim and may be out of date for Flanders. 8 of the 10 FAQ questions have no answer in the design. The copy supports most §7.4 DRAFT questions. Two are not backed by their own page: battery_interest on solar and digital_meter on battery. The battery copy asks for daily consumption, but the draft asks for yearly kWh. The battery copy also suggests a solar-interest question that the draft does not include. All copy is quoted with node ids in the notes file.

### Confirmed against the brief

- Solar Panel Page 69:931 and Home Battery 80:2867 exist and match the §5 table. Both are 1440px desktop only, so the mobile layout has to be derived (as §6 says).
- The header (logo, nav 'Hoe het werkt · Veelgestelde vragen · Over ons · Blogs', CTA 'Gratis beginnen') and the footer (tagline, newsletter, Snelle links, Juridisch, Contact, copyright) are identical to Homepage 3. They can come from the shared layout and site.json.
- Each product page has two page CTAs: hero ('Bereken je besparing' / 'Ontdek jouw voordeel') and CTA band ('Start je berekening'). Both can point to /vergelijken/zonnepanelen or /vergelijken/thuisbatterij as §5 says.
- The FAQ side card has the 'Stel een vraag' button (mailto per §5). The footer newsletter has 'Abonneren' (/api/newsletter per §5).
- §6 typos on both pages, which the listed corrections fix: 'Faqs' (69:972, 80:2897), 'Heb nog steeds een vraag?' (69:1436, 80:3209), 'Neem gerust contact op met ons op.' (69:1043, 80:2936).
- The only 'u/uw' form is 'Voer uw e-mailadres in' (69:1657, 81:3802). The rest of the copy already uses je/jij/jouw.
- Neither page has testimonials, ratings, 'Trusted by over 300+ customers.', partner, installer or brand logos, supplier names, or specific subsidy or premium amounts.
- The footer contact placeholders ('E-mail: info@voordeelvinder.com', 'Telefoon: 335 224 654') are the same as on the homepage. There is no 'Adres: Nederland' line on these pages. They go into site.json as TODO values, per §6.
- The sections map onto §4.4 block types hero, features, steps, faq and cta. Only 'Wat je van ons mag verwachten' needs a new type.
- The copy supports most §7.4 DRAFT questions. Solar: ownership (FAQ 69:1027), roof type and orientation (69:1296, 69:1042), consumption (69:1296). Battery: has_solar (80:3167, 80:2917) and solar_size (80:2935).
- Typography sampled on these pages is all Bricolage Grotesque (Regular/Medium/SemiBold, opsz 14), the same family as the rest of the file. Colours seen: #151d30, #03080f, #3a3c75, #6c5ce7, white.
- The 'Blogs' nav item is present, as on the homepage. The brief already says to hide it until at least one post exists.

### Findings

#### [major] `products-onscreen-results`
- **Brief:** §2 (Direct resultaat claim), §3 (no on-screen results/calculator in MVP), §15 #7 — The MVP is callback-only and shows no results on screen. Claims implying immediate results need client sign-off and proposed replacement copy.
- **Figma:** `69:1253, 69:1259, 69:980, 69:981, 69:1299, 69:1441, 69:1443, 69:1447, 80:3142, 80:2935, 80:3562, 80:3170, 81:3836, 81:3841` — Both pages promise a calculation or an overview. Examples: 'In een paar minuten weet je wat het kost en wat je bespaart.', 'Klaar om te berekenen wat zonnepanelen jou opleveren?', 'In een paar minuten zie je wat het kost, wat je bespaart en wanneer de panelen zichzelf terugverdienen.', 'Je ontvangt een helder overzicht met kosten en besparing.', 'In een paar minuten zie je welke thuisbatterij het beste past…'. The CTAs read 'Bereken je besparing' and 'Start je berekening'.
- **Recommendation:** Build as designed and list every line in docs/CONTENT-TODO.md. For the CTAs, propose reusing existing design copy 'Start je vergelijking' (homepage 60:85 / 60:506) instead of 'Start je berekening' or 'Bereken je besparing'. Ask the client for replacement body copy that describes a callback with a personal proposal.
- **Verified:** confirmed

#### [major] `products-no-sales-call-claim`
- **Brief:** §2 ('Doorgestuurd naar een verkoper: Nooit' must say leads are called), §7.3 call-moment question — Leads are called by a partner, and the copy must say so clearly.
- **Figma:** `81:3836 (Home Battery CTA band body)` — 'In een paar minuten zie je welke thuisbatterij het beste past bij jouw situatie en verbruik. Gratis, vrijblijvend en zonder verkoopgesprek.'
- **Recommendation:** List it next to the §2 'Nooit' claim in CONTENT-TODO. The phrase 'zonder verkoopgesprek' conflicts with the required call-moment step. Ask the client for wording that explains they will be called.
- **Verified:** confirmed

#### [major] `products-service-promise-no-partner`
- **Brief:** §7.4 / §8 (solar & battery outcome = pending, no rules or destination), §15 #5 — Solar and battery leads are stored as pending. No partner or destination exists yet.
- **Figma:** `69:1299, 69:1302, 78:2853, 78:2852, 80:3170, 80:3173` — 'wij begeleiden je van A tot Z.', 'Jij kiest, wij regelen', 'Begeleiding van A tot Z' / 'Van offerte tot plaatsing begeleiden wij je. Geen losse eindjes, geen onverwachte extra's.', 'Wij regelen de rest — van offerte tot installatie.'
- **Recommendation:** Build as designed and flag in CONTENT-TODO. The client must confirm that a partner will deliver this end-to-end service before these pages get paid traffic, or rewrite the copy.
- **Verified:** confirmed

#### [major] `products-payback-placeholder`
- **Brief:** §2 (savings figures such as '€[X]': never invent, hide until real content), §15 #10 — Hide blocks with placeholder savings figures until the client sends real content.
- **Figma:** `69:980 in card 'Snel terugverdiend' (69:977)` — 'Een gemiddeld gezin verdient de investering in zonnepanelen terug binnen €[X] jaar. Wij berekenen jouw persoonlijke terugverdientijd op basis van je verbruik en dak.' The € unit is also wrong for a period in years. The second sentence implies a calculation (see products-onscreen-results).
- **Recommendation:** Default: hide the whole 'Snel terugverdiend' card through a content flag. Neither sentence can ship as written, so the features block shows 2 cards and the layout must handle 2. Ask the client for a sourced payback range in years.
- **Verified:** confirmed

#### [major] `products-subsidies-claim`
- **Brief:** §2 claims needing sign-off (general principle); task note: Belgian regional premiums change often — The brief does not cover subsidy claims. Its rule is that unproven claims are listed for sign-off and content is never invented.
- **Figma:** `69:949, 77:2849 (intro text), FAQ 69:1025, FAQ 80:2919` — 'Energieprijzen blijven stijgen. Subsidies zijn beschikbaar. …' appears twice on the solar page. Both pages ask 'Zijn er subsidies of premies beschikbaar?' / 'Zijn er premies of subsidies beschikbaar?' with no answer. There are no amounts, which is good.
- **Recommendation:** Add to CONTENT-TODO as time-sensitive. Flemish premiums for solar panels and home batteries have been cut back or stopped in recent years, so the flat claim may be untrue today. Put the sentence behind a content flag, hidden until the client confirms. Never add premium amounts without a dated source.
- **Verified:** confirmed

#### [major] `products-faq-answers-missing`
- **Brief:** §17 never invent content; §11 FAQPage structured data; §4.4 faq block — FAQ sections get FAQPage structured data. Content is never invented.
- **Figma:** `Solar 69:1024, 69:1025, 69:1026, 69:1027; Battery 80:2917, 80:2918, 80:2919, 80:2920 (only 69:1042 and 80:2935 have answers)` — Each page shows 5 questions. Only the expanded one has an answer, so 8 answers are missing. Some would need facts: price ('Wat kost een thuisbatterij gemiddeld?'), lifespan ('Hoe lang gaat een thuisbatterij mee?'), installation time and premiums.
- **Recommendation:** Make `answer` required in the faq item schema. Leave unanswered items out of the page JSON, or behind a hidden flag, until the client sends the text. List all 8 questions in CONTENT-TODO. Emit FAQPage only for answered items. The homepage FAQ has the same one-answer pattern.
- **Verified:** confirmed

#### [major] `products-guarantee-independence-claims`
- **Brief:** §2 (claims needing client sign-off), §8/§9.3 (leads delivered to a partner) — Positioning claims such as 'independent' and 'honest' must be true for the real delivery model and be signed off.
- **Figma:** `78:2851/78:2850, 77:2848/77:2847, 69:1298, 80:3564/80:3560, 80:3169` — 'Transparante kostprijs' / 'Geen verborgen kosten of verrassingen achteraf. Wat je ziet, is wat je betaalt.'; 'Wij werken niet voor één installateur.'; 'zonder verborgen voorkeur voor één partij'; 'Wij werken niet voor één fabrikant.'; 'zonder voorkeur voor één merk of leverancier'.
- **Recommendation:** Build as designed and list in CONTENT-TODO. These hold only if leads go to more than one installer, and VoordeelVinder cannot guarantee installer prices.
- **Verified:** confirmed

#### [minor] `products-battery-daily-vs-annual-consumption`
- **Brief:** §7.4 Thuisbatterij (knows_consumption → consumption_kwh), §7.3 7A (kWh per jaar) — The battery flow reuses knows_consumption → consumption_kwh, which asks for yearly kWh.
- **Figma:** `80:3167 (Stap 01 body), 80:2935 (FAQ answer)` — 'Heb je al zonnepanelen? Wat is je gemiddeld dagelijks verbruik? Een schatting volstaat om te starten.' and 'Dat hangt af van je dagelijks verbruik…'
- **Recommendation:** Keep the flow on annual kWh (a shared step, and it matches energy bills). Ask the client to change 'dagelijks verbruik' to 'jaarverbruik' in the page copy. Note it in the PR as a DRAFT alignment.
- **Verified:** confirmed

#### [minor] `products-draft-questions-provenance`
- **Brief:** §7.4 ('drafts come from the landing-page copy and FAQs') — The solar and battery DRAFT questions come from the landing-page copy and FAQs.
- **Figma:** `Solar page (no battery mention anywhere); Battery 81:3573; Battery 80:3566/80:3562` — battery_interest ('Wil je ook een thuisbatterij?') has no basis on the solar page. Only the battery page ('Optimaal gecombineerd' 80:3566) and the homepage mention the combination. digital_meter is not in the battery copy, except indirectly through 'piekuurtarieven' (81:3573). The copy suggests a question the draft lacks: solar interest for battery visitors without panels ('Zonnepanelen én thuisbatterij? We berekenen het gecombineerde voordeel…' 80:3562).
- **Recommendation:** Build the drafts as written. In the PR, note that battery_interest and digital_meter are domain assumptions and not taken from the copy. Offer the client an optional mirrored solar-interest question when has_solar = 'Nee, nog niet' (config only, not built unless approved).

#### [minor] `products-technical-claims`
- **Brief:** §2 claims needing sign-off — Unproven claims are listed for client confirmation.
- **Figma:** `69:979, 69:978, 81:3572/81:3573` — 'Zonnepanelen verhogen de waarde en het EPC-label van je huis.'; 'betaal structureel minder aan je energieleverancier'; 'Buffer bij stroompieken' / 'Bescherm jezelf tegen dure piekuurtarieven.' The last one is loose for Flanders: the capacity tariff depends on peak power, not peak-hour prices, unless the visitor has a dynamic contract.
- **Recommendation:** List in CONTENT-TODO for client or expert confirmation. Build as designed.

#### [minor] `products-faq-heading-singular`
- **Brief:** §6 copy corrections ('Faqs' → 'Veelgestelde vragen') — Change the pill 'Faqs' to 'Veelgestelde vragen'.
- **Figma:** `69:947, 80:2880 (and homepage 60:14)` — The H2 directly under the pill reads 'Veelgestelde vraag' (singular). Once the pill is corrected, pill and H2 say almost the same thing.
- **Recommendation:** Correct the H2 to 'Veelgestelde vragen'. Decide once for the shared faq block whether the eyebrow pill stays, since it duplicates the H2. Note it in the PR.

#### [minor] `products-duplicate-intro-copy`
- **Brief:** §4.4 content model (copy per block) — n/a. The brief has no rule on this; it is a content-quality issue.
- **Figma:** `77:2849 vs 69:949 (Solar)` — The intro of 'Wat je van ons mag verwachten' is word for word the same as the features intro: 'Energieprijzen blijven stijgen. Subsidies zijn beschikbaar. En met de juiste panelen verdien je je investering sneller terug dan je denkt.' The battery page has its own intro (80:3555).
- **Recommendation:** Build as designed and ask the client or designer for a separate solar intro (likely a copy-paste slip). It also repeats the subsidies claim.

#### [minor] `products-raster-assets-and-icon-licence`
- **Brief:** §6 Assets (SVG where possible; layered mascot SVG for §6.1) — Export as SVG where possible. Export the mascot as a layered SVG so parts can move.
- **Figma:** `Raster: 72:2733, 81:3860, 78:2856/80:3568 '564654 1', 69:1688/80:3455 'Group 3 1', 69:1789 'contract 1', 69:1301 'compare 1', 69:1303 'decision-making 1', 81:3847 'label 1', 81:3849 'check (2) 1', cloud photo in 69:1304. Vector: hero mascot 72:2734/81:3863 'Group 21'` — Only the hero mascot is vector (about 90 paths, so it can be exported as layered SVG). The cheering and laptop mascots, the hero product illustrations, the 3 step icons and 2 benefit icons are PNG image fills. Icon layer names ('money 1', 'decision-making 1', 'renewable-energy 1'…) look like stock icon-pack downloads.
- **Recommendation:** Export the vector parts as SVG and the rasters as WebP/AVIF via <Image>. Ask the designer for SVG versions of the raster icons and mascots. Add the icon licence and attribution to the TO CONFIRM list.

#### [minor] `products-hero-h1-line-height`
- **Brief:** §6 Tokens — Typography comes from Figma and goes into @theme tokens.
- **Figma:** `69:1252 (SemiBold 60/70) vs 80:3141 (SemiBold 60/62)` — The same hero H1 style has line-height 70px on solar and 62px on battery.
- **Recommendation:** Use one hero H1 token (suggest 62px, closer to the ~1.05 ratio of the other headings) and note it as an assumption.

#### [info] `products-new-benefits-block`
- **Brief:** §4.4 block types (hero, features, steps, comparisonTable, faq, testimonials, cta) and rule 3 — Each section is a typed block. A new type needs a component, a schema and an AGENTS.md line.
- **Figma:** `Solar 69:1304 + 69:1309 + 77:2847..78:2855 + 78:2856; Battery 80:3175 + 80:3180..80:3567` — 'Wat je van ons mag verwachten': heading, intro and a cheering mascot on the left, and 4 stacked horizontal icon cards on the right, over a masked cloud photo with a #6c5ce7 colour blend. This layout does not appear on the homepage. The homepage 'Waarom kiezen voor VoordeelVinder?' uses a 2x2 grid.
- **Recommendation:** Add one new block (e.g. `benefits`, or `featureList` with layout list|grid shared with the homepage grid), with its schema and an AGENTS.md line.

#### [info] `products-shared-block-variants`
- **Brief:** §4.4 (one component + one schema per block type) — One component per block type.
- **Figma:** `Hero 75:2832 vs homepage hero; Steps 69:938/80:2878 vs homepage; FAQ 69:983 vs homepage; CTA 81:3582/81:3830 vs homepage CTA band` — Shared blocks differ in variant. Product hero has no eyebrow, trust line or USP row. Product steps have a centred title, no highlighted word and no mascot. Product FAQ has a white section and a lavender card, the homepage the reverse. Product CTA is a lime band with a white button that overlaps the footer, the homepage a purple band with a lime button. The FAQ side-card copy is identical on all three pages.
- **Recommendation:** Give the schemas small variant props (tone, align, optional eyebrow, mascot, highlight). Put the FAQ side-card copy in site.json as a shared default.

#### [info] `products-nav-anchor-and-header-cta-targets`
- **Brief:** §5 nav items (anchors to homepage sections), header CTA → /vergelijken, product CTAs → /vergelijken/<product> — 'Hoe het werkt', 'Veelgestelde vragen' and 'Over ons' are homepage anchors. The header CTA goes to /vergelijken.
- **Figma:** `69:1313/80:3181 nav, 69:1646/81:3791 footer links, 69:1055/80:2944 'Gratis beginnen'` — The product pages have their own 'Zo werkt het' and FAQ sections. The site-wide header CTA 'Gratis beginnen' also appears on the product pages.
- **Recommendation:** Default per the brief: nav and footer links go to /#… homepage anchors, and the header CTA goes to /vergelijken, where step 1 is product choice. Note in the PR that pointing the header CTA at /vergelijken/<product> on product pages is a one-line config change if Tanjil prefers it.

#### [info] `products-no-product-links-in-nav`
- **Brief:** §5 site map / nav items — The nav has 'Hoe het werkt', 'Veelgestelde vragen', 'Over ons' and 'Blogs'.
- **Figma:** `69:1313, 69:1646 (and homepage)` — Nothing in the header or footer links to /zonnepanelen or /thuisbatterij. Visitors reach these pages only from the homepage product sections (66:869, 67:899) or from ads.
- **Recommendation:** Build as designed. Suggest adding product links to the footer 'Snelle links' for SEO and discovery, pending designer or client approval.

#### [info] `products-faq-open-state-and-housing-note`
- **Brief:** §6.1 ('The FAQ opens smoothly'); §7.4 draft structure — The FAQ is an accordion. The solar draft asks housing type only inside household (the no-consumption branch).
- **Figma:** `69:1040/69:1419 (expanded item still shows '+'); §7.4 household only in the 'no consumption' branch` — No open-state icon is designed; the expanded item keeps the '+'. The solar copy assumes a roof the visitor controls ('Vertel ons over je dak'), but a visitor who knows their consumption is never asked whether they live in an apartment.
- **Recommendation:** Design an open state in code (rotate '+' to '×' or '−') and show it on staging. Offer the client an optional housing-type question for the solar and battery paths. Do not add it without approval.

### Open questions

- On product pages, should the header CTA 'Gratis beginnen' go to /vergelijken (brief default) or to /vergelijken/<product>? Should the nav and footer 'Hoe het werkt' / 'Veelgestelde vragen' links go to the homepage anchors (brief default) or to the page's own sections?
- 8 FAQ answers are missing. Should unanswered questions stay hidden until the client sends text (proposed default), rather than showing a question without an answer?
- 'Snel terugverdiend' card: can we hide the whole card (proposed default, since neither sentence can ship) so the features section shows 2 cards?
- 'Subsidies zijn beschikbaar.' (69:949, 77:2849): can the client confirm today's premium situation per region? Should the sentence be hidden until then?
- Battery consumption: the copy says 'dagelijks verbruik' but the flow asks for yearly kWh. OK to keep annual kWh in the flow and ask the client to change the copy?
- Should the battery DRAFT flow get a mirrored 'Wil je ook zonnepanelen?' question (suggested by 80:3562) and an ownership question? Should solar and battery ask housing type on every path, not only the no-consumption branch?
- FAQ heading: once 'Faqs' becomes 'Veelgestelde vragen', should the H2 'Veelgestelde vraag' become 'Veelgestelde vragen' and the eyebrow pill be dropped or reworded, to avoid saying it twice?
- Solar 'Wat je van ons mag verwachten' intro (77:2849) copies the features intro word for word. Keep it or ask for new copy?
- Icon licence: layer names suggest stock icon-pack downloads (Flaticon-style names). Is the licence paid, or is attribution needed? Can the designer supply SVGs for the raster icons and mascots?
- Solar and battery have no delivery partner yet. Should these pages receive paid traffic before the 'van offerte tot installatie' promises are backed?

### Detail

### Section map (y ranges; both frames flat, no section groups)
| Section | Solar 69:931 | Battery 80:2867 | Block |
|---|---|---|---|
| Header | 0–85 (69:1050, 69:1051, 69:1056, 69:1313, 69:1055) | 0–85 (80:2939, 80:2940, 80:2945, 80:3181, 80:2944) | layout/site.json (shared) |
| Hero | 85–700 bg 75:2832; H1 69:1252; body 69:1253; CTA 69:1259; img 72:2733 (PNG); mascot 72:2734 (vector) | bg 80:2876; H1 80:3141; body 80:3142; CTA 80:3147; img 81:3860 (PNG); mascot 81:3863 | hero (product variant) |
| Features | 850–1442; H2 69:948 "Waarom nu overstappen op zonne-energie?"; cards 69:975/977/976 | H2 80:2881 "Meer uit je eigen energie halen"; cards 80:2900/81:3570/81:3572 | features (shared style) |
| Steps | 1600–2283 panel 69:938; 69:945 "Zo werkt het" | panel 80:2878; 80:2879 | steps (shared, centred variant) |
| Benefits | 2304–3285 bg 69:1304; 69:1309 "Wat je van ons mag verwachten"; 4 cards | bg 80:3175; 80:3180; 4 cards | NEW block |
| FAQ | 3459–4053; 69:972 pill, 69:947 H2, side card 69:983, 5 Q (1 answered) | 80:2897, 80:2880, 5 Q (1 answered) | faq (shared, colour variant) |
| CTA | 4221–4599 81:3582; 69:1441 / 69:1443 / 69:1447 | 81:3830; 81:3835 / 81:3836 / 81:3841 | cta (lime variant) |
| Footer | 4518–5270 69:1437/69:1452 | 81:3596/81:3597 | layout/site.json (shared) |

### CTAs
| Text | Nodes | Target |
|---|---|---|
| Gratis beginnen | 69:1055, 80:2944 | /vergelijken (§5 default) |
| Bereken je besparing | 69:1259 | /vergelijken/zonnepanelen |
| Start je berekening | 69:1447 · 81:3841 | /vergelijken/zonnepanelen · /vergelijken/thuisbatterij |
| Ontdek jouw voordeel | 80:3147 | /vergelijken/thuisbatterij |
| Stel een vraag | 69:1023, 80:2916 | mailto: (site.json) |
| Abonneren | 69:1662, 81:3807 | POST /api/newsletter |

### Unanswered FAQ questions (for CONTENT-TODO)
Solar: "Hoeveel zonnepanelen heb ik nodig?" · "Zijn er subsidies of premies beschikbaar?" · "Hoe lang duurt de installatie?" · "Kan ik zonnepanelen plaatsen als ik huur?"
Battery: "Heb ik zonnepanelen nodig voor een thuisbatterij?" · "Wat kost een thuisbatterij gemiddeld?" · "Zijn er premies of subsidies beschikbaar?" · "Hoe lang gaat een thuisbatterij mee?"
Answered: 69:1042 (orientation), 80:2935 (capacity).

### §7.4 draft vs copy
| Draft | Backed by copy? | Evidence |
|---|---|---|
| ownership | yes | 69:1027 |
| roof type | yes | 69:1296, 69:1297 |
| roof orientation | yes | 69:1296, 69:1042 |
| consumption (solar) | yes | 69:1296, 69:980 |
| battery_interest | not on solar page | only 80:3566 / homepage 67:908 |
| has_solar | yes | 80:3167, 80:2917 |
| solar_size | yes | 80:2935 |
| digital_meter | no (indirect 81:3573) | — |
| consumption (battery) | partly: copy says DAILY | 80:3167, 80:2935 |
| (missing) solar interest for battery | suggested by 80:3562 | — |

### Typography sampled (Bricolage Grotesque)
H1 SemiBold 60/70 (solar), 60/62 (battery), -1.8px white · H2 SemiBold 48/51 -1.44px #151d30 · CTA heading SemiBold 34/43 #03080f · card title SemiBold 22/27 -0.66px #151d30 · FAQ Q Medium 20/30 #03080f · body Regular 16/24–27 -0.32px #3a3c75 · purple overlay #6c5ce7 · CTA button white pill 277×62 r37.

---

<a id="form-a"></a>
## Form steps 1–6

**Frames reviewed:** 84:3972 Step - 1; 89:7495 Step - 2; 89:7986 Step - 3; 89:8489 Step - 4; 90:8972 Step - 5; 90:9473 Step - 6

**Summary.** Form steps 1–6 follow the brief's order and structure. Each step has the same purple left panel with a raster mascot, a progress card reading "Stap X van 8" with a bar at exactly X/8, a fixed-height question card and "Terug"/"Volgende" buttons. The questions for steps 1, 2, 5 and 6 match §7.3 word for word, apart from the u-forms in steps 2–3 and the "Ne" typo (2x on step 5, 1x on step 6).

As the brief expects, there are no Gas or "Elektriciteit + gas" cards and no step 5b. Also missing from the design:
- the business consumption-band questions revealed by the step 2 checkbox (the brief does not mark these "ADDED vs design")
- any supplier list (only a closed dropdown is drawn)
- selected, focus, error and disabled states on every step
- gas, combined and "Weet ik niet" icons

Copy differences:
- Step 1 says "Zonnepaneel", not "Zonnepanelen".
- Step 4 says "Welk type meter heb je?" with longer, split-compound labels ("Dag meter …"), not the brief's wording.
- Step 6 adds a heading, "Je jaarlijks verbruik", above the question.

Other findings:
- Several colours fail WCAG AA: placeholder 2.08:1, panel body text 3.10:1, checkbox border 1.37:1, radio stroke 1.65:1.
- The mascot is one cropped raster PNG (named "ChatGPT Image…") with the lightning and flame bubbles baked in, so parts cannot be animated.
- The form pages use the full site header and footer.

Every answer card is at least 44px tall: 74px on step 1 and for the inputs, 60px on steps 4–6. The checkbox box itself is only 34px, so its label row needs to provide the tap area.

### Confirmed against the brief

- Design step order 1→6 (product → postcode+business → supplier → meter type → digital meter + solar → knows consumption) matches §7.3 exactly. The design has no step the brief lacks.
- Step 1 title "Wat wil je vergelijken?" (89:7453) matches the brief verbatim. It is single-choice cards with icons (engine single_choice with optional icon). The Elektriciteit, Zonnepanelen (drawn as "Zonnepaneel") and Thuisbatterij cards are present.
- Step 2 has a postcode text field plus a checkbox labelled exactly "Dit is een zakelijk adres." (89:7975), as in §7.3.
- Step 3 is drawn as a select/dropdown (89:8432 with chevron 89:8452), matching the brief's 'select' input.
- Step 4 has exactly 4 single-choice options that map one-to-one to the codes single / dual / single_excl_night / dual_excl_night.
- Step 5 has 2 yes/no questions, "Heb je een digitale meter?" (90:9419) and "Heb je zonnepanelen?" (90:9450), verbatim as in the brief.
- Step 6 question "Ken je je jaarlijks energieverbruik?" (90:10441) is verbatim as in the brief, with a yes/no input.
- Yes/no is drawn as a card pair (Ja/Ne cards with icons and radio), which matches the engine's yes_no type ('a card pair').
- Progress format "Stap X van Y" plus a bar, as in §7.6. The bar fill is exactly X/8 of the 693px track (87/174/261/348/435/522).
- Button labels "Terug" and "Volgende" match §7.6. Terug is drawn even on step 1, which fits §7.6 (on the first step it goes to the previous page).
- Layout matches §6: purple left panel with mascot, progress card above the question card.
- Answer cards are all ≥44px tall (74px on step 1, 60px on steps 4–6, inputs and select 74px, buttons 52px).
- Left-panel copy already uses 'je' ("Vind je beste energiedeal, zonder gedoe.").
- Step 5b (social tariff / budget meter) is absent, as the brief says: no 'sociaal', 'budget' or 'Weet ik niet' text anywhere in the file.
- Gas is absent, as the brief says: no text layer anywhere in the file contains 'gas'.
- Every step card has a radio-style indicator, consistent with §7.6 (real input type=radio, whole card clickable).

### Findings

#### [major] `form-a-no-interaction-states`
- **Brief:** §6.1 Form motion (answer cards: selected state, check mark); §7.6 Next/Accessibility (inline errors, visible focus) — Cards spring into a selected state with a check mark that draws in. Visible focus states. Inline errors under each question with a shake. The submit button shows a lock/loading state.
- **Figma:** `All six frames: radios 'Ellipse 62' (e.g. 90:8968, 89:8961), cards 'Rectangle 323/327…', checkbox 89:7977, input 89:7941` — Only the default/unselected state is drawn: a white radio with a #C4BCE7 stroke. No selected, hover, focus, error, disabled or checked-checkbox state in steps 1–6. No error text for postcode or supplier.
- **Recommendation:** Derive the states from the existing palette. Selected: #7051ed border, filled radio with check. Focus: #7051ed ring. Error: needs a colour decision, because the palette has no red, and §6 says 'no off-palette colours'. Show them on staging for Tanjil/designer approval and note them as assumptions in the PR.
- **Verified:** confirmed

#### [major] `form-a-contrast-wcag`
- **Brief:** §7.6 Accessibility ('Contrast meets WCAG AA'); §6 Tokens ('No off-palette colours') — Contrast meets WCAG AA. No off-palette colours.
- **Figma:** `89:7946 / 89:8436 placeholders #aea9c6 on #f6f4ff; 89:7436 panel body rgba(255,255,255,.65) on #7051ed; 89:7977 checkbox border #ded9f4; Ellipse 62 radio stroke #C4BCE7` — Placeholder 2.08:1. Left-panel body text 3.10:1 (16px regular, needs 4.5:1). Checkbox border 1.37:1 on white (fill vs card 1.09:1). Radio stroke 1.65:1. Input/card borders 1.37:1. Non-text UI needs 3:1 (WCAG 1.4.11).
- **Recommendation:** Darken to in-palette values. For example: placeholder → #3a3c75 at reduced opacity or a darker lavender, panel body → white at ≥0.85 opacity, checkbox and radio stroke → #7051ed or #674bd9. Get designer/Tanjil approval since this deviates from the design, and list it in the PR.
- **Verified:** partly — The panel body text (3.10:1) is a definite AA failure and will fail axe CI; use white at 92% or more, or solid white. Placeholders fail 1.4.3 but axe probably won't detect them. The unselected borders are a 1.4.11 risk, not a certain failure.

#### [major] `form-a-mascot-raster`
- **Brief:** §6 Assets (layered SVG mascot if the layers allow it); §6.1 signature morphs (mascot moves from form panel to thank-you page, mascot cheers) — Export the mascot as layered SVG (head, eyes, arms as separate groups) so parts can move.
- **Figma:** `89:7439 (and 89:7939, 89:8430, 89:8933, 90:9416, 90:9917) 'ChatGPT Image Sep 22, 2026, 01_37_15 PM 5'` — A single raster PNG, 323x289, cropped from a larger image (img 310.59% x 231.58%, offset -106.47% / -11.29%). The lightning and flame bubbles are baked in. No vector layers. The name suggests it is AI-generated.
- **Recommendation:** Export as WebP/AVIF via <Image> for now. Parts cannot be animated, so motion is limited to whole-image transforms. Ask the designer for a vector or Rive mascot before the Phase 7 motion pass, and confirm the licence and source of the image. Does not block launch.
- **Verified:** confirmed

#### [minor] `form-a-step2-business-bands-not-drawn`
- **Brief:** §7.3 step 2 (checkbox reveals Elektriciteit/Aardgas band questions under_100k / over_100k); §6.1 revealed questions — Checkbox "Dit is een zakelijk adres." reveals "Elektriciteit: wat is je geschat jaarverbruik?" and/or "Aardgas: wat is je geschat jaarverbruik?" with "Minder dan 100.000 kWh per jaar" / "Meer dan 100.000 kWh per jaar".
- **Figma:** `89:7495 Step - 2 (checkbox 89:7977, label 89:7975); nothing drawn below y≈570` — Only the unchecked checkbox. No revealed questions anywhere in the file (no 'zakelijk', '100.000' or 'geschat' text besides the checkbox label).
- **Recommendation:** Build the revealed questions with the Step 4 card pattern (60px single-choice cards, 18px labels) under the checkbox, expanding smoothly. Unlike gas and 5b, the brief does not mark this 'ADDED vs design', so list it in the PR as a design addition.

#### [minor] `form-a-step1-gas-icons-missing`
- **Brief:** §7.3 step 1 (Gas, Elektriciteit + gas cards); §6 Assets (SVG icons) — Five cards, including Gas and Elektriciteit + gas.
- **Figma:** `84:3972 icon tiles 89:7462/89:7465/89:7468, icons 89:7470 (lightning), 89:7475, 89:7479` — Only 3 icons exist: lightning (#7051ED), solar-panel, smarthome. There is no gas/flame vector; the flame appears only inside the raster mascot. There is also no icon for a 'Weet ik niet' option (needed for 5b).
- **Recommendation:** Ask the designer for gas, combined and 'Weet ik niet' icons in the same style (24px, #7051ED). Until then, use a neutral placeholder icon from one consistent open-licence set and flag it in the PR.

#### [minor] `form-a-step1-zonnepaneel-label`
- **Brief:** §7.3 step 1 card table — Card label "Zonnepanelen" (product=zonnepanelen).
- **Figma:** `89:7464 'Zonnepaneel'` — "Zonnepaneel" (singular).
- **Recommendation:** Use "Zonnepanelen" as the brief says (it also matches the page name and URL). Note the design difference in the PR.
- **Verified:** confirmed

#### [minor] `form-a-step4-title-and-labels`
- **Brief:** §7.3 step 4; §7.2 meter_type options — Title "Wat voor meter heb je?". Labels: "Dagmeter (enkelvoudig tarief)", "Dag/nachtmeter (tweevoudig tarief)", "Dagmeter + exclusief nacht", "Dag/nachtmeter + exclusief nacht".
- **Figma:** `89:8937 title; 89:8953, 89:8956, 89:8958, 89:8960 labels` — Title "Welk type meter heb je?". Labels: "Dag meter (enkelvoudig tarief)", "Dag / nacht meter (tweevoudig tarief)", "Dag meter (enkelvoudig tarief) + exclusief nacht", "Dag / nacht meter (tweevoudig tarief) + exclusief nacht". 'Dag meter' splits a Dutch compound.
- **Recommendation:** Keep the codes. Default to the brief's wording, since §7.3 is final. List the design's wording in docs/CONTENT-TODO.md or the PR so Tanjil can pick. Either way, write 'dagmeter' as one word.
- **Verified:** confirmed

#### [minor] `form-a-step6-heading-structure`
- **Brief:** §7.3 step 6 / §7.2 knows_consumption title — Step title "Ken je je jaarlijks energieverbruik?" (single title).
- **Figma:** `90:9920 'Je jaarlijks verbruik' (34px) + 90:10441 'Ken je je jaarlijks energieverbruik?' (18px SemiBold)` — Two levels: the heading "Je jaarlijks verbruik" and the question "Ken je je jaarlijks energieverbruik?" as a smaller field label. Card gap is 12px here vs 10px elsewhere.
- **Recommendation:** Let the flow schema take an optional step title plus a field label so this layout can be reproduced. Use the brief's question as the field label, and keep the design's heading unless Tanjil prefers the brief's single title.
- **Verified:** confirmed

#### [minor] `form-a-u-forms`
- **Brief:** §2 Tone; §6 copy corrections (u → je) — Replace every 'u' form with 'je'. Questions: "Wat is je postcode?", "Wie is je huidige energieleverancier?".
- **Figma:** `89:7945, 89:7946 (Step 2); 89:8435, 89:8436 (Step 3); footer 84:4532 and equivalents` — "Wat is uw postcode?", "Voer uw postcode in", "Wie is uw huidige energieleverancier?", "Selecteer uw huidige leverancier", and in the footer "Voer uw e-mailadres in".
- **Recommendation:** Apply the je-forms: "Voer je postcode in", "Selecteer je huidige leverancier", "Voer je e-mailadres in".

#### [minor] `form-a-yes-no-typo-ne`
- **Brief:** §6 copy corrections ('Ne' → 'Nee') — Every yes/no reads "Nee".
- **Figma:** `90:9436, 90:9457 (Step 5); 90:10446 (Step 6)` — "Ne" 3 times in steps 5–6 ("Ja" is correct).
- **Recommendation:** Use one shared yes_no option set, yes "Ja" / no "Nee", in the flow config.

#### [minor] `form-a-left-panel-energy-copy`
- **Brief:** §7.3 step 1 (shared by all products); §7.4 solar/battery flows; §17 never invent content — Step 1 and the shared steps serve energy, solar and battery flows.
- **Figma:** `89:7435 / 89:7436 panel copy; 89:7439 mascot with lightning and flame bubbles` — The panel copy is energy-only ("Vind je beste energiedeal, zonder gedoe.") and so is the mascot art (lightning and flame). No panel copy exists for the solar or battery flows.
- **Recommendation:** Make the panel title, body and image configurable per flow, with the design copy as the default for every flow. List solar/battery panel copy in docs/CONTENT-TODO.md, and don't write new copy.

#### [info] `form-a-step5b-not-in-design`
- **Brief:** §7.3 step 5b tariff_meter (ADDED, TO CONFIRM); §15 #2 — Step 5b: "Heb je een sociaal tarief?" (yes/no) + "Heb je een budgetmeter?" (Ja / Nee / Weet ik niet).
- **Figma:** `No frame; nearest pattern 90:8972 Step - 5` — Not drawn. Step 5's two-question layout already fills the fixed 567px card (content to y=753, divider removed).
- **Recommendation:** Make 5b its own screen using the Step 5 pattern. The 3-option budget meter needs a third card and icon. Put it behind config and list it in the PR as the brief requires.

#### [info] `form-a-step1-no-gas-cards`
- **Brief:** §7.3 step 1 (ADDED vs design: gas, TO CONFIRM); §15 #1 — Five cards: Elektriciteit, Gas, Elektriciteit + gas, Zonnepanelen, Thuisbatterij (config switch).
- **Figma:** `84:3972 cards 89:7452, 89:7463, 89:7466` — Three cards: Elektriciteit, Zonnepaneel, Thuisbatterij (671x74, gap 18).
- **Recommendation:** As expected. Build five cards with the 74px card style behind a config switch. On mobile, 5x74 plus gaps is about 440px.

#### [info] `form-a-step3-no-supplier-list`
- **Brief:** §7.3 step 3 (TO CONFIRM supplier list) — Select with Engie, Luminus, TotalEnergies, Mega, Eneco, Octa+, Bolt, Ecopower, Elegant, Energie.be, DATS 24, Frank Energie, Andere, Weet ik niet.
- **Figma:** `89:8432 closed select, placeholder 89:8436, chevron 89:8452` — Only a closed dropdown with the placeholder "Selecteer uw huidige leverancier" (16px, while the postcode placeholder is 18px). No options are drawn. The only supplier names in the file are homepage marketing copy ("Luminus, Mega en TotalEnergies", e.g. 60:321), which are the suppliers compared.
- **Recommendation:** Use a native <select> styled like 89:8432 (74px, #7051ED chevron), best for mobile and in-app browsers, with options from config. Nothing in the design contradicts the TO CONFIRM list.

#### [info] `form-a-static-step-counter`
- **Brief:** §7.6 Progress; §7.3 path lengths; §6 design fixes (step counter) — X = position on the actual path; Y = estimated total (yes path 9, no path 10 from step 1).
- **Figma:** `89:7443, 89:7940, 89:8431, 89:8934, 90:9417, 90:9918 'Stap 1…6 van 8'` — A static "van 8", the design's yes path without 5b. With 5b, design step 6 becomes Stap 7. Gas-only (meter_type skipped) and preselected product (step 1 skipped) each shorten the path by one.
- **Recommendation:** Compute the counter as the brief says. Keep the design's visual format "Stap X van Y" (14px SemiBold #6c5ce7) and the bar.

#### [info] `form-a-form-page-chrome`
- **Brief:** §6 mobile-first (compact panel header, progress on top); §6.1 'Paid-traffic pages stay light'; §5 nav — Nothing specific about header or footer on /vergelijken. On mobile the panel becomes a compact header above the question card.
- **Figma:** `Header 84:4032–84:4274 and footer 84:4326–84:4538 (and equivalents in every step frame)` — Form frames carry the full site header: 16px lime strip, 69px bar, nav including 'Blogs', and the "Gratis beginnen" CTA that links to the form itself. They also carry the full footer: newsletter, links, placeholder contacts.
- **Recommendation:** Default: build it as designed. On mobile, the site header, compact panel and progress card together push the first question down. Propose a slim, logo-only form header for mobile and paid traffic, and ask Tanjil.

#### [info] `form-a-fixed-card-height-and-spacing`
- **Brief:** §6.1 step change (card height animates); §6 Tokens — Card height animates between steps; components use tokens.
- **Figma:** `Question card 84:4682 etc. (767x567 fixed); Step 1 divider 89:7469 and Terug 89:7981 at x=568; Step 6 card gap 90:10442→90:10444` — The card is a fixed 567px on every step. Small inconsistencies: step 1's divider and Terug are 9px left of the 577 content edge; step 6's card gap is 12px vs 10px; the select placeholder is 16px vs 18px; question titles are #000000 while body text is #03080f.
- **Recommendation:** Use auto height with animation. Normalise the spacing and colours to single tokens (card gap 10, placeholder 18px, text #03080f or a single title token).

#### [info] `form-a-panel-texture`
- **Brief:** §6 Tokens — Read colours, typography, radii and shadows from Figma.
- **Figma:** `88:7430 Rectangle 100 (and equivalents); footer 84:4326` — The render shows a grain/noise texture on the #7051ed panel (sampled R 87–108, G 63–79, B 184–230). get_design_context exports only a flat bg-[#7051ed].
- **Recommendation:** The tokens slice should confirm the effect. Implement it as a tiny inline SVG noise overlay or drop it. Measure contrast against the rendered, darker colour.

#### [info] `form-a-icon-provenance`
- **Brief:** §6 Assets (SVG export); §6 fonts/licence note spirit — Export assets as SVG where possible.
- **Figma:** `89:7475 'solar-panel 1 [Vectorized]' (hidden raster 89:7473); 89:7479 'smarthome 1 [Vectorized]' (hidden raster 89:7478)` — The solar and battery icons are vectorised from raster originals. The layer naming looks like a stock-icon download.
- **Recommendation:** Export the vectorised SVGs (they are available as SVG). Confirm the icon source and licence with the designer and note it next to the font licence.

#### [info] `form-a-jaarlijks-grammar`
- **Brief:** §7.3 step 6 / §7.2 — "Ken je je jaarlijks energieverbruik?" (the brief copies the design).
- **Figma:** `90:9920 'Je jaarlijks verbruik'; 90:10441 'Ken je je jaarlijks energieverbruik?'` — Same text. After a possessive, standard Dutch inflects the adjective ("je jaarlijkse energieverbruik", "Je jaarlijkse verbruik").
- **Recommendation:** This is not in the brief's correction list, so don't change it silently. Add it to docs/CONTENT-TODO.md for the client or Tanjil to confirm.

### Open questions

- Form page chrome: keep the full site header (nav, 'Blogs', 'Gratis beginnen' CTA) and the full footer on /vergelijken as designed? Or use a slim logo-only header and minimal footer on mobile and paid traffic, so the question sits higher on screen?
- Step 4 copy: the brief's "Wat voor meter heb je?" with short labels, or the design's "Welk type meter heb je?" with long labels (spelling fixed to 'Dagmeter' / 'Dag/nachtmeter')?
- Step 6: keep the design's two-level heading ("Je jaarlijks verbruik" plus the question as a label)? And may 'jaarlijks' become 'jaarlijkse' (grammar), or should it stay as designed until the client confirms?
- Icons for Gas, 'Elektriciteit + gas' and 'Weet ik niet' (5b): will the designer supply them, or may the builder pick placeholders from one open-licence icon set?
- Selected, focus, error and disabled states are not designed. May the builder derive them from the palette and propose them on staging? Who approves: Tanjil or the designer? The palette has no error red, so which colour should errors use?
- Contrast: is it OK to darken the placeholder, checkbox/radio borders and left-panel body text with in-palette colours so they pass WCAG AA, even though that deviates from the design?
- Mascot: is a layered vector or Rive mascot coming for the motion pass, or is the cropped raster ('ChatGPT Image Sep 22, 2026…') final? If it is final, can we get the uncropped source file and confirm its licence?
- Left-panel title/body and mascot art are energy-specific. Will the client supply panel copy for the solar and battery flows? Until then, use the design copy for all flows?

### Detail

### Verbatim copy (steps 1–6)
| Step | Node | Title / question | Inputs as drawn (labels verbatim) | Counter |
|---|---|---|---|---|
| 1 | 84:3972 | "Wat wil je vergelijken?" | 3 single-choice cards 671x74 with 44px icon tiles: "Elektriciteit" (lightning), "Zonnepaneel" (solar-panel), "Thuisbatterij" (smarthome) + radio | "Stap 1 van 8" |
| 2 | 89:7495 | "Wat is uw postcode?" | text field 671x74, placeholder "Voer uw postcode in"; checkbox 34x34 "Dit is een zakelijk adres." | "Stap 2 van 8" |
| 3 | 89:7986 | "Wie is uw huidige" / "energieleverancier?" (2 lines) | select 671x74, placeholder "Selecteer uw huidige leverancier", chevron #7051ED; no options drawn | "Stap 3 van 8" |
| 4 | 89:8489 | "Welk type meter heb je?" | 4 cards 671x60, no icons: "Dag meter (enkelvoudig tarief)", "Dag / nacht meter (tweevoudig tarief)", "Dag meter (enkelvoudig tarief) + exclusief nacht", "Dag / nacht meter (tweevoudig tarief) + exclusief nacht" | "Stap 4 van 8" |
| 5 | 90:8972 | "Heb je een digitale meter?" + "Heb je zonnepanelen?" (both 34px) | 2x yes/no card pairs 671x60, 40px icon tiles: "Ja" (check-circle #6C5CE7), "Ne" (x-circle #93B52A) | "Stap 5 van 8" |
| 6 | 90:9473 | heading "Je jaarlijks verbruik" (34px) + question "Ken je je jaarlijks energieverbruik?" (18px SemiBold) | 1 yes/no pair: "Ja", "Ne" | "Stap 6 van 8" |

Buttons on every step: "Terug" (white, #ded9f4 border, left chevron) and "Volgende" (#b7e137, right chevron), each 148x52, radius 12, label Regular 18px #03080f.
Left panel on every step: "Vind je beste energiedeal, zonder gedoe." (30px SemiBold white) / "In een paar eenvoudige stappen verzamelen we precies wat nodig is voor een persoonlijke vergelijking." (16px, white 65%) + raster mascot 323x289.
Header on every step: nav "Hoe het werkt / Veelgestelde vragen / Over ons / Blogs" and CTA "Gratis beginnen". The footer includes "Voer uw e-mailadres in", "E-mail: info@voordeelvinder.com", "Telefoon: 335 224 654".

### Layout (desktop 1440)
- Content 132→1296. Left panel 372x683 (r24, #7051ed + grain). Gap 25. Right column 767 = progress card 767x91 (r24) + gap 25 + question card 767x567 (r24, fixed).
- Card padding 48px sides. Divider y=730 (#CFCAE4). Buttons y=783. 50px bottom padding.
- Answer cards: 74px (step 1, gap 18) · 60px (steps 4–6, gap 10; step 6 gap 12). Inputs 74px. Checkbox 34px. Radio 24px. Icon tiles 44px (step 1) / 40px (yes/no).
- Longest option label is 441px at 18px, so it wraps on mobile. Use min-height, not a fixed height.

### Tokens seen
Font Bricolage Grotesque (opsz 14, wdth 100) at 400/500/600. Sizes 34/30/18/16/14. Title tracking -1.02px, option tracking -0.36px.
Colours: #7051ed, #674bd9, rgba(103,75,217,.13), #6c5ce7, #b7e137, #c9e260, #93b52a, #f6f4ff, #ded9f4, #cfcae4, #c4bce7, #aea9c6, #3a3c75, #03080f, #000000, #151d30, #fff.
Radii 24/16/12/10/8/37. Shadows: `0 29 64 rgba(41,32,132,.11)` (progress card), `.08` (question card), header `0 13 31.8 rgba(0,0,0,.13)`.

### Contrast failures
placeholder 2.08:1 · panel body 3.10:1 · checkbox border 1.37:1 · radio stroke 1.65:1 · card/input border 1.37:1.

### Local artefacts
- Notes: /private/tmp/claude-501/-Users-tanjilrashid-Projects-VoordeelVinder/5cb53aa9-95b4-4978-8f81-bc1ab0eb0bfd/scratchpad/figma/form-a.md
- Screenshots: .../scratchpad/figma/shots/form-a-step2-1440.png, .../scratchpad/figma/shots/form-a-step2-form-crop.png
- Icon SVGs: .../scratchpad/figma/assets-form-a/ (radio, chevrons, divider, Ja/Ne, 3 product icons)

---

<a id="form-b"></a>
## Form steps 7–8 and thank-you

**Frames reviewed:** 90:10462 Step - 7- If user select yes (7A); 91:11921 Step - 7 - if user selct No (7B-1); 91:12392 Step - 7 -slide 2 (7B-2); 91:10958 Step 8 (yes row, canonical); 91:13376 Step 8 (second copy, no row); 91:13857 Thank you page (yes row, canonical); 91:14645 Thank you page (second copy, no row); 90:10458 text 'If Yes'; 91:11447 text 'If NO'; connectors 90:10457, 91:11448, 91:12386, 91:12898, 91:12858, 91:13853, 91:15100 (plus arcs 91:10953-91:10957 above steps 1-6)

**Summary.** The node ids in brief §6 are correct, and the branch structure in Figma matches §7.3.
- On the canvas, Step 6 leads through "If Yes" to 7A, then Step 8 (91:10958), then Thank you (91:13857). Through "If NO" it leads to 7B-1, then 7B-2, then Step 8 copy (91:13376), then Thank you copy (91:14645).
- The two bottom-row copies exist only to draw the no path:
  - Thank you 91:14645 is identical to 91:13857.
  - Step 8 91:13376 is a stale duplicate. It differs only in its counter ("Stap 6 van 8") and phone prefix (+31 with a Dutch flag). The Dutch flag the brief warns about is on this frame.
- The canonical Step 8 (91:10958) already shows a Belgian flag and "+32", but also a chevron-down that suggests a country picker.

Three things §7.3/§7.5 require are not in any Step 8 frame, and the brief does not mark them as "ADDED vs design":
- the call-moment day and slot picker ("Wanneer mogen we je bellen?"), so there is no 13–14 slot drawn;
- the newsletter checkbox;
- the long consent text with the privacybeleid link and partner contact. The design's consent reads only "Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be".

The submit button says "Indienen", not "Verstuur".

Question copy differs from the brief on every step in this slice:
- 7A draws one electricity field: heading "Elektriciteitsverbruik", a "kWh" suffix, and no label, hint, placeholder or gas field.
- 7B-1 asks "Wat is het aantal bewoners? " and "Wat is het type woning?" with closed dropdowns and no options drawn.
- 7B-2 uses the nouns "Warmtepomp" and "Elektrisch voertuig" with "Ja"/"Ne" cards.

Drawn counters:
- 7A "Stap 7 van 8"
- 7B-1 "Stap 3 van 8", although its bar shows 7/8
- 7B-2 "Stap 7 van 8"
- Step 8 "Stap 8 van 8" (yes row) and "Stap 6 van 8" (no row)

Correct counters from step 1, with 5b included:
- 7A: 8 van 9
- Step 8 on the yes path: 9 van 9
- 7B-1: 8 van 10
- 7B-2: 9 van 10
- Step 8 on the no path: 10 van 10

Thank-you page:
- Heading "Bedankt! We gaan voor je aan de slag."
- Body "We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op."
- Button "Terug naar de startpagina"
- Mascot: a thumbs-up fox in a purple circle, drawn as a raster image.
- It makes no time claim. But it promises a callback to every visitor, including no_promo and pending leads that nobody will call. That needs client sign-off.

Other points:
- The left-panel body text contrast is 3.1:1, which fails WCAG AA.
- The left panel is energy-specific, although the contact step is shared with the solar and battery flows.
- No selected, error or loading states are drawn, and Turnstile is not placed.

### Confirmed against the brief

- Node ids in the §6 form frame table are correct: 7A 90:10462, 7B-1 91:11921, 7B-2 91:12392, Step 8 91:10958, Thank you 91:13857. Only the layer names differ slightly in hyphens and spacing.
- The canvas confirms the branch at step 6: "If Yes" (90:10458) with arrow 90:10457 goes to 7A, and "If NO" (91:11447) with L-connector 91:11448 goes to the 7B-1 row. 7B-1 then leads to 7B-2 and on to the contact step, as §7.3 describes.
- 91:10958 and 91:13857 are the yes-row frames. 91:13376 and 91:14645 are the no-row duplicates. The brief's choice of 91:10958 and 91:13857 as canonical is right.
- The two Thank you frames (91:13857, 91:14645) are identical in structure, copy and look.
- The canonical Step 8 (91:10958) already uses the Belgian flag and +32. The Dutch flag and +31 appear only on the stale copy 91:13376.
- 7A input type: a single number field with an in-field 'kWh' unit suffix, which matches the `number` field type with a unit.
- 7B-1 uses 2 dropdowns (selects with chevron-down), which matches the '2 × select' input in §7.3.
- 7B-2 uses 2 × yes/no card pairs, which matches `yes_no`. The options are 'Ja'/'Ne' and the 'Ne' → 'Nee' fix in §6 applies.
- The Step 8 title 'Jouw gegevens' and the labels Voornaam, Achternaam, Telefoonnummer and E-mail match §7.3 row 8.
- The Terug/Volgende pair is on every step frame, and Step 8 has 'Terug' plus the submit button.
- The thank-you copy is product-neutral, so the brief's 'same copy, separate URLs per product' works.
- The thank-you page has no 'binnen X uur' or other time claim and shows no on-screen result or outcome, which fits §1 and §8 (the visitor never sees the outcome).
- Path lengths agree. The design's yes path is 8 screens (1–6, 7A, 8), which matches its 'van 8'. Adding step 5b gives the brief's 9. The design's no path is 9 screens, and adding 5b gives the brief's 10.
- The brief's warning that the step counter on the 'Nee' branch frames is wrong is correct: 7B-1 shows 'Stap 3 van 8', 7B-2 'Stap 7 van 8', and Step 8 copy 'Stap 6 van 8'.

### Findings

#### [major] `form-b-call-moment-missing`
- **Brief:** §7.3 row 8; §7.5 call moment (day_slot); §9.2 call_preference; §14 checklist — Step 8 includes the required 'Wanneer mogen we je bellen?' day + slot picker. Days mon…fri (Maandag–Vrijdag); slots 09-10, 10-11, 11-12, 12-13, 13-14, 14-15, 15-16; keep 13–14. The brief does not mark this as 'ADDED vs design'.
- **Figma:** `91:10958 Step 8 (and 91:13376). The card only holds the 2x2 field grid (91:11419–91:11442), the consent row (91:11443/91:11444), the divider 91:11411 at y=730 and the buttons.` — No call-moment UI anywhere in the slice: no heading, no day options, no slot options. So 13–14 is neither present nor absent; nothing is drawn. The question card is a fixed 767x567 and already full: the divider sits at y=730 and the buttons at 783.
- **Recommendation:** Build it as `day_slot` on the shared contact step, as the brief says. The 9/10 path lengths assume it shares the screen with the contact fields. Derive the look from existing parts: 5 day chips and 7 slot chips in the 7B-2 option-card style (#f6f4ff, border #ded9f4, radius 16), or 2 selects in the 7B-1 style. The card grows in height. Show it on staging, ask the designer to draw desktop and mobile versions, and record it in the PR as an addition to the design.
- **Verified:** confirmed

#### [major] `form-b-thankyou-callback-claim`
- **Brief:** §2 Claims that need client sign-off; §1 and §8 (no_promo is stored, not delivered; pending waits); §5 thank-you row — Every visitor sees the same thank-you copy and the outcome is never shown. The §2 sign-off list does not include the thank-you text.
- **Figma:** `91:14343 (and 91:15094): 'We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op.'; heading 91:14306 'Bedankt! We gaan voor je aan de slag.'` — The copy promises that everyone will be contacted 'zo snel mogelijk' and implies a comparison is being run. no_promo leads are never delivered to a caller, and solar and battery leads are 'pending' with no destination yet, so for those visitors the promise is false.
- **Recommendation:** Build it exactly as designed, from content JSON. Add this sentence and the heading to docs/CONTENT-TODO.md as a claim that needs client sign-off, next to the §2 items. Ask the client or copywriter for wording that is true for every outcome, and do not invent it. This belongs with the 'Doorgestuurd naar een verkoper: Nooit' item.
- **Verified:** confirmed

#### [minor] `form-b-consent-text`
- **Brief:** §7.5 Consent; §11 Privacy ('the consent text names who may contact the visitor'); §15 #8 — Required checkbox (placeholder, TO CONFIRM with the lawyer): "Ik ga akkoord met de [algemene voorwaarden] en het [privacybeleid] en geef toestemming dat VoordeelVinder en haar partners mij contacteren over mijn vergelijking."
- **Figma:** `91:11444 (text) + 91:11443 (34x34 checkbox), Step 8 91:10958` — "Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be". There is 1 link ('algemene voorwaarden' in #6c5ce7), no privacy policy link and no partner-contact consent.
- **Recommendation:** Use the brief's placeholder text with both links in the #6c5ce7 link style. It will wrap to 2–3 lines, so the checkbox should align to the top of the text. Keep the text in content JSON and list it in CONTENT-TODO for the lawyer.
- **Verified:** confirmed

#### [minor] `form-b-newsletter-missing`
- **Brief:** §7.5 Consent (optional newsletter); §9.2 consent.newsletter — An optional, unchecked checkbox: "Ik wil tips en aanbiedingen via e-mail ontvangen."
- **Figma:** `91:10958 Step 8. Only one checkbox (91:11443) is drawn.` — No newsletter checkbox.
- **Recommendation:** Add a second checkbox row that reuses the consent checkbox style (34x34, radius 10, #f6f4ff/#ded9f4, 18px #3a3c75 text), unchecked by default, below the terms checkbox.

#### [minor] `form-b-submit-label`
- **Brief:** §7.3 row 8 ('Button "Verstuur"') — The submit button reads "Verstuur".
- **Figma:** `91:11410 'Indienen' on lime button 91:11407 with chevron-right 91:11412 (the same on 91:13826)` — The submit button reads "Indienen".
- **Recommendation:** Use "Verstuur", since the brief is decided. Keep it configurable in the flow JSON, keep the lime style and chevron, and add the loading state from §6.1. Note the copy change in the PR.
- **Verified:** confirmed

#### [minor] `form-b-phone-prefix-picker`
- **Brief:** §6 Design fixes (phone: fixed +32, no country picker, no Dutch flag); §7.5 Phone — A fixed +32 prefix for Belgian mobiles only, with no country picker and no Dutch flag.
- **Figma:** `91:10958: chip 91:11440 (92x40) with BE flag 'flag (2) 1' 113:1919, '+32' 91:11434, chevron-down 91:11438, placeholder '478 12 34 56' 91:11442. 91:13376: '+31' 91:13844 with NL flag 'flag (1) 1' 91:13845.` — The canonical frame shows the Belgian flag and +32, plus a chevron that implies a country dropdown. The second copy shows +31 with the Dutch flag.
- **Recommendation:** Build from 91:10958 as a static, non-interactive prefix chip: the flag (decorative, aria-hidden) and '+32', with no chevron. The brief bans only the Dutch flag, so keeping the BE flag is an assumption; note it in the PR. Keep the placeholder '478 12 34 56'. The parser must still accept '0478…', '+32…' and '0032…' pasted into the field (§7.5).

#### [minor] `form-b-placeholders-u-form`
- **Brief:** §2 Tone ('replace every "u" with "je"'); §6 copy corrections ('The "u" forms → "je" forms') — Informal 'je' everywhere.
- **Figma:** `91:11431 'Vul hier uw voornaam in', 91:11433 'Vul hier uw achternaam in' (the same in 91:13843/91:13846); email placeholder 91:11441 'example@email.com'` — The name placeholders use 'uw'. The email placeholder is the English 'example@email.com'.
- **Recommendation:** Change them to 'Vul hier je voornaam in' and 'Vul hier je achternaam in'. The brief's u→je rule already covers this. The email placeholder can stay as drawn unless the client wants a Dutch example; list it in CONTENT-TODO rather than inventing one. Also, the placeholder colour #aea9c6 on #f6f4ff is only 2.08:1, which is readable only because each field has a real label.

#### [minor] `form-b-7a-fields-hint`
- **Brief:** §7.3 row 7A; §7.5 kWh fields — Step title 'Je jaarverbruik'; fields "Elektriciteit (kWh per jaar)" and/or "Gas (kWh per jaar)" depending on energy_type; hint "Een gemiddeld gezin verbruikt ±3.500 kWh elektriciteit."; range 100–100 000 (electricity) and 100–150 000 (gas), with a soft warning outside typical ranges; '3500' and '3.500' both accepted.
- **Figma:** `90:10462: heading 90:10938 'Elektriciteitsverbruik', input 90:10935 (671x74) with suffix 'kWh' 90:10939. Empty space from y=492 to the divider at 730.` — One electricity input with no field label, no placeholder, no hint and no gas field. The heading is a noun ('Elektriciteitsverbruik'), not the brief's title.
- **Recommendation:** Follow the brief:
- Use 'Je jaarverbruik' as the step title.
- Show one labelled input per energy_type, labels in the Step 8 style (18px SemiBold).
- Reuse the 7A input with its in-field 'kWh' suffix for gas.
- Put the hint in the empty space under the electricity field.
- Use inputmode=numeric.
The gas field follows from gas being added in §7.3, which is still TO CONFIRM, so it sits behind the same config switch. Record in the PR that the heading differs from the design.
- **Verified:** confirmed

#### [minor] `form-b-7b1-question-copy`
- **Brief:** §7.3 row 7B-1 — 'Hoeveel personen wonen er in je woning?' / 'Wat voor woning heb je?' as 2 × select. Options `1`,`2`,`3`,`4`,`5_plus` and apartment 'Appartement', terraced 'Rijwoning (gesloten bebouwing)', semi_detached 'Halfopen bebouwing', detached 'Open bebouwing'.
- **Figma:** `91:12369 'Wat is het aantal bewoners? ' (the layer text ends with a space), 91:12388 'Wat is het type woning?', placeholders 91:12370 'Selecteer het aantal personen' and 91:12389 'Selecteer woningtype'` — Different question wording. The dropdowns are closed, so neither household sizes nor dwelling types are drawn. The progress bar shows 7/8 while the text says 'Stap 3 van 8'.
- **Recommendation:** Use the brief's wording and options, since §7.3 is final. Keep the design's select placeholders, which are neutral and use 'je'-free Dutch. Trim the trailing space. Use a native <select> on mobile for in-app browsers. The brief is the only source for the options; there is no Figma source to check them against.
- **Verified:** confirmed

#### [minor] `form-b-7b2-question-copy`
- **Brief:** §7.3 row 7B-2; §6 copy corrections ('Ne' → 'Nee') — 'Heb je een warmtepomp?' / 'Heb je een elektrische wagen?' as 2 × yes/no.
- **Figma:** `91:12861 'Warmtepomp', 91:12862 'Elektrisch voertuig'; options 91:12877/91:12878 'Ja' and 91:12879/91:12880 'Ne'; icons 91:12887–91:12893 (check-circle for Ja, x-circle for Ne); radios 91:12881–91:12884` — The headings are nouns ('Warmtepomp', 'Elektrisch voertuig'), not questions, and 'Elektrisch voertuig' is a different term from 'elektrische wagen'. The option label is 'Ne'.
- **Recommendation:** Use the brief's questions and 'Nee'. Keep the card design: icon tile, label and radio on the right. Record the heading change in the PR.
- **Verified:** confirmed

#### [minor] `form-b-left-panel-energy-specific`
- **Brief:** §7.1 Shared steps (contact is reused by all flows); §7.4 (the solar and battery flows reuse knows_consumption, consumption_kwh, household and appliances) — The brief says nothing about left-panel copy or the mascot for the solar and battery flows.
- **Figma:** `Left panel in every form frame of this slice: 90:10903 / 91:12362 / 91:12833 / 91:11399 'Vind je beste energiedeal, zonder gedoe.'; 90:10904 'In een paar eenvoudige stappen verzamelen we precies wat nodig is voor een persoonlijke vergelijking.'; mascot raster 90:10906 (fox with laptop, lightning and flame icons)` — The copy ('energiedeal') and the mascot icons (lightning and flame) are energy-specific. They would appear on the shared contact step and the reused 7A/7B steps in the solar and battery flows.
- **Recommendation:** Make the left-panel title, body and image per-flow settings in the flow JSON. Use the energy copy as a flagged fallback for the solar and battery flows, and list it in CONTENT-TODO so the client or designer can supply product copy. Do not write new copy.

#### [minor] `form-b-left-panel-contrast`
- **Brief:** §7.6 Accessibility (WCAG AA); §11 axe in CI — Contrast must meet WCAG AA.
- **Figma:** `90:10904 / 91:11400 (16px, rgba(255,255,255,0.65) on #7051ed)` — The body text is 3.1:1 against the panel. Normal text needs 4.5:1.
- **Recommendation:** Raise the text opacity to at least 0.92 (0.95 gives 4.8:1) or use solid white (5.14:1). Tell the designer. It will fail axe otherwise. The counter and link colour #6c5ce7 on white pass at 4.86:1.

#### [info] `form-b-step-counters`
- **Brief:** §6 Design fixes (step counter); §7.6 Progress; §7.3 path lengths — The counter is calculated: X is the position on the real path, Y is the estimated total. The yes path is 9 screens and the no path 10, counted from step 1.
- **Figma:** `90:10907 'Stap 7 van 8'; 91:12366 'Stap 3 van 8' (bar 91:13855 = 7/8); 91:12837 'Stap 7 van 8'; 91:11402 'Stap 8 van 8'; 91:13820 'Stap 6 van 8' (bar full)` — All frames use 'van 8'. The no-row frames have wrong X values (3, 7, 6), and even the design's own no path has 9 screens.
- **Recommendation:** Ignore the drawn numbers and compute them.

From step 1:
- 7A = 'Stap 8 van 9'
- Step 8 on the yes path = 'Stap 9 van 9'
- 7B-1 = 'Stap 8 van 10'
- 7B-2 = 'Stap 9 van 10'
- Step 8 on the no path = 'Stap 10 van 10'

With the product preselected, subtract 1 from both X and Y (for example 7A = 'Stap 7 van 8'). With energy_type=gas, meter_type is skipped, so subtract 1 more. Keep the drawn bar style: a 9px track at rgba(103,75,217,0.13) with a #674bd9 fill.

#### [info] `form-b-duplicate-frames`
- **Brief:** §6 form frame table (lists only 91:10958 and 91:13857) — Step 8 is 91:10958 and Thank you is 91:13857.
- **Figma:** `91:13376 Step 8 (second copy), 91:14645 Thank you page (second copy), connected by 91:13853 and 91:15100 in the no row` — The no row repeats Step 8 and Thank you so the branch can be drawn.
- 91:14645 is identical to 91:13857.
- 91:13376 differs from 91:10958 only in its counter ('Stap 6 van 8') and phone prefix: '+31' with the NL flag, and a 90px chip instead of 92px.
- **Recommendation:** Ignore both copies and build one shared contact step and one thank-you template. Ask the designer to delete 91:13376 or fix it to +32, so nobody builds from it later.

#### [info] `form-b-mascot-thankyou-raster`
- **Brief:** §6 Assets (layered SVG mascot if layers allow); §6.1 signature morphs (the mascot moves from the form panel to the thank-you page; 'the mascot cheers') — Export the mascot as a layered SVG where possible. The mascot moves to the thank-you page and cheers.
- **Figma:** `Form panel 90:10906 'ChatGPT Image Sep 22, 2026, 01_37_15 PM 5' (PNG sprite crop); Thank you group 91:14643 with 'Group 21 1' 91:14640 (masked PNG) and 'Group 21 2' 91:14642 (PNG), inside Ellipse 11 91:14358` — Both mascots are rasters with no head, eye or arm layers. The poses differ: laptop with energy icons on the form, a static thumbs-up with spark lines in a purple circle on the thank-you page. No animation is drawn.
- **Recommendation:** Export as WebP/AVIF. The 'mascot moves' morph can only be a shared-element crossfade between two different images; a limb animation needs the designer to supply layered SVG, Rive or Lottie files. The thumbs-up pose is the 'celebration' state. Any cheer animation, such as a pop-in or a few sparks, is a code-side proposal for §15 #13.

#### [info] `form-b-states-and-widgets-undrawn`
- **Brief:** §6.1 form motion (selected, error, submit loading); §7.5 email typo suggestion; §7.6 inline errors; §9.1 Turnstile + honeypot — Selected states, inline errors with a shake, a submit loading state, email typo suggestions and a Turnstile check are all required.
- **Figma:** `7B-2 radios 91:12881–91:12884 (all unselected); 7B-1 selects closed; Step 8 91:10958; Thank you hidden 'check-circle 1' 91:14337` — Only the default state of each control is drawn: nothing is selected, and there are no errors, no focus rings, no loading state and no typo hint. Turnstile has no designed place.
- **Recommendation:** Derive the states from the palette: the selected state in #7051ed/#674bd9, errors in an on-palette danger colour to add to the tokens with the designer, and focus rings for AA. Use Turnstile in managed or invisible mode, placed just above the submit row so it doesn't change the layout. Show all of these on staging.

#### [info] `form-b-layout-inconsistencies`
- **Brief:** §6 Tokens (read from Figma; no off-palette colours) — Put the tokens in Tailwind @theme, with no off-palette colours.
- **Figma:** `Heights: 7A input 90:10935 and 7B-1 selects 91:12367/91:12387 are 74; Step 8 fields 91:11420 etc. and 7B-2 cards 91:12871 etc. are 60. 7B-2 has no divider (Vector 21). Three purples: #7051ed (panel), #674bd9 (bar), #6c5ce7 (text). 7B-2's footer alone adds 'Adres: Nederland' (91:12795, 91:12824, 91:12829).` — Field heights are inconsistent, 7B-2 has no divider, three near-identical purples are used, and one frame has a footer variant with an address line.
- **Recommendation:** Standardise on one field height token (60 on desktop, at least 48 on mobile) and a single divider rule. Have the tokens slice decide whether the three purples become separate tokens. The footer address is already a TODO placeholder in the brief, so treat the footer as one shared component.

#### [info] `form-b-if-no-connector`
- **Brief:** §7.3 branch at step 6 — No at step 6 leads to 7B-1.
- **Figma:** `91:11448 Vector 30 (bbox x 29262..31053, y 2993..4154), label 91:11447 'If NO'` — The L-shaped connector has arrowheads at both ends. It is loosely placed and touches neither Step 6 nor 7B-1, but the intent is clear from the label and the row placement.
- **Recommendation:** Nothing to build. The branch intent matches the brief.

### Open questions

- What are the Dutch labels for the household-size options? The brief gives only the codes `1`,`2`,`3`,`4`,`5_plus`, and Figma draws no options. For example, '1 persoon' … '5 of meer'. This needs client or Tanjil input, not invention.
- What is the 7A hint for gas? The brief's hint ('±3.500 kWh elektriciteit') covers electricity only. Should gas-only visitors get no hint, or a gas hint from the client?
- Should the Belgian flag stay in the fixed +32 prefix as decoration? The brief bans only the Dutch flag and the picker.
- How should the call-moment UI look, and on mobile should it stay on the contact screen? The 9/10 path lengths assume the same screen. The alternative is day and slot chips or 2 selects; the designer should draw it.
- Thank-you copy: can the client approve a sentence that is true for no_promo and pending leads, since they are not called? Should the page echo the chosen call moment?
- §7.6 progress: should Y at step 6 (before the branch) show the shorter yes-path total, so that Y only ever increases after 'Nee'? Or can Y drop when 'Ja' is chosen? The brief's phrase 'without ever going backwards' is ambiguous between the bar and Y.
- Should left-panel copy and mascot be per product? 'Vind je beste energiedeal' also appears on the shared contact step for the solar and battery flows.

### Detail

### Verbatim copy per frame (exact, typos kept)

| Frame | Counter | Heading(s) | Fields and options | Buttons |
|---|---|---|---|---|
| 7A 90:10462 | Stap 7 van 8 (bar 608/693) | Elektriciteitsverbruik | 1 number input, suffix "kWh"; no label, placeholder or hint | Terug / Volgende |
| 7B-1 91:11921 | Stap 3 van 8 (bar 608/693) | "Wat is het aantal bewoners? " / "Wat is het type woning?" | 2 selects: "Selecteer het aantal personen" / "Selecteer woningtype"; no options drawn | Terug / Volgende |
| 7B-2 91:12392 | Stap 7 van 8 (bar 608/693) | Warmtepomp / Elektrisch voertuig | 2 × (Ja [check icon] / Ne [x icon]), radio on the right, none selected | Terug / Volgende |
| Step 8 91:10958 | Stap 8 van 8 (bar full) | Jouw gegevens | Voornaam "Vul hier uw voornaam in"; Achternaam "Vul hier uw achternaam in"; Telefoonnummer [BE flag] "+32" [chevron] "478 12 34 56"; E-mail "example@email.com"; checkbox "Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be" | Terug / Indienen |
| Step 8 copy 91:13376 | Stap 6 van 8 (bar full) | same | same, except [NL flag] "+31" | same |
| Thank you 91:13857 = 91:14645 | none | "Bedankt! We gaan voor je aan de slag." | Body: "We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op." | "Terug naar de startpagina" (arrow up-right) |

**Left panel on all step frames:**
- Title: "Vind je beste energiedeal, zonder gedoe."
- Body: "In een paar eenvoudige stappen verzamelen we precies wat nodig is voor een persoonlijke vergelijking."
- Mascot: raster fox with a laptop and lightning and flame bubbles.

### Correct counters (§7.6, 5b included, electricity involved)

| Screen | From step 1 | Preselected |
|---|---|---|
| 7A | 8/9 | 7/8 |
| Step 8, yes path | 9/9 | 8/8 |
| 7B-1 | 8/10 | 7/9 |
| 7B-2 | 9/10 | 8/9 |
| Step 8, no path | 10/10 | 9/9 |

With gas only, subtract 1 more.

### Style values sampled (Bricolage Grotesque throughout)

- **Question card:** 767x567, white, border #ded9f4, radius 24, shadow 0 29 64 rgba(41,32,132,.08).
- **Progress card:** same, but shadow .11. Counter 14/20 SemiBold #6c5ce7. Track 9px rgba(103,75,217,.13), fill #674bd9, radius 24.
- **Heading:** 34 SemiBold, tracking -1.02.
- **Field label:** 18 SemiBold, lh 36, tracking -0.54.
- **Field:** #f6f4ff, border #ded9f4, radius 16, height 60 or 74. Placeholder 16 Regular #aea9c6, tracking -0.48.
- **Option card:** 671x60 with a 40x40 white icon tile (radius 8) and a 24px radio.
- **Buttons:** Next #b7e137, radius 12, 148x52, text 18 Regular #03080f. Back is white with border #ded9f4.
- **Checkbox:** 34x34, radius 10. Consent text 18 #3a3c75, link #6c5ce7.
- **Thank-you card:** white 767x636 over a #7051ed 767x644 base (8px purple lip).
  - Heading 34/41 centred.
  - Body 18/30 #3a3c75 centred.
  - Button #7051ed pill, radius 37, 352x62, shadow 0 2 8.2 rgba(108,92,231,.36), inner white glow 17.4, text 20 Medium white.

### Contrast

| Colour pair | Ratio | AA |
|---|---|---|
| #6c5ce7 on white | 4.86 | pass |
| Panel body text (white at 0.65 opacity) on #7051ed | 3.1 | **fail** (needs opacity ≥0.92) |
| Placeholder on field | 2.08 | low |
| Lime button text | 13.2 | pass |

### Screenshots

In the scratchpad `figma/shots/` folder:
- formb_7B1_91-11921(.png, _card.jpg)
- formb_step8no_91-13376(.png, _card.jpg)
- formb_tyno_91-14645.png
- formb_vector30_91-11448.png

---

<a id="other"></a>
## Unlisted frames and file-level checks

**Frames reviewed:** 100:2 About us; 113:1135 Blogs overview; 118:2067 Read Blog Page; 5:819 Homepage 1 (hidden); 35:838 Homepage 2 (hidden); 60:2 Homepage 3 (Over ons section 60:21/60:15 only); Canvas connectors 91:10953-91:10957, 90:10457, 91:11448, 91:12386, 91:12898, 91:12858, 91:13853, 91:15100 + labels 90:10458, 91:11447; 91:13376 / 91:14645 (second copies, text diff only); File-level: page list (0:1 only), page1.xml node types

**Summary.** The Figma file has three things the brief doesn't expect. First, there is a full, visually finished About us page (100:2, 11 sections). Homepage 3 does have an "Over ons" section, so the brief's anchor still works. But the About us page's copy repeatedly contradicts the MVP: it promises on-screen results and a calculator ("Bekijk de berekening"), says "Geen tussenpersonen", "We sturen je nooit door naar een verkoper", "Andere vergelijkers verkopen jouw gegevens aan call centers. Wij niet." and "no cure, no pay", and makes a roadmap claim that treats solar as future scope. Its team section looks invented: three names, and two of them use the same stock photo. Recommendation: keep the anchor for the MVP, and log the page as designed but unscoped, with its claims listed. Second, the blog listing IS designed (featured post, 3x3 card grid, pagination), though every entry is the same placeholder. The post template only has a date, an H1 and a hero image. There is no body styling, author, reading time or related posts, and it has a leftover pagination block. Third, Homepages 1 and 2 are confirmed hidden and render as a 1x1 image. Their text is a subset of Homepage 3's, apart from a "30000+" variant of the customer-count claim and an "Adres: Nederland" footer line. File-level: one page, 1440 desktop only, and no components, instances or variables. No prototype data is readable. The arrows between frames are drawn vectors, and they map exactly to the brief's yes/no paths. Nothing exists for a 404 page, the legal pages, a cookie banner, newsletter confirmation, or error, loading, hover or focus states.

### Confirmed against the brief

- Homepage 3 has an 'Over ons' section (pill group 60:21 with text 60:25 'Over ons', heading 60:15 'Waarom VoordeelVinder bestaat', 3 cards), so the §5 nav anchor has a real target. Header nav and footer 'Snelle links' include 'Over ons' in every frame.
- Homepage 1 (5:819) and Homepage 2 (35:838) are hidden old versions (hidden=true; screenshots render 1x1). Their text is a subset of Homepage 3, so ignoring them per §5 loses nothing.
- Only desktop frames exist: all 22 top-level frames are 1440 wide, with no nested device-sized frames (matches §0/§6 'desktop frames only').
- No Figma variables and no components/instances/component sets. Tokens have to be sampled, as §6 anticipates.
- Only one page in the file ('0:1 Page 1'), matching §6.
- The drawn canvas arrows match the §6 step table: Steps 1→2→3→4→5→6, then 'If Yes' → 7A (90:10462) → Step 8 (91:10958) → Thank you (91:13857), and 'If NO' → 7B-1 (91:11921) → 7B-2 (91:12392) → Step 8 copy (91:13376) → Thank you copy (91:14645). That gives 9 screens on the yes path and 10 on the no path from step 1 (§7.3).
- Thank you copy 91:14645 has identical text to 91:13857 (the §5 single thank-you design holds).
- No 404, legal page or cookie banner designs exist, consistent with §5 'not designed' and §10 (CookieConfirm vendor UI).
- No motion or prototype content is detectable, consistent with §6.1.

### Findings

#### [major] `other-aboutus-page-exists`
- **Brief:** §5 Nav items ('Over ons' is an anchor to a homepage section; no separate pages) — 'Over ons' is an anchor to a homepage section. There are no separate pages for it, and no /over-ons route is in the site map.
- **Figma:** `100:2 'About us' (1440x7904)` — A complete, visually polished About us page with 11 sections: hero, founding story, statement banner, mission/vision, 'Wat we nooit doen.' list, personas, team, do/don't comparison, CTA banner, header and footer. Homepage 3 also has the smaller 'Over ons' section (60:21/60:15).
- **Recommendation:** Keep the brief's decision for the MVP: nav 'Over ons' goes to /#over-ons on the Homepage 3 section 60:21. Record 100:2 in docs/CONTENT-TODO.md and an ADR as 'designed, unscoped'. Tanjil should confirm with the client whether /over-ons is wanted at launch. If it is, treat it as added scope that needs a copy rewrite. Build the section types (story cards, statement banner, badge-list, persona cards, do/don't panels) so /over-ons can later be added through pages/over-ons.json with content changes only.
- **Verified:** confirmed

#### [major] `other-aboutus-claims`
- **Brief:** §2 claims needing sign-off; §3 (callback-only, no on-screen results); §9.3.4 (promo leads delivered to telesales partner); §17 never invent content — The MVP is callback-only and shows no results. Promo leads are called by a partner and the copy must say so. Unproven claims are hidden or listed for sign-off.
- **Figma:** `104:716, 100:346, 104:741, 108:757, 109:767, 109:766, 109:774, 109:790, 111:922, 111:934, 111:940, 100:596, 100:265, 100:26` — The About us copy claims: 'Een platform dat je in een paar minuten laat zien welke energieleverancier het voordeligst is … Geen tussenpersonen. Geen verkoopgesprekken.' (104:716); 'Andere vergelijkers verkopen jouw gegevens aan call centers. Wij niet.' (108:757); 'We sturen je nooit door naar een verkoper.' / 'Jij blijft op VoordeelVinder en jij sluit zelf af — of niet.' (109:767/109:766); 'geen betaalde topposities in de resultaten' (109:774); 'Wij verdienen alleen als jij effectief bespaart — no cure, no pay.' (109:790); 'We tonen je alle tariefcomponenten en hoe we tot het resultaat komen.' plus a CTA 'Bekijk de berekening' (111:934/111:940); '… en meteen kan overstappen' (100:346). It also contains a competitor claim ('partijdig', 100:265) and a founding story (100:26).
- **Recommendation:** Do not build these claims into the MVP. If the page is ever scoped, list every one of them in docs/CONTENT-TODO.md with proposed replacement copy for client and legal sign-off. The call-center and 'nooit doorsturen' lines conflict with the partner delivery model and GDPR transparency. 'Bekijk de berekening' has no destination until the 'Later' calculator exists.
- **Verified:** confirmed

#### [major] `other-aboutus-team-placeholder`
- **Brief:** §17 Never invent content; §2 hide unproven blocks — Never invent content such as reviews, numbers or people. Hide blocks until the client sends real content.
- **Figma:** `113:944-113:1006 (photos 113:991 'image 4', 113:1022 'image 8', 113:1018 'image 4')` — The 'De mensen achter VoordeelVinder' section names Thomas Vermeulen (Technologie & Platform), Lotte Peeters (Partnerships & Leveranciers) and Jeroen Maes (Oprichter & Strategie). Thomas and Jeroen use the same photo layer ('image 4'), which suggests stock or placeholder people.
- **Recommendation:** Treat the whole team block as placeholder. Never ship it without real names, roles, photos and consent to publish them. If a team section type is built, it renders nothing unless site content provides it.
- **Verified:** confirmed

#### [minor] `other-aboutus-scope-roadmap`
- **Brief:** §0/§3 (MVP = energy, solar panels, home battery) — Solar panels and the home battery are part of the MVP, alongside energy.
- **Figma:** `104:717, 104:742` — 'Vandaag starten we met energie. Morgen breiden we uit naar telecom, verzekeringen, internet en tv, en zonnepanelen.' (104:717) and 'Vandaag energie. Morgen alles wat je elke maand betaalt.' (104:742). These present solar as future scope, don't mention the battery, and promise a roadmap.
- **Recommendation:** Flag this for a client rewrite if the page is scoped. The copy contradicts the launch scope, and roadmap promises need sign-off.

#### [minor] `other-aboutus-copy-bugs`
- **Brief:** §6 copy corrections; §2 tone ('je') — Fix typos from the design and use 'je' everywhere.
- **Figma:** `113:1031, 113:1030, 111:935, 113:1033-113:1037, 100:562` — Both comparison column headers read 'Wat andere vergelijkers doen ' (113:1030 and 113:1031), although the right, lime column with check marks describes VoordeelVinder. The persona quote 111:935 has no quotation marks while 111:911 and 111:923 do. Several text nodes have trailing spaces. The footer placeholder says 'Voer uw e-mailadres in' (u-form, in every footer).
- **Recommendation:** If the page is built, ask for correct copy for the right-hand column header instead of inventing one. Normalise quotes and trim spaces. Change the footer placeholder to a je-form. Log this in CONTENT-TODO.
- **Verified:** confirmed

#### [minor] `other-blog-is-designed`
- **Brief:** §5 /blog, /blog/[slug]: 'not designed — derive from design system' — The blog listing and post are not designed and should be derived from the design system.
- **Figma:** `113:1135 'Blogs overview', 118:2067 'Read Blog Page'` — The listing is designed. It has a 'Recent bericht' featured post (image 673x417 r24; date, 48px title, divider, excerpt, lime 'Lees meer' pill) and an 'Onze blogs en artikelen' 3x3 grid of cards (image 376x246 r24, 24/31 title, 16/24 excerpt, purple #6c5ce7 'Lees meer' pill with arrow). It is followed by pagination: circles 1–4 plus a lime next arrow, 9 cards per page. The post page is only partly designed: a date, an H1 (48/52) and a 1170x566 hero image.
- **Recommendation:** Build the /blog listing from 113:1135 and the post header from 118:2067, and update the §5 'Figma source' column. The featured post is the newest post. Show pagination only when there are more than 9 posts. Keep the nav link hidden until at least one post exists, even though every Figma header shows 'Blogs'.

#### [minor] `other-blog-post-incomplete`
- **Brief:** §5 blog post template; §4.4 Markdown blog — Derive the post template from the design system.
- **Figma:** `118:2067 (empty y 901–2516; pagination 118:2575–118:2585)` — Below the hero image there is about 1600px of empty space. There are no prose styles (h2/h3/p/lists/quotes/links/images), no author, no reading time, no share block, no CTA to the form and no related posts. A pagination block copied from the listing sits above the footer.
- **Recommendation:** Derive a Markdown prose style from the design system: Bricolage Grotesque, #151d30 headings, #3a3c75 body, 16/24 text, 24px image radius. Drop the pagination on the post page. Add an end-of-post CTA to /vergelijken using existing CTA-banner copy only, and list it as an assumption in the PR. Author and reading time should be optional frontmatter or computed values, never invented.

#### [minor] `other-blog-date-format`
- **Brief:** §2 Dutch only (Flanders) — The site is Dutch-only.
- **Figma:** `118:1931, 118:2589` — The date is shown in English format as 'September 29, 2026'.
- **Recommendation:** Format dates with nl-BE, e.g. '29 september 2026', from frontmatter, and use a <time datetime> element.
- **Verified:** confirmed

#### [info] `other-blog-placeholder-content`
- **Brief:** §17 never invent content; §5 'Blogs' hidden until ≥1 post — Only real posts exist, and the nav link stays hidden until one does.
- **Figma:** `113:1135 cards 117:1920-118:2066; 118:2588/118:2589` — All 10 entries are identical placeholders: 'Betaal jij te veel voor energie? Zo ontdek je het' / 'Ontdek in een paar eenvoudige stappen of je huidige energiecontract nog bij je past en waar je mogelijk kunt besparen.', with grey #d9d9d9 image boxes and one date. No categories, tags, author, reading time, search, sidebar, blog newsletter block (only the footer one), related posts or empty state are designed.
- **Recommendation:** Do not seed placeholder posts to production. Use fixture posts only in tests or staging with noindex. Don't add unrequested features such as categories or author blocks. #d9d9d9 is a placeholder colour, not a token.

#### [info] `other-blog-pagination-state`
- **Brief:** §5 blog — Not specified.
- **Figma:** `118:1995-118:1999 (Ellipse 96/97/100)` — Page '2' uses a different ellipse asset (Ellipse 97) from 1, 3 and 4 (Ellipse 96), which may be meant as an active or hover state. There is a 'next' button but no 'previous' button.
- **Recommendation:** Assume a lime-filled current page with aria-current='page', and prev/next buttons that show only when relevant. Note this assumption in the PR.

#### [info] `other-hidden-homepage-variants`
- **Brief:** §2 'Trusted by over 300+ customers.' hidden; §6 footer placeholders — Hide the customer-count claim. 'Adres: Nederland' is a footer placeholder.
- **Figma:** `5:819 text 8:1147; 5:819 40:2453; 35:838 43:3325` — Hidden Homepage 1 says 'Trusted by over 30000+ customers.', a different number from Homepage 3's 300+. 'Adres: Nederland' appears only in the hidden versions' footers. Homepage 3, the product pages, About us and the blog footers show only 'E-mail: info@voordeelvinder.com' / 'Telefoon: 335 224 654'.
- **Recommendation:** Keep the claim hidden, since the design itself has two different numbers. In site.json make the address an optional TODO field that only renders when set. The current design has no address line.

#### [info] `other-no-components`
- **Brief:** §4.4 one component per section type; §6 tokens — Each section type has one component, and tokens are read from Figma.
- **Figma:** `page1.xml node types: frame/vector/rounded-rectangle/ellipse/text/boolean-operation only` — There are no component, component-set or instance nodes. Header, footer, buttons, pills, badges and cards are duplicated as raw layers in every frame, with small drifts: two limes (#c9e260 and #b7e137) and two purples (#6c5ce7 and #7051ed).
- **Recommendation:** Derive the code components from the repeated patterns: Header, Footer with newsletter, SectionPill, lime and purple and white Buttons with arrow, TintCard with coloured bottom edge, Badge, Check/Cross list row, CTA banner with rings, PersonaCard, TeamCard, BlogCard, FeaturedPost and Pagination. Consolidate the colour drifts into tokens in the tokens slice.

#### [info] `other-no-prototype-flow`
- **Brief:** §6 form frames table; §7.3 branch — Energy branch: 6 → 7A (yes) or 7B-1 → 7B-2 (no) → 8 → thank you.
- **Figma:** `vectors 91:10954, 91:10953, 91:10955, 91:10956, 91:10957, 90:10457 + 'If Yes' 90:10458, 91:11448 + 'If NO' 91:11447, 91:12386, 91:12898, 91:12858, 91:13853, 91:15100` — No prototype interactions can be read with the read-only tools. The flow is drawn with plain vector arrows, which have arrowheads at both ends. They map exactly to the brief. The no-row copy of Step 8 (91:13376) differs from 91:10958 only in 'Stap 6 van 8' and a '+31' phone prefix.
- **Recommendation:** Use the brief and flow JSON as the source of truth, not the canvas arrows. The '+31' and the counter in 91:13376 are already overridden by §6 (fixed +32, computed counter). Mention both in the form slice or PR.

#### [info] `other-missing-state-designs`
- **Brief:** §5 404/legal 'not designed'; §5 footer newsletter; §6.1 errors; §7.6 — 404 and legal pages are not designed. The newsletter posts to /api/newsletter with double opt-in. Errors show inline, with a shake.
- **Figma:** `whole file (text search for 404/cookie/fout/ongeldig/verplicht/geldig/bevestig/nieuwsbrief)` — Nothing designed for: 404, legal pages, cookie banner, newsletter success/error/confirmation, form validation errors, the submit loading state, hover/focus/disabled states or an empty blog state. The only related items are the footer legal links and the Step 8 consent 'Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be' (91:11444/91:13852).
- **Recommendation:** Derive all of these from the design system as the brief says, and list each derived state as an assumption in the relevant PR. Newsletter feedback copy must come from site.json, as TODO text if the client hasn't supplied it.

#### [info] `other-asset-provenance`
- **Brief:** §6 Assets (layered SVG mascot; self-host fonts, check licence) — Export the mascot as a layered SVG if the layers allow it. Check licences.
- **Figma:** `113:1133, 89:7439 etc. ('ChatGPT Image Sep 22, 2026, 01_37_15 PM 5/7/8/9'); 104:749/60:849 '5874891 1'; 63:860 '54544 1'; 78:2856/80:3568 '564654 1'; 100:305 'money 1 [Vectorized]', hidden 'close 1'/'question 1'/'smarthome 1'…; vector fox 109:799` — Most mascot poses are raster images, and their layer names suggest they are AI-generated. Numeric names such as '5874891 1' look like stock downloads. The icons are vectorised versions of raster icons with Flaticon-style names. Only the logo fox and the About us waving fox (109:799) are vectors.
- **Recommendation:** Give this to the asset slice. Layered SVG will only be possible for the vector foxes. Ask Tanjil to confirm the provenance and licence of the stock-named images and icons, including attribution if they come from a free plan, and note the answer in docs.

### Open questions

- Does the client want the About us page (100:2) at launch as /over-ons, or does the brief's anchor-only decision stand? If they want the page, who rewrites the copy that contradicts the MVP (results, calculator, 'nooit doorsturen naar een verkoper', call-center, 'no cure, no pay', roadmap), and who supplies the real team names and photos?
- What was the designer's intent for the right-hand comparison column header on About us? Both columns say 'Wat andere vergelijkers doen '.
- Is the persona CTA 'Vergelijk voor je verhuis' meant to lead to a mover-specific landing variant (/l/…), or just to /vergelijken? And 'Bekijk de berekening' has no MVP destination: hide it or relabel it?
- Blog: which pagination circle is the active state (page '2' uses a different ellipse asset)? Should post pages show author or reading time? Neither is designed.
- Asset provenance: mascot rasters are named 'ChatGPT Image …'. Are the numeric-named images (5874891, 54544, 564654) and the Flaticon-style icons licensed for commercial use, and do they need attribution?
- Should site.json keep an address field? The current frames dropped the 'Adres: Nederland' footer line, which only appears in the hidden old homepages.

### Detail

### About us (100:2) sections
| # | y | Section | Heading node |
|---|---|---|---|
| 1 | 0–85 | Header | 100:304 |
| 2 | 85–700 | Hero (purple, raster mascot 113:1133), CTA 'Ontdek jouw voordeel' | 100:264 |
| 3 | 835–1480 | 'Hoe VoordeelVinder ontstond' 2 story cards | 100:11 |
| 4 | 1612–2115 | Statement banner 'Jij vult in. / Wij vergelijken. / Jij bespaart.' | 104:723/104:732 |
| 5 | 2073–3054 | 'Waar we voor staan' Missie/Visie cards + mascot 104:749 | 100:303 |
| 6 | 3187–4089 | 'Wat we nooit doen.' 5 'Nooit' rows + vector fox 109:799 | 108:754 |
| 7 | 4184–5139 | 'Is VoordeelVinder iets voor mij?' 3 personas (Uitsteller/Verhuizer/Rekenaar) | 111:896 |
| 8 | 5261–5900 | 'De mensen achter VoordeelVinder' 3 team cards (placeholder) | 113:944 |
| 9 | 6055–6694 | 'Niet zomaar een vergelijker' do/don't panels | 113:1009 |
| 10 | 6855–7233 | Lime CTA 'Overtuigd? Zie zelf wat je kan besparen.' | 100:595 |
| 11 | 7152–7904 | Footer | 100:556 |

### Homepage 3 'Over ons' anchor target
Pill group 60:21 (text 60:25) + H2 60:15 'Waarom VoordeelVinder bestaat' + 60:16 + cards 60:42/44/43, y≈1090–1760 → id `over-ons`.

### Blog templates
- Listing 113:1135: featured post (117:1922 img 673x417 r24 · date 118:1931 20px #6c5ce7 · title 117:1924 48/52 SemiBold #151d30 · divider 118:1930 · excerpt 118:1925 16/24 #3a3c75 · lime pill 118:1926 170x48 'Lees meer'); grid 3x3 (img 376x246 r24 · title 24/31 SemiBold −0.72 · excerpt 16/24 #3a3c75 · purple pill #6c5ce7 137x42 white 'Lees meer' + arrow; no date on cards); pagination 118:1994–118:2005 (50px circles 1–4 + lime next).
- Post 118:2067: date 118:2589 · H1 118:2588 (w 996) · hero 118:2587 1170x566 r24 · no body · leftover pagination.
- Not designed: categories, tags, author, reading time, search, sidebar, related posts, blog newsletter, breadcrumbs, empty state.

### Flow arrow map (canvas)
| Vector | From → To |
|---|---|
| 91:10954 | Step 1 → Step 2 |
| 91:10953 | Step 2 → Step 3 |
| 91:10955 | Step 3 → Step 4 |
| 91:10956 | Step 4 → Step 5 |
| 91:10957 | Step 5 → Step 6 |
| 90:10457 + 'If Yes' 90:10458 | Step 6 → 7A 90:10462 |
| 91:11448 (L) + 'If NO' 91:11447 | Step 6 → 7B-1 91:11921 |
| 91:12386 | 7A → Step 8 91:10958 |
| 91:12898 | Step 8 → Thank you 91:13857 |
| 91:12858 | 7B-1 → 7B-2 91:12392 |
| 91:13853 | 7B-2 → Step 8 copy 91:13376 ('Stap 6 van 8', '+31') |
| 91:15100 | Step 8 copy → Thank you copy 91:14645 (text-identical) |

### File-level
- 1 page, 22 top-level frames (2 hidden), all 1440w; no mobile/tablet; no components/instances; no variables; no readable prototype.
- Screenshots: shots/other-aboutus.png (+ -0..-3 crops), other-blogs.png, other-readblog.png, other-vectors.png. Hidden homepages render 1x1.

---

<a id="verifier"></a>
## Verifier

### Coverage gaps (brief statements no slice checked, now checked)

- §6.1 'The Figma file contains no animation': slices only ran get_motion_context on 60:2 and 84:3972, exactly the frames the brief names. I also ran it recursively on 91:13857 (Thank you) and 69:931 (Solar). Both return {"nodes":[]}, so the statement holds beyond the two cited frames.
- §6.1 'The header has its own view-transition-name, so it stays still': no slice checked header consistency across pages. XML comparison of the header layers (y<100) shows identical geometry on Homepage 3, Solar, Battery, About us, both blog frames, Step 1, Step 8 and Thank you. The logo, nav at (524,46) and 'Gratis beginnen' are at the same positions everywhere. Only the Read Blog header shadow differs (tokens slice: α.25 vs α.13), so use one header token or the header will visibly change during transitions.
- §6.1 'A product card on the homepage or a product page morphs into the form card': no slice checked the morph source on the product pages. They have no card. The hero is a full-bleed 1440x615 purple panel (75:2832, 80:2876) with a CTA pill (69:1259, 80:3147). The homepage product blocks (66:861, 67:893) are about 1168px-wide section panels, and the target form card is 767x567. The only practical morph source is the CTA pill, or the pill growing into the card. Propose that on staging.
- §6.1 'The form card morphs into the thank-you card': thank-you card 91:14644 is 767x636 at x336 (centred), on a #7051ed 767x644 base (91:14304). The form question card is 767x567 at x529. Same width, so the morph is a translate plus a height change. The thank-you page has no progress card and no left panel, so those have to fade out. The thank-you mascot 91:14643 sits inside the top of the card, so the 'mascot moves' morph lands inside the card morph (nested view-transition names).
- §6.1 'Counters roll up, but only for approved numbers': the design contains no approved figures. The only numbers are '300+' (60:328, hidden per §2), '30000+' (hidden Homepage 1), '€[X]' placeholders and 'vijf/tien minuten'. So the counter pattern has no MVP content.
- §7.6 PromoCheckers lesson (yellow on white failed): the tokens slice says lime is never used as a text or icon colour on white. That is refuted. The 'Ne' x-circle icon (e.g. 90:9468, SVG fill #93B52A) sits on a white 40px tile in Step 5, Step 6 and 7B-2, at 2.36:1. The icon supplements the 'Nee' text, so 1.4.11 may not strictly apply, but it is exactly the pattern the brief warns about.
- §0/§3 scope (three products) vs site-wide copy: the footer tagline 'De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden.' appears on all 19 visible frames, including Solar Panel Page and Home Battery. The shared form panel ('Vind je beste energiedeal') is also energy-only. The audience wording matches §2 ('households and singles'), but the product framing does not cover solar or battery.
- §6 copy-correction list, full census across all visible frames. 'Ne' x5: 90:9436, 90:9457, 90:10446, 91:12879, 91:12880. 'oordeligst' 60:321, 'e ziet meteen' 60:368, 'Geen erplichtingen' 60:80, 'Voor Vinder versus anderen' 60:424 and 'Trusted…' 60:328 each appear once, on Homepage 3 only. 'Neem gerust contact op met ons op.', 'Heb nog steeds een vraag?' and 'Faqs' appear 3x each (home, solar, battery). u-forms: 27 visible, all listed by the slices (19 footer placeholders plus Step 2, Step 3 and Step 8 texts). There are no others anywhere, including About us and the blog.
- §6 design fix 'Adres: Nederland': of the visible frames it appears only in 91:12795 (Step 7B-2 footer). '335 224 654' and 'info@voordeelvinder.com' are on all 19 visible frames. '+31' appears only on 91:13844 (stale Step 8 copy).
- §6.1 'check mark that draws in' / Submit celebration: the Thank you page has a hidden layer 'check-circle 1' (91:14337, 124x124) under the body copy, and every step frame hides 'question 1', 'smarthome 1' and 'solar-panel 1' rasters. No slice mentioned the hidden check-circle. It may be the designer's intended success mark and is worth asking about before designing a new one.
- §7.5 phone error copy vs design: the brief's error text example 'bijvoorbeeld 0475 12 34 56' conflicts visually with the designed fixed '+32' chip (91:11434) and placeholder '478 12 34 56' (91:11442). A visitor who follows the example would type the leading 0 after +32. The parser accepts it, but the example and placeholder formats should agree. The brief copy is decided, so flag it in the PR (TO CONFIRM) rather than changing it.

### Extra findings

- **[minor] `verify-ne-icon-lime-on-white`** (§7.6 Accessibility ('On PromoCheckers, yellow text on white failed'); §11 WCAG 2.1 AA; `90:9468, 90:9471 (Step 5), and the matching 'Frame' icons in Step 6 (90:9473) and 7B-2 (91:12887–91:12893): x-circle SVG fill #93B52A on a white 40x40 tile (e.g. 90:9447)`): The 'Ne' answer icon is lime-green (#93B52A) on white, which is 2.36:1. That contradicts the tokens slice's claim that lime is never used as a text or icon colour on white. It is decorative next to the 'Nee' label, but it repeats the PromoCheckers pattern. **→** Use a darker green (at least 3:1 on white) or ink/purple for the 'Nee' icon, or mark it aria-hidden and accept it as decorative. Note it in the tokens doc as a guard rule: lime is only used as a background behind dark ink.
- **[minor] `verify-axe-ci-scope`** (§4.6 CI axe checks; §16 DoD 'axe shows no serious issues'; `89:7436 / 91:11400 (white at 65% on #7051ed, 3.10:1) vs placeholders 91:11431 (2.08:1) and borders #ded9f4/#C4BCE7`): Of the contrast problems the slices found, only the form-panel body text is a certain WCAG 1.4.3 failure that axe's color-contrast rule will flag as serious, on every form step. Placeholder text is generally not evaluated by axe, and non-text 1.4.11 boundaries are never evaluated by axe. So green axe CI will not prove AA for the form. The slices rated the panel text 'minor' while it is the one issue that will fail CI. **→** Fix the panel body in Phase 2 tokens: white at 92% or more (4.61:1) or solid white. The tokens slice's 90% gives 4.50:1, right on the threshold. Add a manual contrast checklist to each form PR for placeholders, borders, and the selected and focus states.
- **[info] `verify-faq-answers-in-design-copy`** (§17 never invent content; §11 FAQPage; `111:912, 109:790, 113:1066 (About us), 60:367 (Homepage 3), 69:1443`): Three of the four unanswered homepage FAQs could be answered from copy the designer already wrote elsewhere in the file. Factuur: 111:912 'Het duurt vijf minuten. Geen registratie. Je hebt je factuur niet nodig.' Gratis: 109:790 'Vergelijken op VoordeelVinder is gratis en vrijblijvend…' / 113:1066 'Gratis en volledig vrijblijvend'. Leveranciers: 60:367 'We checken Luminus, Mega en TotalEnergies…'. Vastzitten: 69:1443 '…Geen verplichtingen, geen verrassingen.' **→** In CONTENT-TODO, offer these as sourced draft answers for client sign-off, instead of hiding all four. Don't ship them without approval, since several carry §2 claims (e.g. 109:790 'no cure, no pay').
- **[minor] `verify-product-page-morph-source`** (§6.1 Signature morphs ('A product card on the homepage or a product page morphs into the form card'); `Solar hero 75:2832 + CTA 69:1259; Battery hero 80:2876 + CTA 80:3147; homepage product blocks 66:861/67:893; form card 84:4682 (767x567)`): Neither product page has a product card to morph from. The homepage 'cards' are about 1168-wide section panels, so morphing them into a 767x567 card is a large, heavy transition. **→** Propose on staging: the clicked CTA pill carries the view-transition-name and grows into the form card, on both homepage and product pages. Record it as a motion assumption for §15 #13.
- **[minor] `verify-energy-only-sitewide-copy`** (§0/§3 (three products in MVP); §7.1 shared contact step; `Footer tagline on all 19 visible frames (e.g. 60:707, 69:931 footer, 91:11360); form panel 91:11399 'Vind je beste energiedeal, zonder gedoe.'`): 'De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden.' appears in every footer, including the Solar and Battery pages. Together with the energy-only form panel, this positions the brand as energy-only. **→** Keep it as designed via site.json. Add it to CONTENT-TODO so the client can decide on a product-neutral tagline, and do not rewrite it ourselves.
- **[info] `verify-thankyou-hidden-check`** (§6.1 Form motion (check mark that draws in; celebrate on thank-you); `91:14337 / 91:15093 'check-circle 1' (hidden, 124x124) on both Thank you frames`): A hidden success icon exists on the thank-you page, under the body text area. The designer may have intended it as an alternative or additional success mark. **→** Ask the designer whether it should appear (e.g. as the animated check) before designing a new celebration asset.
- **[info] `verify-header-transition-consistency`** (§6.1 Page transitions (header has its own view-transition-name); `Header layers on 60:2, 69:931, 80:2867, 100:2, 113:1135, 118:2067, 84:3972, 91:10958, 91:13857; shadow 84:4033 vs 118:2069`): The header geometry is identical across all page types, so a static header during transitions is feasible. The only drift is the blog header shadow (α.25 vs α.13). **→** Use one header component and token (the Step 1 α.13 shadow) everywhere, so the header really stays still across view transitions.

### Duplicates (same issue reported by several slices)

- assets-hero-baked-price = home-hero-image-savings-figure
- assets-mascot-not-layered = form-a-mascot-raster = home-raster-mascots = form-b-mascot-thankyou-raster (layering part) = products-raster-assets-and-icon-licence (mascot part)
- tokens-no-interaction-states = form-a-no-interaction-states = form-b-states-and-widgets-undrawn = other-missing-state-designs (form states part)
- tokens-contrast-placeholders + tokens-contrast-control-boundaries + tokens-contrast-form-panel-body = form-a-contrast-wcag
- tokens-contrast-form-panel-body = form-b-left-panel-contrast
- home-over-ons-about-page-exists = other-aboutus-page-exists
- home-faq-answers-missing = products-faq-answers-missing (same one-answer pattern on 3 pages; one CONTENT-TODO item)
- assets-licence-provenance = other-asset-provenance = form-a-icon-provenance = products-raster-assets-and-icon-licence (licence part)
- home-claim-direct-result-family = products-onscreen-results (one §2 claim family; 69:920 'Bereken je besparing' appears in both)
- home-claim-no-seller-family = products-no-sales-call-claim = home-callback-permission-gap (60:109/60:451) = other-aboutus-claims (call-center/'nooit doorsturen' lines)
- home-supplier-installer-claims = products-service-promise-no-partner = products-guarantee-independence-claims (home 67:882/67:888 vs solar 77:2847/78:2852)
- assets-morph-two-different-images = form-b-mascot-thankyou-raster (morph part)
- assets-thankyou-not-cheering = form-b-mascot-thankyou-raster (cheer part)
- tokens-noise-texture = form-a-panel-texture
- tokens-emoji-eyebrow = assets-emoji-eyebrow
- form-a-static-step-counter = form-b-step-counters
- form-a-left-panel-energy-copy = form-b-left-panel-energy-specific = assets-form-mascot-energy-specific
- home-u-form-newsletter = form-a-u-forms (footer part) = form-b-placeholders-u-form (u part) = other-aboutus-copy-bugs (footer placeholder part)
- home-footer-placeholders-no-address = other-hidden-homepage-variants (address part) = form-b-layout-inconsistencies (7B-2 'Adres: Nederland' part)
- assets-flags-unused = form-b-phone-prefix-picker (flag part) = form-b-duplicate-frames (+31/NL flag part) = other-no-prototype-flow (+31 note)
- form-b-if-no-connector = other-no-prototype-flow (connector part)
- products-faq-heading-singular = home-extra-typos (60:14 'Veelgestelde vraag' part)
- products-faq-open-state-and-housing-note (open-state part) = home-faq-answers-missing (open-state '+' remark)
- home-product-cta-targets-and-orphaned-product-pages = products-no-product-links-in-nav
- tokens-purple-variants + tokens-lime-button-inconsistency = other-no-components (colour drift part) = form-b-layout-inconsistencies (three purples part)
- tokens-type-scale-inconsistent ⊃ products-hero-h1-line-height
- form-a-fixed-card-height-and-spacing = form-b-layout-inconsistencies (field heights and divider part)
- tokens-offpalette-greys (#d9d9d9 part) = other-blog-placeholder-content (#d9d9d9) = assets-no-social-or-blog-imagery (grey blog placeholders)
- tokens-contrast-control-boundaries (checkbox 34px not a tap target) = form-a summary note on the 34px checkbox
