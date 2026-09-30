// Keeps the e2e lead fixture (tests/support/energy-lead.ts) valid against the real flow.
import { describe, expect, it } from 'vitest';

import { DUMMY_TURNSTILE_TOKEN, energyLeadBody } from '../../support/energy-lead';

describe('energy lead fixture', () => {
  it('builds a complete submission from the real energy flow', () => {
    const body = energyLeadBody({ test: true });
    expect(body).toMatchObject({
      product: 'energie',
      flow_id: 'energie',
      answers: { energy_type: 'both', supplier: 'luminus', meter_type: 'single' },
      derived: { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' },
      contact: { phone_e164: '+32475000000', email: 'test.persoon@example.be' },
      call_preference: { day: 'wed', slot: '13-14' },
      consent: { terms: true },
      meta: { page: '/vergelijken/energie', test: true },
      website: '',
      turnstile_token: DUMMY_TURNSTILE_TOKEN,
    });
    expect(body.lead_id).not.toBe(energyLeadBody().lead_id);
    expect(energyLeadBody({ website: 'spam' }).website).toBe('spam');
  });
});
