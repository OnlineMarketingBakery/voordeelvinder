# 0013: Results and ordering screens on placeholder data, off in production

- **Date:** 2026-10-02
- **Status:** Accepted (Tanjil: "add the structure already, we'll add the APIs and data later")
- **Design:** Figma 221:5711 (results), 241:7189, 249:10051, 250:12053 (ordering), 254:14001 (thanks)

## Context

Screens 2–6 show supplier prices and take an order. There is no tariff data, no supplier API and
no order hand-off yet, and we never publish invented prices, suppliers or ratings.

## Decision

- **Routes:** `/vergelijken/energie/resultaten` and `/bestellen/{gegevens,aansluiting,controle,bedankt}` exist
  everywhere except production (`orderPreview`); in production they answer 404. Always noindex.
- **Data:** the screens read one data contract (`src/lib/comparison/types.ts`). Today
  `placeholderComparison()` fills it with "Leverancier A…E" and round example amounts, marked
  `placeholder: true`, which shows a preview notice on every screen. The tariff API will fill
  the same shapes.
- **Copy:** `src/content/order/nl.json`, checked at build (no empty texts).
- **Ordering:** kept in sessionStorage (this tab only), prefilled from the single-page form,
  validated per step (IBAN with check digits, EAN 54 + 16 digits, dates, the form's e-mail,
  phone and postcode validators). Nothing is sent: "Bevestig je bestelling" makes a placeholder
  reference (VV-123456) and opens the thank-you page.
- **On staging only:** after a sent lead the single-page form goes to the results instead of the
  thank-you page (`resultsAfterLead`), so the whole flow can be clicked through. The lead itself
  is sent exactly as before.

## Consequences

- To go live: replace `placeholderComparison()` with the API, add the order hand-off (and its
  payload, with approval), confirm the copy and claims (CONTENT-TODO 2.35), then switch
  `orderPreview` and `resultsAfterLead` on for production.
- Birth date and IBAN are personal data: the privacy policy must cover them before launch.
