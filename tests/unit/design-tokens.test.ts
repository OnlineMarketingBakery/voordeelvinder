import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { contrastRatio, parseColor } from '../../src/lib/design/contrast';
import { readTokens, tokenValue } from '../../src/lib/design/tokens';

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const color = (name: string) => tokenValue(css, `--color-${name}`);

describe('contrast helpers', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#7051ed')).toBeCloseTo(5.14, 2);
  });

  it('composites translucent colours over the background', () => {
    expect(parseColor('rgb(255 255 255 / 0.92)')).toEqual([255, 255, 255, 0.92]);
    expect(contrastRatio('rgb(255 255 255 / 0.65)', '#7051ed')).toBeCloseTo(3.1, 1);
  });
});

describe('design tokens', () => {
  it('only defines on-palette colours (Tailwind defaults removed)', () => {
    expect(css).toContain('--color-*: initial;');
    const names = readTokens(css, '--color-').map((t) => t.name);
    expect(names).toContain('--color-purple-600');
    expect(names).not.toContain('--color-red-500');
  });

  // Text pairs used in the design (and the NEW accessible variants): WCAG AA, 4.5:1 for normal text.
  const text: Array<[fg: string, bg: string]> = [
    ['ink-900', 'white'],
    ['ink-800', 'white'],
    ['ink-600', 'white'],
    ['ink-600', 'lavender-50'],
    ['ink-600', 'lavender-100'],
    ['ink-600', 'lime-50'],
    ['ink-600', 'lime-400'],
    ['ink-900', 'lime-300'],
    ['ink-900', 'lime-400'],
    ['white', 'purple-600'],
    ['white', 'purple-500'],
    ['purple-500', 'white'],
    ['purple-700', 'lavender-50'],
    ['on-purple-muted', 'purple-600'],
    ['ink-placeholder', 'white'],
    ['ink-placeholder', 'lavender-50'],
    ['danger', 'white'],
    ['danger', 'lavender-50'],
  ];
  it.each(text)('%s text on %s meets 4.5:1', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  // Boundaries of form controls (WCAG 1.4.11): 3:1 against what surrounds them.
  it.each([
    ['control-border', 'white'],
    ['control-border', 'lavender-50'],
    ['purple-500', 'white'],
  ])('%s against %s meets 3:1 for UI components', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });

  // Focus rings (WCAG 1.4.11): purple on light surfaces, white on purple (`surface-dark`).
  it.each([
    ['purple-500', 'white'],
    ['purple-500', 'lavender-50'],
    ['purple-500', 'lime-300'],
    ['white', 'purple-600'],
    ['white', 'purple-500'],
  ])('focus ring %s is visible on %s (3:1)', (ring, surface) => {
    expect(contrastRatio(color(ring), color(surface))).toBeGreaterThanOrEqual(3);
  });

  it('removes Tailwind defaults so only tokens can be used', () => {
    for (const reset of ['--color-*', '--text-*', '--radius-*', '--shadow-*', '--drop-shadow-*']) {
      expect(css).toContain(`${reset}: initial;`);
    }
  });

  // The PromoCheckers lesson: lime is a background behind dark ink, never text on white.
  it.each(['lime-300', 'lime-400'])('%s is not usable as text on white', (lime) => {
    expect(contrastRatio(color(lime), color('white'))).toBeLessThan(3);
  });
});
