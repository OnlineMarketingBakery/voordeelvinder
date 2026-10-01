// Lead qualification on the site (ADR 0010, src/server/rules/energie.json).
import { describe, expect, it } from 'vitest';

import { qualify } from '../../../src/server/lead/qualify';

const home = { social_tariff: 'no', budget_meter: 'no' };
const flanders = { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' };

describe('energy qualification', () => {
  it('is promo with no reasons when no rule holds', () => {
    expect(qualify('energie', home, flanders)).toEqual({ outcome: 'promo', outcome_reasons: [] });
  });

  it('"Weet ik niet" on the budget meter stays promo (draft rule, TO CONFIRM)', () => {
    expect(qualify('energie', { ...home, budget_meter: 'unknown' }, flanders).outcome).toBe(
      'promo',
    );
  });

  it('gives each reason on its own', () => {
    const cases: Array<[Record<string, unknown>, Record<string, unknown>, string]> = [
      [home, { ...flanders, region: 'wallonia' }, 'region_not_flanders'],
      [home, { ...flanders, region: 'brussels' }, 'region_not_flanders'],
      [{ ...home, social_tariff: 'yes' }, flanders, 'social_tariff'],
      [{ ...home, budget_meter: 'yes' }, flanders, 'budget_meter'],
      [
        { ...home, is_business: true, business_gas_band: 'over_100k' },
        flanders,
        'business_over_100k',
      ],
      [
        { ...home, is_business: true, business_electricity_band: 'over_100k' },
        flanders,
        'business_over_100k',
      ],
    ];
    for (const [answers, derived, reason] of cases) {
      expect(qualify('energie', answers, derived), reason).toEqual({
        outcome: 'no_promo',
        outcome_reasons: [reason],
      });
    }
  });

  it('a business under 100,000 kWh is treated like a home', () => {
    const answers = {
      ...home,
      is_business: true,
      business_electricity_band: 'under_100k',
      business_gas_band: 'under_100k',
    };
    expect(qualify('energie', answers, flanders).outcome).toBe('promo');
  });

  it('lists every reason that holds, in rule order', () => {
    const answers = {
      social_tariff: 'yes',
      budget_meter: 'yes',
      is_business: true,
      business_gas_band: 'over_100k',
    };
    expect(
      qualify('energie', answers, { ...flanders, region: 'wallonia' }).outcome_reasons,
    ).toEqual(['region_not_flanders', 'social_tariff', 'budget_meter', 'business_over_100k']);
  });
});

describe('solar panels and home battery', () => {
  it('are always pending (no rules yet)', () => {
    for (const product of ['zonnepanelen', 'thuisbatterij'] as const) {
      expect(qualify(product, { social_tariff: 'yes' }, { region: 'wallonia' })).toEqual({
        outcome: 'pending',
        outcome_reasons: [],
      });
    }
  });
});
