// Motion tokens for GSAP and Motion (brief §6.1). The CSS variables in src/styles/global.css
// hold the same values; tests/unit/motion-tokens.test.ts keeps both in sync. Components use these
// tokens, never one-off values. See docs/MOTION.md for every pattern and its reduced version.

/** Durations in milliseconds. */
export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  /** Page crossfade. */
  page: 200,
} as const;

/** Cubic-bezier control points. */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** Travel distances in px (slide-ins, reveals, press offsets). */
export const distance = {
  1: 8,
  2: 16,
  3: 24,
} as const;

/** The one spring for Motion (`motion/react`). */
export const spring = { type: 'spring', stiffness: 400, damping: 32 } as const;

/** GSAP and Motion take seconds. */
export const seconds = (ms: number): number => ms / 1000;

/** `cubic-bezier(...)` string for GSAP's CustomEase or inline styles. */
export const cubicBezier = (points: readonly [number, number, number, number]): string =>
  `cubic-bezier(${points.join(', ')})`;

/** True when the visitor asked for reduced motion. Safe to call during SSR (returns false). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
