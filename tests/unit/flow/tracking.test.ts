// cleanTrackingValue (src/lib/flow/tracking.ts): tracking values are visitor-controlled and go
// into the lead sheet, so they are cut to length and dropped when they could be a formula.
import { describe, expect, it } from 'vitest';

import { cleanTrackingValue, TRACKING_MAX_LENGTH } from '../../../src/lib/flow/tracking';

describe('cleanTrackingValue', () => {
  it('keeps click ids, UTMs, GA ids and URLs as they are (trimmed)', () => {
    for (const value of [
      '',
      'Cj0KCQjw-abc_123',
      'fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz',
      'GA1.1.123456789.1700000000',
      'zomer actie – été',
      'https://www.google.com/search?q=energie+vergelijken&hl=nl#top',
      '/vergelijken/energie?utm_source=meta&utm_medium=paid%20social',
      "a,b;c|d!e*f'g$h[i]j@k=l",
    ]) {
      expect(cleanTrackingValue(value), value).toBe(value);
    }
    expect(cleanTrackingValue('  facebook \n')).toBe('facebook');
  });

  it('drops values that start like a formula or use characters outside the charset', () => {
    for (const value of [
      '=IMPORTDATA("https://x.example")',
      '@SUM(A1)',
      '  =1+1',
      'a"b',
      'call(me)',
      '<b>',
      'back\\slash',
      'curly{}',
      'tab\there',
      'nul\u0000',
      'caret^',
      'tick`',
    ]) {
      expect(cleanTrackingValue(value), value).toBe('');
    }
  });

  it(`cuts values to ${TRACKING_MAX_LENGTH} characters, counting code points`, () => {
    expect(cleanTrackingValue('x'.repeat(2000))).toBe('x'.repeat(TRACKING_MAX_LENGTH));
    const accents = 'é'.repeat(TRACKING_MAX_LENGTH + 5);
    expect([...cleanTrackingValue(accents)]).toHaveLength(TRACKING_MAX_LENGTH);
    // A cut that ends on a space is trimmed again.
    expect(cleanTrackingValue(`${'x'.repeat(TRACKING_MAX_LENGTH - 1)} yz`)).toHaveLength(
      TRACKING_MAX_LENGTH - 1,
    );
  });
});
