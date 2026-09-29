# v2 slice "terms" — Figma 134:2705 "Terms and Conditions" (1440x3467)

File 8bhHL5kRbwYzYPbH6Vgdjn, frame at canvas x=6752, y=0. Brand-new frame: 0 of its 114 nodes existed in the
morning metadata (figma-diff-nodes.json, key a). Header and footer nodes are 134:*, while hero and body nodes are 140:*
(the content was added after the chrome was copied in). A sibling frame, 140:3318 "Privacybeleid" (1440x3721), is also
new and uses the same template (same H1, TOC and prose coordinates). It is reviewed in another slice.
Sources: get_design_context 134:2705 (full, not sparse), get_screenshot 134:2705 at 1440x3467
-> figma/shots-v2/terms-134-2705.png (+ terms-crop0..3.png).

## Section list (by y)

| # | y range | Section | Nodes | Block type |
|---|---|---|---|---|
| 1 | 0–85 | Lime strip + site header (logo, nav, CTA) | 134:2706, 134:2707, 134:2708–134:2711, 134:2712–134:2905, 134:2906 | shared layout (site.json) |
| 2 | 85–393 | Legal hero: purple band #7051ed 1440x308 (grain visible in render), H1 only | 140:3200, 140:3201 | NEW `legalHero` (or a layout prop) |
| 3 | 462–975 | TOC card, left column (x 135–509) | 140:3202 (card), 140:3258 (header bar), 140:3259 (label), 140:3268 (items), 140:3271–140:3280 (10 triangle markers) | NEW `toc`, generated from H2s |
| 4 | 462–2693 | Prose column (x 548–1256, 708 wide): 10 H2 sections | 140:3204–140:3257 | NEW `prose` (Markdown body) |
| 5 | 2840–3396 | Footer (newsletter, Snelle links, Juridisch, Contact) | 134:2907, 134:2909–134:3136 | shared layout (site.json) |
| 6 | 3397–3467 | Copyright bar | 134:2908, 134:3119; hidden 134:3138 "close 1" 8x8 | shared layout |

The prose ends at y≈2693 and the footer starts at 2840 (about 147 px bottom padding). The hero ends at 393 and the
content starts at 462 (69 px top padding).

## Verbatim copy (exact Figma text; line breaks only where Figma has hard breaks)

### Header (134:*)
- Nav 134:2906: "Hoe het werkt         Veelgestelde vragen         Over ons         Blogs" (spaced with runs of spaces, whitespace-pre-wrap)
- CTA 134:2711: "Gratis beginnen"

### Hero
- H1 140:3201: "Algemene Voorwaarden"

### TOC card
- Label 140:3259: "Inhoudsopgave"
- Items 140:3268 (one text node, 10 lines):
  "Wie zijn wij" / "Toepassingsgebied" / "Onze dienstverlening" / "Gratis gebruik en no cure, no pay" /
  "Gebruik van het platform" / "Nauwkeurigheid van de resultaten" / "Aansprakelijkheid" / "Intellectuele eigendom" /
  "Wijzigingen aan de voorwaarden" / "Toepasselijk recht"
  (The 10 TOC items match the 10 H2s exactly, in the same order.)

### Prose
1. H2 140:3204 "Wie zijn wij"
   - 140:3205 (24px lead style, 3 hard-broken lines; note the DOUBLE space after "vergelijken."):
     "VoordeelVinder.be is een onafhankelijk online platform waarop" /
     "consumenten energiecontracten kunnen vergelijken.  Je kunt ons" /
     "bereiken via " + [link colour #6c5ce7] "contact@voordeelvinder.be"
2. H2 140:3207 "Toepassingsgebied"
   - 140:3209: "Deze voorwaarden zijn van toepassing op elk gebruik van VoordeelVinder.be. Door het platform te" /
     "gebruiken, aanvaard je deze voorwaarden volledig. Ze zijn uitsluitend van toepassing op particuliere gebruikers."
3. H2 140:3210 "Onze dienstverlening"
   - 140:3211: "VoordeelVinder.be laat je toe energiecontracten van deelnemende leveranciers te vergelijken op basis van jouw verbruik en woonsituatie. Wij treden op als tussenpersoon — het contract zelf sluit je af met de leverancier van jouw keuze."
   - H3-style 140:3216 (24px Medium #6c5ce7): "Onze dienst omvat:"
   - Bullets 140:3217 (3):
     - "Gepersonaliseerde vergelijking van energiecontracten."
     - "Ondersteuning bij het overstapproces, indien gewenst."
     - "Informatieve content over energie en tarieven."
4. H2 140:3213 "Gratis gebruik en no cure, no pay"
   - 140:3214: "Vergelijken op VoordeelVinder.be is volledig gratis. Wij ontvangen een vergoeding van de leverancier wanneer jij effectief overstapt. Die vergoeding heeft geen invloed op de volgorde of objectiviteit van de resultaten."
   - 140:3224: "We zijn transparant over welke leveranciers deelnemen aan onze vergelijking."
5. H2 140:3225 "Gebruik van het platform"
   - 140:3226: "Je verbindt je ertoe het platform te gebruiken conform deze voorwaarden en de geldende wetgeving. Het is niet toegestaan:"
   - Bullets 140:3234 (4):
     - "Valse of misleidende informatie in te voeren."
     - "Het platform te gebruiken voor commerciële doeleinden zonder toestemming."
     - "Het platform te hacken, manipuleren of verstoren."
     - "Geautomatiseerde tools te gebruiken om data te verzamelen."
6. H2 140:3243 "Nauwkeurigheid van de resultaten"
   - 140:3244: "De vergelijkingsresultaten zijn gebaseerd op de gegevens die jij invoert en de tariefinformatie van de leveranciers. Wij streven naar maximale nauwkeurigheid, maar de weergegeven bedragen zijn indicatief. Verifieer de exacte voorwaarden altijd bij de leverancier zelf."
7. H2 140:3246 "Aansprakelijkheid"
   - 140:3247: "VoordeelVinder.be is niet aansprakelijk voor schade die voortvloeit uit het gebruik van het platform, beslissingen op basis van vergelijkingsresultaten, technische storingen of onjuiste tariefinformatie aangeleverd door derden. Dit geldt niet in geval van opzet of grove nalatigheid van onze kant."
8. H2 140:3249 "Intellectuele eigendom"
   - 140:3250: "Alle rechten op het platform, de inhoud, het ontwerp en de merkidentiteit van VoordeelVinder.be behoren toe aan VoordeelVinder.be of haar licentiegevers. Niets mag worden gekopieerd of gebruikt zonder voorafgaande schriftelijke toestemming."
9. H2 140:3252 "Wijzigingen aan de voorwaarden"
   - 140:3253: "Wij behouden het recht deze voorwaarden te wijzigen. Wijzigingen zijn van kracht na publicatie op het platform. Bij wezenlijke wijzigingen informeren wij je via het platform of per e-mail."
10. H2 140:3255 "Toepasselijk recht"
   - 140:3256: "Deze voorwaarden worden beheerst door het Belgische recht. Bij geschillen zijn de Belgische rechtbanken bevoegd. Consumenten kunnen ook terecht bij de Consumentenombudsdienst" /
     "(www.consumentenombudsdienst.be)."  (plain text, not styled as a link)

### Footer (134:*, same as the other frames)
- 134:3104 "De eenvoudige energievergelijker voor Belgische gezinnen en alleenstaanden."
- 134:3113 placeholder "Voer uw e-mailadres in" · 134:3118 button "Abonneren"
- 134:3107 "Snelle links" -> 134:3102 "Hoe het werkt" / "Veelgestelde vragen" / "Over ons"
- 134:3108 "Juridisch" -> 134:3103 "Privacybeleid" / "Cookiebeleid" / "Algemene voorwaarden"
- 134:3109 "Contact" -> 134:3105 "E-mail: info@voordeelvinder.com" / "Telefoon: 335 224 654" (no "Adres: Nederland" line)
- 134:3119 "© 2026 VoordeelVinder.be" (SemiBold) + " — Alle rechten voorbehouden."
- Hidden: 134:3138 "close 1" 8x8 at 145,3457 (leftover, ignore)

## Content analysis

### Is it real legal text?
Not lorem ipsum. It is fluent, plausible Dutch in the site's "je" voice, but it reads as a generic template drafted by
the designer or an AI, not by a lawyer:
- It identifies no legal entity: no company name or legal form, no KBO/ondernemingsnummer, no BTW number, no registered
  address. "VoordeelVinder.be" (a domain name) is used as the contracting party, the liable party and the IP owner.
- No article numbering, no version and no "laatst bijgewerkt" date.
- Short, one-paragraph generic clauses (use, liability, IP, changes, governing law), the sort any template has.
- It describes a different business from the brief (see below), matching the About us copy flagged this morning
  ("Wij verdienen alleen als jij effectief bespaart — no cure, no pay.", 109:790). The same voice wrote both.
- Cross-slice hint: the sibling Privacybeleid frame refers to "(zie Artikel 7)" (140:3770) although neither page has article
  numbers, and it uses bracketed placeholders "[privacy@voordeelvinder.be]" (140:3909, 140:3915). Both point to template origin.
- Nobody is credited as the author. Per brief §5/§15 #8/§17 it must be treated as placeholder text, not legal text.

### Coverage checklist
| Topic | Present? | Where / note |
|---|---|---|
| Company identity (entity, KBO/BTW, address) | NO | only "VoordeelVinder.be" + contact@voordeelvinder.be (140:3205) |
| Contact | yes | contact@voordeelvinder.be (.be). The footer on the same frame says info@voordeelvinder.com. Privacy frame: privacy@voordeelvinder.be |
| Scope / acceptance | yes | 140:3209 browse-wrap ("Door het platform te gebruiken, aanvaard je …"), consumers only |
| Service description | yes, but wrong model | 140:3211/140:3217: energy only, "tussenpersoon", contract with the supplier, "Ondersteuning bij het overstapproces" |
| Partners calling the visitor / lead sharing | NO | nothing about a partner or call center contacting you, or about passing on contact details |
| Solar panels / home battery | NO | energy only |
| Remuneration | yes, unverified | 140:3214 supplier fee on switch, "no cure, no pay" |
| Results / ranking | yes, contradicts MVP | 140:3214 "volgorde of objectiviteit van de resultaten"; 140:3244 "weergegeven bedragen zijn indicatief" |
| Acceptable use | yes | 140:3226 + 140:3234 |
| Liability | yes | 140:3247 exclusion, carve-out for opzet/grove nalatigheid |
| IP | yes | 140:3250 |
| Changes | yes | 140:3253 (promises email notification of material changes) |
| Governing law / forum | yes | 140:3256 Belgian law, Belgian courts, Consumentenombudsdienst |
| Reference to privacybeleid / cookiebeleid | NO | no link to either |
| Newsletter terms | NO | – |
| Last-updated date / version | NO | – |

### Tone / language
- "u" forms in the body: none (je/jij/jouw throughout). The only "u" form on the frame is the known footer placeholder "Voer uw e-mailadres in".
- English: "no cure, no pay" (H2 + TOC). Anglicisms: "content", "tools", "data", "hacken" (common in Flemish usage; info only).
- Typos / idiom:
  - 140:3205 double space "vergelijken.  Je kunt ons".
  - 140:3253 "Wij behouden het recht deze voorwaarden te wijzigen": the standard idiom is "Wij behouden ons het recht voor …".
  - "Wij" and "We" are mixed ("We zijn transparant", 140:3224, against "Wij …" elsewhere).
  - H1 "Algemene Voorwaarden" is in Title Case, while the footer link and the consent line use "Algemene voorwaarden" / "algemene voorwaarden".
  - The list items after "Het is niet toegestaan:" start with a capital and end with a full stop ("Valse of misleidende …").
    This is a style choice, not an error.

## Layout / tokens (from get_design_context)
- Container 135–1305 (1170 wide, same as the footer divider). TOC column 374 wide; 39 px gap; prose column 708–718 wide.
- Hero: bg #7051ed (grain in the render), h 308; H1 Bricolage SemiBold 60 / lh 62 / tracking −1.8, white, left at x 134, top 252 (bottom-aligned in the band). No eyebrow, subtitle, breadcrumb or date.
- TOC card: bg #f2f0ff, radius 14, 374x509; header bar #7051ed radius 12, 338x53, inset 18/14; label "Inhoudsopgave" SemiBold 20 white;
  items Regular 16 / lh 40 #3a3c75 at x 187; 9x11 purple triangle markers at x 170. No active, hover or current state. It is not
  visibly sticky (the card ends at y 975 while the prose runs to 2693).
- H2: SemiBold 34 / lh 52 / tracking −1.02, #151d30; accent rule 364x2 #6c5ce7 4 px below the line box (fixed width, even when the
  heading is wider or narrower); body starts 30 px under the rule. Gap from end of section to next H2 about 44–50 px.
- Lead paragraph (first section only, 140:3205): Regular 24 / lh 40 / tracking −0.48, #3a3c75.
- H3-style label 140:3216: Medium 24 / lh 27, #6c5ce7.
- Body: Regular 16 / lh 27 / tracking −0.32, #3a3c75. Paragraph gap about 30 px (140:3214 -> 140:3224).
- Lists: Regular 16 / lh 31; custom bullet = 16 px ring (ellipse 104 svg) + 6 px dot (ellipse 101), text indent 23 px.
- Inline link: #6c5ce7, no underline. Contrast against the body text colour #3a3c75 is 2.07:1 (below 3:1, WCAG 1.4.1 needs a non-colour cue).
  #6c5ce7 on white 4.86:1 passes; #3a3c75 on white 10.08:1; #3a3c75 on #f2f0ff 8.97:1; #151d30 on white 16.8:1.

## Builder needs (Markdown legal template)
- Frontmatter: title (H1), lastUpdated (not designed; propose "Laatst bijgewerkt: <datum>" under the H1 in the hero),
  optional version, `placeholder: true` flag (renders a visible "voorlopige tekst" notice on staging and blocks production),
  SEO description, noindex optional.
- Markdown body: `##` = H2 (TOC entries and anchor ids, auto-slugged), `###` = the 24px purple label, paragraphs, `-` lists with the
  ring bullet, links (mailto and external) with an underline. Optional lead paragraph via CSS (the first paragraph after the first H2)
  instead of a Markdown extension.
- TOC generated at build time from the H2s (the Astro `headings` from render()). Desktop: left column, sticky is the builder's
  proposal. Mobile: collapsible <details> "Inhoudsopgave" above the prose. Add aria-current or an active state (not designed).
- Email and company values must come from site.json (never hardcoded in .md), so the .com/.be mismatch disappears.
- One layout for /algemene-voorwaarden, /privacybeleid (same template in 140:3318) and /cookiebeleid (no frame; reuse).
