# Slice: assets (Phase 0, read-only review)

Figma file 8bhHL5kRbwYzYPbH6Vgdjn, Page 1. Brief refs: §2 (fox + green cap), §6 Assets, §6.1 (mascot morph + cheer), §4.3 `public/`, §11 (OG image, `<Image>`).

Method: parsed page1.xml; `get_design_context` on raster leaf nodes to get the fill URL and crop %
(89:7439, 91:14643, 63:860, 62:858, 60:345, 60:723, 60:747, 60:849, 60:71, 67:875, 69:929, 60:373, 78:2856, 72:2733,
81:3860, 72:2734, 113:1012); `download_assets` on 89:7439, 91:14643, 60:124 (logo), 60:370, 67:878, 81:3847, 113:1919,
60:401, 60:337, 60:739, 60:835, 60:330, 60:754. I reused the sibling slices' full-frame screenshots in `figma/shots/`.
The downloaded files are in `figma/assets/`, and my own renders and crops are in `figma/shots/assets_*`.

"Effective density" means native px ÷ displayed px at 1440 desktop, taking the crop into account. For retina you want at least 2.0x.

Note: the `download_assets` "export" PNG comes back flattened and opaque (0% transparent pixels), even for nodes that are
transparent on the canvas. Use the raw fills, not the export, for transparent assets.

---------------------------------------------------------------------------------------------------
## 1. Mascot inventory (non-hidden frames)

### 1a. The only VECTOR mascot: "Group 21", a waving fox (92 paths)
| Where | Node(s) | Size | Notes |
|---|---|---|---|
| Logo badge, header, every frame | Group 27, e.g. 60:125 (in Group 28 60:124), 84:4039, 91:13868 … (19 frames) | 51x54 | Ellipse 9 (white + drop shadow), Ellipse 10 `#7051ED`, "Mask group" (lime Ellipse 11 `#B7E137` mask + fox "Group 20"), "Frame 5" (the same fox again, unmasked, so the head breaks out of the circle) |
| Logo badge, footer, every frame | Group 60, e.g. 60:512, 84:4328 | 82x87 | same structure |
| Solar hero | 72:2734 "Group 21" | 319x347 | **flipped horizontally in Figma** (it waves on the viewer's left). The MCP SVG export comes out un-mirrored |
| Battery hero | 81:3863 "Group 21" | 264x287 | flipped, as above |
| About us | 109:799 "Group 21" | 276x298 | flipped (About us isn't in the MVP) |

SVG structure (from `group21_solarhero_72-2734.svg`, 50.9 KB; the logo copy `logo/svg_4.svg` is identical):
- 1 `<g id="Group 21">`, 92 `<path>`s with ids "Vector", "Vector_2" … "Vector_92".
- No `<image>`, no transforms, no masks, no semantic names.
- ~19 flat colours: #03080F, #FEFEFE, #FE9D19, #FA8901, #FEB55D, #FECC90, #FEECD7, #FFDBB5, #FD595A, #162638, #563CEC, #4930DD,
  #292084, #B7E137, #98D122, #3C9F0E, #3E970C, #3A546F, #534329. The colours and the tiny shard paths (e.g. Vector_27 is
  0.7 x 0.1 units) look like an auto-trace. That fits the designer's "[Vectorized]" naming elsewhere.
- **The whole black outline is ONE path**: "Vector", `#03080F`, a single M…Z subpath of 4.8 KB covering the full
  silhouette, including the boots. Every colour region sits on top of it. See `shots/assets_group21_layers.jpg`:
  outline only | fills only | black details.
- The face details are separate small paths: eye whites Vector_14 and Vector_2; eyes, pupils and brows Vector_12, 13, 23,
  28 and 29; nose Vector_5; tongue Vector_6. So an "eyes" group CAN be rebuilt by hand, for a blink or a look-around.
- The head, the waving arm (sleeve Vector_41, paw Vector_49) and the tail are separate colour paths, but their outline is
  part of the shared silhouette. If you rotate the arm or the head, a black arm/head-shaped "shadow" stays behind. So
  head and arm motion needs the silhouette split into per-part outlines, with pivots. That is designer or illustrator work.
- The quality is clean and crisp at any size (rendered at 800 px: `shots/assets_group21_solar_render.jpg`).

Logo lockup `download_assets 60:124`: rawImages = none. The svgAssets are: white shadow circle (1.0 KB), purple circle
(0.3 KB), mask group with fox (52.1 KB), overflow fox (50.8 KB) and the wordmark (12.5 KB, 14 paths, one fill `#03080F`,
outlined text "Voordeelvinder"). That is **~116 KB of unoptimised SVG for one 51 px header badge**, because the fox is duplicated.

### 1b. RASTER mascot poses (all PNG, AI-generated)
| Pose | Node | Frame | Displayed | Visible fill (native) | Crop | Effective density | Notes |
|---|---|---|---|---|---|---|---|
| Sitting with laptop + lightning bubble + flame bubble | 89:7439 "ChatGPT Image Sep 22, 2026, 01_37_15 PM 5" | Step - 1 (same node name, size 323x289 and position 157,579 on all 12 step frames: 89:7939, 89:8430, 89:8933, 90:9416, 90:9917, 90:10906, 91:11401, 91:13819, 91:12365, 91:12836) | 323x289 | 2922x1948 RGBA sprite sheet, 52% transparent (`step1-mascot/raw_3.png` = `dc_fill.png`) | w 310.59%, h 231.58%, left -106.47%, top -11.29% | 2922/1003 = **2.9x** | The node stacks **6 image fills**: 1536x1024 RGB (white bg, the original ChatGPT output size), 1536x1024 RGBA, 2922x1948 RGBA (visible, an upscale), 384x256 ×2, 366x244. **True drawn detail ≈ 512 px per pose** (6 poses on a 1536x1024 sheet). The lightning and flame bubbles are baked in (energy-specific). I visually confirmed the same crop on Step 1, 7B-1 and Step 8 (no) |
| Same laptop pose | 113:1133 (same layer name) | About us hero | 497x445 | presumably the same sheet | not measured | – | not in the MVP |
| Sprite sheet contents (2922x1948) | – | – | – | – | – | – | 6 poses: (1) wink + thumbs up + card "€ 52 /maand" "BESTE DEAL"; (2) laptop + lightning + flame; (3) thinking with "?" and cards "€ 68 /maand" / "€ 52 /maand"; (4) cheering with a document; (5) pointing at a list "Vergelijk eenvoudig" / "Bespaar geld" / "Slimme keuze"; (6) hugging a heart. The text is baked in |
| Thumbs up, in a purple circle badge (head breaks out of the circle) | 91:14643 "Group 72": 91:14640 "Group 21 1" (masked by Ellipse 11 `#B7E137`) + 91:14642 "Group 21 2" (unmasked head) + Ellipse 9 (white + shadow) + Ellipse 10 `#7051ED` | Thank you page (copy: 91:14851 / 91:14852 in 91:14645) | badge 174x180 | 1024x994 RGBA (`thankyou-mascot/raw_2.png`) | Group 21 2: w 164.71% → 265 px | 1024/265 = **3.9x** | Same image used twice with a mask (overflow trick, like the logo). 4 stacked fills (1024x994 RGB white bg, 1024x994 RGBA visible, 512x497 ×2). A static thumbs up, **not** cheering. Not layered |
| Wink + thumbs up + "€ 52 /maand" + "✓ BESTE DEAL" card | 63:860 "54544 1" | Homepage 3 hero (likely the LCP area) | 615x604 | 615x604 RGBA | object-cover, no crop | **1.0x** | Price and "best deal" claim baked into the image |
| Magnifying glass | 60:345 "Fx 1" | Homepage 3 "Zo werkt het vergelijken" | 333x323 | 4096x3846 RGBA (3.6 MB) | w 126.94% | 9.7x | |
| Two documents + € speech bubble | 60:849 "5874891 1" (also 104:749 About us) | Homepage 3 "Waarom kiezen" | 584x581 | 1560x1553 RGBA | none | 2.7x | |
| Laptop, **no** bubbles, on a purple semicircle | 60:747 "Group 3 1" (also 69:1688, 80:3455) | Homepage 3 / Solar / Battery FAQ side card | 285x226 | 4096x3664 RGBA (3.3 MB) | w 129.27% | 11x | A neutral version of the form-panel pose |
| Cheering with a document (sprite pose 4) | 60:723 "ChatGPT Image Sep 22, 2026, 01_37_15 PM 9" | Homepage 3 final CTA | 598x598 | **1584x1056** sheet (a smaller copy of the same 6-pose sheet) | w 300%, h 200%, top -96.12% (bottom-left cell) | 1584/1794 = **0.88x** | The same cell from the 2922 sheet would be 974 px → 1.63x |
| Cheering, both fists up, confetti | 78:2856 "564654 1" (also 80:3568) | Solar / Battery "Wat je van ons mag verwachten" | 442x482 | 957x1024 RGBA | w 144.67% | 1.5x | The best "cheer" pose in the file |

## 2. Layered-mascot feasibility (§6 / §6.1)
- **Not feasible as specified from the current layers.** No mascot has head, eyes or arms as groups.
- Nine of the ten poses are raster only.
- The only vector pose (the waving "Group 21") is a flat 92-path trace with one merged black outline.
- What engineering can do without the designer:
  - (a) Whole-mascot transforms (hop, tilt, scale, squash) on any pose.
  - (b) On the vector waving fox: hand-regroup the eye and pupil paths into `#eyes` for a blink or look-around.
  - (c) CSS or Motion confetti around the thank-you badge.
- What needs the designer:
  - Split the outline per part (head, torso, raised arm/paw, other arm, tail, legs), with overlaps and pivot points. Deliver it as a named, layered SVG, or as Rive/Lottie (§6.1 allows Rive only if the designer supplies files).
  - Ideally also vector versions of the laptop, thumbs-up and cheer poses.
- The §6.1 morph "mascot moves from form panel to thank-you":
  - The source (89:7439, a sprite crop of the laptop pose with energy bubbles, 323x289, bottom-left of the purple panel) and the target (91:14643, a thumbs-up raster inside a circle badge with head overflow, 174x180, centred above the card) are different drawings.
  - A cross-document View Transition will animate the box and cross-fade the two images. That works, but it reads as a swap, not "the mascot moving".
  - To get a true move, both slots need the same asset, e.g. the vector fox in both. That is a design change and needs sign-off.

## 3. Icons
| Group | Nodes (examples) | Type | Notes |
|---|---|---|---|
| UI icons in "Frame" > "Vector" (arrow-up-right CTA 22–32 px, info-circle badge 28 px, chevrons 12 px, plus 23 px, mail/phone 13 px, newsletter mail 26 px, location pin 18 px, eye 30 px 60:835, rocket 40 px 60:837, form chevrons) | 84:4035, 60:26, 60:724, 60:97, 60:739, 60:719, 60:765 | **vector**, filled, e.g. `fill="#6C5CE7"` / `black` | They look like one UI icon family (filled "line" style). Good SVG candidates (use currentColor) |
| "[Vectorized]" feature icons | no-call 60:390, hide 60:393, file 60:397, money 60:403 / 69:1336 / 100:307, send 60:411, wallet 60:417, charity 60:839, fist 60:843, solar-panel 89:7475, smarthome 89:7479, advice 81:3850, book 81:3856, time 118:2591, home 118:2600, renewable-energy 118:2603, home (1) 118:2608, energy 118:2612, close 109:763… | **vector** (vectorised from PNGs, e.g. money = 5 paths, 5.3 KB, clip-path) | The hidden raster originals are still in the file (118:2590, 118:2599, 118:2602, 118:2607, 118:2611, 89:7473, 89:7478, 109:762 …). **"money 1" shows a US dollar sign "$"** on a euro site |
| Raster icons still in use (visible) | "contract 1" 60:848 / 69:1789 / 80:3459; "compare 1" 60:370 / 69:1301 / 80:3172; "decision-making 1" 60:372 / 69:1303 / 80:3174; "solar-panel 1" 67:878 (home solar pill); "car-battery 1" 69:926 (home battery pill); "label 1" 81:3847 / 81:3966; "check (2) 1" 81:3849 / 81:3971 | **raster PNG 512x512, pure black on transparent** (verified for compare, solar-panel, label) | ~10x density, but they can't be recoloured and they aren't SVG |
| Step 1 product cards | Elektriciteit 89:7470 (Frame, lightning, #7051ED), Zonnepaneel 89:7475, Thuisbatterij 89:7479 | vector | No gas icon (the flame exists only inside the raster mascot) |
| Yes/No (Steps 5, 7) | check-circle (Ja) / x-circle (Nee) | vector (form-a slice: s5-icon-ja.svg / s5-icon-ne.svg) | |
| Comparison rows | 60:472–60:477 "Vector" 14x18 lightning in a purple circle | vector | |
| Stars | 60:337 "Group 36" 105x21 (5 × "Star", `#FFAD15`), 60:757 etc. | vector | They sit only in the hidden-by-brief blocks (300+ customers, testimonials) |
| Quote marks | 60:752 "“" 32x27 | vector (outlined glyph) | testimonials (hidden per §2) |
| Hidden raster leftovers | "question 1" 84:4708…, "check-circle 1" 91:14337 (124 px), "close 1" | raster, hidden | ignore |
| Flags | "flag (2) 1" 113:1919 (BE, PNG 512x512 shown at 32x22) on Step 8 91:10958; "flag (1) 1" 91:13845 (NL) on the stale copy 91:13376 | raster | Not needed: fixed +32, no flag (§6) |
| Emoji | text 60:322 "👋 Welkom bij voordeelvinder" | text emoji | Renders per OS (the design shows the Apple glyph) |
| Social icons | – | none | The footer has none. `site.json` in §4.3 lists "social links", but there is no design for them |

Consistency: the set is mixed, and comes from at least three sources:
- one UI icon family ("Frame" > "Vector");
- stock-style downloads that were vectorised ("X 1 [Vectorized]");
- the same kind of downloads left as black PNGs ("X 1", "check (2) 1").

The fill colours vary (black, #6C5CE7, #7051ED, white). The Flaticon-style names ("money 1", "check (2) 1") need a licence and attribution check (TO CONFIRM).

## 4. Illustrations and photos
| Asset | Node | Displayed | Native | Density | Notes |
|---|---|---|---|---|---|
| Hero solar panel + battery | 62:858 "6548 1" | 483x296 | 1509x923 RGBA | 3.1x | behind the hero fox |
| Solar panels + light bulb | 67:875 "Asset 1 3" | 508x398 (img w 150%) | 835x465 RGBA | **1.1x** | Flat stock-vector style (no outlines), unlike the outlined cartoon style elsewhere. Probably stock → ask for the vector original + licence |
| Brick gabled house + 3 batteries | 69:929 "Group 66 1" | 524x534 (img w 150.34%) | 1024x830 RGBA | **1.3x** | |
| Solar hero panel | 72:2733 "Group 66 2" | 441x274 (img w 131.68%) | 1024x830 RGBA | 1.76x | |
| Battery hero units | 81:3860 "Group 66 3" | 523x349 (img w 123.93%) | 1024x830 RGBA | 1.58x | |
| Line-icon pattern (Waarom) | 60:73 "Asset 1 2", used as the **alpha mask** of Ellipse 34 60:74 (SVG fill, opacity 0.32) in Group 32 60:71 | 543x551 | 1086x1102 RGBA (89% transparent) | 2.0x | CSS `mask-image` with PNG works. An SVG original would be better |
| Cloud texture (comparison bg; also 69:1307, 80:3178, 100:301) | 60:376 "image 3" inside Mask group 60:373 + 60:377 `#6c5ce7` `mix-blend-mode: color` | 1578x981 | 2880x1790 RGB | 1.8x | Soft texture, fine. Pre-bake the tint into one AVIF/WebP |
| Hero avatars ×4 | 60:330/332/334/336 "image" (ellipses) | 47 px | 736x1104 (+184x276 duplicate fill) | – | Stock photos. The block is hidden (§2) |
| Testimonial avatars | 60:754, 60:771, 60:788, 60:805, 60:822 (52 px) | 52 px | 736x1308 RGB (+184x327) | – | Stock photos. Testimonials are hidden (§2) |
| Team photos (About us) | 113:991 & 113:1018 "image 4" (the **same man** for "Thomas Vermeulen" and "Jeroen Maes"), 113:1022 "image 8" | 296x370 / 417x645 | image 8: 834x1493 | 2.0x | Placeholder or stock. Not in the MVP. Never ship |
| Blog images | Blogs overview / Read Blog cards | – | none | – | Grey placeholder rectangles, no imagery |
| Logo | Group 28 60:124 (badge + wordmark) | 215x54 | vector | – | See §1a. Wordmark = outlined paths "Voordeelvinder" (lower-case "v"; the copy uses "VoordeelVinder"). Footer wordmark 60:704 is 260x27 (white on purple) |
| Favicon / app icon / OG image | – | – | – | – | **None in the file** |

## 5. Baked-in content inside raster art (conflicts with §2 / §17)
- 63:860 (homepage hero): "€ 52 /maand" and "✓ BESTE DEAL". This is an invented price or savings figure plus an on-screen-result claim. It can't be hidden through content JSON.
- The sprite sheet also holds "€ 68 /maand", "€ 52 /maand", "Vergelijk eenvoudig", "Bespaar geld" and "Slimme keuze". Those poses aren't used in visible frames, apart from the hero's own image.
- The form-panel mascot 89:7439 has lightning and flame bubbles baked in, which suits energy only. For the solar and battery flows, 60:747 "Group 3 1" is the same pose without the bubbles.

## 6. Export plan
| Asset | Source node | Format | Notes |
|---|---|---|---|
| Logo lockup (header, dark wordmark) | 60:124 | SVG | Run SVGO; define the fox once (`<symbol>`/`<use>`) and clip it twice instead of duplicating 92 paths; target < 30 KB. Or ship the badge as a 2x/3x WebP and the wordmark as SVG |
| Logo lockup (footer, white wordmark) | 60:512 + 60:704 | SVG | same |
| Mascot, waving (vector) | 72:2734 (= logo "Group 21") | SVG in `public/mascot/` or inline | Mirror with `scaleX(-1)` where the design flips it (solar hero, battery hero). Regroup `#eyes` by hand for a blink. Whole-body motion only until the designer splits the outline |
| Form-panel mascot (energy) | 89:7439, crop of the 2922x1948 sheet | AVIF + WebP via `<Image>` (crop the source to ~940x841 first) | widths 323/646/969; `view-transition-name` on click |
| Form-panel mascot (solar/battery) | 60:747 image (4096x3664, crop) | AVIF + WebP | assumption until the client or designer decides |
| Thank-you badge | 91:14643 (1024x994 fill) | Circles in CSS/SVG + mascot WebP/AVIF (≥522 px wide), overflow via two layers or `clip-path`; or one flattened @3x WebP | The cheer is an animation on this image (hop + confetti) until a cheer asset or Rive file exists |
| Hero fox + €52 card | 63:860 (615x604) | AVIF + WebP, `fetchpriority="high"`, `loading="eager"` | **Pending sign-off (§2)**. Working assumption: use the product-hero pattern instead (vector waving fox + 62:858) until the client approves or a clean version arrives |
| Hero solar + battery | 62:858 | AVIF + WebP | 3.1x source |
| Magnifier fox | 60:345 | AVIF + WebP (crop, downscale from 4096) | |
| Documents fox | 60:849 | AVIF + WebP | 2.7x |
| Icon pattern mask | 60:73 | WebP/PNG alpha mask (CSS `mask-image`) | or ask for the SVG |
| Cheering fox (final CTA) | 60:723, crop from the **2922** sheet, not the 1584 one | AVIF + WebP | 1.63x vs 0.88x |
| Cheering fox, fists up | 78:2856 | AVIF + WebP | 1.5x |
| Solar bulb | 67:875 | AVIF + WebP | 1.1x → ask for the vector original |
| House + batteries | 69:929 | AVIF + WebP | 1.3x |
| Product hero panel / batteries | 72:2733 / 81:3860 | AVIF + WebP | 1.6–1.8x |
| Cloud texture | 60:376 + tint | one pre-tinted AVIF/WebP, or CSS `mix-blend-mode: color` | |
| UI icons ("Frame") | e.g. 60:26, 60:97, 84:4035 | SVG sprite / inline, `currentColor` | |
| "[Vectorized]" icons | e.g. 60:390, 60:411, 89:7475 | SVG, `currentColor` | Replace the "$" money icon with a € variant |
| Raster icons (7 types) | 60:848, 60:370, 60:372, 67:878, 69:926, 81:3847, 81:3849 | need SVG: designer vectorises them like the others, or swap in the matching icon from the same pack (licence) | Interim: PNG 512 via `<Image>` (black only) |
| Stars, quotes, blobs ("Union" 60:383, "Subtract" 60:4), sparkle 60:507 | – | SVG | Stars and quotes only in hidden blocks |
| Flags | 113:1919, 91:13845 | do not export | +32 is fixed |
| Avatars, testimonial and team photos | – | do not export | hidden / not in the MVP / not real |
| 👋 | 60:322 | text emoji with `aria-hidden`, or an SVG | |
| Favicon set | derive from the badge 60:125 | favicon.svg + ico/32/180/192/512 PNG | The full-body fox is unreadable at 16–32 px. A simplified fox-head mark needs the designer; working assumption: the badge cropped to its circle |
| OG default image | none | 1200x630 PNG/JPG | compose from the logo + vector fox on purple; per-page overrides from content JSON |

## 7. Provenance and licence (TO CONFIRM in docs/CONTENT-TODO.md)
- The layer names "ChatGPT Image Sep 22, 2026, 01_37_15 PM 5/9" mean AI-generated mascot art. The waving vector fox and the "[Vectorized]" icons are auto-traced.
- The numeric names ("54544 1", "564654 1", "5874891 1", "6548 1") and "Asset 1 2/3" look like stock downloads.
- Flaticon-style icon names: attribution is required unless the pack is Premium-licensed.
- The avatar and team photos are stock.
