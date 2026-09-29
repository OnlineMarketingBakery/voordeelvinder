# Slice "home" — Homepage 3 (60:2), Phase 0 review notes

File 8bhHL5kRbwYzYPbH6Vgdjn, frame 60:2 "Homepage 3", 1440 x 10083.
The frame is flat: 294 direct children, with no section frames or auto-layout, just loose rectangles, texts and a few groups.
get_design_context on 60:2 is too large (it returns only sparse metadata), so the sections below were reconstructed by y-position.
Copy sources:
- **(DC):** verified with get_design_context on that node.
- **(LN):** the text layer name, which Figma auto-names from the content. It was cross-checked against the full-frame screenshot (`shots/home_full.png`, sections in `shots/home_s01..s11_*.png`).
- Line breaks inside one text node are shown as ` / `.
- Typos are quoted exactly as they appear in Figma.

Hidden layers inside 60:2: **none**. No node in the subtree has `hidden="true"`.
Clipped/off-canvas content: 2 testimonial cards sit partly outside the frame (60:818 at x=-275, 60:784 at x=1341), clipped by mask 60:748. This is a carousel.

Fonts used: **Bricolage Grotesque** Regular + SemiBold (variation `opsz 14, wdth 100`). It's OFL/Google Fonts, so it can be self-hosted.
Stray: 60:328 has a root style `Aeonik:Medium` (a commercial font). Its spans override it with Bricolage, so Aeonik never renders. Ignore it and don't ship Aeonik.

Sampled homepage values (no Figma variables exist):
- lime CTA fill `#c9e260` (60:120), white 1px border, glow `0 2px 8.2px rgba(165,202,53,.53)` + inset white 17.4px, radius 37px
- lime table cell `#b7e137` (60:430), radius 18px
- lime pill background `rgba(183,225,55,0.28)` (60:22), pill inner white, radius 34px
- purple CTA `#6c5ce7` (69:922), inset glow `rgba(255,255,255,.7)`, radius 37px
- purple table header `#7051ed` (60:427), radius 18px
- text: `#03080f` (headings/USP), `#151d30` (nav, pill label), `#3a3c75` (body in cards/testimonials), white on purple
- card: white, border `#ededed`, shadow `0 18px 27px rgba(0,0,0,.05)`, radius 25px (USP bar 60:382)
- FAQ card: white, radius 20px, shadow `12px 12px 48px rgba(40,34,88,.07)` (60:107)
- testimonial card: white, radius 24px, shadow `0 15px 50px rgba(40,34,88,.15)`. Avatar frame bg `rgba(108,92,231,.06)`, border 3px `rgba(198,185,248,.56)`
- type:
  - H1 60/70, SemiBold, tracking -1.8px (-3%) (60:320)
  - H2 48/65, SemiBold, -1.44px (60:12)
  - final CTA display 80/104, SemiBold, -2.4px (60:500)
  - nav 14/36, -0.28px (60:380)
  - hero body 16/26, -0.32px (60:321)
  - CTA-banner body 18/28 (60:80)
  - pill label 24/30, -0.48px (60:25)
  - USP 20/20, -0.6px (60:384)
  - testimonial name 22/27 SemiBold, -0.66px
  - card body 16/22–24

---

## Section order (top → bottom) with verbatim copy

### 0. Header (site-wide → site.json) y 0–85
- 60:118: lime strip 1440x16 above the header (decorative, no text).
- 60:119: white header bar 1440x69.
- 60:124 "Group 28": logo. Mascot badge 60:125 + wordmark **vector** 60:317 "Voordeelvinder" (lower-case "v" in "vinder" in the wordmark).
- 60:380 nav (DC), one text node spaced with runs of spaces: `Hoe het werkt         Veelgestelde vragen         Over ons         Blogs`
- 60:120 / 60:123 header CTA: `Gratis beginnen` + arrow icon 60:121

### 1. Hero y 85–931 (bg vector 60:4 "Subtract", purple; decorative ellipses 60:318, 60:319, 60:8; shadow ellipse 60:343)
- 60:322 (DC): `👋` (28px) + ` Welkom bij voordeelvinder` (24px). The brand is written lower-case.
- 60:320 H1 (DC): `Betaal jij te veel / voor energie?`
- 60:321 (DC): `In een paar minuten weet je het zeker. Vul je gegevens in, wij vergelijken / Luminus, Mega en TotalEnergies — en je ziet meteen welk contract het / oordeligst is voor jouw situatie.`
- 60:323: divider line
- 60:324 / 60:327 CTA (LN): `Vergelijk nu gratis` + arrow icon 60:325
- Social proof row:
  - avatar rings 60:329 / 60:331 / 60:333 / 60:335 + 4 stock photos 60:330 / 60:332 / 60:334 / 60:336
  - 60:328 (DC): `Trusted by over 300+ customers.` (non-breaking space before "300+")
  - 60:337 "Group 36": 5 gold stars graphic
- Images:
  - 63:860 "54544 1" (raster): mascot giving a thumbs up, holding a card that reads **"€ 52 /maand" + "✓ BESTE DEAL"**. The text is baked into the image (see `shots/home_zoom_hero_price.png`).
  - 62:858 "6548 1" (raster): solar panel + home battery.

### 2. USP bar (overlaps the bottom of the hero) — 60:381 "Group 49" y 863–967 (DC)
- 60:384 `Geen / verkoopgesprekken.`, icon 60:390 "no-call"
- 60:385 `Geen kleine / lettertjes` (no full stop, unlike its siblings), icon 60:393 "hide". This middle item is on a lime "Union" shape 60:383.
- 60:386 `Geen / gedoe.`, icon 60:397 "file"

### 3. "Over ons" section (anchor target for nav "Over ons") y 1090–1758
- 60:21 pill (DC): info icon 60:26 + `Over ons`
- 60:15 H2 (LN): `Waarom VoordeelVinder bestaat`
- 60:16 (LN): `De meeste Belgen betalen te veel voor energie. Niet omdat ze het niet willen weten — maar omdat vergelijken traag, saai en verwarrend is.`
- 3 cards, left → right. Card bg 60:18 / 60:19 / 60:20, bottom-border rects 60:5 / 60:6 / 60:7. The middle card is lime-tinted and the outer two are purple-tinted.
  1. icon 60:401 (money). 60:42 `De meeste Belgen betalen te veel voor energie.` / 60:45 `Niet omdat ze het niet willen weten maar omdat vergelijken traag, saai en verwarrend is.`
  2. icon 60:409 (send). 60:44 `Bestaande vergelijkers sturen je door naar een verkoper. Wij niet.` / 60:47 `Bij VoordeelVinder vergelijk je zelf, wanneer het jou past. Zonder afspraak. Zonder wachtrij. Zonder druk.`
  3. icon 60:415 (wallet). 60:43 `Jij vult in. Wij vergelijken. Jij bespaart.` / 60:46 `Alles wat we doen, is erop gericht om dat zo makkelijk en eerlijk mogelijk te maken.`

### 4. "Hoe het werkt" — steps (anchor target for nav "Hoe het werkt"; the section carries no "Hoe het werkt" label) y 1920–2725
- 60:9: purple rounded background 1378x765. 60:345 "Fx 1" (raster): mascot with a magnifying glass.
- 60:12 (DC) + 60:11 on lime highlight 60:10: `Zo werkt het vergelijken / van je` + `energiecontract`
- 60:48 (LN): `In drie eenvoudige stappen ontdek je welke energieleverancier het voordeligst is voor jouw situatie.`
- Timeline line 60:346. Step pills 60:350 / 60:353 / 60:356 with labels 60:845 `Stap 01`, 60:846 `Stap 02`, 60:847 `Stap 03`. Pill 02 is lime; 01 and 03 are purple.
- Cards 60:347 / 60:348 / 60:349:
  1. icon 60:848 "contract 1". 60:366 `Vul je situatie in` / 60:365 `Een schatting van je verbruik volstaat. Je hebt je factuur niet nodig om te starten.`
  2. icon 60:370 "compare 1". 60:369 `Wij vergelijken` / 60:367 `We checken Luminus, Mega en TotalEnergies op basis van jouw gegevens. Transparant, zonder verborgen voorkeur.`
  3. icon 60:372 "decision-making 1". 60:371 `Jij beslist` / 60:368 (DC) `e ziet meteen wie het voordeligst is voor jou. / Kies zelf of je overschakelt  wij regelen dan / de rest. Je zit nooit zonder stroom.` (there is a double space and missing punctuation between "overschakelt" and "wij")

### 5. Comparison table y 2832–3813 (bg mask group 60:373: cloud image 60:376 + overlay 60:377)
- 60:420 pill: `Voor Vinder versus anderen` (60:424)
- 60:378 H2: `Niet zomaar een vergelijker`
- 60:379: `Er zijn veel vergelijkingssites. De meeste sturen je door naar een verkoper, tonen niet alle opties, of bellen je daarna op. Dat doen wij niet.`
- Header row 60:427 (#7051ed): 60:436 `Andere vergelijkers` | 60:437 `VoordeelVinder`
- Rows: label cell (white) with a lightning icon in a purple circle, then an "Andere" cell (lime #b7e137), then a "VoordeelVinder" cell (purple).

  | row | label | Andere | VoordeelVinder |
  |---|---|---|---|
  | 60:428 | 60:438 `Doorgestuurd naar een verkoper` | 60:439 `Vaak` | 60:440 `Nooit` |
  | 60:431 | 60:451 `Jij bepaalt of en wanneer we bellen` | 60:456 `Zelden` | 60:461 `Altijd` |
  | 60:432 | 60:452 `Open over welke leveranciers we vergelijken` | 60:457 `Niet altijd` | 60:462 `Ja` |
  | 60:433 | 60:453 `Eerlijk resultaat, ook als overstappen weinig oplevert` | 60:458 `Zelden` | 60:463 `Altijd` |
  | 60:434 | 60:454 `Gratis en volledig vrijblijvend` | 60:459 `Niet altijd` | 60:464 `Ja` |
  | 60:435 | 60:455 `Direct resultaat, geen wachttijd` | 60:460 `Nee` | 60:465 `Ja` |

### 6a. Product section: Zonnepanelen y 3941–4756 (card 66:861, lime-tinted, lime bottom border 66:862)
- Pill 66:866 / 66:867 / 66:868: icon 67:878 "solar-panel 1" + 66:869 `Zonnepanelen`
- CTA (top-right) 69:917: 69:920 `Bereken je besparing` + arrow 69:918 (lime button)
- 66:863 H2: `Betaal minder. Produceer zelf.`
- 66:872: `Zonnepanelen zijn een slimme investering — maar de prijzen en aanbieders variëren sterk. VoordeelVinder vergelijkt de beste installateurs en formules voor jouw dak, zonder verborgen kosten.`
- Feature items (white card + lime left bar):
  - 67:883 `Onafhankelijk advies` / 67:882 `Wij werken niet voor één installateur. Je krijgt een eerlijk overzicht van wat op jouw situatie past.`
  - 67:886 `Bereken je terugverdientijd` / 67:885 `Op basis van je verbruik en dak tonen we hoeveel je maandelijks bespaart — en wanneer de panelen zichzelf terugverdienen.`
  - 67:889 `Van offerte tot installatie` / 67:888 `Wij begeleiden je van vergelijking tot plaatsing. Geen losse eindjes, geen onverwachte extra's.`
- Illustration 67:875 "Asset 1 3" (raster: solar panels + light bulb)

### 6b. Product section: Thuisbatterij y 4846–5661 (card 67:893, purple-tinted, purple bottom border 67:894)
- Pill 67:896 / 67:897 / 67:898: icon 69:926 "car-battery 1" + 67:899 `Thuisbatterij`
- CTA 69:922 (#6c5ce7): 69:925 `Ontdek jouw voordeel` + arrow 69:923
- 67:895 H2: `Sla je energie op. Gebruik het wanneer jij wil.`
- 69:916: `Een thuisbatterij maakt je nog onafhankelijker van het net. Combineer je zonnepanelen met slimme opslag en haal het maximale uit je eigen energie — overdag én 's avonds.`
- Items (purple left bar):
  - 67:914 `Minder afhankelijk van het net` / 67:913 `Gebruik de energie die je zelf opwekt ook als de zon niet schijnt. Jij bepaalt wanneer en hoe je stroom verbruikt.`
  - 67:911 `Vergelijk capaciteit en prijs` / 67:910 `Batterijen verschillen sterk in grootte, technologie en prijs. Wij helpen je de juiste keuze maken voor jouw situatie.` ("te" is missing: "de juiste keuze te maken")
  - 67:908 `Gecombineerd voordeel` / 67:907 `Zonnepanelen én thuisbatterij samen? We berekenen het gecombineerde voordeel in één overzicht — duidelijk en zonder jargon.`
- Illustration 69:929 "Group 66 1" (raster: brick gabled house + 3 batteries)

### 7. Why us y 5816–6683
- 60:28 pill: 60:32 `Waarom voor ons kiezen?`
- 60:13 H2: `Waarom kiezen voor VoordeelVinder?`
- CTA (right) 60:51: 60:54 `Vergelijk nu gratis` + arrow 60:52 (purple button)
- 60:17: `Geen gedoe, geen verrassingen. Alleen een eerlijk resultaat dat jou verder helpt.`
- Illustration: 60:71 masked "Asset 1 2" (line-icon background) + 60:849 "5874891 1" (raster mascot with € speech bubble and bills)
- 2x2 cards 60:55 / 60:61 / 60:56 / 60:62, icon tiles 60:113 / 60:116 / 60:114 / 60:115:
  - 60:67 `Duidelijk` / 60:63 `Geen jargon, geen verborgen voorwaarden. Je weet precies wat je invult en waarom.` (icon 60:835 eye)
  - 60:69 `Snel` / 60:65 `Van je eerste klik tot een helder resultaat in enkele minuten. Geen lange formulieren, geen wachttijd.` (icon 60:837 rocket)
  - 60:68 `Eerlijk` / 60:64 `We tonen de resultaten zoals ze zijn — ook als overstappen weinig oplevert.` (icon 60:839 charity)
  - 60:70 `Zelfstandig` / 60:66 `Jij bepaalt wanneer en hoe je vergelijkt. Geen verkoopgesprekken, geen onverwachte telefoontjes.` (icon 60:843 fist)

### 8. CTA banner y 6812–7178 (60:49 purple, concentric circles 60:75)
- 60:79 H2: `Klaar om te zien wat jij betaalt?`
- 60:80 (DC): `In een paar minuten weet je of je te veel betaalt — en welk contract beter bij je past. Geen / erplichtingen, geen verrassingen.`
- 60:81 button: 60:85 `Start je vergelijking` + arrow 60:83 (lime)

### 9. FAQ (anchor target for nav "Veelgestelde vragen") y 6987–7991 (lavender section bg 60:3, 1391x1004, which also sits behind the lower half of the CTA banner)
- 60:35 pill: 60:39 `Faqs`
- 60:14 H2: `Veelgestelde vraag` (singular)
- Contact card 60:50:
  - 60:495 `Heb nog steeds / een vraag?`
  - 60:110 `Wij helpen je graag verder. Neem gerust contact op met ons op.`
  - button 60:86: 60:90 `Stel een vraag` + arrow 60:88
  - mascot with laptop 60:747 "Group 3 1" (raster) on circle 60:745
- Accordion (right column), each item has a "+" icon circle:
  1. 60:57 / 60:482: 60:91 `Moet ik mijn factuur bij de hand hebben?` (closed, **no answer in design**)
  2. 60:107 / 60:478 (open): 60:112 `Word ik daarna opgebeld door een verkoper?`, divider 60:108, label 60:111 `Antwoord`, answer 60:109 `Nee. Jij bepaalt zelf of en wanneer we contact opnemen. We bellen je alleen als jij daar bewust voor kiest.`
  3. 60:58 / 60:103: 60:92 `Is VoordeelVinder gratis?` (**no answer**)
  4. 60:59 / 60:99: 60:93 `Met welke leveranciers vergelijken jullie?` (**no answer**)
  5. 60:60 / 60:95: 60:94 `Zit ik ergens aan vast na de vergelijking?` (**no answer**)
- The open item still shows the "+" icon; no "−"/open-state icon is designed.

### 10. Testimonials y 8104–8742
- 60:488 pill: 60:492 `Ervaringen`
- 60:486 H2: `Wat klanten zeggen`
- 60:487: `Geen gedoe, geen verrassingen. Alleen een eerlijk resultaat dat jou verder helpt.` (duplicates 60:17)
- Carousel 60:748 (DC). There are 5 cards; the outer two are faded and partly off-canvas. Each card has a stock-photo avatar, 5 stars, a quote mark, a divider and a location pin.
  - 60:818 (off-left): 60:824 `Sofie V., Gent` / pin 60:832 `Antwerpen`
  - 60:751: 60:756 `Sofie V.` / pin 60:764 `Gent`
  - 60:767: 60:773 `Thomas D.` / pin 60:781 `Antwerpen`
  - 60:801: 60:807 `Sofie V., Gent` / pin 60:815 `Antwerpen` (the name says Gent but the pin says Antwerpen)
  - 60:784 (off-right): 60:790 `Thomas D.` / pin 60:798 `Antwerpen`
  - All 5 quotes are identical (60:755, 60:772, 60:806, 60:789, 60:823): `Ik had dit al maanden uitgesteld. In tien / minuten was het geregeld en ik bespaar / nu €[X] per maand. Had het eerder / moeten doen.`

### 11. Final CTA y 8818–9420
- Circles 81:3574 / 81:3575, mascot raster 60:723 "ChatGPT Image Sep 22, 2026, 01_37_15 PM 9" (a cheering mascot holding a bill), decorative ellipses 60:497 / 60:498, sparkle 60:507
- 60:500 (DC) `Jij vult in. / ​ / Jij bespaart.`. The middle line is a zero-width space; 60:501 `Wij vergelijken.` is overlaid there on lime highlight 60:499. It reads "Jij vult in. / Wij vergelijken. / Jij bespaart."
- 60:502: `Doe het nu — het duurt een paar minuten en je weet meteen waar je staat.`
- 60:503 button: 60:506 `Start je vergelijking` + arrow 60:504 (purple)

### 12. Footer (site-wide → site.json) y 9474–10083 (60:496 purple)
- Logo 60:512 + wordmark vector 60:704 "Voordeelvinder"
- 60:707: `De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden.`
- Newsletter pill 60:715:
  - mail icon 60:719, divider 60:717
  - placeholder 60:716 `Voer uw e-mailadres in`
  - button 60:718 / 60:721 `Abonneren`
  - **no heading, label, consent checkbox or privacy line**
- Dividers 60:709 / 60:713 / 60:714
- 60:710 `Snelle links` → 60:705 (DC) `Hoe het werkt` / `Veelgestelde vragen` / `Over ons` (chevrons 60:724 / 60:732 / 60:734)
- 60:711 `Juridisch` → 60:706 `Privacybeleid` / `Cookiebeleid` / `Algemene voorwaarden` (chevrons 60:726 / 60:728 / 60:730)
- 60:712 `Contact` → 60:708 (DC) `E-mail: info@voordeelvinder.com` / `Telefoon: 335 224 654` (icons 60:736 + 60:739, 60:737 + 60:741). **There is no "Adres: Nederland" line on this frame.** That line exists only on the hidden Homepage 1/2 (40:2453, 43:3325) and on "Step - 7 -slide 2" (91:12795).
- Bottom bar 60:511: 60:722 `© 2026 VoordeelVinder.be — Alle rechten voorbehouden.`
- No social icons, no Blogs link, no links to /zonnepanelen or /thuisbatterij.

---

## §6 copy-correction check (Homepage 3)

| Brief item | On 60:2? | Where / quote |
|---|---|---|
| "Ne" → "Nee" | **No** | only correct `Nee` (60:460) and `Nee.` (60:109) |
| "het oordeligst" | **Yes** | 60:321 `…welk contract het / oordeligst is voor jouw situatie.` |
| "e ziet meteen" | **Yes** | 60:368 `e ziet meteen wie het voordeligst is voor jou.` |
| "Geen erplichtingen" | **Yes** | 60:80 `Geen / erplichtingen, geen verrassingen.` (across a line break) |
| "Neem gerust contact op met ons op" | **Yes** | 60:110 |
| "Heb nog steeds een vraag?" | **Yes** | 60:495 `Heb nog steeds / een vraag?` |
| "Voor Vinder versus anderen" | **Yes** | 60:424 (pill 60:420) |
| "Faqs" | **Yes** | 60:39 (pill 60:35) |
| "Trusted by over 300+ customers." | **Yes** | 60:328 (with NBSP) |
| "u" forms | **Yes, 1** | 60:716 `Voer uw e-mailadres in` (the same placeholder appears in every frame's footer) |
| Footer placeholders | partly | 60:708 `.com` email + `335 224 654`. **No** `Adres: Nederland` on this frame |

Additional typos and grammar (not in §6):
- 60:368 `Kies zelf of je overschakelt  wij regelen dan de rest.`: double space, and a separator is missing (probably "—").
- 60:45 `Niet omdat ze het niet willen weten maar omdat…`: the "—" before "maar" is missing (60:16 has it).
- 67:910 `Wij helpen je de juiste keuze maken`: should be "de juiste keuze te maken".
- 60:322 `Welkom bij voordeelvinder`: brand in lower case (copy elsewhere uses "VoordeelVinder"; the logo wordmark is "Voordeelvinder").
- 60:385 `Geen kleine lettertjes`: no full stop (siblings 60:384 and 60:386 end with ".").
- 60:14 `Veelgestelde vraag`: singular. Once "Faqs" becomes "Veelgestelde vragen", the pill and the H2 almost duplicate each other.
- 60:807 / 60:824 `Sofie V., Gent` with pin `Antwerpen` (placeholder data, hidden anyway).
- Duplicate copy: 60:42 + 60:45 repeat 60:16 almost word for word; 60:487 = 60:17.

## Claims inventory (§2 + other unverifiable claims)
1. **"No seller / no calls" family (conflicts with promo leads being called by a partner, §2 and §9.3):**
   - 60:384 `Geen verkoopgesprekken.`
   - 60:44 `Bestaande vergelijkers sturen je door naar een verkoper. Wij niet.`
   - 60:47 `…Zonder afspraak. Zonder wachtrij. Zonder druk.`
   - 60:379 `…of bellen je daarna op. Dat doen wij niet.`
   - 60:438 / 440 `Doorgestuurd naar een verkoper` → `Nooit`
   - 60:66 `…Geen verkoopgesprekken, geen onverwachte telefoontjes.`
   - FAQ 60:112 / 60:109 `Word ik daarna opgebeld door een verkoper?` → `Nee. …We bellen je alleen als jij daar bewust voor kiest.`
   - 60:451 / 461 `Jij bepaalt of en wanneer we bellen` → `Altijd`. The "of" (whether) has no call-permission question to back it; §7.3/§7.5 only have a required call moment.
2. **"Instant on-screen result" family (the MVP is callback-only):**
   - 60:321 `…en je ziet meteen welk contract het oordeligst is`
   - 60:368 `e ziet meteen wie het voordeligst is voor jou.`
   - 60:455 / 465 `Direct resultaat, geen wachttijd` → `Ja`
   - 60:65 `Van je eerste klik tot een helder resultaat in enkele minuten. … geen wachttijd.`
   - 60:64 `We tonen de resultaten zoals ze zijn`
   - 60:453 `Eerlijk resultaat, ook als overstappen weinig oplevert`
   - 60:79 / 60:80 `Klaar om te zien wat jij betaalt?` / `In een paar minuten weet je of je te veel betaalt — en welk contract beter bij je past.`
   - 60:502 `…je weet meteen waar je staat.`
   - 60:48 `…ontdek je welke energieleverancier het voordeligst is`
   - 60:47 `Bij VoordeelVinder vergelijk je zelf`
   - 60:17 / 60:487 `Alleen een eerlijk resultaat…`
   - solar: 67:886 / 67:885 `Bereken je terugverdientijd` / `…tonen we hoeveel je maandelijks bespaart — en wanneer de panelen zichzelf terugverdienen.`; CTA 69:920 `Bereken je besparing`
   - battery: 67:907 `We berekenen het gecombineerde voordeel in één overzicht`
3. **Supplier and partner claims:**
   - 60:321 and 60:367 `Luminus, Mega en TotalEnergies`, and `Transparant, zonder verborgen voorkeur.`
   - 60:452 `Open over welke leveranciers we vergelijken` → `Ja`
   - FAQ 60:93 (unanswered)
   - solar: 66:872 `vergelijkt de beste installateurs en formules…zonder verborgen kosten`, 67:882 `Wij werken niet voor één installateur.`, 67:888 `Wij begeleiden je van vergelijking tot plaatsing.` Solar and battery have no partner or destination yet (§7.4, §8).
   - 60:368 `wij regelen dan de rest. Je zit nooit zonder stroom.`
4. **Social proof:**
   - 60:328 `Trusted by over 300+ customers.` + 4 stock avatars (60:330 / 332 / 334 / 336) + 5-star graphic 60:337
   - testimonials 60:748: 5 cards, stock photos, 5-star rows, `€[X]`, placeholder names
5. **€ amounts:**
   - hero raster 63:860 shows `€ 52 /maand` + `BESTE DEAL`, baked into the image
   - `€[X]` in all 5 testimonial quotes
   - 60:849 shows a "€" coin (generic, fine)
6. **Free / no obligations:**
   - `Vergelijk nu gratis`, `Gratis beginnen`
   - 60:454 `Gratis en volledig vrijblijvend`
   - 60:80 `Geen erplichtingen`
   - FAQ 60:92 / 60:94 unanswered
   - These are probably true, but the client should confirm them.
7. No partner or supplier logos anywhere on the homepage.

## CTAs
| Node | Text | Style | Proposed target |
|---|---|---|---|
| 60:123 | Gratis beginnen | lime, header | /vergelijken (§5) |
| 60:327 | Vergelijk nu gratis | lime, hero | /vergelijken (§5) |
| 69:920 | Bereken je besparing | lime, solar section | not in the brief. For the §6.1 morph → /vergelijken/zonnepanelen |
| 69:925 | Ontdek jouw voordeel | purple, battery section | not in the brief. For the morph → /vergelijken/thuisbatterij |
| 60:54 | Vergelijk nu gratis | purple, why-us | /vergelijken |
| 60:85 | Start je vergelijking | lime, CTA banner | /vergelijken |
| 60:90 | Stel een vraag | lime, FAQ | mailto:(site.json email) (§5) |
| 60:506 | Start je vergelijking | purple, final CTA | /vergelijken |
| 60:721 | Abonneren | lime, footer | POST /api/newsletter (§5) |

## Assets on the homepage (all illustrations are raster)
- 63:860 "54544 1": hero mascot + €52 card
- 62:858 "6548 1": solar + battery
- 60:345 "Fx 1": magnifier mascot
- 67:875 "Asset 1 3": solar/bulb
- 69:929 "Group 66 1": house + batteries
- 60:73 "Asset 1 2": icon pattern, masked by 60:71
- 60:849 "5874891 1": mascot with bills
- 60:747 "Group 3 1": laptop mascot
- 60:723 "ChatGPT Image Sep 22, 2026, 01_37_15 PM 9": cheering mascot. The layer name suggests AI-generated art.
- 60:376 "image 3": clouds bg
- Stock photos: 4 hero avatars and 3 distinct testimonial photos
- Vectors: logo wordmarks 60:317 / 60:704, mascot badges 60:125 / 60:512 (mask group + "Frame 5"), most icons are "[Vectorized]" frames. The step icons 60:370 "compare 1", 60:848 "contract 1" and 60:372 "decision-making 1" are rounded-rectangles, so they are probably image fills (not verified). The same goes for "solar-panel 1" 67:878 and "car-battery 1" 69:926.
