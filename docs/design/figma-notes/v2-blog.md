# v2 blog slice — Figma 8bhHL5kRbwYzYPbH6Vgdjn, update review (2026-09-29, evening)

Sources: figma-diff-nodes.json (geometry diff a->b), page1-v2.xml, get_design_context 118:2067 + 113:1135 (full frames),
get_screenshot 1:1 of both frames -> shots-v2/readblog-118-2067.png (1440x3998), shots-v2/blogs-113-1135.png (1440x3339),
crops: shots-v2/readblog-crop-top.png, -mid.png, -bottom.png, blogs-crop-top.png, blogs-crop-pagination.png.
Asset SVGs inspected: shots-v2/icon-hero-119.svg, icon-card-90.svg, vector37-post.svg, arrow-volgende.svg, arrow-terug.svg.
Fill changes are NOT in the diff JSON (geometry only); verified by pixel-sampling morning shots (../shots/other-blogs.png,
../shots/other-readblog.png, 992px wide, scale 0.6889) against the new 1:1 shots.

## 1. Node diff

### 118:2067 "Read Blog Page" — h 3487 -> 3998, canvas x 15350 -> 4821. 64 -> 102 nodes. +49 / -11.
REMOVED (11) — the leftover listing pagination:
- 118:2575 Vector 37 (divider, y2516), 118:2576–118:2580 Ellipse 96–100 (50px circles, y2544), 118:2581–118:2584 texts "1" "2" "3" "4", 118:2585 next-arrow Frame.
ADDED (49):
- H2 texts (5): 134:2615 "Hoe weet je of je te veel betaalt?" (y964, w698) · 134:2620 "Vergelijken hoeft niet ingewikkeld te zijn" (y1335, w873) · 134:2623 "Benieuwd of je kunt besparen?" (y1706, w674) · 134:2629 "Misschien betaal je meer dan nodig" (y1955, w776) · 134:2632 "Is jouw energiecontract nog wel voordelig?" (y2204, w776)
- Paragraphs (7), all x134 w1170 h92, identical text "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia conse quuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.":
  134:2616 (y1062) + 134:2619 (y1184) [section 1, 2 paras] · 134:2621 (y1433) + 134:2622 (y1555) [section 2, 2 paras] · 134:2624 (y1804) [s3] · 134:2630 (y2053) [s4] · 134:2633 (y2302) [s5]
- Accent bars under each H2 (5), 364x4, x134: 134:2626 y1025 #6c5ce7 · 134:2627 y1396 #b7e137 · 134:2628 y1767 #6c5ce7 · 134:2631 y2016 #b7e137 · 134:2634 y2265 #6c5ce7 (purple/lime alternate, starting purple; no radius)
- Post nav: 134:2643 "Group 70" (x135 y2467 148x52) = 134:2644 Rectangle 328 + 134:2645 "Terug" + 134:2646 chevron (mirrored) · 134:2638 "Group 76" (x295 y2467 148x52) = 134:2639 Rectangle 326 + 134:2640 "Volgende" + 134:2641 chevron
- Divider 134:2635 Vector 37 (x135 y2551 w1170)
- Related heading 134:2636 "Misschien vind je dit ook leuk" (x400 y2646 w641 h51)
- Related cards ×3 (columns x132/532/932): images 134:2649/134:2650/134:2651 (376x246, y2742) · titles 134:2652/2653/2654 "Betaal jij te veel voor energie? Zo ontdek je het" (y3016) · excerpts 134:2655/2656/2657 "Ontdek in een paar eenvoudige stappen of je huidige energiecontract nog bij je past en waar je mogelijk kunt besparen." (y3096) · pills 134:2658/2659/2660 (137x42, y3179) · arrows 134:2661/2663/2665 (23px) · labels 134:2667/2668/2669 "Lees meer"
- Image-placeholder glyphs: 134:2697 (119x119, x660 y559 = centred on hero 118:2587) · 134:2699/134:2701/134:2703 (90x90, y2820 = centred on related-card images)
CHANGED:
- 118:2587 hero: x 135 -> 134; fill #d9d9d9 -> #f2f0ff (pixel: old #d9d9d9, new #f2f0ff)
- Footer 118:2269–118:2498: band 118:2269 y 2735 -> 3371, h 681 -> 556; bottom bar 118:2270 3417 -> 3928; all footer content +511 (e.g. logo 118:2271 2917 -> 3428). Band top to logo: 182px -> 57px.
- Unchanged: header (shadow still 0 10 31.8 rgba(0,0,0,.25) on 118:2069), date 118:2589 "September 29, 2026", H1 118:2588.

### 113:1135 "Blogs overview" — h 3487 -> 3339, canvas x 13419 -> 2890. 125 -> 135 nodes. +10 / -0.
ADDED (10) — image-placeholder glyphs, each exactly centred on an image box:
- 134:2671 119x119 (x412 y428) on featured image 117:1922 (673x417)
- 90x90 on grid images: row1 y947: 134:2679 (x276), 134:2681 (x676), 134:2683 (x1076) · row2 y1476: 134:2685, 134:2687, 134:2689 · row3 y2005: 134:2691, 134:2693, 134:2695
CHANGED (fills, pixel-verified vs morning shot):
- All 10 image boxes (117:1922, 117:1920, 118:2011, 118:2018, 118:2025, 118:2026, 118:2027, 118:2046, 118:2047, 118:2048): #d9d9d9 -> #f2f0ff
- Grid "Lees meer" pills (118:1934, 118:2014, 118:2021, 118:2034, 118:2035, 118:2036, 118:2055, 118:2056, 118:2057): #6c5ce7 -> #7051ed (old px #6c5ce7, new px #7051ed; get_design_context now bg-[#7051ed])
- Footer: band 113:1411 y 2735 -> 2712, h 681 -> 556; bottom bar 113:1412 3417 -> 3269; footer content -148 (logo 113:1413 2917 -> 2769).
UNCHANGED: featured post block, section headings, card titles/excerpts, featured lime pill #c9e260, date 118:1931 "September 29, 2026", pagination 118:1994–118:2005 (circles 1–4 all render #f2f9db, next #b7e137; still no visible active state, no prev). Pagination bottom 2594 -> footer band 2712 = 118px.

## 2. Placeholder glyph asset (both frames)
icon-hero-119.svg / icon-card-90.svg: single path, generic "image" pictogram (frame + sun circle + mountain), fill #DBD8F4, on #f2f0ff box.
=> It is a "no image yet" placeholder, not real imagery or a content icon.

## 3. Post body — styles (from get_design_context 118:2067; all Bricolage Grotesque, opsz 14)
| Element | Node | Size/LH | Weight | Tracking | Colour | Notes |
|---|---|---|---|---|---|---|
| Date | 118:2589 | 20/24 | Regular | -0.4 (-2%) | #6c5ce7 | still "September 29, 2026" |
| H1 | 118:2588 | 48/52 | SemiBold | -1.44 (-3%) | #151d30 | w996 |
| Hero image | 118:2587 | 1170x566 | – | – | #f2f0ff | r24 |
| H2 | 134:2615… | 34/52 | SemiBold | -1.02 (-3%) | #151d30 | single-line boxes |
| H2 accent bar | 134:2626… | 364x4 | – | – | #6c5ce7 / #b7e137 alternating | square, fixed width |
| Paragraph | 134:2616… | 16/27 | Regular | -0.32 (-2%) | #3a3c75 | w1170, text-box-trim cap/alphabetic |
| Nav button "Terug" | 134:2644/2645 | label 18/30 | Regular | -0.36 | #03080f on #fff, 1px #ded9f4, r12, 148x52 | left chevron 24px #03080F (same asset mirrored) |
| Nav button "Volgende" | 134:2639/2640 | label 18/30 | Regular | -0.36 | #03080f on #b7e137, r12, 148x52 | right chevron 24px #03080F; gap between buttons 12px |
| Divider | 134:2635 | 1px x 1170 | – | – | #3A3C75 @ 43% (renders #d4d5e1) | |
| Related heading | 134:2636 | 48/51 | SemiBold | -1.44 | #151d30 | centred (box x400 w641) |
| Related card image | 134:2649… | 376x246 | – | – | #f2f0ff r24 + 90px glyph | |
| Related card title | 134:2652… | 24/31 | SemiBold | -0.72 (-3%) | #151d30 | w324 |
| Related card excerpt | 134:2655… | 16/24 | Regular | -0.32 | #3a3c75 | |
| Related card pill | 134:2658… | 137x42 r37 | label 16 Medium white | – | #7051ed | 23px arrow icon, no date on card |

Nav buttons are the form's Back/Next buttons (same layer names Rectangle 326/328, same styling as 89:7461/89:7982 per tokens.md).

### Vertical rhythm (frame px; paragraphs are cap-top..baseline boxes because of text-box-trim)
Measured cap height ~0.647em (H2 'H' rows 979–1000; para 'S' 1062–1072). For 16/27 text the trim is ~8.3px top and bottom.
- header bottom 85 -> date cap top 220 (untrimmed date box ~214.5) ≈ 130 top padding
- date -> H1 box 253: ~14.5 (untrimmed) · H1 box bottom 305 -> hero 335: 30
- hero bottom 901 -> first H2 box 964: 63
- H2 box bottom -> bar: 9 · bar bottom -> para cap top: 33 (≈25 untrimmed)
- para -> para: 30 trimmed (≈13–14 untrimmed CSS margin)
- last para of a section -> next H2 box: 59 trimmed (≈51 untrimmed)
- last para 2394 -> nav buttons 2467: 73 trimmed (≈65 untrimmed)
- buttons bottom 2519 -> divider 2551: 32 · divider -> related heading box 2646: 95
- related heading box bottom 2697 -> card images 2742: 45 · image -> title: 28 · title box -> excerpt: ~11 untrimmed · excerpt -> pill: ~17 untrimmed
- pill bottom 3221 -> footer band 3371: 150
Paragraph line length: first line of 134:2616 is 150 characters at 1170px.
Column x drift: body/H2/hero x134, nav x135, divider x135, related cards x132, overview cards x133 (a centred 1170 container is x135).

### Prose elements present / absent
Present: H1, date, hero image, H2 (+ accent bar), paragraph, prev/next buttons, divider, related posts (3 cards).
Absent (not designed): H3/H4, ordered/unordered lists, blockquote, inline links, bold/italic, inline/body images + captions, tables, code, author, reading time, share, tags/categories, breadcrumbs, CTA to /vergelijken, newsletter block (footer only).

## 4. Content status
Still placeholder: H1 + all card titles/excerpts identical to this morning; body = 7 identical Latin "Sed ut perspiciatis…" paragraphs;
H2 headings are Dutch, informal "je", energy-themed but dummy structure; all images = #f2f0ff + #dbd8f4 glyph; dates English.
No u-forms or typos in the new copy ("Misschien vind je dit ook leuk", "Terug", "Volgende", 5 H2s checked).

## 5. Morning findings status
- other-blog-post-incomplete: PARTLY resolved — body (H2 + bar + p), prev/next nav, related posts added; leftover pagination 118:2575–118:2585 removed. Still no h3/lists/quotes/links/images, author, reading time, CTA.
- other-blog-placeholder-content: #d9d9d9 part resolved (now #f2f0ff + glyph); content still placeholder -> stands.
- tokens-offpalette-greys (#d9d9d9 part) / assets-no-social-or-blog-imagery (grey part): resolved — lavender #f2f0ff (existing tint, cf. battery block 67:893) replaces #d9d9d9.
- other-blog-is-designed: updated — the post is now designed through related posts; recommendation extends to body/nav/related.
- other-blog-date-format: UNCHANGED ("September 29, 2026" on 118:2589 and 118:1931).
- other-blog-pagination-state: UNCHANGED on 113:1135 (all four circles #f2f9db, no prev). N/A on the post page now.
- verify-header-transition-consistency: UNCHANGED (blog header shadow still α.25).

## 6. Cross-slice notes
- New top-level frames in this update (not reviewed here): 134:2705 "Terms and Conditions" (1440x3467), 140:3318 "Privacybeleid" (1440x3721). Their footer band is also h556 with the logo at +57.
- Footer band h556 on blog + legal frames vs h681 on 69:931 Solar, 80:2867 Battery, 100:2 About us (unchanged); step frames h554.
