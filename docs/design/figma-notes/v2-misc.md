# v2 review, slice "misc" (Figma 8bhHL5kRbwYzYPbH6Vgdjn, evening update)

Inputs: page1.xml (morning), page1-v2.xml (evening), figma-diff-nodes.json (a=before, b=after).
Figma calls: get_design_context x15 (14 text nodes, screenshots excluded, plus 134:2637 with screenshot); get_screenshot x3 (63:860 at 615px, 100:2 at 1440x7904 and 100:2 at 729x4000).
Screenshots are in figma/shots-v2/misc-*.png|jpg.

## 1. About us (100:2): what the 71 "moved/resized" nodes really are

Diff result: 372 nodes before and 372 after. None were added or removed, and none were re-parented, renamed or hidden.

The 71 changed nodes break down as:
- 1 × the frame itself: 100:2 moved on the canvas from x=11488 to x=959 (y=0 and 1440x7904 unchanged). The whole canvas was rearranged. Homepage 3 is now at x=-4834, Solar at x=-2903, Battery at x=-972, About us at 959, Blogs overview at 2890 and Read Blog at 4821. New frames 134:2705 'Terms and Conditions' (x6752) and 140:3318 'Privacybeleid' (x8683) were added. All form frames shifted by about -6247 in x and +93 in y.
- 1 × 109:799 'Group 21' (the waving vector fox) plus 68 of its child 'Vector' paths: only the `w` attribute changed, and the largest delta is 9.09e-13 px. That is floating-point re-serialisation noise, not a resize.
- 1 × 100:563 'Vector 18' (a 0-width divider line): w 1.3113422e-6 became 1.3113413e-6. Also noise.

In-frame x/y/h deltas: none. So the About us layout did NOT change: no section moved and no section was resized.

Copy/claims check:
- The full-frame screenshot at 729x4000, compared pixel by pixel with the morning render shots/other-aboutus.png at the same Figma scale, gives max channel diff 23/255, 0 pixels above 24, and 513 pixels above 8. That is the grain texture, not text. The page is visually identical to this morning.
- I also read the 1440 render section by section (misc-aboutus-s1..s9.jpg). Every morning claim is still present, unchanged:
  - hero: "Wij geloven dat besparen voor iedereen makkelijk moet zijn." / "…de bestaande tools traag, verwarrend en partijdig zijn. Dat doen wij anders."
  - 104:716: "Een platform dat je in een paar minuten laat zien welke energieleverancier het voordeligst is voor jouw situatie. Geen tussenpersonen. Geen verkoopgesprekken. Geen druk. Alleen een helder resultaat — en de keuze die volledig bij jou ligt."
  - 104:717: "Vandaag starten we met energie. Morgen breiden we uit naar telecom, verzekeringen, internet en tv, en zonnepanelen. Één vertrouwde plek voor alles wat je elke maand betaalt."
  - Missie: "…zodat iedereen in een paar minuten weet of hij te veel betaalt — en meteen kan overstappen."
  - Visie: "Vandaag energie. Morgen alles wat je elke maand betaalt."
  - 'Wat we nooit doen.': "Andere vergelijkers verkopen jouw gegevens aan call centers. Wij niet." / "We sturen je nooit door naar een verkoper." / "…Jij blijft op VoordeelVinder en jij sluit zelf af — of niet." / "…geen betaalde topposities in de resultaten." / "Wij verdienen alleen als jij effectief bespaart — no cure, no pay."
  - personas: CTA "Bekijk de berekening" and "We tonen je alle tariefcomponenten en hoe we tot het resultaat komen. Transparant tot op het detail." The third quote still has no quotation marks ("Ik wil zien hoe jullie rekenen, niet zomaar een getal.").
  - team: still Thomas Vermeulen / Lotte Peeters / Jeroen Maes, and Thomas and Jeroen still share the same photo.
  - comparison: BOTH column headers still read "Wat andere vergelijkers doen".
  - footer: "Voer uw e-mailadres in", "E-mail: info@voordeelvinder.com", "Telefoon: 335 224 654". The Juridisch links are "Privacybeleid", "Cookiebeleid", "Algemene voorwaarden".

Verdict: no content or layout change on About us. The morning findings other-aboutus-page-exists, -claims, -team-placeholder, -scope-roadmap and -copy-bugs all stand unchanged.

## 2. Step - 1 (84:3972): new node 134:2637 'Group 76'

v2 XML:
```
<frame id="134:2637" name="Group 76" x="1100" y="783" width="148" height="52">
  <rounded-rectangle id="89:7461" name="Rectangle 326" x="1100" y="783" width="148" height="52" />
  <text id="89:7488" name="Volgende" x="1122" y="803" width="76" height="12" />
  <frame id="89:7489" name="Frame" x="1202" y="797" width="24" height="24" />
</frame>
```
Morning XML: the same three nodes (89:7461, 89:7488, 89:7489) at identical coordinates, but as direct children of 84:3972. The diff shows only a parent change for those three plus the new group, with nothing else in Step 1 added, removed or moved (85 nodes before, 86 after).

get_design_context 134:2637 gives a plain group ('contents', no auto-layout): bg #b7e137, 148x52, rounded 12px; label "Volgende", Bricolage Grotesque Regular 18px/30, #03080f, tracking -0.36px; 24px right-chevron SVG. The screenshot shows the lime "Volgende >" button. The style is identical to the morning description ("Volgende" #b7e137, right chevron, 148x52, r12, Regular 18px #03080f).

So Group 76 is NOT a new button. It is the existing Step 1 "Volgende" button, now grouped (Cmd+G). The Step 1 "Terug" was already grouped as 89:7981 'Group 70'.

Steps 2–8 before and after (unchanged):
- 'Volgende' is a loose text node directly under the step frame in 89:7495, 89:7986, 89:8489, 90:8972, 90:9473, 90:10462, 91:11921 and 91:12392, all at x1122 y803. Each 'Terug' is in its own 'Group 70'.
- Step 8 (91:10958, 91:13376) has 'Terug' only, because its primary button is the submit, as in the morning.
- Step 1 had "Volgende" this morning too, so nothing was added.

Probable reason for the grouping: the new nodes 134:2638 'Group 76' (Rectangle 326 134:2639 + 'Volgende' 134:2640 + chevron 134:2641, at x295 y2467) and 134:2643 'Group 70' ('Terug' 134:2645, at x135 y2467) were pasted into 118:2067 'Read Blog Page' next to the new blog-post body and the "Misschien vind je dit ook leuk" (134:2636) section. Their ids are consecutive with 134:2637, so the designer grouped the Step 1 button to copy it into the blog post as prev/next buttons. That belongs to the blog slice.

Effect on brief/review: none. It is not an auto-advance signal and it does not change §6.1. "Volgende stays visible" was already true on every step with Volgende. §7.6 Next validation is unaffected. Structure-only.

## 3. Copy spot-check (get_design_context, verbatim, line breaks as `/`)

| Node | Frame | Evening text (verbatim) | Morning quote | Changed? |
|---|---|---|---|---|
| 60:321 | Homepage 3 | "In een paar minuten weet je het zeker. Vul je gegevens in, wij vergelijken / Luminus, Mega en TotalEnergies — en je ziet meteen welk contract het / oordeligst is voor jouw situatie." | same | No ('oordeligst' typo still there) |
| 60:368 | Homepage 3 | "e ziet meteen wie het voordeligst is voor jou. / Kies zelf of je overschakelt  wij regelen dan / de rest. Je zit nooit zonder stroom." | same | No (missing 'J', missing separator; the code string shows a double space before 'wij') |
| 60:80 | Homepage 3 | "In een paar minuten weet je of je te veel betaalt — en welk contract beter bij je past. Geen / erplichtingen, geen verrassingen." | same | No |
| 60:424 | Homepage 3 | "Voor Vinder versus anderen" | same | No |
| 60:328 | Homepage 3 | "Trusted by over" + " 300+" + " customers." (3 spans, root font still 'Aeonik:Medium', spans Bricolage SemiBold 14) | same | No |
| 60:14 | Homepage 3 | "Veelgestelde vraag" (SemiBold 48/65) | same | No (still singular) |
| 60:109 | Homepage 3 | "Nee. Jij bepaalt zelf of en wanneer we contact opnemen. We bellen / je alleen als jij daar bewust voor kiest." | same | No |
| 90:9436 | Step - 5 | "Ne" | same | No |
| 89:7946 | Step - 2 | "Voer uw postcode in" (18px #aea9c6) | same | No |
| 89:8436 | Step - 3 | "Selecteer uw huidige leverancier" (16px #aea9c6) | same | No |
| 91:11442 | Step 8 | "478 12 34 56" (16px #aea9c6) | same | No |
| 91:14343 | Thank you page | "We hebben je gegevens goed ontvangen. We vergelijken de / mogelijkheden en nemen zo snel mogelijk contact met je op." | same | No |
| 69:980 | Solar Panel Page | "Een gemiddeld gezin verdient de / investering in zonnepanelen terug binnen / €[X] jaar. Wij berekenen jouw persoonlijke / terugverdientijd op basis van je / verbruik en dak." | same | No |
| 69:949 | Solar Panel Page | "Energieprijzen blijven stijgen. Subsidies zijn beschikbaar. En met de juiste panelen verdien je je / investering sneller terug dan je denkt." | same | No |

Result: none of the 14 texts changed.

The diff JSON also shows no x/y/w/h/name/parent/hidden change for any of these 14 nodes. Their frames (60:2, 69:931, 89:7495, 89:7986, 90:8972, 91:10958, 91:13857) have 0 added, 0 removed and 0 changed child nodes.

### 63:860 hero image ('54544 1', Homepage 3)
- get_screenshot 615x604 (misc-hero-63-860.png): the fox still holds the card with the lightning icon, "€ 52 /maand" and "✓ BESTE DEAL".
- A pixel diff against the morning render shots/verify_hero_63-860.png gives max diff 0 (byte-identical render).
- The node is unchanged in the diff (x801 y219 615x604, same name, not hidden), and so is its neighbour 62:858 '6548 1'.
- So the €52 is still baked in, and home-hero-image-savings-figure / assets-hero-baked-price stand.

## Summary for the orchestrator
- About us: the frame moved on the canvas only, and the rest is float noise. The content is pixel-identical.
- Step 1: 'Group 76' is the existing Volgende button, grouped (a by-product of copying it into the Read Blog Page). No behaviour or brief change.
- Spot-check: 0 of 14 texts changed. The €52 is still in the hero raster (pixel-identical).
- No morning finding in this slice is resolved.
