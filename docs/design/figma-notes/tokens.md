# Slice: tokens (design tokens, fonts, contrast, motion) — Phase 0 review notes

File 8bhHL5kRbwYzYPbH6Vgdjn, Page 1. Read-only review, 2026-09-29.

## 1. Variables / styles / libraries
- get_variable_defs 60:2 -> {} (from orchestrator), 84:3972 -> {}, 69:931 -> {}. NO Figma variables.
- search_design_system: style "purple" -> [], style "heading" -> [], variable "color" -> []. (server clamps batch to 1 query per call.)
- get_libraries: subscribed libraries are only community kits (Material 3 Design Kit, Simple Design System, iOS 18/iPadOS 18, iOS/iPadOS 26, watchOS 26, visionOS 26, macOS 26). No org/brand library. No evidence they are used on Page 1 (generated code references no library components).
- Conclusion: all values are raw hex/px on layers; tokens must be sampled.

## 2. Step - 1 (84:3972) raw values (get_design_context)
- Top lime strip 84:4032: bg #c9e260, h16, full width.
- Header bar 84:4033: bg #fff, h69, shadow 0 13 31.8 0 rgba(0,0,0,0.13).
- Header CTA "Gratis beginnen" 84:4034: bg #c9e260, 1px border #fff, radius 37, shadow 0 2 8.2 0 rgba(165,202,53,0.53) + inset 0 0 17.4 0 #fff; label 84:4037 Bricolage Grotesque Medium 16, #151d30, lh normal; icon 22px.
- Nav 84:4274: "Hoe het werkt / Veelgestelde vragen / Over ons / Blogs" Regular 14, #151d30, lh36, tracking -0.28 (-2%). (single text node, spaces used as gaps)
- Logo 84:4038 group (fox head vectors) + wordmark vector 84:4231 "Voordeelvinder" (vector, not text).
- Left panel 88:7430: bg #7051ed, radius 24, 372x683 at x132 y202.
  - Heading 89:7435 "Vind je beste energiedeal, zonder gedoe." SemiBold 30 / lh32, #fff.
  - Body 89:7436 Regular 16 / lh23, rgba(255,255,255,0.65).
  - Mascot bitmap 89:7439 "ChatGPT Image Sep 22, 2026, 01_37_15 PM 5" (PNG, cropped sprite).
- Progress card 89:7438: bg #fff, 1px #ded9f4, radius 24, shadow 0 29 64 0 rgba(41,32,132,0.11), 767x91.
  - "Stap 1 van 8" 89:7443 SemiBold 14 / lh20, #6c5ce7.
  - Track 89:7441 rgba(103,75,217,0.13) h9 r24 w693; fill 89:7442 #674bd9 h9 r24 w87.
- Form card 84:4682: bg #fff, 1px #ded9f4, radius 24, shadow 0 29 64 0 rgba(41,32,132,0.08), 767x567.
  - Title 89:7453 "Wat wil je vergelijken?" SemiBold 34 / lh27 (!) tracking -1.02 (-3%), #000.
  - Answer cards 89:7452/7463/7466: bg #f6f4ff, 1px #ded9f4, radius 16, 671x74.
  - Icon tiles 89:7462/7465/7468: bg #fff, 1px #ded9f4, radius 8, 44x44.
  - Labels 89:7454 etc. Regular 18 / lh30, tracking -0.36 (-2%), #03080f. ("Elektriciteit", "Zonnepaneel", "Thuisbatterij")
  - Radio 90:8968 etc. = SVG ellipse 24px (colour inside SVG).
  - Divider 89:7469 vector 671 wide (SVG).
  - Next 89:7461: bg #b7e137, radius 12, 148x52; label 89:7488 "Volgende" Regular 18 #03080f (NOT the same lime as header CTA #c9e260).
  - Back 89:7982: bg #fff, 1px #ded9f4, radius 12, 148x52; label "Terug" Regular 18 #03080f.
- Footer 84:4326: bg #7051ed h554; bottom bar 84:4327 #fff h70.
  - Footer column headings 84:4526-28 SemiBold 34 / lh65, tracking -1.02, #fff.
  - Footer links / tagline Regular 16 / lh39, tracking -0.32, #fff.
  - Newsletter pill 84:4531 #fff radius 41 h60 w449 (+inset white glow); placeholder 84:4532 "Voer uw e-mailadres in" Regular 16, rgba(3,8,15,0.34).
  - "Abonneren" button 84:4534 bg #b7e137 radius 37 h46 w121 (+inset white glow); label Medium 16 #03080f.
  - Copyright 84:4538 16, #03080f, SemiBold "© 2026 VoordeelVinder.be" + Regular rest, lh37.
- Font: every text node = 'Bricolage Grotesque' with fontVariationSettings "opsz" 14, "wdth" 100 (optical size pinned at 14 at every size).

## 3. Homepage 3 (60:2) — get_design_context is too large for the whole frame (sparse metadata returned; 430 nodes, flat, no auto-layout). Solar 69:931 also too large. Sampled per node (excludeScreenshot) + pixel sampling of a 1:1 full-frame PNG (figma/shots/home_full.png, tokens-home3-full.png) with figma/sample.py -> figma/home_samples.txt.
- Hero H1 60:320 "Betaal jij te veel / voor energie?" SemiBold 60 / lh70, tracking -1.8 (-3%), #fff.
- Hero body 60:321 Regular 16 / lh26, tracking -0.32, #fff. (copy typo "oordeligst")
- Eyebrow 60:322 "👋 Welkom bij voordeelvinder": emoji 28 + text Regular 24 / lh30, tracking -0.48, #fff.
- Hero primary CTA 60:324: bg #c9e260, 1px #fff border, radius 37, shadow 0 7 19 0 rgba(108,92,231,0.56) + inset 0 0 17.4 0 rgba(255,255,255,0.7); 215x54. Label 60:327 "Vergelijk nu gratis" Medium 16 lh normal #03080f.
- Hero bg 60:4 "Subtract" vector (purple, pixel-sampled — see below).
- USP bar 60:381/60:382: white, 1px #ededed, radius 25, shadow 0 18 27 0 rgba(0,0,0,0.05), 1165x104. Lime "Union" blob 60:383 (SVG). Texts 60:384-386 Regular 20 / lh20, tracking -0.6 (-3%), colour #000 (60:384, 60:386) and #03080f (60:385). Icon circles 60:387/389 SVG (px #f0edff fill, icon #6c5ce7), 60:388 SVG (white).
- Section badge (pill) 60:21 "Over ons": outer pill rgba(183,225,55,0.28) radius 34 219x60; inner white pills radius 34 (44 icon circle + 153 label pill); label Regular 24 / lh30 tracking -0.48 #151d30; icon 28px.
- Section H2 60:15 "Waarom VoordeelVinder bestaat" SemiBold 48 / lh76, tracking -1.44 (-3%), #151d30.
- Section intro 60:16 Regular 18 / lh30, tracking -0.36, #3a3c75, centered.
- Value cards (Waarom bestaat): front 60:18/60:20 linear-gradient(to bottom, #f6f4ff, rgba(246,244,255,0.86)) radius 30; middle 60:19 linear-gradient(#fff -> rgba(255,255,255,0.85)) + 1px #b7e137 border radius 30; back plates 60:5/60:7 #7051ed radius 30 offset +6px (px sample of 60:6 back plate under middle card: lime). 370x402.
  - Card title 60:42 SemiBold 22 / lh27, tracking -0.66 (-3%), #151d30.
  - Card body 60:45 Regular 16 / lh24, tracking -0.32, #3a3c75.
  - Icon tiles 60:402/60:416 px #6c5ce7 (76x76), 60:410 px #c9e260.
- "Hoe het werkt" container 60:9 bg #7051ed radius 40 (1378x765, x30 -> 30px inset from frame edge). Pixel render shows a grain/noise texture over it? (px mode #6247cf/#6046cb varying) -> see screenshot.
  - H2 60:12 SemiBold 48 / lh65, tracking -1.44, #fff. Highlight word 60:11 "energiecontract" SemiBold 48 / lh62 #03080f on lime chip 60:10 #c9e260 radius 12.
  - Intro 60:48 Regular 18 / lh30, tracking -0.36, #fff.
  - Step pills: 60:350 Union (SVG), 60:359 #6c5ce7 radius 19.5 (167x39), gloss 60:362 linear-gradient(rgba(255,255,255,0.33) -> transparent) opacity .5 radius 18.5; middle pill 60:360 lime (px #bee44b/#c1e552 = lime + gloss). "Stap 01" 60:845 SemiBold 18 / lh37 tracking -0.36 #fff.
  - Step cards 60:347 white radius 36, shadow 0 11 29.2 0 rgba(0,0,0,0.53) (!! very dark shadow on purple), 387x297.
  - Step title 60:366 SemiBold 24 / lh27, tracking -0.72 (-3%), #000.
  - Step body 60:365 Regular 16 / lh24 tracking -0.32 #3a3c75 centered.
- Comparison section bg 60:373: photo/texture image 60:376 masked + #6c5ce7 layer with mix-blend-mode: color (60:377). i.e. a tinted bitmap, not a flat colour.
  - H2 60:378 SemiBold 48 / lh65 tracking -1.44 #03080f. (NB: 60:15 uses #151d30 for the same H2 style)
  - Intro 60:379 Regular 18 / lh30 #3a3c75.
  - Header row 60:427 #7051ed radius 18 (1172x66); header labels 60:436 "Andere vergelijkers" Regular 20 / lh30 tracking -0.4 #fff; 60:437 "VoordeelVinder".
  - Row label cell 60:428: #fff, 1px rgba(108,92,231,0.23), radius 18, shadow 0 4 22.1 0 rgba(108,92,231,0.14). Label 60:438 Regular 20 / lh30 #3a3c75.
  - "Andere" column cell 60:430: #b7e137 bg + 1px #b7e137, radius 18; value 60:439 "Vaak" SemiBold 20 #3a3c75 (on lime).
  - "VoordeelVinder" column cell 60:429: #6c5ce7 bg + 1px #e6e6e6, radius 18; value 60:440 "Nooit" SemiBold 20 #fff.
  - Row icon 60:466 ellipse SVG 38px (px #6c5ce7) + vector check.
- Badge 60:420 "Voor Vinder versus anderen": outer rgba(183,225,55,0.19) (vs 0.28 in 60:22), inner white pills, label Regular 24 #151d30.
- Solar block 66:861: #f8fceb, radius 18 top corners only (1168x815); bottom accent bar 66:862 px #b7e137 (h10).
  - Badge 66:866 rgba(183,225,55,0.19) radius 34.
  - H2 66:863 "Betaal minder. Produceer zelf." (65 tall, H2 style assumed; not fetched).
  - Body 66:872 Regular 18 / lh30 #3a3c75.
  - CTA 69:917 "Bereken je besparing": #c9e260, 1px #fff, radius 37, inset 0 0 17.4 rgba(255,255,255,0.7), NO drop shadow; label 69:920 Medium 16 #03080f.
  - Feature card 67:876 #fff radius 18, shadow 0 13 24 0 rgba(68,85,15,0.06); accent plate 67:892 #b7e137 radius 7 (offset -8px left); title 67:883 SemiBold 20 / lh27 tracking -0.6 #000; body 67:882 Regular 14 / lh20 tracking -0.28 #3a3c75.
- Battery block 67:893: #f2f0ff radius 18 top; bottom bar 67:894 px #6c5ce7. Badge 67:896 px #e5e1ff over white (purple-tint version). CTA 69:922 "Ontdek jouw voordeel": #6c5ce7, 1px #fff, radius 37, inset white glow; label 69:925 Medium 16 #fff.
- "Waarom kiezen" H2 60:13 SemiBold 48 / lh65 #03080f. Intro 60:17 Regular 18 / lh30 #3a3c75. Button 60:51 px #6c5ce7 (label px white).
  - Cards 60:55 #fff radius 24, shadow 12 12 48 0 rgba(40,34,88,0.07). Icon tile 60:113 bg rgba(108,92,231,0.06), 3px border rgba(198,185,248,0.56), radius 16, 59x59. Title 60:67 SemiBold 22 / lh27 tracking -0.66 #03080f.
- CTA band 60:49 #7051ed radius 34 (1170x366); decoration 60:75 concentric circles SVG. H2 60:79 SemiBold 48 / lh54 #fff centered; body 60:80 Regular 18 / lh28 #fff centered (typo "erplichtingen"). Button 60:81/60:82 #c9e260, 1px #fff, radius 37, shadow 0 2 8.2 rgba(165,202,53,0.53) + inset 0 0 17.4 #fff; label 60:85 Medium 20 #151d30.
- FAQ section bg 60:3: linear-gradient(to bottom, rgba(240,236,255,0.4), rgba(108,92,231,0.15)), bottom radii 30 (1391x1004, x25).
  - Closed item 60:57: #fff radius 20 (672x79), no shadow. Open item 60:107: #fff radius 20, shadow 12 12 48 0 rgba(40,34,88,0.07).
  - FAQ question 60:91 Medium 20 / lh30 tracking -0.4 #03080f. "Antwoord" 60:111 Regular 16 / lh24 #6c5ce7. Answer 60:109 Regular 16 / lh24 #3a3c75. FAQ icon circles 60:483 etc. px #6c5ce7 41px.
  - Side card 60:50 #fff radius 26 (458x429). Title 60:495 "Heb nog steeds een vraag?" SemiBold 34 / lh38 tracking -1.02 #03080f. Body 60:110 Regular 16 / lh24 #3a3c75 ("Neem gerust contact op met ons op." typo). Button 60:86/60:87 #c9e260 radius 37 1px #fff inset white glow (no drop shadow); label 60:90 "Stel een vraag" Medium 16 #151d30.
  - Badge 60:35 "Faqs" purple variant: outer #fff radius 34, inner pills #f6f4ff, label Regular 24 #151d30, icon purple.
- Testimonials 60:748 (HIDDEN per brief until real content): card 60:768 #fff radius 24 shadow 0 15 50 0 rgba(40,34,88,0.15) 374x337; avatar frame 60:770 rgba(108,92,231,0.06) + 3px rgba(198,185,248,0.56) radius 23; avatar img radius 18; name 60:773 SemiBold 22 / lh27 #03080f; quote 60:772 Regular 16 / lh22 #3a3c75 ("€[X]" placeholder); location 60:781 Regular 16 / lh24 #000; stars 60:774 SVG (px #ffad15); quote mark SVG #6C5CE7.
- Final CTA: 60:500 "Jij vult in. / (ZWSP line) / Jij bespaart." SemiBold 80 / lh104 tracking -2.4 #03080f; 60:501 "Wij vergelijken." SemiBold 80 / lh104 centered #03080f on lime highlight 60:499 (px #c9e260); sub 60:502 Regular 24 / lh32 tracking -0.48 #3a3c75; button 60:503 #7051ed radius 37, 1px #fff, shadow 0 2 8.2 0 rgba(108,92,231,0.36) + inset 0 0 17.4 #fff, 298x62; label 60:506 Medium 20 #fff. Mascot ring 81:3574 SVG white w/ drop shadow (dy19 blur17); side blobs 60:497/498 px #eae7f7-#ece9f8.
- Footer 60:496 #7051ed (same as Step 1 footer). Pixel render lighter noise (mean #694cdf).
- Header on home 60:118/60:119 same as Step 1 (px). Read Blog Page header 118:2069 shadow differs: 0 10 31.8 0 rgba(0,0,0,0.25).

## 4. Solar page (69:931) sampled
- Hero bg 75:2832 #7051ed (flat rect, 615 tall). H1 69:1252 SemiBold 60 / lh70 #fff.
- Value cards 69:951/69:953 #f6f4ff radius 30; middle 75:2835 #f8fbeb radius 30 (near-dup of #f8fceb). Back plates 75:2837/2839 px #f6f4ff?/#6c5ce7 edge; icon tiles #6c5ce7 / #c9e260.
- "Wat je van ons mag verwachten" H2 69:1309 SemiBold 48 / lh56 #03080f.
- Expectation cards 69:1374 #fff, 1px rgba(108,92,231,0.23), radius 24, shadow 0 4 22.1 rgba(108,92,231,0.14). Icon tiles 81:3842 #6c5ce7 radius 16 (88px), alternate px #b7e137.
- FAQ items 69:990 #f5f4ff radius 20 (home uses #fff); side card 69:983 #f5f4ff radius 26 (home #fff).
- CTA band 81:3582 #c9e260 radius 35 (LIME, home uses purple). H 69:1441 SemiBold 34 / lh43 #03080f centered; body 69:1443 Regular 16 / lh27 #03080f; button 69:1444 #fff radius 37 (no border/shadow) + label 69:1447 Medium 20 #03080f.
- Battery page (80:2867, px only): same system; FAQ items #f5f4ff; CTA band 81:3830 px #c9e260; expectation icon tiles alternate #6c5ce7/#b7e137.

## 5. Step 8 (91:10958) full get_design_context
- Same header/panel/progress/footer as Step 1. Progress fill 91:10963 full width #674bd9.
- Title 91:11408 "Jouw gegevens" SemiBold 34 / lh27 #000.
- Field labels 91:11419/11422/11427/11428 SemiBold 18 / lh36 tracking -0.54 #000 ("Voornaam","Achternaam","Telefoonnummer","E-mail").
- Inputs 91:11420/11423/11429/11430 #f6f4ff, 1px #ded9f4, radius 16, 326x60.
- Placeholders 91:11431 "Vul hier uw voornaam in", 91:11433 "Vul hier uw achternaam in", 91:11441 "example@email.com", 91:11442 "478 12 34 56": Regular 16 / lh30 tracking -0.48 (-3%) #aea9c6.
- Phone prefix chip 91:11440 #fff, 1px #ded9f4, radius 8, 92x40; flag bitmap 113:1919 "flag (2) 1" radius 3 (Belgian flag in this frame); "+32" 91:11434 Regular 16 #03080f; chevron 18px.
- Checkbox 91:11443 #f6f4ff, 1px #ded9f4, radius 10, 34x34. Consent 91:11444 Regular 18 / lh30 #3a3c75 with link "algemene voorwaarden" #6c5ce7 (no underline).
- Submit 91:11407 #b7e137 radius 12 148x52; label 91:11410 "Indienen" Regular 18 #03080f.
- Back 91:11415 #fff 1px #ded9f4 radius 12; "Terug" Regular 18 #03080f.
- Other steps (text nodes): sub-question 90:10441 SemiBold 18 / lh36 #000; unit "kWh" 90:10939 Regular 18 #03080f; checkbox label 89:7975 Regular 18 #3a3c75; placeholder 89:7946 "Voer uw postcode in" Regular 18 (!) #aea9c6 (Step 8 placeholders are 16).
- No components/instances/variants anywhere in the file (XML: 0 <instance>/<component>); no hover/focus/selected/error/disabled states drawn.

## 6. SVG assets inspected (figma/svg/)
- hero_subtract_60-4.svg: fill #7051ED + filter feTurbulence fractalNoise baseFrequency 2, numOctaves 3, black specks rgba(0,0,0,0.25) = Figma NOISE effect.
- Pixel stats confirm noise on purple rects too (60:9, 60:49, 88:7430: sd ~8 on blue channel; mean #6247cf) though get_design_context only reports flat #7051ed. Footer 60:496 lighter (sd 3). Top lime strip mean #c4dd5d (slight noise).
- step1_radio_ellipse62.svg: fill white, stroke #C4BCE7 (radio ring).
- step1_divider_vector21.svg: stroke #CFCAE4.
- step8_footer_vector17.svg: white, stroke-opacity 0.34 (footer dividers).
- home_usp_ellipse12.svg: fill #F0EDFF, stroke #6C5CE7 @0.18, 2px.
- home_usp_union.svg: #B7E137. home_step_union.svg: white. home_cmp_ellipse22.svg: #6C5CE7 + white stroke + blur 4.1 glow. home_cta_frame7.svg: white rings stroke 31, stroke-opacity .15, gradients. home_testimonial_quote.svg: #6C5CE7. step1_icon_frame5.svg (answer icon): #7051ED.

## 7. Motion
- get_motion_context(60:2, recursive) -> {"nodes":[]}
- get_motion_context(84:3972, recursive) -> {"nodes":[]}
=> matches brief §6.1 "Figma contains no animation".

## 8. Fonts
- Only family: Bricolage Grotesque (all sampled nodes on home, solar, battery, steps, read-blog). Weights: 400 Regular, 500 Medium, 600 SemiBold. No 700. Axes pinned "opsz" 14, "wdth" 100 on every node.
- Wordmark "Voordeelvinder" is a vector (60:317, 84:4231, 60:704) -> SVG export, no font needed.
- Emoji "👋" (60:322) = system emoji (Apple in Figma render).
- Licence: SIL OFL 1.1 (google/fonts ofl/bricolagegrotesque/METADATA.pb; designer Mathieu Triay; added 2023-06-15; file BricolageGrotesque[opsz,wdth,wght].ttf; axes opsz 12–96, wdth 75–100, wght 200–800; subsets latin, latin-ext, vietnamese).
- Fontsource: @fontsource/bricolage-grotesque (static) and @fontsource-variable/bricolage-grotesque v5.3.0 (OFL-1.1). CSS entry points: index.css, wght.css, opsz.css, wdth.css, standard.css; family name 'Bricolage Grotesque Variable'; font-display: swap built in.
  - latin woff2 sizes: wght 41,344 B; opsz 76,888 B; standard (all axes) 131,548 B; latin-ext wght 18,668 B.
- Google Fonts CSS2 API: wght-only request returns the same file as opsz=14 -> the font's default opsz is 14 = exactly what Figma uses. The wght-only file therefore matches Figma; the opsz/standard files + default `font-optical-sizing: auto` would set opsz = font-size (60px hero -> opsz 60) and change glyph shapes vs Figma.
- Recommendation: self-host @fontsource-variable/bricolage-grotesque (wght.css / index.css), latin + latin-ext only; preload the latin woff2; `font-display: swap`; add a metric-matched fallback (size-adjust/ascent-override) to keep CLS < 0.1. If the full-axes file is ever used: `font-optical-sizing: none` (or `font-variation-settings: "opsz" 14`). Dutch glyphs (ë é ï ’ — €) are in the latin subset (U+0000-00FF, U+2000-206F, U+20AC).
- GSAP SplitText on headings must run after `document.fonts.ready` (otherwise re-split after swap).

## 9. Contrast (figma/contrast.py)
(see extra_data table in structured output)
Fails AA: form panel body rgba(255,255,255,.65) on #7051ed = 3.10:1 (16px regular; needs >=90% white for 4.5:1);
placeholders #aea9c6 on #f6f4ff = 2.08:1; newsletter placeholder rgba(3,8,15,.34) on #fff = 2.30:1;
non-text 1.4.11: radio ring #c4bce7 on #f6f4ff = 1.65:1; checkbox/input border #ded9f4 on #fff = 1.37:1; input fill #f6f4ff vs #fff = 1.09:1.
Borderline: #6c5ce7 text on #f6f4ff = 4.47:1 (not currently used for small text; avoid).
Passes: white on #7051ed 5.14; white on #6c5ce7 4.86; #6c5ce7 on white 4.86; dark ink on both limes 11.6–13.9; #3a3c75 on white/lavender/lime-50 9–10; #3a3c75 on #b7e137 6.64; progress fill vs track 4.87.
Lime-as-text never used on white in the design (PromoCheckers lesson OK): white/lime 1.45–1.52 would fail -> lint rule.

## 10. Layout metrics (desktop 1440)
- Content container x135–1305 = 1170px (side padding 135). Header container x137–1307. Form layout x132–1296: panel 372 + gap ~24 + card 767 (card padding 48; progress card padding 37).
- Wide containers: "Hoe het werkt" 1378 (x30) radius 40; FAQ bg 1391 (x25) bottom radius 30; product blocks 1168 (x135); solar CTA band 1184 (x128). Full-bleed: hero, comparison texture bg, footer.
- Header: lime strip 16 + white bar 69 = 85px. CTA pill 170x42.
- Vertical rhythm (homepage): badge->H2 ~17–19; H2->intro ~16–19; intro->content ~46–51; section gaps 90 / 107 / 123 / 128 / 155 / 160 / 202 / 224 (inconsistent).
- Card padding: value cards 34; why cards 30; FAQ items 27 (h79); answer cards 15 inset, h74; buttons 148x52 (form), pills 42/51/54/62 tall.

## 11. Proposed Tailwind 4 @theme (Phase 2 draft; merges near-duplicates; NEW = not in Figma, needs sign-off)
```css
@theme {
  /* brand */
  --color-purple-600: #7051ed;  /* surfaces: hero, footer, form panel, CTA band, table header, value-card plates */
  --color-purple-500: #6c5ce7;  /* accents: icon tiles, secondary CTA, highlight column, links, "Stap X van Y" */
  --color-purple-700: #674bd9;  /* progress fill; small purple text on lavender (5.38:1) */
  --color-lavender-50:  #f6f4ff; /* answer cards, inputs, light cards (absorbs #f5f4ff, #f6f6fe) */
  --color-lavender-100: #f2f0ff; /* battery block, USP icon circles (absorbs #f0edff) */
  --color-lavender-300: #ded9f4; /* hairline card borders (decorative only) */
  --color-lavender-400: #cfcae4; /* dividers */
  --color-lime-300: #c9e260;     /* primary CTA pills, top strip, highlight chip, solar CTA band */
  --color-lime-400: #b7e137;     /* accents: strips, table column, form buttons (pending: pick ONE for buttons) */
  --color-lime-50:  #f8fceb;     /* solar block (absorbs #f8fbeb) */
  /* ink */
  --color-ink-900: #03080f;      /* headings, labels, button text (absorbs #000000) */
  --color-ink-800: #151d30;      /* nav, badge labels, some CTA labels */
  --color-ink-600: #3a3c75;      /* body / secondary text */
  --color-ink-placeholder: #6b6790; /* NEW: replaces #aea9c6 and rgba(3,8,15,.34); 4.86:1 on lavender-50 */
  --color-control-border: #897dec;  /* NEW-derived (purple-500 @80% on white): radio/checkbox/input boundary 3.38:1 / 3.11:1 */
  --color-danger: #c62828;       /* NEW: inline errors, 5.62:1 on white, 5.17:1 on lavender-50 */
  --color-white: #ffffff;

  /* type */
  --font-sans: "Bricolage Grotesque Variable", "Bricolage Grotesque", "Bricolage Fallback", ui-sans-serif, system-ui, sans-serif;
  --text-display: 5rem;    --text-display--line-height: 1.3;   --text-display--letter-spacing: -0.03em; --text-display--font-weight: 600; /* 80/104 */
  --text-h1: 3.75rem;      --text-h1--line-height: 1.1667;     --text-h1--letter-spacing: -0.03em;      --text-h1--font-weight: 600;      /* 60/70 */
  --text-h2: 3rem;         --text-h2--line-height: 1.2;        --text-h2--letter-spacing: -0.03em;      --text-h2--font-weight: 600;      /* 48 (Figma lh 52-76) */
  --text-h3: 2.125rem;     --text-h3--line-height: 1.15;       --text-h3--letter-spacing: -0.03em;      --text-h3--font-weight: 600;      /* 34 (Figma lh 27-65) */
  --text-h4: 1.875rem;     --text-h4--line-height: 1.1;        --text-h4--letter-spacing: -0.02em;      --text-h4--font-weight: 600;      /* 30/32 form panel */
  --text-title-lg: 1.5rem; --text-title-lg--line-height: 1.125; --text-title-lg--letter-spacing: -0.03em; --text-title-lg--font-weight: 600; /* 24/27 */
  --text-title: 1.375rem;  --text-title--line-height: 1.227;   --text-title--letter-spacing: -0.03em;   --text-title--font-weight: 600;   /* 22/27 */
  --text-title-sm: 1.25rem; --text-title-sm--line-height: 1.35; --text-title-sm--letter-spacing: -0.03em; --text-title-sm--font-weight: 600; /* 20/27 */
  --text-lead: 1.5rem;     --text-lead--line-height: 1.3;      --text-lead--letter-spacing: -0.02em;    /* 24/30-32 eyebrow, badges, sub */
  --text-body-xl: 1.25rem; --text-body-xl--line-height: 1.5;   --text-body-xl--letter-spacing: -0.02em; /* 20/30 */
  --text-body-lg: 1.125rem; --text-body-lg--line-height: 1.667; --text-body-lg--letter-spacing: -0.02em; /* 18/30 */
  --text-body: 1rem;       --text-body--line-height: 1.5;      --text-body--letter-spacing: -0.02em;    /* 16/24 */
  --text-sm: 0.875rem;     --text-sm--line-height: 1.4286;     --text-sm--letter-spacing: -0.02em;      /* 14/20 */
  --text-label: 1.125rem;  --text-label--line-height: 1.5;     --text-label--letter-spacing: -0.03em;   --text-label--font-weight: 600;   /* 18 field labels (Figma lh 36) */
  --text-label-sm: 0.875rem; --text-label-sm--line-height: 1.4286; --text-label-sm--font-weight: 600;   /* 14/20 progress */
  --text-button: 1rem;     --text-button--line-height: 1.25;   --text-button--font-weight: 500;         /* 16 Medium */
  --text-button-lg: 1.25rem; --text-button-lg--line-height: 1.25; --text-button-lg--font-weight: 500;   /* 20 Medium */

  /* radius */
  --radius-xs: 0.5rem;   /* 8  (7,8,10) icon tiles in form, prefix chip, checkbox */
  --radius-sm: 0.75rem;  /* 12 form buttons, highlight chip */
  --radius-md: 1rem;     /* 16 answer cards, inputs, icon tiles */
  --radius-lg: 1.25rem;  /* 20 (18-20) FAQ items, table cells, feature cards */
  --radius-xl: 1.5rem;   /* 24 (23-26) form/progress cards, panel, why/testimonial cards */
  --radius-2xl: 1.875rem;/* 30 (30-36) value cards, section ends, CTA bands */
  --radius-3xl: 2.5rem;  /* 40 "Hoe het werkt" container */
  --radius-pill: 9999px; /* 34/37/41 pills, badges, buttons */

  /* shadow */
  --shadow-header: 0 13px 32px rgb(0 0 0 / 0.13);
  --shadow-form: 0 29px 64px rgb(41 32 132 / 0.08);
  --shadow-card: 12px 12px 48px rgb(40 34 88 / 0.07);
  --shadow-card-lg: 0 15px 50px rgb(40 34 88 / 0.15);
  --shadow-row: 0 4px 22px rgb(108 92 231 / 0.14);
  --shadow-soft: 0 18px 27px rgb(0 0 0 / 0.05);
  --shadow-on-purple: 0 11px 29px rgb(0 0 0 / 0.53);   /* step cards on purple — confirm, very heavy */
  --shadow-glow-lime: 0 2px 8px rgb(165 202 53 / 0.53), inset 0 0 17.4px #fff;
  --shadow-glow-purple: 0 7px 19px rgb(108 92 231 / 0.56), inset 0 0 17.4px rgb(255 255 255 / 0.7);
  --inset-shadow-gloss: inset 0 0 17.4px rgb(255 255 255 / 0.7);

  /* layout */
  --container-content: 73.125rem; /* 1170 */
  --container-wide: 86.125rem;    /* 1378 */
  --container-form: 72.75rem;     /* 1164 = 372 + 24 + 767 */

  /* motion (brief §6.1 defaults; Figma has none) */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --motion-duration-fast: 150ms;
  --motion-duration-base: 250ms;
  --motion-duration-slow: 400ms;
  --motion-distance-1: 8px;
  --motion-distance-2: 16px;
  --motion-distance-3: 24px;
  /* spring (Motion only, in src/lib/motion.ts): stiffness 400, damping 32 */
}
```
