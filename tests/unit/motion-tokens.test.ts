import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { tokenValue } from '../../src/lib/design/tokens';
import { cubicBezier, distance, duration, ease, seconds, spring } from '../../src/lib/motion';

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const normalise = (value: string) => value.replace(/\s+/g, '');

describe('motion tokens', () => {
  it('uses the brief’s starting values', () => {
    expect(duration).toMatchObject({ fast: 150, base: 250, slow: 400 });
    expect(ease.out).toEqual([0.22, 1, 0.36, 1]);
    expect(ease.inOut).toEqual([0.65, 0, 0.35, 1]);
    expect(spring).toMatchObject({ stiffness: 400, damping: 32 });
    expect(Object.values(distance)).toEqual([8, 16, 24]);
  });

  it.each(Object.entries(duration))('CSS duration %s matches motion.ts', (name, ms) => {
    expect(tokenValue(css, `--motion-duration-${name}`)).toBe(`${ms}ms`);
  });

  it.each([
    ['out', ease.out],
    ['in-out', ease.inOut],
  ] as const)('CSS easing %s matches motion.ts', (name, points) => {
    expect(normalise(tokenValue(css, `--ease-${name}`))).toBe(normalise(cubicBezier(points)));
  });

  it.each(Object.entries(distance))('CSS distance %s matches motion.ts', (step, px) => {
    expect(tokenValue(css, `--motion-distance-${step}`)).toBe(`${px}px`);
  });

  it('converts to seconds for GSAP and Motion', () => {
    expect(seconds(duration.base)).toBe(0.25);
  });
});

describe('page transitions', () => {
  it('opts in to native cross-document view transitions', () => {
    expect(normalise(css)).toContain('@view-transition{navigation:auto;}');
  });

  it('keeps the header still without blending two header snapshots', () => {
    const flat = normalise(css);
    expect(flat).toContain('::view-transition-old(site-header){display:none;}');
  });

  it('keeps only short fades under reduced motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('::view-transition-group(*)');
    expect(reduced).toContain('animation: none');
  });
});
