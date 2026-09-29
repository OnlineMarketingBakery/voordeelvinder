# v2 verification notes (adversarial verifier, Figma update of 2026-09-29 evening)

File 8bhHL5kRbwYzYPbH6Vgdjn. Read-only. No writes to the project folder.

## Method
- Diff walk: python over figma-diff-nodes.json (a = morning, b = v2). Noise threshold 1e-6 px for x/y/w/h.
- Figma MCP calls by me (2 in total):
  - get_design_context 134:2705 (Terms and Conditions, full code + render). All Terms quotes re-read from code.
  - get_design_context 140:3318 (Privacybeleid, full code + render; the tool output was truncated only after the node tree had been returned). All Privacy quotes re-read from code.
- Brief re-read: §0, §1, §2, §3, §4.4, §5, §7.3–§7.5, §8, §9.1–§9.3, §10, §11, §15, §17.
- Contrast recomputed: #6c5ce7 vs #3a3c75 2.07; white on #7051ed 5.14; #6c5ce7 on white 4.86; #3a3c75 on white 10.08.

## Diff walk (whole file)
- Top-level: 35 -> 37 frames. New: 134:2705 "Terms and Conditions" (114 nodes), 140:3318 "Privacybeleid" (153 nodes).
- Added 327 nodes: 153 in 140:3318, 114 in 134:2705, 49 in 118:2067, 10 in 113:1135, 1 in 84:3972. Removed 11 (all in 118:2067: pagination 118:2575–118:2585).
- In the 3,335 nodes present in both versions:
  - 0 name/text changes, 0 hidden-flag changes, 0 tag changes.
  - 3 parent changes (89:7461, 89:7488, 89:7489 moved into 134:2637 on Step 1).
  - 78 width deltas below 1e-6 px (About us fox 109:799 + children, 100:563, etc.): noise.
  - Real x/y/h changes only on the top-level frames (canvas moves) and inside the two blog frames (footer shift, hero x 135->134).
  - So no pre-existing text anywhere in the file was edited. This extends the misc slice's 14-node spot check to the whole file.
- Canvas: 33 visible top-level frames moved; hidden Homepage 1 (5:819) and Homepage 2 (35:838) did not move and now sit under About us / Blogs overview / Read Blog on the canvas. Pure canvas, ignored.
- Every added/removed subtree is explained by a slice, with the additions below (see "Missed").

## Verdicts on MAJOR findings (15): 12 confirmed, 3 partly, 0 refuted

### Terms (134:2705)
- terms-not-lawyer-text: CONFIRMED. The 10 H2 sections contain no entity, KBO, BTW, address, date or article numbers. The copy shares the voice of the About us copy, which is unchanged in v2: 109:774 "We zijn open over wie er in de vergelijking zit en wie niet." parallels 140:3224 "We zijn transparant over welke leveranciers deelnemen aan onze vergelijking.", and "no cure, no pay" appears in both 109:790 and 140:3213. Extra evidence: the Privacybeleid reference "(zie Artikel 7)" (140:3770) points exactly at that page's 7th H2, "Cookies". The draft therefore came from a numbered template whose numbers were stripped. Calling it "AI-drafted" is speculation, but the actionable fact holds: the text has no provenance and, under §15 #8, is placeholder.
- terms-service-model-mismatch: CONFIRMED. 140:3211 says "Wij treden op als tussenpersoon — het contract zelf sluit je af met de leverancier van jouw keuze."; 140:3217 lists 3 energy-only bullets; nothing covers partner callbacks or lead sharing. 104:716 "… Geen tussenpersonen. Geen verkoopgesprekken. …" is still present in v2. Not flagged by the slice: 140:3209 "Ze zijn uitsluitend van toepassing op particuliere gebruikers." (see Missed #1).
- terms-results-contradict-mvp: CONFIRMED. Quotes are verbatim: 140:3244 "… maar de weergegeven bedragen zijn indicatief. …", 140:3214 "… geen invloed op de volgorde of objectiviteit van de resultaten.", 140:3217 "Gepersonaliseerde vergelijking van energiecontracten.", 140:3247 "… beslissingen op basis van vergelijkingsresultaten …".
- terms-remuneration-claims: CONFIRMED. 140:3214 "Wij ontvangen een vergoeding van de leverancier wanneer jij effectief overstapt." and 140:3224 are verbatim. The brief says nothing about how VoordeelVinder earns money. The two designer texts also disagree with each other: About us 109:790 has "Wij verdienen alleen als jij effectief bespaart", while Terms has "wanneer jij effectief overstapt". One says saves, the other says switches.
- terms-no-legal-entity: CONFIRMED. The only identity anywhere is "VoordeelVinder.be" (140:3205, 140:3247, 140:3250) plus the copyright "© 2026 VoordeelVinder.be" (134:3119). The WER XII identification point is correctly hedged as a question for the lawyer.

### Privacy (140:3318)
- privacy-draft-not-legal-text: CONFIRMED. 140:3909 and 140:3915 have the bracketed "[privacy@voordeelvinder.be]"; 140:3770 has "(zie Artikel 7)"; 140:3898 and 140:3907 contradict each other; 140:3915 is "Ben je niet tevreden? Neem eerst contact met ons op via [privacy@voordeelvinder.be]. " (trailing space in Figma).
- privacy-controller-identity: CONFIRMED. 140:3766 says "VoordeelVinder.be is de verwerkingsverantwoordelijke …" and names no entity. There are 3 mailboxes: privacy@…be here, contact@…be (140:3205) and info@…com (140:3718).
- privacy-sharing-contradicts-partner-delivery: CONFIRMED. 140:3872 "Wij delen jouw gegevens alleen in de volgende gevallen:" introduces exactly 3 cases (140:3871, 140:3880, 140:3883). None of them is a partner or call centre, and no processor is named.
- privacy-purposes-and-legal-bases: PARTLY. Every quote is verbatim (140:3832, 140:3847), and the missing purposes and the "anonieme" analytics point both stand. But the sub-claim "Partner contact rests on 'overeenkomst' here" is not in the text. The page never mentions partner contact. Its contract basis covers only "om de vergelijkings- en overstapservice te leveren", and supplier sharing is stated as "uitsluitend met jouw uitdrukkelijke toestemming" (140:3871). The defect is that a basis is absent, not that the wrong one is given.
- privacy-data-categories-incomplete: CONFIRMED. 140:3770 is verbatim: there is no phone field, and "alleen als jij een offerte of opvolging aanvraagt" is at odds with the required contact step (§7.3 step 8). §9.2 carries meta.ip, meta.user_agent, tracking.*, outcome and outcome_reasons.
- privacy-retention-contradicts-brief: PARTLY. 140:3859 is verbatim. But "Contactgegevens: maximaal 24 maanden" matches the brief's 24-month working assumption (§11, §15 #11). The real conflicts are three: the 12-month limit for answers (same record as the contact details), the missing 30-day backup, and a 7-year accounting line for data that visitors don't generate. The Belgian 10-year point is outside Figma and correctly hedged.
- privacy-cookie-section-contradictions: CONFIRMED. 140:3898 and 140:3907 are verbatim. The code shows 5 paragraphs but only 4 bullets (ellipses at y 2307/2338/2402/2433), so "13 maanden." is a stray paragraph. There is no marketing category. Because "Artikel 7" = the 7th H2 "Cookies", the #cookies anchor is the unambiguous replacement.
- privacy-no-third-country-transfers: CONFIRMED. I read the full text: nothing about transfers outside the EU/EEA.
- privacy-complaint-gba-missing: CONFIRMED. 140:3915 stops after "eerst … via […]". The GBA appears only in the data-breach sentence (140:3912). 140:3909 says "Wij reageren binnen 30 dagen."
- privacy-automated-classification-undisclosed: PARTLY. The page is silent on classification, confirmed. But art. 13(2)(f) disclosure is mandatory only for art. 22 decisions, and a callback/no-callback decision is unlikely to count as "similarly significant" (lawyer's call). The practical fix is to describe qualification as a purpose under art. 13(1)(c), which duplicates privacy-purposes-and-legal-bases. Keep it as a question for the lawyer; the severity is overstated as a standalone major.

## Spot-checks of non-major items
- blog-footer-band-shortened: open question ANSWERED by XML. The 681-high bands exist only on pages whose CTA banner straddles the footer top: Solar 81:3582 (y4221 h378, band y4518, 81 px overlap), Battery 81:3830 and About us 100:590 (logo 182 px below band top). Pages without that banner have short bands: Homepage 3 is 538 (logo +39; its CTA 60:75 sits far above), the steps 554 (+55), and blog and legal 556 (+57). The blog frames carried the allowance without a banner, and the designer removed it. It is not drift. Build one Footer with ~56 px top padding plus a "banner overlap" modifier. This also means the designer shows no CTA banner above the blog-post footer (relevant to blog-no-conversion-cta).
- terms "header same as other frames": INACCURATE. 134:2707 and 140:3320 have shadow 0 10 31.8 rgba(0,0,0,0.25), which is the blog variant, not the α.13 used on Homepage 3 and the steps. Together with the hidden 8x8 "close 1" at (145,3457), which also sits in About us 109:762 and the blog frames 113:1694/118:2500, and the 556 footer, this shows the legal frames were duplicated from a blog frame.
- misc-step1-group76-is-existing-volgende: CONFIRMED by the diff (parent changes only). Small error: "Step 8 has only Terug" should read that Step 8 has Terug plus "Indienen" (91:11410, 91:13826). Step 1 already had a Terug group (89:7981) this morning.
- misc-copy-spotcheck-no-silent-edits: CONFIRMED and extended to the whole file (0 text changes in 3,335 common nodes).
- terms-link-a11y: 2.07:1 recomputed, CONFIRMED.

## Missed (not explained by any slice)
1. Terms scope vs business leads: 140:3209 "Ze zijn uitsluitend van toepassing op particuliere gebruikers." Meanwhile Step 2 (89:7495) shows 89:7975 "Dit is een zakelijk adres.", and the brief keeps business leads: §7.3 is_business with business bands; §8 makes only business_over_100k no_promo, so business leads under 100k are promo and get called. Every such lead ticks a consent checkbox for T&C that says they don't apply to them. This is a question for the lawyer, major.
2. The legal frames' header shadow is α.25 (blog variant), so 4 frames now use α.25 and all others α.13. Header chrome, "close 1" and footer show that the legal frames were cloned from a blog frame. The morning header-shadow token question stays open: build one token, not per-template shadows (§6.1 stationary header).
3. Footer-band cause (see spot-check above): the slice saw the change but left its cause open. It is resolved as a CTA-banner overlap allowance.
4. Whole-file result: no text changed in any pre-existing frame. Every morning copy finding stands as is.

## Cross-slice consistency issue (for the builder)
- The Terms slice proposes frontmatter `placeholder: true` plus a required `lastUpdated`; the Privacy slice proposes `draft: true` plus an optional `updated`. One LegalLayout needs one schema. Proposed: `placeholder: boolean` (true shows a staging notice and fails the production build) and `lastUpdated: date`, optional while placeholder is true and required once it is false (Zod refine). The "Laatst bijgewerkt" line renders only when it is set.
