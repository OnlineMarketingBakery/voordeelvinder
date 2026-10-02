// The results and ordering screens' logic (ADR 0013): the production switch, the placeholder
// data, the copy check and the order fields' validators.
import { describe, expect, it } from 'vitest';

import { fill, orderCopy } from '../../src/lib/comparison/copy';
import {
  isBelgianIban,
  isBirthDate,
  isEan,
  placeholderReference,
  readOrder,
  writeOrder,
} from '../../src/lib/comparison/order-state';
import { placeholderComparison } from '../../src/lib/comparison/placeholder';
import {
  hasResults,
  orderPreview,
  resultsAfterLead,
  resultsPath,
} from '../../src/lib/comparison/preview';

describe('the preview switch', () => {
  it('keeps the screens out of production and sends only staging to the results', () => {
    expect(orderPreview('production')).toBe(false);
    expect(['local', 'ci', 'staging'].every((env) => orderPreview(env as 'local'))).toBe(true);
    expect(resultsAfterLead('staging')).toBe(true);
    expect(resultsAfterLead('local')).toBe(false);
    expect(resultsAfterLead('ci')).toBe(false);
    expect(resultsAfterLead('production')).toBe(false);
  });
});

describe('the results route', () => {
  it('is one path per product, with results for energy only so far', () => {
    expect(resultsPath('energie')).toBe('/vergelijken/energie/resultaten');
    expect(hasResults('energie')).toBe(true);
    expect(hasResults('zonnepanelen')).toBe(false);
    expect(hasResults('onbekend')).toBe(false);
  });
});

describe('the placeholder comparison', () => {
  const data = placeholderComparison();
  it('is marked as placeholder, cheapest first, without real supplier names', () => {
    expect(data.placeholder).toBe(true);
    const costs = data.offers.map((offer) => offer.yearlyCost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(data.offers.every((offer) => /^Leverancier [A-Z]$/.test(offer.supplier))).toBe(true);
  });
});

describe('the copy', () => {
  it('fills placeholders and has no em dashes', () => {
    expect(fill(orderCopy.results.subtitle, { count: 5 })).toBe(
      '5 producten, van goedkoopst naar duurst.',
    );
    expect(JSON.stringify(orderCopy)).not.toContain('—');
  });
});

describe('order field validators', () => {
  it('checks a Belgian IBAN with its check digits', () => {
    expect(isBelgianIban('BE68 5390 0754 7034')).toBe(true);
    expect(isBelgianIban('BE69 5390 0754 7034')).toBe(false);
    expect(isBelgianIban('NL91ABNA0417164300')).toBe(false);
  });
  it('checks an EAN code: 18 digits starting with 54', () => {
    expect(isEan('541448820000000001')).toBe(true);
    expect(isEan('541 448 820 000 000 001')).toBe(true);
    expect(isEan('551448820000000001')).toBe(false);
    expect(isEan('5414488200')).toBe(false);
  });
  it('checks a birth date dd/mm/jjjj in the past', () => {
    const today = new Date('2026-10-02');
    expect(isBirthDate('18/11/2000', today)).toBe(true);
    expect(isBirthDate('31/02/2000', today)).toBe(false);
    expect(isBirthDate('01/01/2030', today)).toBe(false);
    expect(isBirthDate('2000-11-18', today)).toBe(false);
  });
  it('makes a VV- reference and keeps the order in the given storage', () => {
    expect(placeholderReference(() => 0)).toBe('VV-100000');
    const memory = new Map<string, string>();
    const store = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
    };
    writeOrder({ offerId: 'a', details: { firstName: 'Jan' }, connection: {} }, store);
    expect(readOrder(store)).toMatchObject({ offerId: 'a', details: { firstName: 'Jan' } });
    expect(readOrder({ getItem: () => '{bad', setItem: () => {} })).toEqual({
      details: {},
      connection: {},
    });
  });
});
