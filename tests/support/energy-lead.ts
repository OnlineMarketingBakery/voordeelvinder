// A complete energy lead as the form posts it to /api/lead: the submission the form builds
// (buildSubmission with the real flow in src/content/flows/nl), plus the honeypot and the
// Turnstile token. The same path as tests/e2e/form.spec.ts's "Nee" path from
// /vergelijken/energie?energie=both. Fake contact details only.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSubmission, type Submission } from '../../src/lib/flow/engine';
import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowFile, sharedStepsFile, type Flow } from '../../src/lib/flow/schema';
import type { Answers } from '../../src/lib/flow/types';
import { derive } from '../../src/lib/flow/validators/postcode';

const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const read = (name: string): unknown => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));

export function energyFlow(): Flow {
  return resolveFlow(
    flowFile.parse(read('energie.json')),
    sharedStepsFile.parse(read('_shared.json')),
  );
}

/** Cloudflare's dummy token, what the test site key's widget produces. */
export const DUMMY_TURNSTILE_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

export const ENERGY_ANSWERS: Answers = {
  energy_type: 'both',
  postcode: '9000',
  supplier: 'luminus',
  meter_type: 'single',
  digital_meter: 'yes',
  has_solar: 'no',
  knows_consumption: 'no',
  household_size: '2',
  home_type: 'terraced',
  heat_pump: 'no',
  electric_car: 'yes',
  first_name: 'Test',
  last_name: 'Persoon',
  phone: '0475 00 00 00',
  email: 'test.persoon@example.be',
  terms: true,
};

export function energySubmission(overrides: { test?: boolean } = {}): Submission {
  const flags = { preselected: true, energy_preselected: true };
  return buildSubmission(energyFlow(), ENERGY_ANSWERS, {
    lead_id: randomUUID(),
    event_id: randomUUID(),
    submitted_at: new Date().toISOString(),
    derived: { ...flags, ...derive(ENERGY_ANSWERS) },
    tracking: { entry_path: '/vergelijken/energie' },
    cookies: { analytics: false, marketing: false },
    page: '/vergelijken/energie',
    test: overrides.test ?? false,
  });
}

/** The POST body: the submission plus the honeypot (`website`) and the Turnstile token. */
export function energyLeadBody(
  extra: { website?: string; turnstile_token?: string; test?: boolean } = {},
) {
  const { test, ...fields } = extra;
  return {
    ...energySubmission({ test }),
    website: '',
    turnstile_token: DUMMY_TURNSTILE_TOKEN,
    ...fields,
  };
}
