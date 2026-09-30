// Lead bodies for the server tests: built the way the form builds them (buildSubmission with
// the real flows, src/lib/form/answers.ts engineDerived), plus the honeypot and Turnstile token.
// Every value is fake.
import { buildSubmission, type Submission } from '../../src/lib/flow/engine';
import type { Answers, Product } from '../../src/lib/flow/types';
import { engineDerived } from '../../src/lib/form/answers';
import { serverFlows } from '../../src/server/lead/flows';

export const flows = serverFlows();

export const LEAD_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
export const EVENT_ID = '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f';
export const SUBMITTED_AT = '2026-10-01T09:30:00.000Z';

export const contactAnswers: Answers = {
  first_name: ' Jan ',
  last_name: 'Peeters',
  phone: '0475 12 34 56',
  email: ' Jan.Peeters@Example.BE ',
  call_moment: { day: 'wed', slot: '13-14' },
  terms: true,
  newsletter: false,
};

/** The docs/PAYLOAD.md example's answers: electricity + gas, knows the consumption. */
export const energyAnswers: Answers = {
  product_choice: 'both',
  postcode: '9000',
  is_business: false,
  supplier: 'luminus',
  meter_type: 'dual',
  digital_meter: 'yes',
  has_solar: 'no',
  social_tariff: 'no',
  budget_meter: 'no',
  knows_consumption: 'yes',
  electricity_kwh: '3.500',
  gas_kwh: 12000,
  ...contactAnswers,
};

export const solarAnswers: Answers = {
  product_choice: 'zonnepanelen',
  postcode: '3000',
  is_business: false,
  ownership: 'owner',
  roof_type: 'pitched',
  roof_orientation: 'south',
  knows_consumption: 'no',
  household_size: '5_plus',
  home_type: 'detached',
  heat_pump: 'yes',
  electric_car: 'no',
  battery_interest: 'maybe_later',
  ...contactAnswers,
};

export const batteryAnswers: Answers = {
  product_choice: 'thuisbatterij',
  postcode: '8000',
  is_business: false,
  has_solar: 'yes',
  solar_size: '10_to_20',
  digital_meter: 'yes',
  knows_consumption: 'yes',
  electricity_kwh: 4200,
  ...contactAnswers,
};

/** The form's submission for these answers, from the home page (not preselected). */
export function clientSubmission(
  product: Product,
  answers: Answers,
  { preselected = false, test = false } = {},
): Submission {
  const derived = engineDerived({ preselected, energy_preselected: false }, answers);
  return buildSubmission(flows[product], answers, {
    lead_id: LEAD_ID,
    event_id: EVENT_ID,
    submitted_at: SUBMITTED_AT,
    derived,
    tracking: { entry_path: `/vergelijken/${product}` },
    cookies: { analytics: true, marketing: true },
    page: `/vergelijken/${product}`,
    test,
  });
}

/** A POST body: the submission plus an empty honeypot and a (fake) Turnstile token. */
export function body(
  product: Product,
  answers: Answers,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...structuredClone(clientSubmission(product, answers)),
    website: '',
    turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
    ...extra,
  };
}

/** A copy of a body with one nested value changed (or removed with `undefined`). */
export function withValue(
  source: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const copy = structuredClone(source);
  const keys = path.split('.');
  let target = copy as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  const last = keys.at(-1)!;
  if (value === undefined) delete target[last];
  else target[last] = value;
  return copy;
}
