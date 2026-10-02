# E-mail templates (Mailchimp)

Six HTML templates for VoordeelVinder, ready to import once we have our own Mailchimp account.
Open `index.html` in a browser for a preview of each at desktop (640 px) and mobile (375 px) width.

| File | When it is sent | Flow |
| ---- | --------------- | ---- |
| `01-aanvraag-ontvangen.html` | Right after every lead | Lead journey, step 1 |
| `02-voordeel-gevonden.html` | Energy lead with outcome `promo` | Lead journey, promo branch |
| `03-geen-voordeel.html` | Lead with outcome `no_promo` | Lead journey, no-promo branch |
| `04-opvolging-gemist-gesprek.html` | The partner couldn't reach the lead | Follow-up |
| `05-welkom-nieuwsbrief.html` | After the newsletter double opt-in is confirmed | Newsletter welcome |
| `06-nieuwsbrief.html` | Each newsletter edition | Regular campaign |

**All copy is a DRAFT for the client to approve** (CONTENT-TODO). No savings figures, prices or
promises; no em dashes.

## Design

- **Colours** come from the site's styleguide (`src/styles/global.css`):
  - purple `#7051ED` for the header;
  - lime `#B7E137` for buttons and the line under the header;
  - chip `#C9E260` for the one highlighted word;
  - lavender `#F6F4FF` for the background and cards;
  - ink `#03080F` for headings and `#3A3C75` for body text.
- **Font:** Bricolage Grotesque where the client loads web fonts (Apple Mail, iOS, some
  Android). Everywhere else, Arial or Helvetica.
- **Layout:**
  - 600 px wide, built from tables with inline styles;
  - the header, the topic cards and the article blocks stack on phones (below 620 px);
  - buttons are rounded and also render in Outlook (VML fallback);
  - every template has a hidden preheader, the preview line in the inbox.
- **Light mode only:** `color-scheme: light` asks clients not to invert colours. Outlook.com
  keeps the cards readable.

## Import in Mailchimp

1. **Upload the images:** upload `assets/*.png` to the Content Studio, then replace each
   `src="assets/…"` with the image's Mailchimp URL. Alternatively, serve them from the site
   once it's live.
2. **Import the templates:** Templates → Create template → Code your own → Import HTML, one
   file each.
3. **Edit the copy:** text, buttons and images with `mc:edit` are editable in Mailchimp's
   editor. The newsletter's article block is `mc:repeatable`, so you can add or remove articles.
4. **Check the links:** they point to `https://www.voordeelvinder.be` (TO CONFIRM: the
   production domain).

## Merge tags

Standard tags:
- `*|FNAME|*`, with a fallback greeting "Hoi," when the first name is empty;
- `*|ARCHIVE|*`, `*|UNSUB|*`, `*|UPDATE_PROFILE|*`;
- `*|CURRENT_YEAR|*`, `*|LIST:ADDRESSLINE|*`;
- `*|DATE:F Y|*` (newsletter only).

Custom audience fields. n8n fills these when it adds the lead to Mailchimp (step 8, still disabled):

| Merge tag | Content | Source |
| --------- | ------- | ------ |
| `*|PRODUCT|*` | "je energiecontract", "zonnepanelen" or "een thuisbatterij" | `product` in the payload |
| `*|BELMOMENT|*` | e.g. "woensdag 7 oktober, tussen 13:00 en 14:00" | `call_preference` (the sheet's Belmoment) |
| `*|BELNUMMER|*` | The number the call partner calls from | TO CONFIRM with the partner |
| `*|TERUGBEL_URL|*` | Link to choose a new call moment | TO CONFIRM: no such page exists yet |

## TO CONFIRM

- **All copy**, especially:
  - the "Antwoord op deze e-mail" lines: someone must read and act on the replies;
  - the no-promo wording.
- **Call partner:** the calling number (`BELNUMMER`), and how a lead picks a new call moment
  (`TERUGBEL_URL`).
- **Domain:** the production domain for links.
- **Sender:** the sender name and address, e.g. "VoordeelVinder" `<hallo@voordeelvinder.be>`.
- **Double opt-in:** Mailchimp's confirmation e-mail for the newsletter is set up in Mailchimp
  itself (Audience → Signup forms). Use the same colours and the copy we agree on.
