# Motion

The site should feel like an app: instant navigation, elements that glide between pages, and a
form that responds to every tap (brief §6.1). Figma contains no animation, so everything here
is proposed in code and shown on staging first. The signature moments (Phase 7) need approval
from Tanjil and the designer.

## Tokens

The values live in `src/styles/global.css`: `@theme static` for the durations and distances,
and `@theme` for the easings. [`src/lib/motion.ts`](../src/lib/motion.ts) exports the same
values for GSAP and Motion, and `tests/unit/motion-tokens.test.ts` fails if the two drift apart.
Components use these tokens and never one-off values.

| Token       | CSS                             | JS (`src/lib/motion.ts`) | Value                              |
| ----------- | ------------------------------- | ------------------------ | ---------------------------------- |
| fast        | `--motion-duration-fast`        | `duration.fast`          | 150 ms                             |
| base        | `--motion-duration-base`        | `duration.base`          | 250 ms                             |
| slow        | `--motion-duration-slow`        | `duration.slow`          | 400 ms                             |
| page        | `--motion-duration-page`        | `duration.page`          | 200 ms (page crossfade)            |
| ease out    | `--ease-out` / `ease-out`       | `ease.out`               | `cubic-bezier(0.22, 1, 0.36, 1)`   |
| ease in-out | `--ease-in-out` / `ease-in-out` | `ease.inOut`             | `cubic-bezier(0.65, 0, 0.35, 1)`   |
| spring      | —                               | `spring`                 | stiffness 400, damping 32 (Motion) |
| distances   | `--motion-distance-1…3`         | `distance[1…3]`          | 8, 16, 24 px                       |

GSAP and Motion take seconds: use `seconds(duration.base)`.

## Tools (decided in the brief)

| Layer              | Tool                                                                            | Where                         |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------- |
| Page transitions   | Native cross-document view transitions (`@view-transition`)                     | Every page                    |
| Instant navigation | Astro prefetch (`prefetchAll`, strategy `viewport`)                             | Every internal link           |
| Page motion        | GSAP + ScrollTrigger/SplitText, imported per page                               | Homepage, product pages, blog |
| Form motion        | Motion (`motion/react`) with `LazyMotion` + `m` (features load after hydration) | Form island only              |
| Simple states      | CSS transitions, `motion-safe:` / `motion-reduce:`                              | Everywhere                    |

**Not used:**

- `<ClientRouter />`: it breaks the cookie banner, page views and script setup.
- Speculation Rules `prerender`: a prerendered page runs its scripts and would count page
  views nobody saw.
- Smooth-scroll libraries and scroll snapping.

## Patterns

Each pattern is listed with its reduced-motion version (`prefers-reduced-motion: reduce`). When
reduced motion is on, only short fades remain: no slides, parallax, scroll-linked motion, morphs
or loops.

| Pattern                              | Status                                            | Normal                                                                                                                                                                                                                                                                                                                                                                                                          | Reduced motion                       |
| ------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Page change                          | **Built** (Phase 2)                               | Root crossfade, `page` duration, `ease-out`                                                                                                                                                                                                                                                                                                                                                                     | Crossfade at `fast`                  |
| Header stays still                   | **Built** (Phase 2)                               | `view-transition-name: site-header`, no animation                                                                                                                                                                                                                                                                                                                                                               | Same                                 |
| Anchor scroll ("Hoe het werkt" etc.) | **Built** (Phase 2)                               | `scroll-behavior: smooth`                                                                                                                                                                                                                                                                                                                                                                                       | Instant jump                         |
| Hero entrance                        | Phase 3                                           | CSS only, from first paint; the headline and hero image are never hidden while waiting for JS (LCP)                                                                                                                                                                                                                                                                                                             | No motion                            |
| 404 mascot                           | **Built** (Phase 3)                               | CSS only: the fox fades and scales in once (0.94 → 1, `slow`, `ease-out`) and sways twice (±4°), no loop; the h1 is visible at first paint                                                                                                                                                                                                                                                                      | No motion                            |
| Scroll reveals                       | Phase 3                                           | Sections and cards rise `distance[2]` and fade in once, staggered. CSS `animation-timeline: view()` inside `@supports`; GSAP only where needed                                                                                                                                                                                                                                                                  | Visible immediately                  |
| "Hoe het werkt"                      | Phase 3/7                                         | Steps build up on scroll; pinned on desktop only                                                                                                                                                                                                                                                                                                                                                                | Static                               |
| Cards / buttons                      | Phase 3                                           | Hover lift (desktop only), press scale                                                                                                                                                                                                                                                                                                                                                                          | Colour change only                   |
| FAQ                                  | Phase 3                                           | Smooth open/close                                                                                                                                                                                                                                                                                                                                                                                               | Instant                              |
| Comparison rows                      | Phase 3                                           | Rows tick in                                                                                                                                                                                                                                                                                                                                                                                                    | Static                               |
| Counters                             | Not planned                                       | Only for approved numbers (§2), and there are none                                                                                                                                                                                                                                                                                                                                                              | —                                    |
| Form step change                     | **Built** (PR 17)                                 | The new step slides in `distance[3]` from the direction of travel (Volgende and auto-advance from the right, "Terug" from the left) on the spring and fades in at `base`; the step area's height follows on the spring (a Web Animation with the spring as `linear()`, ease-out before Safari 17.2). The old step is replaced at once (one step in the DOM, unique ids); a restore after hydration doesn't move | Fade at `fast`, height jumps         |
| Answer cards                         | **Built** (PR 17)                                 | CSS scale to 0.98 on press (`motion-safe:active:`; Motion's `whileTap` would make each label a tab stop); the radio circle springs in (0.8 → 1) and its white check mark draws in (`pathLength`, `base`)                                                                                                                                                                                                        | Instant state change                 |
| Auto-advance                         | **Built** (PR 17), on; Tanjil approves on staging | 300 ms after a pointer tap or click on a card, when the card's question is the step's only visible field (single choice or yes/no), as if "Volgende" was pressed (validated). Never on keyboard input (a pointerdown on that same card must precede the change), never on the last step. Any other navigation cancels it. Switch: `settings.autoAdvance` in `src/content/flows/nl/_copy.json`                   | Same timing, no slide                |
| Revealed questions                   | **Built** (PR 17)                                 | Fields with `visibleIf` that appear after the step did expand (height 0 → auto on the spring, fade `base`) and collapse when hidden; a collapsing field is `inert`                                                                                                                                                                                                                                              | Instant                              |
| Progress                             | **Built** (PR 17)                                 | The bar fill (full width, `translateX`) moves on the spring; each number in "Stap X van Y" rolls (up when it grows, down when it shrinks). No idle accent yet (optional)                                                                                                                                                                                                                                        | Bar jumps; numbers swap              |
| Errors                               | **Built** (PR 17)                                 | "Volgende" with errors shakes each flagged field once (±6 px, `slow`, `ease-out`; a later blur error doesn't shake); every error and warning line fades in (`base`); focus moves at once                                                                                                                                                                                                                        | Message fades in (`fast`) only       |
| Submit                               | **Built** (PR 17; the POST is Phase 5)            | The thank-you page is prefetched (`prefetch()` from `astro:prefetch`) when the last step shows; "Verstuur" locks and shows a spinner at once; no artificial delay                                                                                                                                                                                                                                               | Same, the spinner doesn't spin       |
| Product card → form card             | **Built** (PR 17, hook; Phase 7 polish)           | A click on a product card's CTA names that card `form-card` in `pageswap` (src/scripts/morph.ts, only for a plain click to `/vergelijken/<product>`); the form card always carries `form-card` (it is the only one on its page). The box moves and resizes at `slow` on `ease-in-out`, the snapshots crossfade at `page`. Arriving any other way the form card fades in with the page                           | Plain crossfade (no name set)        |
| Form card → thank-you card           | **Built** (PR 18, hook; Phase 7 polish)           | The form card and the thank-you card both carry `view-transition-name: form-card` (the only one on each page), so "Verstuur" morphs the form card into the thank-you card (box and size at `slow` on `ease-in-out`, snapshots crossfade at `page`)                                                                                                                                                              | Plain crossfade (no group animation) |
| Mascot moves / cheers                | Phase 7 (signature)                               | Needs a split vector or Rive mascot from the designer; until then whole-image motion only                                                                                                                                                                                                                                                                                                                       | Static                               |
| Thank-you celebration                | **Built** (Phase 4)                               | CSS only, after the crossfade: the badge hops once (`distance[3]`), confetti bursts out; `celebrate.ts` decides (Phase 5: lead is safe)                                                                                                                                                                                                                                                                         | Static badge, no confetti            |

## The form island (PR 17)

Where it lives: `src/components/form/motion.tsx` (the React pieces), `src/lib/form/motion.ts`
(the pure parts: direction, the auto-advance guard, every variant and its reduced version,
unit-tested in `tests/unit/form-motion.test.ts`), `src/lib/morph.ts` + `src/scripts/morph.ts`
(the card morph).

- **Bundle.** `LazyMotion` with `m` components; `domAnimation` comes from
  `src/components/form/motion-features.ts`, a separate chunk loaded right after hydration.
  Until it is there nothing starts from a hidden state (`useMotionReady`), so a slow or failed
  chunk only costs the animations. The `m` components add about 20 kB gzipped to the island's
  first JavaScript, the features chunk about 15 kB.
- **Hydration.** Everything renders in its final state on the server (`initial={false}`); the
  reduced-motion preference is read with `useSyncExternalStore` (false on the server), so the
  first client render matches the HTML.
- **Never waiting.** The engine updates the step and the answers at once; the title focus, the
  scroll and the `aria-live` announcement happen in the same render as before PR 17.
- **Auto-advance switch.** `settings.autoAdvance` in `src/content/flows/nl/_copy.json` (default
  `true`). Set it to `false` to turn auto-advance off; "Volgende" works the same either way.
- **Clipping.** The step area clips (`overflow: clip`, never `hidden`, so `scrollIntoView` can't
  scroll it) with 8 px of room for focus rings and the shake.

## Rules

- **Never block the visitor.** Animations can be interrupted, taps during an animation still
  work, and nothing waits for an animation before accepting input or sending the lead. Focus
  moves and `aria-live` announcements never wait for an animation either.
- **Performance.** Animate `transform` and `opacity` only. GSAP never loads on the form page.
  Pause loops when they're off-screen or the tab is hidden. The §11 targets (LCP < 2.5 s,
  CLS < 0.1, INP < 200 ms, Lighthouse ≥ 90 on mobile) apply with all motion on. Test with 4×
  CPU throttling.
- **Mobile and in-app browsers.** Use `100dvh`/`100svh`, never `100vh`. Sticky bottom buttons
  respect `env(safe-area-inset-bottom)`.
- **Paid-traffic pages stay light.** The form and `/l/*` get the form motion and
  micro-interactions only.
- **Unique view-transition names.** Set a name only on the clicked element (on click or in
  `pageswap`), never on repeated elements.
- **Nothing flashes more than three times a second.**

## Testing

- The e2e suite runs with `reducedMotion: 'reduce'`, so results are stable.
- From Phase 4, one extra run per flow keeps motion on and clicks through as fast as possible.
  It checks that no step is skipped and nothing is sent twice.
- `tests/e2e/form-motion.spec.ts`: auto-advance on a click but never on the keyboard, a quick
  "Volgende" or "Terug" after a tap moves once, the whole solar path by taps with reduced
  motion and with motion on (no step skipped, one thank-you navigation), and no layout shift
  when the island hydrates (boxes with and without JavaScript; Chromium's layout-shift entries).
  `tests/e2e/form.spec.ts` picks radios with the keyboard so auto-advance can't race it.
- Before each production release, check manually with Reduce Motion on in the phone's
  settings, and with 4× CPU throttling in Chrome DevTools.
