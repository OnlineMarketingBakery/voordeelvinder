# Phase 0 verification notes (adversarial verifier)

Scope: re-check every blocker/major finding from the 7 Figma slices, spot-check minors, dedupe, find coverage gaps, and critique the Ploi and stack research. Read-only. No writes to the project folder.

## Method / evidence sources
- page1.xml parsed with `figma/verify/q.py` (truncated after `</canvas>`; the file ends with a tool note). Commands: `id`, `grep`, `kids`, `texts`.
- Figma MCP calls made by me:
  - get_screenshot 63:860 (hero raster) -> shots/verify_hero_63-860.png. Shows "€ 52 /maand" and "✓ BESTE DEAL" drawn into the image; the fox winks and gives a thumbs-up.
  - get_screenshot 91:14643 (thank-you mascot) -> shots/verify_thankyou_91-14643.png. Raster thumbs-up fox in a purple circle.
  - get_screenshot 89:7439 (form panel mascot). Laptop fox with lightning and flame bubbles (also visible in the Step 8 context render).
  - get_metadata 72:2734 'Group 21'. 92 child vectors (72:2735..72:2826). The first vector, 72:2735, has the full group bbox (319x347), which fits a single silhouette/outline path under the fills.
  - get_design_context 91:10958 (Step 8, full frame). Values seen: placeholders #aea9c6 on field #f6f4ff (border #ded9f4); checkbox 91:11443 #f6f4ff + 1px #ded9f4; panel body 91:11400 rgba(255,255,255,0.65) on #7051ed; title 34px/27px text-black; newsletter placeholder rgba(3,8,15,0.34); consent 91:11444 "Ik ga akkoord met de algemene voorwaarden van voordeelvinder.be"; button "Indienen"; BE flag 113:1919 + "+32" + chevron 91:11438; no call-moment UI and no newsletter checkbox; question card fixed 767x567 at y318, divider y730, buttons y783.
  - get_design_context 90:9468 ('Ne' x-circle icon, Step 5). SVG fill #93B52A, on a white 40px tile, which gives 2.36:1.
  - get_screenshot 90:8972 (Step 5) and 91:12392 (7B-2). Only unselected radios; "Ne" labels; 7B-2 has no divider, and its footer includes "Adres: Nederland".
  - get_screenshot 113:991 and 113:1018 (About-us team photos). Mean absolute pixel difference is 0.03/255, so this is the same photo under two names.
  - get_screenshot 60:401 (icon tile holding 'money 1 [Vectorized]'). A document with a "$" coin. (The 60:403 icon on its own renders white-on-white.)
  - get_motion_context recursive on 91:13857 (Thank you) and 69:931 (Solar): both return {"nodes":[]}.
- Contrast recomputed (WCAG 2.x relative luminance): #aea9c6/#f6f4ff 2.08; rgba(3,8,15,.34)/#fff 2.30; white65/#7051ed 3.10; #c4bce7/#f6f4ff 1.65 (1.80 vs white fill); #ded9f4/#fff 1.37; #f6f4ff/#fff 1.09; #93b52a/#fff 2.36; white90/#7051ed 4.50 (on the threshold), white92 4.61, white95 4.79; white/#7051ed 5.14; #6c5ce7/#fff 4.86.
- npm/gh checks: astro latest 7.3.5 (2026-09-24); 7.0.0 released 2026-06-22; newest 6.x is 6.4.8 (2026-06-17), newest 5.x is 5.18.2 (2026-05-26); astro engines >=22.12.0. GHSA-26w7-cxv4-gfx2 is critical, published 2026-08-27, range astro <7.2.8, patched only in 7.2.8 (no 6.x or 5.x fix). eslint-plugin-astro engines ^22.22.3 || ^24.16.0 || >=26.3.0 with peer eslint >=10. eslint-plugin-jsx-a11y peer eslint ≤^9. @astrojs/check peer TS ^5||^6; TS latest 7.0.2. GitHub OnlineMarketingBakery is type User; the repo is public and holds README.md only.
- Saved docs: v6.mdx line 1310ff ("import.meta.env values are always inlined"); cli-v22.x.md (--env-file no longer experimental in v22.21.0); v7.mdx (compressHTML default 'jsx'); env.mdx ("Astro evaluates configuration files before it loads your other files", so .env is not loaded into astro.config; use vite loadEnv); @astrojs/node 11.1.6 dist/index.js (fsLite sessions unless `session === false`).

## Copy-correction census (visible frames only)
- "Ne" x5: 90:9436, 90:9457 (Step 5), 90:10446 (Step 6), 91:12879, 91:12880 (7B-2)
- "oordeligst" 60:321 · "e ziet meteen" 60:368 · "Geen erplichtingen" 60:80 · "Voor Vinder versus anderen" 60:424 · "Trusted by over 300+ customers." 60:328
- "Neem gerust contact op met ons op." 60:110, 69:1043, 80:2936 · "Heb nog steeds een vraag?" 60:495, 69:1436, 80:3209 · "Faqs" 60:39, 69:972, 80:2897
- u-forms: 27 visible. There are 19 footers with "Voer uw e-mailadres in" (every visible frame), plus 89:7945 "Wat is uw postcode?", 89:7946 "Voer uw postcode in", 89:8435 "Wie is uw huidige energieleverancier?", 89:8436 "Selecteer uw huidige leverancier", 91:11431/91:13843 "Vul hier uw voornaam in", and 91:11433/91:13846 "Vul hier uw achternaam in". No other u-forms.
- "Adres: Nederland" appears on only one visible frame (91:12795, 7B-2). "335 224 654" and info@voordeelvinder.com appear on all 19 visible frames. "+31" appears only on 91:13844 (stale Step 8 copy).
- "€[X]": the 5 testimonial quotes (60:755, 60:772, 60:789, 60:806, 60:823) and 69:980.

## Verdicts on blocker/major findings (31)
See the structured output. Summary: 24 confirmed, 7 partly, 0 refuted.
- partly: tokens-contrast-control-boundaries (the 1.4.11 fail is arguable and axe does not test it), assets-mascot-not-layered (the slice's own inventory has 9 poses and 8 rasters, not 9 of 10), assets-licence-provenance (layer-name inference only; the team-photo duplicate is verified), home-callback-permission-gap (the §7.5 consent does carry contact permission but is required), home-product-cta-targets (§5 and §6.1 do give a default), home-newsletter-no-consent (facts right, but the brief already decides email + consent, so severity is overstated), form-a-contrast-wcag (duplicate, same 1.4.11 nuance).

## Minor spot-checks (all quotes verified against layer text)
form-a-step1-zonnepaneel-label, form-a-step4-title-and-labels, form-a-step6-heading-structure, form-b-7b1-question-copy (trailing space, 'Stap 3 van 8', bar 608/693), form-b-7b2-question-copy, form-b-submit-label, form-b-consent-text, form-b-7a-fields-hint, products-battery-daily-vs-annual-consumption, other-blog-date-format, other-aboutus-copy-bugs, assets-dollar-icon (visual). home-extra-typos is partly right: layer 60:368 shows a single space before "wij", so the double-space claim is unconfirmed; the other typos are confirmed.

## Coverage gaps checked by me
1. §6.1 no animation beyond 60:2 and 84:3972: 91:13857 and 69:931 also return no motion.
2. §6.1 header kept still between pages: header layers have identical geometry on all 9 frame types (XML compare). Only the blog header shadow differs (tokens slice).
3. §6.1 product card to form card morph: product pages have no card. Their hero is a full-bleed 1440x615 panel (75:2832/80:2876) with a CTA pill. The homepage product blocks are 1168-wide panels. So the morph source has to be the CTA pill or the panel.
4. §6.1 form card to thank-you card: both are 767 wide. The thank-you card 91:14644 is 767x636 at x336; the form card is 767x567 at x529. The thank-you mascot 91:14643 sits inside the top of the card.
5. §6.1 counters "only for approved numbers": there are no approved figures in the design ('300+', '30000+' only on hidden HP1, '€[X]').
6. §7.6 PromoCheckers yellow-on-white: the 'Ne' icon is #93B52A on white (2.36:1) in Steps 5, 6 and 7B-2. This contradicts the tokens slice.
7. §2/§0 scope: the footer tagline "De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden." is on all 19 visible frames, including Solar and Battery, so the site-wide copy is energy-only.
8. The thank-you page has a hidden 'check-circle 1' (91:14337, 124x124). It may be meant as the check-mark asset.
9. §7.5 phone error example "0475 12 34 56" sits next to a fixed "+32" chip with placeholder "478 12 34 56", so the example uses a different format from the field.

## Research critique (see structured output)
Key items:
- Astro 6 is "still patched" in policy, but there has been no 6.x release since 2026-06-17 and the critical RCE has no 6.x fix.
- The owner is a GitHub User, not an org, so Ploi's org-grant step does not apply.
- `site: process.env.PUBLIC_SITE_URL` in the stack sketch would be undefined on Ploi builds.
- `astro:env/server` cannot be imported by cron scripts that run outside Astro.
- Type stripping vs tsx for the cron scripts is unresolved between the two reports.
- The engines constraint of the eslint devDependency is overstated as a server requirement.
- The `SITE_ENV: test` value is not in the brief.
- Relative vs absolute start-command paths differ between the two reports.
- Several Ploi facts rest on community/roadmap posts, not official docs.
