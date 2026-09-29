# v2 slice: privacy — Figma frame 140:3318 "Privacybeleid"

File 8bhHL5kRbwYzYPbH6Vgdjn. NEW since the morning review: 140:3318 is absent from page1.xml and present in page1-v2.xml
(153 descendant nodes, all new; the only hidden layer is 140:3751 "close 1"). Frame is 1440x3721 at x=8683, next to the
also-new "Terms and Conditions" 134:2705, whose layout it copies (hero band + "Inhoudsopgave" card + article column at x=548).
No Cookiebeleid frame exists in v2 (no non-text node anywhere has "cookie" in its name; the only "Cookiebeleid" is the footer link text).

Sources: get_design_context 140:3318 (code saved as privacy-code.tsx, per-node text as privacy-texts.json),
screenshot shots-v2/privacy-full.png (+ privacy-part1..4.png crops).

## Section list (y ranges in frame)

| # | y | Section | Nodes |
|---|---|---|---|
| – | 0–85 | Header (lime strip 16px #c9e260, logo, nav, CTA) — same as other frames | 140:3319, 140:3320, 140:3325, 140:3519, 140:3321/3324 |
| 1 | 85–393 | Hero band #7051ed, 308px, H1 | 140:3752, 140:3753 |
| 2 | 466–975 | TOC card #f2f0ff 374x509 r14 at x135; header pill #7051ed 338x53 r12; 10 items with 9x11 triangle icons | 140:3754, 140:3755, 140:3805, 140:3767, 140:3806–3815 |
| 3 | 462–646 | H2 "Wie verwerkt jouw gegevens?" + 24px intro | 140:3756, 140:3781, 140:3766 |
| 4 | 690–951 | H2 "Welke gegevens verzamelen we?" + lead-in + 5 bullets | 140:3757, 140:3782, 140:3768, 140:3770 |
| 5 | 995–1259 | H2 "Waarvoor gebruiken we jouw gegevens?" + lead-in + 5 bullets | 140:3759, 140:3784, 140:3773, 140:3832 |
| 6 | 1305–1538 | H2 "Rechtsgrond voor de verwerking" + lead-in + 4 bullets | 140:3843, 140:3846, 140:3845, 140:3847 |
| 7 | 1584–1786 | H2 "Hoe lang bewaren we jouw gegevens?" + lead-in + 3 bullets | 140:3858, 140:3861, 140:3860, 140:3859 |
| 8 | 1834–2104 | H2 "Delen we jouw gegevens met derden?" + lead-in + 3 bullets | 140:3870, 140:3873, 140:3872, 140:3871, 140:3880, 140:3883 |
| 9 | 2152–2449 | H2 "Cookies" + paragraph + 2 bullet groups (4 bullets) | 140:3886, 140:3891, 140:3890, 140:3898, 140:3907 |
| 10 | 2495–2648 | H2 "Jouw rechten" + paragraph | 140:3908, 140:3910, 140:3909 |
| 11 | 2694–2847 | H2 "Beveiliging" + paragraph | 140:3911, 140:3913, 140:3912 |
| 12 | 2893–2992 | H2 "Klachten" + one sentence (then ~100px empty space before footer) | 140:3914, 140:3916, 140:3915 |
| – | 3094–3721 | Footer (same as other frames) + copyright bar | 140:3520 … 140:3732 |

Styles (from code): H1 Bricolage Grotesque SemiBold 60/62 white. H2 SemiBold 34/52 #151d30, with a 364x2 #6c5ce7 rule below
(140:3781 etc., ~4px under the H2 box). Section-1 intro Regular 24/40 #3a3c75 with the email in #6c5ce7. Body Regular 16 #3a3c75,
lead-ins leading 27; bullet items leading 31 (single-line) or 27 (wrapping). Bullet labels SemiBold #03080f — EXCEPT
"Verbruiksgegevens:" which is Medium (140:3770, first span). Bullets = 16px ring + 6px dot (e.g. 140:3791 + 140:3798), x=548.
TOC header "Inhoudsopgave" SemiBold 20/52 white; TOC items Regular 16/40 #3a3c75. Footer bg #7051ed.

## Verbatim copy (quoted exactly; " / " = hard paragraph/line break inside the Figma text node)

Header
- 140:3519 nav: "Hoe het werkt         Veelgestelde vragen         Over ons         Blogs"
- 140:3324 CTA: "Gratis beginnen"

Hero
- 140:3753 H1: "Privacybeleid"

TOC
- 140:3805: "Inhoudsopgave"
- 140:3767: "Wie verwerkt jouw gegevens?" / "Welke gegevens verzamelen we?" / "Waarvoor gebruiken we jouw gegevens?" / "Rechtsgrond voor de verwerking" / "Hoe lang bewaren we jouw gegevens?" / "Delen we jouw gegevens met derden?" / "Cookies" / "Jouw rechten" / "Beveiliging" / "Klachten"
  (the TOC items equal the 10 H2s exactly; headings are not numbered)

1. 140:3756 H2 "Wie verwerkt jouw gegevens?"
- 140:3766: "VoordeelVinder.be is de verwerkingsverantwoordelijke voor de persoonsgegevens die via dit platform worden verzameld. Wij zijn bereikbaar via privacy@voordeelvinder.be"
  ("privacy@voordeelvinder.be" styled as link #6c5ce7; no full stop at the end)

2. 140:3757 H2 "Welke gegevens verzamelen we?"
- 140:3768: "Wij verzamelen alleen wat nodig is om onze dienst aan te bieden:"
- 140:3770 bullets (label bold + text):
  - "Verbruiksgegevens: geschat of exact jaarverbruik elektriciteit en/of aardgas."
  - "Woonsituatie: type woning en postcode of gemeente."
  - "Contactgegevens: voornaam, naam en e-mailadres — alleen als jij een offerte of opvolging aanvraagt."
  - "Technische gegevens: IP-adres en browserinfo, automatisch verzameld bij elk bezoek."
  - "Gebruiksgegevens: bezochte pagina's en klikgedrag, via cookies (zie Artikel 7)."

3. 140:3759 H2 "Waarvoor gebruiken we jouw gegevens?"
- 140:3773: "Jouw gegevens worden uitsluitend gebruikt voor:"
- 140:3832 bullets:
  - "Het uitvoeren van een gepersonaliseerde energievergelijking."
  - "Het begeleiden van je overstapproces, indien jij daarvoor kiest."
  - "Het verbeteren van ons platform op basis van geanonimiseerde gebruiksdata."
  - "Het informeren over wijzigingen aan onze dienst, indien je hiervoor toestemming gaf."
  - "Het voldoen aan wettelijke verplichtingen."

4. 140:3843 H2 "Rechtsgrond voor de verwerking"
- 140:3845: "Wij verwerken jouw gegevens op basis van:"
- 140:3847 bullets:
  - "Uitvoering van een overeenkomst: om de vergelijkings- en overstapservice te leveren."
  - "Gerechtvaardigd belang: anonieme platformanalyse ter verbetering van onze dienst."
  - "Toestemming: voor communicatie en nieuwsbrieven. Intrekbaar op elk moment."
  - "Wettelijke verplichting: indien de wet ons verplicht gegevens bij te houden."

5. 140:3858 H2 "Hoe lang bewaren we jouw gegevens?"
- 140:3860: "Wij bewaren jouw gegevens niet langer dan nodig:"
- 140:3859 bullets:
  - "Vergelijkingsgegevens: maximaal 12 maanden na je laatste interactie."
  - "Contactgegevens: maximaal 24 maanden, of eerder indien je dit vraagt."
  - "Boekhoudkundige data: 7 jaar conform de wettelijke bewaarplicht."

6. 140:3870 H2 "Delen we jouw gegevens met derden?"
- 140:3872: "Wij delen jouw gegevens alleen in de volgende gevallen:"
- 140:3871: "Met de leverancier van jouw keuze, wanneer jij beslist over te stappen — en uitsluitend met jouw" / "uitdrukkelijke toestemming."
- 140:3880: "Met technische verwerkers (bv. hostingprovider) die gebonden zijn aan strikte" / "verwerkersovereenkomsten."
- 140:3883: "Met overheidsinstanties, wanneer wij daar wettelijk toe verplicht zijn."

7. 140:3886 H2 "Cookies"
- 140:3890: "VoordeelVinder.be gebruikt cookies om het platform te laten werken en te verbeteren. Bij je eerste bezoek vragen we jouw toestemming voor niet-essentiële cookies."
- 140:3898 bullets:
  - "Essentiële cookies: nodig voor het functioneren van het platform. Geen toestemming vereist."
  - "Analytische cookies: anonieme meting van bezoekersgedrag. Toestemming vereist. Bewaring: max" / "13 maanden."   (hard break after "max"; "13 maanden." is its own paragraph)
- 140:3907 bullets:
  - "Functionele cookies: opslaan van jouw voorkeuren. Toestemming vereist. Bewaring: max. 12 maanden."
  - "Analytische cookies: momenteel niet actief op VoordeelVinder.be."

8. 140:3908 H2 "Jouw rechten"
- 140:3909: "Op grond van de AVG/GDPR heb jij het recht op inzage, rectificatie, wissing, beperking van de verwerking," / "overdraagbaarheid en bezwaar. Je kunt deze rechten uitoefenen via [privacy@voordeelvinder.be]. Wij" / "reageren binnen 30 dagen."
  (email in square brackets, plain body colour, not a link)

9. 140:3911 H2 "Beveiliging"
- 140:3912: "Wij nemen passende maatregelen om jouw gegevens te beschermen, waaronder versleutelde" / "verbindingen (HTTPS), beperkte toegangsrechten en verwerkersovereenkomsten met alle externe partijen. Bij een ernstig datalek informeren wij de Gegevensbeschermingsautoriteit en — indien vereist — jou."

10. 140:3914 H2 "Klachten"
- 140:3915: "Ben je niet tevreden? Neem eerst contact met ons op via [privacy@voordeelvinder.be]. "  (trailing space in Figma; nothing follows "eerst")

Footer (identical to other frames; known from the morning review)
- 140:3717: "De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden."
- 140:3726 placeholder: "Voer uw e-mailadres in" · 140:3731 button: "Abonneren"
- 140:3720 "Snelle links" · 140:3715 "Hoe het werkt" / "Veelgestelde vragen" / "Over ons"
- 140:3721 "Juridisch" · 140:3716 "Privacybeleid" / "Cookiebeleid" / "Algemene voorwaarden"
- 140:3722 "Contact" · 140:3718 "E-mail: info@voordeelvinder.com" / "Telefoon: 335 224 654"
- 140:3732: "© 2026 VoordeelVinder.be" (SemiBold) + " — Alle rechten voorbehouden."

Cross-page emails: privacy page uses "privacy@voordeelvinder.be" (140:3766, 140:3909, 140:3915); Terms 140:3205 uses
"contact@voordeelvinder.be"; footer 140:3718 uses "info@voordeelvinder.com".

Not present anywhere on the page: company legal name/legal form, address, KBO/BCE number, DPO, "laatst bijgewerkt" date,
phone number as a collected field, partners/telesales/call centre, n8n, Mailchimp, Google (GA4/GTM/Sheets), Meta (Pixel/CAPI),
Microsoft Clarity, CookieConfirm, Cloudflare Turnstile, transfers outside the EU/EER, automated classification/profiling,
whether providing data is required, the GBA/APD complaint route, solar panels or home battery, a link to /cookiebeleid or to
cookie settings.

## Real vs placeholder

Designer draft of generic template-style legal text, not the client's lawyer text. Evidence: bracketed "[privacy@voordeelvinder.be]"
(placeholder convention) in 140:3909/140:3915 vs an unbracketed link in 140:3766; "(zie Artikel 7)" while no heading is numbered;
self-contradiction on analytics cookies (140:3898 vs 140:3907); energy-comparison/switching-service wording that does not match the
MVP (no on-screen comparison, callback via partner); no controller identity; no date/version; the Klachten sentence ends at "eerst".
Brief §5/§15 #8: legal pages carry placeholder text until the client's lawyer provides it; §17: never invent legal text.

## GDPR art. 13 checklist

| Art. 13 item | In design? | Node | Note |
|---|---|---|---|
| 1(a) controller identity + contact | Partly | 140:3766 | Brand/domain "VoordeelVinder.be" only; email given. No legal entity, address, KBO number |
| 1(b) DPO contact | No | – | Only if a DPO is appointed (lawyer) |
| 1(c) purposes + legal basis | Partly, inaccurate | 140:3832, 140:3847 | See findings: missing partner delivery, qualification, newsletter/Mailchimp, ads measurement, anti-spam; "anonieme" analytics under legitimate interest vs consent-gated GA4/Clarity/Meta |
| 1(d) legitimate interests | Partly | 140:3847 | Only "anonieme platformanalyse" |
| 1(e) recipients/categories | Partly, contradicts brief | 140:3871/3880/3883 | "alleen" 3 cases; no telesales partner (Adversus), n8n, Sheets, Mailchimp, Meta, Google, Microsoft, CookieConfirm, Cloudflare |
| 1(f) transfers outside EU | No | – | Meta, Google, Microsoft, Intuit Mailchimp, Cloudflare |
| 2(a) retention | Yes, contradicts brief | 140:3859, 140:3898/3907 | 12 m / 24 m / 7 y vs brief 30 d backup + 24 m TO CONFIRM |
| 2(b) rights | Yes | 140:3909 | Six rights listed; "30 dagen" vs GDPR "one month" |
| 2(c) withdraw consent | Partly | 140:3847 | "Intrekbaar op elk moment." — no how (unsubscribe, cookie settings) |
| 2(d) complaint to supervisory authority (GBA/APD) | No | 140:3915 | Sentence stops at "Neem eerst contact met ons op" |
| 2(e) required or not + consequences | No | – | Contact + consent required to submit; newsletter optional |
| 2(f) automated decisions / profiling | No | – | promo/no_promo/pending classification is automated (§8), outcome also sent to Meta as QualifiedLead (§9.3) |

## Brief data flows vs design statements

- Collected (brief §7.3–7.5, §9.2): energy_type, is_business + business bands, postcode (+ derived region/province), supplier,
  meter_type, digital_meter, has_solar, social_tariff, budget_meter, knows_consumption, kWh, household size, housing type, heat pump,
  EV; solar: ownership, roof type/orientation, battery_interest; battery: has_solar, solar_size; contact first_name, last_name,
  phone (E.164 + display), email; call day + slot; consent flags (terms, newsletter, cookies analytics/marketing); tracking fbc,
  fbp, fbclid, gclid, gbraid, wbraid, msclkid, ttclid, utm_*, ga_client_id, ga_session_id, landing_page, referrer, entry_path;
  meta page, user_agent, ip, site_env; outcome + outcome_reasons; lead_id/event_id.
  Design lists only yearly consumption, housing type + postcode/"gemeente", first name/"naam"/email, IP/browser info, pages/clicks.
- Flows (brief §9, §10): server backup JSONL 30 days → n8n → lead sheet → Mailchimp (subscriber, tags, confirmation journey) →
  promo leads to telesales partner (energy: salesUp Adversus, TO CONFIRM) → Meta CAPI Lead/QualifiedLead (marketing consent only);
  browser: CookieConfirm, GTM, GA4, Meta Pixel, Clarity (after consent), Turnstile on submit.
  Design: "alleen" supplier-of-choice with explicit consent, technical processors, authorities.
- Retention (brief §9.1 step 10, §11, §15 #11): backups 30 days; n8n/sheet 24 months TO CONFIRM.
  Design: 12 months comparison data, 24 months contact data, 7 years accounting data; analytics cookies max 13 months;
  functional cookies max. 12 months.
- Cookies (brief §10): GA4 + Meta Pixel + Clarity via GTM, all after consent, Consent Mode v2 default denied; consent categories
  analytics + marketing. Design: essential / analytical (consent, 13 m) / functional (consent, 12 m) / analytical "momenteel niet
  actief"; no marketing category.

## Language
- No u-forms in the page body (je/jij/jouw throughout). Only u-form on the frame is the shared footer placeholder
  "Voer uw e-mailadres in" (140:3726), already in the morning review.
- English: only "GDPR" in "AVG/GDPR" (acceptable next to AVG).
- Inconsistencies: "Bewaring: max" (140:3898) vs "Bewaring: max. 12 maanden" (140:3907); forced break before "13 maanden.";
  "(zie Artikel 7)" but headings are not numbered; "naam" (140:3770) vs form label "Achternaam"; email as link in 140:3766 vs
  bracketed plain text in 140:3909/140:3915; missing final full stop after the email in 140:3766; "Verbruiksgegevens:" Medium
  weight vs SemiBold for every other bullet label.
