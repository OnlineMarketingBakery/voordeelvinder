import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cssTimeMs } from '../../src/lib/css-time';
import { tokenValue } from '../../src/lib/design/tokens';
import { duration } from '../../src/lib/motion';

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');

describe('cssTimeMs', () => {
  it('reads milliseconds and seconds', () => {
    expect(cssTimeMs('400ms', 0)).toBe(400);
    expect(cssTimeMs('250ms', 0)).toBe(250);
    expect(cssTimeMs('1s', 0)).toBe(1000);
    expect(cssTimeMs('1.5s', 0)).toBe(1500);
  });

  // The build minifies the tokens: 400ms reaches the browser as ".4s" (not 0.4 ms).
  it('reads the minified form of every duration token', () => {
    for (const ms of Object.values(duration)) {
      const minified = `${ms / 1000}s`.replace(/^0/, ''); // 400 → ".4s"
      expect(cssTimeMs(minified, 0)).toBeCloseTo(ms);
    }
    expect(cssTimeMs('.464s', 0)).toBeCloseTo(464);
    expect(cssTimeMs('0.15s', 0)).toBeCloseTo(150);
  });

  it('ignores the whitespace getPropertyValue leaves around a custom property', () => {
    expect(cssTimeMs(' 400ms ', 0)).toBe(400);
    expect(cssTimeMs('\n.25s', 0)).toBeCloseTo(250);
  });

  it('falls back when there is no plain time value', () => {
    expect(cssTimeMs('', 400)).toBe(400);
    expect(cssTimeMs('400', 400)).toBe(400);
    expect(cssTimeMs('calc(1.5 * 400ms)', 400)).toBe(400);
    expect(cssTimeMs('var(--motion-duration-slow)', 400)).toBe(400);
    expect(cssTimeMs('fast', 400)).toBe(400);
  });

  it('matches the tokens as written in global.css', () => {
    expect(cssTimeMs(tokenValue(css, '--motion-duration-slow'), 0)).toBe(duration.slow);
    expect(cssTimeMs(tokenValue(css, '--motion-duration-base'), 0)).toBe(duration.base);
  });
});
