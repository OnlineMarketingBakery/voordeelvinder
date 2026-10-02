// The single-page energy form (energie_vergelijker, Figma 193:2095): its flow, the decimal kW
// field, the checkbox-style yes/no, and the server accepting its leads by flow_id.
import { describe, expect, it } from 'vitest';

import {
  buildSubmission,
  isStepShown,
  visibleFields,
  withCheckboxDefaults,
} from '../../src/lib/flow/engine';
import type { Answers } from '../../src/lib/flow/types';
import { validateNumber } from '../../src/lib/flow/validators/number';
import { engineDerived } from '../../src/lib/form/answers';
import { serverFlowFor, serverFlowVariants } from '../../src/server/lead/flows';
import { toPayload } from '../../src/server/lead/payload';
import { parseLeadRequest } from '../../src/server/lead/validate';
import { contactAnswers, EVENT_ID, flows, LEAD_ID, SUBMITTED_AT } from './lead-fixtures';

const flow = serverFlowVariants().find((candidate) => candidate.id === 'energie_vergelijker')!;
const FLAGS = { preselected: true, energy_preselected: true };

const answers: Answers = {
  energy_type: 'both',
  postcode: '9420',
  supplier: 'luminus',
  meter_type: 'dual',
  digital_meter: 'yes',
  has_solar: 'yes',
  inverter_kw: '3,5',
  injection_day_kwh: '1200',
  injection_night_kwh: '300',
  knows_consumption: 'no',
  home_type: 'terraced',
  household_size: '2',
  heat_pump: 'yes',
  contract_type: 'fixed',
  ...contactAnswers,
};

function body(given: Answers) {
  const filled = withCheckboxDefaults(flow, given);
  return {
    ...structuredClone(
      buildSubmission(flow, filled, {
        lead_id: LEAD_ID,
        event_id: EVENT_ID,
        submitted_at: SUBMITTED_AT,
        derived: engineDerived(FLAGS, filled),
        tracking: { entry_path: '/vergelijken/energie' },
        cookies: { analytics: false, marketing: false },
        page: '/vergelijken/energie',
        test: false,
      }),
    ),
    website: '',
    turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
  };
}

describe('decimal number fields', () => {
  const kw = { id: 'kw', type: 'number', required: true, min: 0.5, max: 100, decimals: 1 } as const;
  it('accept one decimal with a comma or a dot', () => {
    expect(validateNumber('3,5', kw)).toEqual({ ok: true, value: 3.5 });
    expect(validateNumber('3.5', kw)).toEqual({ ok: true, value: 3.5 });
    expect(validateNumber('4', kw)).toEqual({ ok: true, value: 4 });
  });
  it('refuse more decimals than allowed, and decimals on a whole-number field', () => {
    expect(validateNumber('3,55', kw).ok).toBe(false);
    expect(validateNumber('3,5', { id: 'kwh', type: 'number', min: 0, max: 10 }).ok).toBe(false);
  });
});

describe('the energie_vergelijker flow', () => {
  it('shows every section on one page and opens the solar panel only for solar owners', () => {
    const derived = engineDerived(FLAGS, answers);
    expect(flow.steps.filter((step) => isStepShown(flow, step.id, answers, derived))).toHaveLength(
      5,
    );
    const solar = (given: Answers) =>
      visibleFields(flow, 'meter_zonnepanelen', given, engineDerived(FLAGS, given)).map(
        (f) => f.id,
      );
    expect(solar(answers)).toContain('injection_night_kwh');
    expect(solar({ ...answers, meter_type: 'single' })).not.toContain('injection_night_kwh');
    expect(solar({ ...answers, has_solar: 'no' })).not.toContain('inverter_kw');
  });

  it('answers "no" for an unticked checkbox-style yes/no', () => {
    const filled = withCheckboxDefaults(flow, answers);
    expect(filled.electric_car).toBe('no');
    expect(filled.home_battery).toBe('no');
    expect(filled.heat_pump).toBe('yes');
  });
});

describe('the server and the single-page form', () => {
  it('accepts its lead by flow_id and builds the payload with its own labels', () => {
    const parsed = parseLeadRequest(body(answers), flows);
    if (!parsed.ok) throw new Error(parsed.issues.join('; '));
    expect(parsed.submission.flow_id).toBe('energie_vergelijker');
    const payload = toPayload(parsed.submission, {
      receivedAt: new Date(SUBMITTED_AT),
      ip: '203.0.113.7',
      userAgent: 'test',
      siteEnv: 'production',
      isTest: false,
    });
    expect(payload.answers).toMatchObject({
      energy_type: 'both',
      inverter_kw: 3.5,
      digital_meter: 'yes',
      home_battery: 'no',
      contract_type: 'fixed',
    });
    // The tariff questions are not on this form (Tanjil 2026-10-02, waiting for the client).
    expect(payload.answers).not.toHaveProperty('social_tariff');
    expect(payload.answers).not.toHaveProperty('budget_meter');
    expect(payload.labels.home_type).toBe('Rijwoning');
    expect(payload.outcome).toBe('promo');
    expect(payload.call_preference).toEqual({ day: 'wed', slot: '13-14' });
  });

  it('still classifies: an address outside Flanders makes it no_promo', () => {
    const parsed = parseLeadRequest(body({ ...answers, postcode: '1000' }), flows);
    if (!parsed.ok) throw new Error(parsed.issues.join('; '));
    const payload = toPayload(parsed.submission, {
      receivedAt: new Date(SUBMITTED_AT),
      ip: '203.0.113.7',
      userAgent: 'test',
      siteEnv: 'production',
      isTest: false,
    });
    expect(payload.outcome).toBe('no_promo');
    expect(payload.outcome_reasons).toEqual(['region_not_flanders']);
  });

  it('refuses an unknown flow_id as the energy flow, and finds the variant by id', () => {
    const issues = parseLeadRequest({ ...body(answers), flow_id: 'onbekend' }, flows);
    expect(issues.ok).toBe(false);
    expect(serverFlowFor('energie', 'energie_vergelijker').id).toBe('energie_vergelijker');
    expect(serverFlowFor('energie', 'energie').id).toBe('energie');
  });
});
