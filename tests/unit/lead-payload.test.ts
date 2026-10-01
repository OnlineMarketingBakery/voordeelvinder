// toPayload (src/server/lead/payload.ts): the n8n payload must have exactly the shape of the
// docs/PAYLOAD.md example (brief §9.2) for a full energy path, with Dutch labels.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TRACKING_KEYS } from '../../src/lib/flow/engine';
import { serverFlowCopy } from '../../src/server/lead/flows';
import {
  BRAND,
  MAX_USER_AGENT,
  payloadLabels,
  toPayload,
  type PayloadMeta,
} from '../../src/server/lead/payload';
import { parseLeadRequest } from '../../src/server/lead/validate';
import {
  batteryAnswers,
  body,
  energyAnswers,
  EVENT_ID,
  flows,
  LEAD_ID,
  solarAnswers,
  SUBMITTED_AT,
} from './lead-fixtures';

const doc = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'PAYLOAD.md'), 'utf8');
const example = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(doc)![1]!) as Record<string, unknown>;

const production: PayloadMeta = {
  receivedAt: new Date(SUBMITTED_AT),
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0 (test)',
  siteEnv: 'production',
  isTest: false,
};

/** The server's pipeline up to the payload: parse, build (the site never qualifies, ADR 0009). */
function payloadFor(input: Record<string, unknown>, meta: PayloadMeta = production) {
  const parsed = parseLeadRequest(input, flows);
  if (!parsed.ok) throw new Error(parsed.issues.join('; '));
  return toPayload(parsed.submission, meta);
}

/** The keys of an object, recursively ("…" and uuid placeholders don't matter here). */
function shape(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
}

describe('toPayload: the docs/PAYLOAD.md contract', () => {
  const payload = payloadFor(body('energie', energyAnswers));

  it('has exactly the keys of the example, in its order, with the same types', () => {
    const { labels: exampleLabels, ...exampleRest } = example;
    const { labels, ...rest } = payload;
    expect(shape(rest)).toEqual(shape(exampleRest));
    expect(Object.keys(payload)).toEqual(Object.keys(example));
    expect(Object.keys(payload.consent)).toEqual(Object.keys(example.consent as object));
    expect(Object.keys(payload.contact)).toEqual(Object.keys(example.contact as object));
    expect(Object.keys(payload.meta)).toEqual(Object.keys(example.meta as object));
    expect(Object.keys(payload.tracking)).toEqual([...TRACKING_KEYS]);
    // The example lists two labels ("…"); every coded answer gets one.
    expect(labels).toMatchObject(exampleLabels as object);
  });

  it('has the example values for the example answers', () => {
    for (const key of [
      'schema_version',
      'brand',
      'is_test',
      'submitted_at',
      'product',
      'flow_version',
      'answers',
      'derived',
      'call_preference',
      'consent',
      'tracking',
    ] as const) {
      expect(payload[key], key).toEqual(example[key]);
    }
    expect(Object.keys(payload.answers)).toEqual(Object.keys(example.answers as object));
    expect(payload.contact).toMatchObject({
      phone_e164: '+32475123456',
      phone_display: '+32 475 12 34 56',
    });
    expect(payload.meta).toEqual({
      page: '/vergelijken/energie',
      user_agent: 'Mozilla/5.0 (test)',
      ip: '203.0.113.7',
      site_env: 'production',
    });
    expect(payload).toMatchObject({ brand: BRAND, lead_id: LEAD_ID, event_id: EVENT_ID });
    expect(payload.submitted_at).toBe(SUBMITTED_AT);
  });

  it('dates the payload with the server clock, never the browser’s', () => {
    const received = new Date('2026-10-03T12:00:00.000Z');
    const built = payloadFor(
      body('energie', energyAnswers, { submitted_at: '2020-01-01T00:00:00.000Z' }),
      {
        ...production,
        receivedAt: received,
      },
    );
    expect(built.submitted_at).toBe('2026-10-03T12:00:00.000Z');
  });

  it('labels every coded answer in Dutch, in the order of the answers', () => {
    expect(payload.labels).toEqual({
      energy_type: 'Elektriciteit + gas',
      supplier: 'Luminus',
      meter_type: 'Dag/nachtmeter (tweevoudig tarief)',
      digital_meter: 'Ja',
      has_solar: 'Nee',
      social_tariff: 'Nee',
      budget_meter: 'Nee',
      knows_consumption: 'Ja',
    });
  });

  it('never carries the form-only parts (flow_id, meta.test, honeypot, token)', () => {
    const text = JSON.stringify(payload);
    expect(payload).not.toHaveProperty('flow_id');
    expect(payload.meta).not.toHaveProperty('test');
    expect(text).not.toContain('website');
    expect(text).not.toContain('XXXX.DUMMY.TOKEN.XXXX');
  });

  it('is a plain copy: changing it leaves the submission alone', () => {
    const parsed = parseLeadRequest(body('energie', energyAnswers), flows);
    if (!parsed.ok) throw new Error('invalid');
    const built = toPayload(parsed.submission, production);
    built.answers.supplier = 'x';
    built.consent.cookies.analytics = false;
    built.call_preference!.day = 'mon';
    expect(parsed.submission.answers.supplier).toBe('luminus');
    expect(parsed.submission.consent.cookies.analytics).toBe(true);
    expect(parsed.submission.call_preference!.day).toBe('wed');
  });
});

describe('toPayload: no qualification, and test mode', () => {
  it('sends every lead with the outcome the site decided; n8n only routes (ADR 0010)', () => {
    const outsideFlanders = payloadFor(
      body('energie', { ...energyAnswers, postcode: '1000', social_tariff: 'yes' }),
    );
    expect(outsideFlanders.outcome).toBe('no_promo');
    expect(outsideFlanders.outcome_reasons).toEqual(['region_not_flanders', 'social_tariff']);
    expect(outsideFlanders.answers).toMatchObject({ social_tariff: 'yes' });
    expect(outsideFlanders.derived).toEqual({
      postcode: '1000',
      region: 'brussels',
      province: 'brussel',
    });
    const solar = payloadFor(body('zonnepanelen', solarAnswers));
    expect(solar.product).toBe('zonnepanelen');
    expect(solar.outcome).toBe('pending');
    expect(solar.outcome_reasons).toEqual([]);
  });

  it('is a test lead unless production, and on production with ?test=1 or isTest', () => {
    const lead = body('energie', energyAnswers);
    expect(payloadFor(lead).is_test).toBe(false);
    for (const siteEnv of ['local', 'ci', 'staging'] as const) {
      expect(payloadFor(lead, { ...production, siteEnv }).is_test, siteEnv).toBe(true);
      expect(payloadFor(lead, { ...production, siteEnv }).meta.site_env).toBe(siteEnv);
    }
    expect(
      payloadFor({ ...lead, meta: { page: '/vergelijken/energie', test: true } }).is_test,
    ).toBe(true);
    expect(payloadFor(lead, { ...production, isTest: true }).is_test).toBe(true);
  });

  it('cuts an overlong user agent', () => {
    const payload = payloadFor(body('energie', energyAnswers), {
      ...production,
      userAgent: 'A'.repeat(5000),
    });
    expect(payload.meta.user_agent).toHaveLength(MAX_USER_AGENT);
  });
});

describe('labels', () => {
  it('use the field labels of yes/no questions that have them, else Ja/Nee', () => {
    const { yesNo } = serverFlowCopy();
    const flow = {
      ...flows.thuisbatterij,
      steps: flows.thuisbatterij.steps.map((step) =>
        step.id === 'digital_meter'
          ? {
              ...step,
              fields: step.fields.map((field) =>
                field.type === 'yes_no'
                  ? { ...field, labels: { yes: 'Ja, digitaal', no: 'Nee, analoog' } }
                  : field,
              ),
            }
          : step,
      ),
    };
    expect(payloadLabels(flow, { digital_meter: 'no' }, yesNo)).toEqual({
      digital_meter: 'Nee, analoog',
    });
    expect(payloadLabels(flows.thuisbatterij, { digital_meter: 'no' }, yesNo)).toEqual({
      digital_meter: 'Nee',
    });
  });

  it('label solar and battery answers; numbers and booleans have none', () => {
    const solar = payloadFor(body('zonnepanelen', solarAnswers));
    expect(solar.labels).toEqual({
      ownership: 'Eigenaar',
      roof_type: 'Hellend dak',
      roof_orientation: 'Zuid',
      knows_consumption: 'Nee',
      household_size: '5 of meer',
      home_type: 'Open bebouwing',
      heat_pump: 'Ja',
      electric_car: 'Nee',
      battery_interest: 'Misschien later',
    });
    const battery = payloadFor(body('thuisbatterij', batteryAnswers));
    expect(battery.labels).toEqual({
      has_solar: 'Ja',
      solar_size: '10–20',
      digital_meter: 'Ja',
      knows_consumption: 'Ja',
    });
    expect(battery.answers).toMatchObject({ is_business: false, electricity_kwh: 4200 });
  });

  it('skip unknown codes and implied values of another product', () => {
    const { yesNo } = serverFlowCopy();
    expect(payloadLabels(flows.energie, { supplier: 'nope', energy_type: 'water' }, yesNo)).toEqual(
      {},
    );
    expect(payloadLabels(flows.zonnepanelen, { energy_type: 'both' }, yesNo)).toEqual({});
    expect(payloadLabels(flows.energie, { energy_type: 'gas', has_solar: 'maybe' }, yesNo)).toEqual(
      { energy_type: 'Gas' },
    );
  });
});
