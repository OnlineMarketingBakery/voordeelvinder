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

| Layer              | Tool                                                        | Where                         |
| ------------------ | ----------------------------------------------------------- | ----------------------------- |
| Page transitions   | Native cross-document view transitions (`@view-transition`) | Every page                    |
| Instant navigation | Astro prefetch (`prefetchAll`, strategy `viewport`)         | Every internal link           |
| Page motion        | GSAP + ScrollTrigger/SplitText, imported per page           | Homepage, product pages, blog |
| Form motion        | Motion (`motion/react`) with `LazyMotion` + `m`             | Form island only              |
| Simple states      | CSS transitions, `motion-safe:` / `motion-reduce:`          | Everywhere                    |

**Not used:**

- `<ClientRouter />`: it breaks the cookie banner, page views and script setup.
- Speculation Rules `prerender`: a prerendered page runs its scripts and would count page
  views nobody saw.
- Smooth-scroll libraries and scroll snapping.

## Patterns

Each pattern is listed with its reduced-motion version (`prefers-reduced-motion: reduce`). When
reduced motion is on, only short fades remain: no slides, parallax, scroll-linked motion, morphs
or loops.

| Pattern                              | Status                    | Normal                                                                                                                                         | Reduced motion            |
| ------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Page change                          | **Built** (Phase 2)       | Root crossfade, `page` duration, `ease-out`                                                                                                    | Crossfade at `fast`       |
| Header stays still                   | **Built** (Phase 2)       | `view-transition-name: site-header`, no animation                                                                                              | Same                      |
| Anchor scroll ("Hoe het werkt" etc.) | **Built** (Phase 2)       | `scroll-behavior: smooth`                                                                                                                      | Instant jump              |
| Hero entrance                        | Phase 3                   | CSS only, from first paint; the headline and hero image are never hidden while waiting for JS (LCP)                                            | No motion                 |
| Scroll reveals                       | Phase 3                   | Sections and cards rise `distance[2]` and fade in once, staggered. CSS `animation-timeline: view()` inside `@supports`; GSAP only where needed | Visible immediately       |
| "Hoe het werkt"                      | Phase 3/7                 | Steps build up on scroll; pinned on desktop only                                                                                               | Static                    |
| Cards / buttons                      | Phase 3                   | Hover lift (desktop only), press scale                                                                                                         | Colour change only        |
| FAQ                                  | Phase 3                   | Smooth open/close                                                                                                                              | Instant                   |
| Comparison rows                      | Phase 3                   | Rows tick in                                                                                                                                   | Static                    |
| Counters                             | Not planned               | Only for approved numbers (§2), and there are none                                                                                             | —                         |
| Form step change                     | Phase 4                   | New step slides in from the direction of travel on the spring; the card height animates                                                        | Short fade                |
| Answer cards                         | Phase 4                   | Scale down on press, spring into selected, check mark draws in                                                                                 | Instant state change      |
| Auto-advance                         | Phase 4 (Tanjil approves) | ~300 ms after a tap/click on single-choice steps; never on keyboard input                                                                      | Same timing, no slide     |
| Revealed questions                   | Phase 4                   | Expand/collapse smoothly                                                                                                                       | Instant                   |
| Progress                             | Phase 4                   | Bar fills on the spring; "Stap X van Y" rolls; small idle accent on the current segment                                                        | Bar jumps; no idle accent |
| Errors                               | Phase 4                   | Field shakes once (~6 px), message fades in; focus moves immediately                                                                           | Message fades in only     |
| Submit                               | Phase 4/5                 | Loading state at once; thank-you page prefetched when the last step appears; no artificial delay                                               | Same                      |
| Product card → form card             | Phase 7 (signature)       | The clicked CTA carries the name and morphs into the form card                                                                                 | Plain crossfade           |
| Form card → thank-you card           | Phase 7 (signature)       | Translate plus height morph                                                                                                                    | Plain crossfade           |
| Mascot moves / cheers                | Phase 7 (signature)       | Needs a split vector or Rive mascot from the designer; until then whole-image motion only                                                      | Static                    |

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
- Before each production release, check manually with Reduce Motion on in the phone's
  settings, and with 4× CPU throttling in Chrome DevTools.
