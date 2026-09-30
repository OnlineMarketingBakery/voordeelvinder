# Campaign landing variants

One Markdown file per variant: `src/content/landing/<slug>.md` is served at `/l/<slug>`. This
README is not a variant. The schema is `src/schemas/landing.ts`; an unknown or misspelled field
fails the build.

The page is the product's own page with the variant's hero copy: the homepage sections for
`energie`, the `/zonnepanelen` or `/thuisbatterij` sections otherwise. Every CTA to the form goes
to `/vergelijken/<product>` and keeps the ad's query string (`utm_*`, click ids). Variants are
always `noindex` and stay out of the sitemap.

| Field               | Required | What it is                                                                          |
| ------------------- | -------- | ----------------------------------------------------------------------------------- |
| `product`           | yes      | `energie`, `zonnepanelen` or `thuisbatterij` (the form preselect)                   |
| `title`             | yes      | The h1 (headline); `\n` is a forced line break                                      |
| `subtitle`          | yes      | The text under the h1; a string, or sentences with `hidden`/`claim` like page copy  |
| `cta`               | no       | The hero button label (default: the product page's hero button)                     |
| `heroImage.product` | no       | `{ src, alt }`, an image key from `src/assets/images` (default: the product page's) |
| `heroImage.mascot`  | no       | `{ src, alt, mirror? }` (default: the product page's mascot)                        |
| `seo.title`         | yes      | The `<title>`, without the site name (the title template adds it)                   |
| `seo.description`   | no       | The meta description (default: the site's)                                          |

Leave the Markdown body empty: it is not rendered yet, and the build fails when there is one.
Never invent copy: campaign copy must be supplied and signed off (`docs/CONTENT-TODO.md`).
