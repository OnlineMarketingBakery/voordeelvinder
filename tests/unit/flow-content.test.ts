// The real form flows (src/content/flows/nl): loaded through the schema and resolveFlow, then
// played through the engine as a visitor would (brief §7.3, §7.4, §7.6, §9.2).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadFlowSources } from '../../scripts/lib/flow-sources';
import {
  answerLabels,
  buildSubmission,
  clearAbandoned,
  estimatedTotalSteps,
  getStep,
  nextStep,
  pathSoFar,
  previousStep,
  progress,
  startStep,
  TRACKING_KEYS,
  validateStep,
  visibleFields,
  type SubmissionContext,
} from '../../src/lib/flow/engine';
import { resolveFlow } from '../../src/lib/flow/resolve';
import {
  flowCopyFile,
  flowFile,
  sharedStepsFile,
  type Flow,
  type Step,
} from '../../src/lib/flow/schema';
import { validateFlowSources } from '../../src/lib/flow/validate';
import { ERROR_CODES } from '../../src/lib/flow/validators/errors';
import type { Answers, Derived } from '../../src/lib/flow/types';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON from the content files */

const REPO = join(import.meta.dirname, '..', '..');
const FLOWS = join(REPO, 'src', 'content', 'flows');
const read = (name: string): any => JSON.parse(readFileSync(join(FLOWS, 'nl', name), 'utf8'));
const sharedData = read('_shared.json');

/** A real flow, resolved with the real shared steps (or changed ones). */
function real(name: string, shared: unknown = sharedData): Flow {
  return resolveFlow(flowFile.parse(read(`${name}.json`)), sharedStepsFile.parse(shared));
}

const energie = real('energie');
const zonnepanelen = real('zonnepanelen');
const thuisbatterij = real('thuisbatterij');

/** Not preselected: the visitor came through the home page (the island always passes it). */
const home: Derived = { preselected: false };
const preselected: Derived = { preselected: true };
/** /vergelijken/energie?energie=… : the island passes both flags. */
const energyPreselected: Derived = { preselected: true, energy_preselected: true };

const contact: Answers = {
  first_name: ' Jan ',
  last_name: 'Peeters',
  phone: '0475 12 34 56',
  email: ' Jan.Peeters@Example.BE ',
  call_moment: { day: 'wed', slot: '13-14' },
  terms: true,
};

/** Answers per step for a full energy run (both, knows the consumption); tests override steps. */
const energyScript: Record<string, Answers> = {
  // The island writes the implied answer together with the chosen card.
  product: { product_choice: 'both', energy_type: 'both' },
  energy_choice: { energy_choice: 'both' },
  postcode: { postcode: '9000', is_business: false },
  supplier: { supplier: 'luminus' },
  meter_type: { meter_type: 'dual' },
  meters_solar: { digital_meter: 'yes', has_solar: 'no' },
  tariff_meter: { social_tariff: 'no', budget_meter: 'no' },
  knows_consumption: { knows_consumption: 'yes' },
  consumption_kwh: { electricity_kwh: '3.500', gas_kwh: 12000 },
  household: { household_size: '2', home_type: 'terraced' },
  appliances: { heat_pump: 'no', electric_car: 'yes' },
  contact,
};

const solarScript: Record<string, Answers> = {
  product: { product_choice: 'zonnepanelen' },
  postcode: { postcode: '3000', is_business: false },
  ownership: { ownership: 'owner' },
  roof: { roof_type: 'pitched', roof_orientation: 'south' },
  knows_consumption: { knows_consumption: 'yes' },
  consumption_kwh: { electricity_kwh: 4200 },
  household: { household_size: '5_plus', home_type: 'detached' },
  appliances: { heat_pump: 'yes', electric_car: 'no' },
  battery_interest: { battery_interest: 'maybe_later' },
  has_solar: { has_solar: 'yes' },
  solar_size: { solar_size: '10_to_20' },
  digital_meter: { digital_meter: 'yes' },
  contact,
};

const context: SubmissionContext = {
  lead_id: '0b6f5a4e-1111-4c2d-9a9a-000000000001',
  event_id: '0b6f5a4e-2222-4c2d-9a9a-000000000002',
  submitted_at: '2026-10-01T09:30:00.000Z',
  derived: { region: 'flanders', province: 'oost-vlaanderen', preselected: false },
  tracking: { entry_path: '/vergelijken/energie' },
  cookies: { analytics: true, marketing: true },
  page: '/vergelijken/energie',
  test: false,
};

type Seen = { id: string; step: number; total: number };

/** Plays a visitor through a flow: answer each shown step, validate it, go on. */
function play(
  flow: Flow,
  script: Record<string, Answers>,
  derived: Derived = home,
  initial: Answers = {},
) {
  let answers = clearAbandoned(flow, initial, derived);
  const seen: Seen[] = [];
  const totals: number[] = [estimatedTotalSteps(flow, answers, derived)];
  let current = startStep(flow, answers, derived);
  while (current !== null) {
    seen.push({ id: current, ...progress(flow, current, answers, derived) });
    answers = { ...answers, ...script[current] };
    totals.push(estimatedTotalSteps(flow, answers, derived));
    expect(validateStep(flow, current, answers, derived).errors, current).toEqual({});
    current = nextStep(flow, current, answers, derived);
  }
  // "Stap X van Y": X counts up by one, Y never goes up and ends at the path length.
  seen.forEach((entry, index) => expect(entry.step).toBe(index + 1));
  totals.forEach(
    (total, index) => index > 0 && expect(total).toBeLessThanOrEqual(totals[index - 1]!),
  );
  seen.forEach(
    (entry, index) => index > 0 && expect(entry.total).toBeLessThanOrEqual(seen[index - 1]!.total),
  );
  expect(totals.at(-1)).toBe(seen.length);
  expect(seen.at(-1)).toMatchObject({ id: 'contact', step: seen.length, total: seen.length });
  return { ids: seen.map((entry) => entry.id), seen, answers };
}

const ENERGY_YES = [
  'product',
  'postcode',
  'supplier',
  'meter_type',
  'meters_solar',
  'tariff_meter',
  'knows_consumption',
  'consumption_kwh',
  'contact',
];
const ENERGY_NO = [...ENERGY_YES.slice(0, 7), 'household', 'appliances', 'contact'];

describe('real flows: validate:flows', () => {
  it('passes on the content folder, with the gas switch on and off', () => {
    const { locales, issues } = loadFlowSources(FLOWS);
    expect(issues).toEqual([]);
    expect(locales.map(({ locale }) => locale)).toEqual(['nl']);
    expect(locales[0]!.flows.map(({ path }) => path)).toEqual([
      'nl/energie.json',
      'nl/thuisbatterij.json',
      'nl/zonnepanelen.json',
    ]);
    expect(locales[0]!.copy?.path).toBe('nl/_copy.json');
    expect(validateFlowSources(locales)).toEqual([]);
    const noGas = structuredClone(locales);
    (noGas[0]!.shared!.data as any).switches.gas = false;
    expect(validateFlowSources(noGas)).toEqual([]);
  });
});

describe('real flows: energy (brief §7.3)', () => {
  it('"yes" path: 9 screens from step 1', () => {
    const run = play(energie, energyScript);
    expect(run.ids).toEqual(ENERGY_YES);
    expect(run.seen[0]).toEqual({ id: 'product', step: 1, total: 10 });
    expect(run.seen.at(-1)).toEqual({ id: 'contact', step: 9, total: 9 });
  });

  it('"no" path: 10 screens from step 1', () => {
    const run = play(energie, { ...energyScript, knows_consumption: { knows_consumption: 'no' } });
    expect(run.ids).toEqual(ENERGY_NO);
    expect(run.seen.every(({ total }) => total === 10)).toBe(true);
    // The design's counters for the "no" branch are wrong (brief §6): these are computed.
    expect(run.seen.slice(7)).toEqual([
      { id: 'household', step: 8, total: 10 },
      { id: 'appliances', step: 9, total: 10 },
      { id: 'contact', step: 10, total: 10 },
    ]);
  });

  it('gas only: no meter type, no solar question, no electricity kWh', () => {
    const run = play(energie, {
      ...energyScript,
      product: { product_choice: 'gas', energy_type: 'gas' },
      meters_solar: { digital_meter: 'no' },
      consumption_kwh: { gas_kwh: '12.000' },
    });
    expect(run.ids).toEqual(ENERGY_YES.filter((id) => id !== 'meter_type'));
    const shown = (id: string) => visibleFields(energie, id, run.answers, home);
    expect(shown('meters_solar').map((field) => field.id)).toEqual(['digital_meter']);
    expect(shown('consumption_kwh').map((field) => field.id)).toEqual(['gas_kwh']);
    // The electricity hint sits on the electricity field, so gas-only visitors don't see it.
    expect(shown('consumption_kwh')[0]!.hint).toBeUndefined();
  });

  it('electricity only: no gas kWh', () => {
    const run = play(energie, {
      ...energyScript,
      product: { product_choice: 'electricity', energy_type: 'electricity' },
      consumption_kwh: { electricity_kwh: 3500 },
    });
    expect(run.ids).toEqual(ENERGY_YES);
    expect(run.answers).not.toHaveProperty('gas_kwh');
  });

  it('the business checkbox reveals the band questions per energy type', () => {
    const postcode = getStep(energie, 'postcode');
    const shown = (energy_type: string | undefined, is_business: boolean) =>
      visibleFields(energie, 'postcode', { postcode: '9000', is_business, energy_type }, home).map(
        (field) => field.id,
      );
    expect(shown('electricity', false)).toEqual(['postcode', 'is_business']);
    expect(shown('electricity', true)).toEqual([
      'postcode',
      'is_business',
      'business_electricity_band',
    ]);
    expect(shown('gas', true)).toEqual(['postcode', 'is_business', 'business_gas_band']);
    expect(shown('both', true)).toEqual([
      'postcode',
      'is_business',
      'business_electricity_band',
      'business_gas_band',
    ]);
    // Revealed bands are required.
    expect(
      validateStep(
        energie,
        'postcode',
        { postcode: '9000', is_business: true, energy_type: 'both' },
        home,
      ).errors,
    ).toEqual({ business_electricity_band: 'required', business_gas_band: 'required' });
    const band = postcode.fields.find((field) => field.id === 'business_gas_band')!;
    expect(band.type === 'single_choice' && band.options.map((option) => option.code)).toEqual([
      'under_100k',
      'over_100k',
    ]);
  });

  it('never shows the bands in the solar and battery flows (energy only)', () => {
    for (const flow of [zonnepanelen, thuisbatterij]) {
      // A stale energy_type from the energy flow is cleared: it isn't this flow's value.
      const answers = clearAbandoned(
        flow,
        { postcode: '9000', is_business: true, energy_type: 'both' },
        preselected,
      );
      expect(answers).toEqual({ postcode: '9000', is_business: true });
      expect(visibleFields(flow, 'postcode', answers, preselected)).toHaveLength(2);
    }
  });

  it("uses the brief's codes (a data contract)", () => {
    const codes = (flow: Flow, id: string) =>
      flow.steps
        .flatMap((step) => step.fields)
        .filter((field) => field.id === id)
        .flatMap((field) =>
          field.type === 'single_choice' || field.type === 'select'
            ? field.options.map((option) => option.code)
            : field.type === 'day_slot'
              ? [...field.days, ...field.slots].map((option) => option.code)
              : [],
        );
    expect(codes(energie, 'product_choice')).toEqual([
      'electricity',
      'gas',
      'both',
      'zonnepanelen',
      'thuisbatterij',
    ]);
    expect(codes(energie, 'supplier')).toEqual([
      'engie',
      'luminus',
      'totalenergies',
      'mega',
      'eneco',
      'octa-plus',
      'bolt',
      'ecopower',
      'elegant',
      'energie-be',
      'dats-24',
      'frank-energie',
      'other',
      'unknown',
    ]);
    expect(codes(energie, 'meter_type')).toEqual([
      'single',
      'dual',
      'single_excl_night',
      'dual_excl_night',
    ]);
    expect(codes(energie, 'budget_meter')).toEqual(['yes', 'no', 'unknown']);
    expect(codes(energie, 'household_size')).toEqual(['1', '2', '3', '4', '5_plus']);
    expect(codes(energie, 'home_type')).toEqual([
      'apartment',
      'terraced',
      'semi_detached',
      'detached',
    ]);
    expect(codes(energie, 'call_moment')).toEqual([
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      '09-10',
      '10-11',
      '11-12',
      '12-13',
      '13-14',
      '14-15',
      '15-16',
    ]);
    const kwh = getStep(energie, 'consumption_kwh').fields;
    expect(kwh.map((field) => field.type === 'number' && [field.min, field.max])).toEqual([
      [100, 100000],
      [100, 150000],
    ]);
    // No soft warning ranges: the brief gives no numbers (CONTENT-TODO).
    expect(kwh.every((field) => field.type === 'number' && field.softMin === undefined)).toBe(true);
  });
});

describe('real flows: preselect (brief §7.6)', () => {
  it('/vergelijken/energie?energie=both skips step 1', () => {
    const initial = { energy_type: 'both' };
    expect(startStep(energie, initial, energyPreselected)).toBe('postcode');
    const run = play(energie, energyScript, energyPreselected, initial);
    expect(run.ids).toEqual(ENERGY_YES.slice(1));
    expect(run.seen[0]).toEqual({ id: 'postcode', step: 1, total: 9 });
    expect(previousStep(energie, 'postcode', run.answers, energyPreselected)).toBeNull();
    expect(clearAbandoned(energie, run.answers, energyPreselected)).toMatchObject({
      energy_type: 'both',
    });
  });

  it('/vergelijken/energie without ?energie= asks only the energy type on step 1', () => {
    expect(startStep(energie, {}, preselected)).toBe('energy_choice');
    const choice = visibleFields(energie, 'energy_choice', {}, preselected)[0]!;
    expect(choice.type === 'single_choice' && choice.options.map(({ code }) => code)).toEqual([
      'electricity',
      'gas',
      'both',
    ]);
    const run = play(energie, energyScript, preselected);
    expect(run.ids).toEqual(['energy_choice', ...ENERGY_YES.slice(1)]);
    expect(run.seen[0]).toEqual({ id: 'energy_choice', step: 1, total: 10 });
    // Answering the step keeps it on the path, so "Terug" comes back to it.
    expect(pathSoFar(energie, run.answers, preselected)[0]).toBe('energy_choice');
    expect(previousStep(energie, 'postcode', run.answers, preselected)).toBe('energy_choice');
    expect(previousStep(energie, 'energy_choice', run.answers, preselected)).toBeNull();
    expect(clearAbandoned(energie, run.answers, preselected)).toMatchObject({
      energy_choice: 'both',
      energy_type: 'both',
    });

    const gas = play(
      energie,
      {
        ...energyScript,
        energy_choice: { energy_choice: 'gas' },
        meters_solar: { digital_meter: 'yes' },
        consumption_kwh: { gas_kwh: 9000 },
        knows_consumption: { knows_consumption: 'no' },
      },
      preselected,
    );
    expect(gas.ids).toEqual([
      'energy_choice',
      ...ENERGY_NO.slice(1).filter((id) => id !== 'meter_type'),
    ]);
  });

  it('treats an unknown ?energie= value as missing', () => {
    const initial = clearAbandoned(energie, { energy_type: 'solar' }, preselected);
    expect(initial).toEqual({});
    expect(startStep(energie, initial, preselected)).toBe('energy_choice');
  });

  it('never shows the energy-type step without a preselect', () => {
    expect(startStep(energie, {}, home)).toBe('product');
    expect(startStep(energie, {}, {})).toBe('product');
    expect(estimatedTotalSteps(energie, {}, {})).toBe(10);
    const answers = { product_choice: 'gas', energy_type: 'gas' };
    expect(nextStep(energie, 'product', answers, home)).toBe('postcode');
  });

  it('/vergelijken/zonnepanelen and /vergelijken/thuisbatterij skip step 1', () => {
    expect(startStep(zonnepanelen, {}, preselected)).toBe('postcode');
    expect(startStep(thuisbatterij, {}, preselected)).toBe('postcode');
  });
});

describe('real flows: solar panels and home battery (brief §7.4, DRAFT)', () => {
  it('solar panels: both consumption branches reach contact', () => {
    expect(play(zonnepanelen, solarScript).ids).toEqual([
      'product',
      'postcode',
      'ownership',
      'roof',
      'knows_consumption',
      'consumption_kwh',
      'battery_interest',
      'contact',
    ]);
    const no = play(zonnepanelen, {
      ...solarScript,
      knows_consumption: { knows_consumption: 'no' },
    });
    expect(no.ids).toEqual([
      'product',
      'postcode',
      'ownership',
      'roof',
      'knows_consumption',
      'household',
      'appliances',
      'battery_interest',
      'contact',
    ]);
    expect(no.seen[0]!.total).toBe(9);
  });

  it('home battery: the panel count only after "Ja"', () => {
    expect(
      play(thuisbatterij, { ...solarScript, product: { product_choice: 'thuisbatterij' } }).ids,
    ).toEqual([
      'product',
      'postcode',
      'has_solar',
      'solar_size',
      'digital_meter',
      'knows_consumption',
      'consumption_kwh',
      'contact',
    ]);
    const planned = play(
      thuisbatterij,
      {
        ...solarScript,
        has_solar: { has_solar: 'planned' },
        knows_consumption: { knows_consumption: 'no' },
      },
      preselected,
    );
    expect(planned.ids).toEqual([
      'postcode',
      'has_solar',
      'digital_meter',
      'knows_consumption',
      'household',
      'appliances',
      'contact',
    ]);
    // The electricity kWh field in these flows has no energy_type condition.
    expect(visibleFields(thuisbatterij, 'consumption_kwh', {}, preselected)).toHaveLength(1);
  });

  it("sends the pending products' answers as codes", () => {
    const { answers } = play(zonnepanelen, solarScript, preselected);
    const submission = buildSubmission(zonnepanelen, answers, { ...context, derived: preselected });
    expect(submission.product).toBe('zonnepanelen');
    expect(submission.answers).toEqual({
      is_business: false,
      ownership: 'owner',
      roof_type: 'pitched',
      roof_orientation: 'south',
      knows_consumption: 'yes',
      electricity_kwh: 4200,
      battery_interest: 'maybe_later',
    });
  });
});

describe('real flows: the submission matches docs/PAYLOAD.md', () => {
  const doc = readFileSync(join(REPO, 'docs', 'PAYLOAD.md'), 'utf8');
  const example = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(doc)![1]!);
  const keys = (value: object) => Object.keys(value).sort();

  it('has the documented keys for a full energy run', () => {
    const { answers } = play(energie, energyScript, context.derived);
    const submission = buildSubmission(energie, answers, context);
    // The documented example is exactly this visitor.
    expect(submission.answers).toEqual(example.answers);
    expect(keys(submission.contact)).toEqual(keys(example.contact));
    expect(submission.derived).toEqual(example.derived);
    expect(submission.call_preference).toEqual(example.call_preference);
    expect(submission.consent).toEqual(example.consent);
    expect(keys(submission.tracking)).toEqual(keys(example.tracking));
    expect(Object.keys(submission.tracking)).toEqual([...TRACKING_KEYS]);
    // Top level: what the server adds (docs/PAYLOAD.md "Where each part comes from").
    const serverOnly = ['brand', 'is_test', 'outcome', 'outcome_reasons', 'labels'];
    expect(keys(submission)).toEqual(
      keys(example)
        .filter((key) => !serverOnly.includes(key))
        .concat('flow_id')
        .sort(),
    );
    expect(keys(submission.meta)).toEqual(['page', 'test']);
    expect(answerLabels(energie, submission.answers)).toMatchObject(example.labels);
  });
});

describe('real flows: copy', () => {
  const copy = flowCopyFile.parse(read('_copy.json'));
  const strings = (value: unknown): string[] =>
    typeof value === 'string'
      ? [value]
      : typeof value === 'object' && value !== null
        ? Object.values(value).flatMap(strings)
        : [];

  it("has a message for every error code, and the brief's phone error", () => {
    expect(Object.keys(copy.errors).sort()).toEqual([...ERROR_CODES].sort());
    const phone = 'Geef een geldig Belgisch gsm-nummer in, bijvoorbeeld 0475 12 34 56.';
    expect(copy.errors.phone_invalid).toBe(phone);
    expect(copy.errors.phone_landline).toBe(phone);
    expect(copy.buttons).toEqual({ back: 'Terug', next: 'Volgende', submit: 'Verstuur' });
    expect(copy.progress).toBe('Stap {step} van {total}');
    expect(copy.yesNo).toEqual({ yes: 'Ja', no: 'Nee' });
  });

  it('uses "je", never "u" or "uw" (AGENTS.md rule 6)', () => {
    const all = [
      '_shared.json',
      '_copy.json',
      'energie.json',
      'zonnepanelen.json',
      'thuisbatterij.json',
    ].flatMap((name) => strings(read(name)));
    expect(all.filter((value) => /\b(u|uw|uzelf)\b/i.test(value))).toEqual([]);
    expect(all.some((value) => /\bje\b/.test(value))).toBe(true);
  });

  it("labels every field: a field without a label is its step's first, named by the title", () => {
    for (const flow of [energie, zonnepanelen, thuisbatterij]) {
      for (const step of flow.steps as Step[]) {
        step.fields.forEach((field, index) => {
          if (field.label === undefined) expect(index, `${flow.id}/${field.id}`).toBe(0);
        });
      }
    }
  });

  it('links the consent to the legal pages that exist', () => {
    const terms = getStep(energie, 'contact').fields.find((field) => field.id === 'terms')!;
    expect(terms.type).toBe('consent');
    const links = terms.type === 'consent' ? (terms.links ?? []) : [];
    expect(links.map((link) => link.href)).toEqual(['/algemene-voorwaarden', '/privacybeleid']);
    for (const { href } of links) {
      expect(existsSync(join(REPO, 'src', 'content', 'legal', `${href.slice(1)}.md`))).toBe(true);
    }
  });
});

describe('real flows: the gas switch (brief §7.3 "must be a config switch")', () => {
  const noGas = { ...sharedData, switches: { gas: false } };
  const energieNoGas = real('energie', noGas);
  const options = (flow: Flow, step: string) =>
    getStep(flow, step).fields.flatMap((field) =>
      field.type === 'single_choice' ? field.options.map(({ code }) => code) : [],
    );

  it('is on: five cards on step 1', () => {
    expect(sharedData.switches).toEqual({ gas: true });
    expect(options(energie, 'product')).toHaveLength(5);
  });

  it('off: removes the gas and electricity + gas cards everywhere', () => {
    expect(options(energieNoGas, 'product')).toEqual([
      'electricity',
      'zonnepanelen',
      'thuisbatterij',
    ]);
    expect(options(energieNoGas, 'energy_choice')).toEqual(['electricity']);
    expect(options(real('zonnepanelen', noGas), 'product')).toHaveLength(3);
    // A preselect (or stored answer) for gas is dropped, and gas questions never show.
    expect(clearAbandoned(energieNoGas, { energy_type: 'gas' }, preselected)).toEqual({});
    const run = play(energieNoGas, {
      ...energyScript,
      product: { product_choice: 'electricity', energy_type: 'electricity' },
      consumption_kwh: { electricity_kwh: 3500 },
    });
    expect(run.ids).toEqual(ENERGY_YES);
    expect(validateStep(energieNoGas, 'product', { product_choice: 'gas' }, home).errors).toEqual({
      product_choice: 'option_unknown',
    });
  });
});
