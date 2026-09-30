// parseLeadRequest (src/server/lead/validate.ts, brief §9.1 steps 2, 3 and 5): the server
// rebuilds every submission from the posted answers with its own flows.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowFile, sharedStepsFile, type Flow } from '../../src/lib/flow/schema';
import type { Product } from '../../src/lib/flow/types';
import {
  HONEYPOT_FIELD,
  impliedValues,
  parseLeadRequest,
  submittedAnswerKeys,
  TURNSTILE_FIELD,
} from '../../src/server/lead/validate';
import {
  batteryAnswers,
  body,
  clientSubmission,
  energyAnswers,
  flows,
  solarAnswers,
  withValue,
} from './lead-fixtures';

const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));

const energy = () => body('energie', energyAnswers);

function issuesOf(input: unknown, using: Record<Product, Flow> = flows): string[] {
  const result = parseLeadRequest(input, using);
  if (result.ok) throw new Error('expected a 400');
  expect(result.status).toBe(400);
  return result.issues;
}

function accepted(input: unknown) {
  const result = parseLeadRequest(input, flows);
  if (!result.ok) throw new Error(`expected ok, got ${result.issues.join('; ')}`);
  return result;
}

describe('parseLeadRequest: valid bodies', () => {
  it('rebuilds the form submission exactly, for every product', () => {
    for (const [product, answers] of [
      ['energie', energyAnswers],
      ['zonnepanelen', solarAnswers],
      ['thuisbatterij', batteryAnswers],
    ] as const) {
      const result = accepted(body(product, answers));
      expect(result.submission, product).toEqual(clientSubmission(product, answers));
      expect(result.honeypot).toBe(false);
      expect(result.turnstileToken).toBe('XXXX.DUMMY.TOKEN.XXXX');
    }
  });

  it('normalises the contact the same way as the form', () => {
    const { submission } = accepted(energy());
    expect(submission.contact).toEqual({
      first_name: 'Jan',
      last_name: 'Peeters',
      phone_e164: '+32475123456',
      phone_display: '+32 475 12 34 56',
      email: 'jan.peeters@example.be',
    });
    expect(submission.call_preference).toEqual({ day: 'wed', slot: '13-14' });
    expect(submission.consent).toEqual({
      cookies: { analytics: true, marketing: true },
      terms: true,
      newsletter: false,
    });
  });

  it('recomputes region and province from the postcode (never trusts the posted ones)', () => {
    const forged = withValue(energy(), 'derived', {
      postcode: '4000',
      region: 'flanders',
      province: 'antwerpen',
    });
    expect(accepted(forged).submission.derived).toEqual({
      postcode: '4000',
      region: 'wallonia',
      province: 'luik',
    });
    const noRegion = withValue(energy(), 'derived', { postcode: '9000' });
    expect(accepted(noRegion).submission.derived).toEqual({
      postcode: '9000',
      region: 'flanders',
      province: 'oost-vlaanderen',
    });
  });

  it('recomputes the phone display from the E.164 number (the posted display is ignored)', () => {
    const forged = withValue(energy(), 'contact.phone_display', 'bel me niet');
    expect(accepted(forged).submission.contact.phone_display).toBe('+32 475 12 34 56');
    const noDisplay = withValue(energy(), 'contact.phone_display', undefined);
    expect(accepted(noDisplay).submission.contact.phone_display).toBe('+32 475 12 34 56');
    const national = withValue(energy(), 'contact.phone_e164', '0475/12.34.56');
    expect(accepted(national).submission.contact.phone_e164).toBe('+32475123456');
  });

  it('drops answers of hidden fields and branches not taken', () => {
    // Electricity only: no gas kWh; knows the consumption: no household questions.
    const electricity = body('energie', { ...energyAnswers, product_choice: 'electricity' });
    const stale = {
      ...electricity,
      answers: {
        ...(electricity.answers as object),
        gas_kwh: 12000,
        household_size: '2',
        heat_pump: 'yes',
        business_gas_band: 'over_100k',
        business_electricity_band: 'over_100k',
      },
    };
    const { submission } = accepted(stale);
    expect(submission.answers).not.toHaveProperty('gas_kwh');
    expect(submission.answers).not.toHaveProperty('household_size');
    expect(submission.answers).not.toHaveProperty('heat_pump');
    expect(submission.answers).not.toHaveProperty('business_gas_band');
    expect(submission.answers).not.toHaveProperty('business_electricity_band');
    expect(submission.answers.energy_type).toBe('electricity');
    // Even a hidden answer that wouldn't validate is simply dropped.
    const invalidHidden = withValue(stale, 'answers.gas_kwh', 'veel');
    expect(accepted(invalidHidden).submission.answers).not.toHaveProperty('gas_kwh');
  });

  it('keeps business bands only for a business, per energy type', () => {
    const business = body('energie', {
      ...energyAnswers,
      is_business: true,
      business_electricity_band: 'over_100k',
      business_gas_band: 'under_100k',
    });
    expect(accepted(business).submission.answers).toMatchObject({
      is_business: true,
      business_electricity_band: 'over_100k',
      business_gas_band: 'under_100k',
    });
    const home = withValue(business, 'answers.is_business', false);
    expect(accepted(home).submission.answers).not.toHaveProperty('business_electricity_band');
  });

  it('reads a filled honeypot and a missing Turnstile token', () => {
    const bot = accepted({ ...energy(), [HONEYPOT_FIELD]: 'https://spam.example' });
    expect(bot.honeypot).toBe(true);
    expect(accepted({ ...energy(), [HONEYPOT_FIELD]: '   ' }).honeypot).toBe(false);
    const bare = withValue(
      withValue(energy(), HONEYPOT_FIELD, undefined),
      TURNSTILE_FIELD,
      undefined,
    );
    expect(accepted(bare)).toMatchObject({ honeypot: false, turnstileToken: '' });
  });

  it('fills missing tracking keys with ""', () => {
    const tracking = withValue(energy(), 'tracking', { gclid: 'abc' });
    expect(accepted(tracking).submission.tracking).toMatchObject({
      gclid: 'abc',
      fbclid: '',
      entry_path: '',
    });
  });

  it('accepts a preselected visit (no product step answered) and ?test=1', () => {
    const preselected = clientSubmission('zonnepanelen', solarAnswers, { preselected: true });
    const result = accepted({ ...structuredClone(preselected), website: '' });
    expect(result.submission).toEqual(preselected);
    const test = withValue(energy(), 'meta.test', true);
    expect(accepted(test).submission.meta).toEqual({ page: '/vergelijken/energie', test: true });
  });
});

describe('parseLeadRequest: rejected bodies (400)', () => {
  it('rejects a body that is not an object', () => {
    expect(issuesOf(null)).toEqual(['(body): Invalid input: expected object, received null']);
    expect(issuesOf('lead')).toHaveLength(1);
  });

  it('rejects unknown keys at every level', () => {
    expect(issuesOf({ ...energy(), is_test: false })[0]).toMatch(/Unrecognized key.*is_test/);
    expect(issuesOf(withValue(energy(), 'meta.user_agent', 'x'))[0]).toMatch(/^meta: Unrecognized/);
    expect(issuesOf(withValue(energy(), 'tracking.utm_foo', 'x'))[0]).toMatch(/^tracking: /);
    expect(issuesOf(withValue(energy(), 'answers.favourite_colour', 'blue'))).toEqual([
      'answers.favourite_colour: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'contact.age', '42'))).toEqual([
      'contact.age: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'consent.marketing_calls', true))).toEqual([
      'consent.marketing_calls: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'derived.municipality', 'Gent'))).toEqual([
      'derived.municipality: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'call_preference.note', 'x'))[0]).toMatch(
      /^call_preference: Unrecognized/,
    );
  });

  it('rejects fields that are never sent, or sent in the wrong place', () => {
    expect(issuesOf(withValue(energy(), 'answers.product_choice', 'both'))).toEqual([
      'answers.product_choice: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.email', 'jan@example.be'))).toEqual([
      'answers.email: unknown field',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.postcode', '9000'))).toEqual([
      'answers.postcode: unknown field',
    ]);
  });

  it("rejects another product's questions", () => {
    const solar = body('zonnepanelen', solarAnswers);
    expect(issuesOf(withValue(solar, 'answers.supplier', 'engie'))).toEqual([
      'answers.supplier: unknown field',
    ]);
    expect(issuesOf(withValue(solar, 'answers.energy_type', 'both'))).toEqual([
      'answers.energy_type: unknown field',
    ]);
  });

  it('rejects bad codes', () => {
    expect(issuesOf(withValue(energy(), 'answers.meter_type', 'Dag/nachtmeter'))).toEqual([
      'answers.meter_type: option_unknown',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.supplier', 'Luminus'))).toEqual([
      'answers.supplier: option_unknown',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.social_tariff', 'ja'))).toEqual([
      'answers.social_tariff: option_unknown',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.energy_type', 'water'))).toEqual([
      'answers.energy_type: option_unknown',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.energy_type', 3))).toEqual([
      'answers.energy_type: option_unknown',
    ]);
    expect(issuesOf(withValue(energy(), 'call_preference', { day: 'sat', slot: '13-14' }))).toEqual(
      ['call_preference: day_unknown'],
    );
    // "false" as text: not a boolean (and truthy, so the business bands would be asked too).
    expect(issuesOf(withValue(energy(), 'answers.is_business', 'false'))).toEqual([
      'answers.is_business: invalid_type',
      'answers.business_electricity_band: required',
      'answers.business_gas_band: required',
    ]);
  });

  it('rejects gas answers while the gas switch is off', () => {
    const shared = sharedStepsFile.parse(readJson('_shared.json'));
    shared.switches = { ...shared.switches, gas: false };
    const noGas = {
      ...flows,
      energie: resolveFlow(flowFile.parse(readJson('energie.json')), shared),
    };
    expect(issuesOf(energy(), noGas)).toEqual(['answers.energy_type: option_unknown']);
    const electricity = body('energie', { ...energyAnswers, product_choice: 'electricity' });
    expect(parseLeadRequest(electricity, noGas).ok).toBe(true);
  });

  it('rejects missing required answers', () => {
    expect(issuesOf(withValue(energy(), 'answers.supplier', undefined))).toEqual([
      'answers.supplier: required',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.gas_kwh', undefined))).toEqual([
      'answers.gas_kwh: required',
    ]);
    expect(issuesOf(withValue(energy(), 'call_preference', null))).toEqual([
      'call_preference: required',
    ]);
    expect(issuesOf(withValue(energy(), 'consent.terms', false))).toEqual([
      'consent.terms: required',
    ]);
    expect(issuesOf(withValue(energy(), 'contact.first_name', '  '))).toEqual([
      'contact.first_name: required',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.energy_type', undefined))).toEqual([
      'answers: "energy_type" is missing: the step that asks it ("product", "energy_choice") was skipped',
    ]);
    // A missing step stops the path there: later steps are not reported yet.
    expect(issuesOf(withValue(energy(), 'answers.knows_consumption', undefined))).toEqual([
      'answers.knows_consumption: required',
    ]);
    expect(issuesOf(withValue(energy(), 'answers', {}))).toEqual(['answers.supplier: required']);
  });

  it('rejects a bad phone, e-mail, postcode or number, and names only the place', () => {
    const phone = (value: string) => issuesOf(withValue(energy(), 'contact.phone_e164', value));
    expect(phone('+3292123456')).toEqual(['contact.phone_e164: phone_landline']);
    expect(phone('04484620944')).toEqual(['contact.phone_e164: phone_invalid']);
    expect(phone('+31612345678')).toEqual(['contact.phone_e164: phone_invalid']);
    expect(phone('')).toEqual(['contact.phone_e164: required']);
    expect(issuesOf(withValue(energy(), 'contact.email', 'jan@'))).toEqual([
      'contact.email: email_invalid',
    ]);
    expect(issuesOf(withValue(energy(), 'derived.postcode', '0900'))).toEqual([
      'derived.postcode: postcode_invalid',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.electricity_kwh', 99))).toEqual([
      'answers.electricity_kwh: number_too_low',
    ]);
    expect(issuesOf(withValue(energy(), 'answers.gas_kwh', 3.5))).toEqual([
      'answers.gas_kwh: number_not_integer',
    ]);
    for (const issue of phone('+3292123456')) expect(issue).not.toContain('3292123456');
  });

  it('rejects bad types and sizes in the envelope', () => {
    expect(issuesOf(withValue(energy(), 'schema_version', 2))[0]).toMatch(/^schema_version: /);
    expect(issuesOf(withValue(energy(), 'lead_id', 'lead-1'))[0]).toMatch(/^lead_id: /);
    expect(issuesOf(withValue(energy(), 'event_id', undefined))[0]).toMatch(/^event_id: /);
    expect(issuesOf(withValue(energy(), 'submitted_at', 'gisteren'))[0]).toMatch(/^submitted_at/);
    expect(issuesOf(withValue(energy(), 'product', 'water'))[0]).toMatch(/^product: /);
    expect(issuesOf(withValue(energy(), 'meta.page', 'vergelijken'))[0]).toMatch(/^meta\.page: /);
    expect(issuesOf(withValue(energy(), 'consent.cookies', undefined))[0]).toMatch(
      /^consent\.cookies: /,
    );
    expect(issuesOf(withValue(energy(), 'consent.newsletter', 'yes'))[0]).toMatch(
      /^consent\.newsletter: /,
    );
    expect(issuesOf(withValue(energy(), 'contact.first_name', 'x'.repeat(1001)))[0]).toMatch(
      /^contact\.first_name: /,
    );
    expect(issuesOf(withValue(energy(), 'contact.last_name', 'x'.repeat(101)))).toEqual([
      'contact.last_name: text_too_long',
    ]);
    expect(issuesOf(withValue(energy(), HONEYPOT_FIELD, 42))[0]).toMatch(/^website: /);
    expect(issuesOf(withValue(energy(), TURNSTILE_FIELD, 'x'.repeat(2049)))[0]).toMatch(
      /^turnstile_token: /,
    );
    expect(issuesOf(withValue(energy(), 'answers.supplier', { code: 'engie' }))[0]).toMatch(
      /^answers\.supplier: /,
    );
  });

  it("rejects a flow id or version that isn't the server's", () => {
    expect(issuesOf(withValue(energy(), 'flow_id', 'zonnepanelen'))).toEqual([
      'flow_id: is not the energie flow',
    ]);
    expect(issuesOf(withValue(energy(), 'flow_version', 2))).toEqual([
      "flow_version: the server's energie flow is version 1",
    ]);
  });

  it('keeps issues short, even for many long unknown keys', () => {
    const extra = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`unknown_${index}_${'k'.repeat(20)}`, 1]),
    );
    const [issue] = issuesOf({ ...energy(), ...extra });
    expect(issue!.length).toBeLessThanOrEqual(200);
    expect(issue!.endsWith('…')).toBe(true);
  });

  it('rejects "__proto__" keys from JSON without polluting any prototype', () => {
    const json = JSON.stringify(energy());
    const inject = (at: string, entry: string) => JSON.parse(json.replace(at, `${at}${entry},`));
    expect(issuesOf(JSON.parse(`{"__proto__":{"polluted":1},${json.slice(1)}`))).toEqual([
      '__proto__: unknown field',
    ]);
    expect(issuesOf(inject('"answers":{', '"__proto__":"x"'))).toEqual([
      'answers.__proto__: unknown field',
    ]);
    expect(issuesOf(inject('"consent":{', '"__proto__":true'))).toEqual([
      'consent.__proto__: unknown field',
    ]);
    expect(issuesOf(inject('"cookies":{', '"__proto__":{"a":1}'))).toEqual([
      'consent.cookies.__proto__: unknown field',
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('never reads a built-in property as an answer', () => {
    const issues = issuesOf(withValue(energy(), 'answers.constructor', 'x'));
    expect(issues).toEqual(['answers.constructor: unknown field']);
  });
});

describe('answer keys', () => {
  it('lists what each flow sends in answers (rules read these)', () => {
    expect([...submittedAnswerKeys(flows.energie)].sort()).toEqual(
      [
        'budget_meter',
        'business_electricity_band',
        'business_gas_band',
        'digital_meter',
        'electricity_kwh',
        'energy_type',
        'gas_kwh',
        'has_solar',
        'heat_pump',
        'electric_car',
        'home_type',
        'household_size',
        'is_business',
        'knows_consumption',
        'meter_type',
        'social_tariff',
        'supplier',
      ].sort(),
    );
    expect(submittedAnswerKeys(flows.zonnepanelen).has('energy_type')).toBe(false);
    expect([...impliedValues(flows.energie).get('energy_type')!].sort()).toEqual([
      'both',
      'electricity',
      'gas',
    ]);
    expect(impliedValues(flows.thuisbatterij).get('energy_type')!.size).toBe(0);
  });

  it('posts a phone with payload "answers" under both keys and reads its E.164 form', () => {
    const phoneField = { id: 'mobile', type: 'phone' as const, required: true };
    const flow: Flow = {
      ...flows.energie,
      steps: flows.energie.steps.map((step) =>
        step.id === 'supplier' ? { ...step, fields: [...step.fields, phoneField] } : step,
      ),
    };
    expect(submittedAnswerKeys(flow).has('mobile_e164')).toBe(true);
    expect(submittedAnswerKeys(flow).has('mobile_display')).toBe(true);
    const input = withValue(energy(), 'answers.mobile_e164', '+32470000000');
    const result = parseLeadRequest(input, { ...flows, energie: flow });
    expect(result.ok && result.submission.answers).toMatchObject({
      mobile_e164: '+32470000000',
      mobile_display: '+32 470 00 00 00',
    });
  });
});
