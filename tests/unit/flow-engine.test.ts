import { describe, expect, it } from 'vitest';

import {
  answerLabels,
  buildSubmission,
  clearAbandoned,
  conditionData,
  estimatedTotalSteps,
  FlowError,
  getStep,
  isStepAnswered,
  isStepShown,
  nextStep,
  pathSoFar,
  previousStep,
  progress,
  SCHEMA_VERSION,
  startStep,
  TRACKING_KEYS,
  validateStep,
  visibleFields,
  type SubmissionContext,
} from '../../src/lib/flow/engine';
import type { Flow, Step } from '../../src/lib/flow/schema';
import type { Answers, Derived } from '../../src/lib/flow/types';
import { fixtureFlow, question, smallFlow } from './flow-fixtures';

const energie = fixtureFlow('valid', 'energie');
const zonnepanelen = fixtureFlow('valid', 'zonnepanelen');

// The island writes the implied answer together with the choice (energy_type first, so that
// answering key by key in play() never sees the choice without it).
const product = (choice: 'electricity' | 'gas' | 'both') => ({
  energy_type: choice,
  product_choice: choice,
});

/** Answers per step for a complete energy run; tests override single steps. */
const script: Record<string, Answers> = {
  product: product('both'),
  postcode: { postcode: '9000', is_business: false },
  supplier: { supplier: 'luminus' },
  meter_type: { meter_type: 'dual' },
  meters_solar: { digital_meter: 'yes', has_solar: 'no' },
  tariff_meter: { social_tariff: 'no', budget_meter: 'no' },
  knows_consumption: { knows_consumption: 'yes' },
  consumption_kwh: { electricity_kwh: '3.500', gas_kwh: 12000 },
  household: { household_size: '2', home_type: 'terraced' },
  appliances: { heat_pump: 'no', electric_car: 'yes' },
  contact: {
    first_name: ' Jan ',
    last_name: 'Peeters',
    phone: '0475 12 34 56',
    email: ' Jan.Peeters@Example.BE ',
    call_moment: { day: 'wed', slot: '13-14' },
    terms: true,
  },
};

type Seen = { id: string; step: number; total: number };

/** Plays a visitor through a flow: answer each step, validate it, go on. */
function play(
  flow: Flow,
  overrides: Record<string, Answers> = {},
  derived: Derived = {},
  initial: Answers = {},
) {
  const steps = { ...script, ...overrides };
  let answers: Answers = initial;
  const seen: Seen[] = [];
  const totals: number[] = [];
  let current = startStep(flow, answers, derived);
  while (current !== null) {
    seen.push({ id: current, ...progress(flow, current, answers, derived) });
    totals.push(estimatedTotalSteps(flow, answers, derived, current));
    // Answer the step field by field: Y may only shrink meanwhile.
    for (const [key, value] of Object.entries(steps[current] ?? {})) {
      answers = { ...answers, [key]: value };
      totals.push(estimatedTotalSteps(flow, answers, derived, current));
    }
    const result = validateStep(flow, current, answers, derived);
    expect(result.errors, current).toEqual({});
    current = nextStep(flow, current, answers, derived);
  }
  return { seen, totals, answers };
}

function expectMonotonic({ seen, totals }: { seen: Seen[]; totals: number[] }) {
  totals.forEach((total, index) => {
    if (index > 0) expect(total).toBeLessThanOrEqual(totals[index - 1]!);
  });
  seen.forEach((entry, index) => {
    expect(entry.step).toBe(index + 1);
    expect(entry.total).toBeGreaterThanOrEqual(entry.step);
    if (index > 0)
      expect(entry.step / entry.total).toBeGreaterThan(
        seen[index - 1]!.step / seen[index - 1]!.total,
      );
  });
  expect(seen.at(-1)!.total).toBe(seen.length);
  expect(totals.at(-1)).toBe(seen.length);
}

describe('flow engine: paths (brief §7.3 energy flow)', () => {
  it('"yes" path: 9 screens from step 1', () => {
    const run = play(energie);
    expect(run.seen.map((s) => s.id)).toEqual([
      'product',
      'postcode',
      'supplier',
      'meter_type',
      'meters_solar',
      'tariff_meter',
      'knows_consumption',
      'consumption_kwh',
      'contact',
    ]);
    expect(run.seen[0]).toEqual({ id: 'product', step: 1, total: 10 });
    expectMonotonic(run);
  });

  it('"no" path: 10 screens from step 1', () => {
    const run = play(energie, { knows_consumption: { knows_consumption: 'no' } });
    expect(run.seen.map((s) => s.id)).toEqual([
      'product',
      'postcode',
      'supplier',
      'meter_type',
      'meters_solar',
      'tariff_meter',
      'knows_consumption',
      'household',
      'appliances',
      'contact',
    ]);
    expect(run.seen.every((s) => s.total === 10)).toBe(true);
    expectMonotonic(run);
  });

  it('gas only skips the meter step and the electricity questions', () => {
    const run = play(energie, {
      product: product('gas'),
      meters_solar: { digital_meter: 'no' },
      consumption_kwh: { gas_kwh: '12.000' },
    });
    expect(run.seen.map((s) => s.id)).not.toContain('meter_type');
    expect(run.seen).toHaveLength(8);
    expect(visibleFields(energie, 'meters_solar', run.answers).map((f) => f.id)).toEqual([
      'digital_meter',
    ]);
    expectMonotonic(run);
  });

  it('a preselect skips the product step (brief §7.6)', () => {
    const derived = { preselected: true };
    const run = play(
      energie,
      { product: {}, knows_consumption: { knows_consumption: 'no' } },
      derived,
      { energy_type: 'electricity' },
    );
    expect(run.seen[0]).toEqual({ id: 'postcode', step: 1, total: 9 });
    expect(run.seen).toHaveLength(9);
    expect(previousStep(energie, 'postcode', run.answers, derived)).toBeNull();
    expectMonotonic(run);
  });

  it('business addresses answer the band questions on the postcode step', () => {
    const run = play(energie, {
      postcode: {
        postcode: '9000',
        is_business: true,
        business_electricity_band: 'under_100k',
        business_gas_band: 'over_100k',
      },
    });
    expect(visibleFields(energie, 'postcode', run.answers).map((f) => f.id)).toEqual([
      'postcode',
      'is_business',
      'business_electricity_band',
      'business_gas_band',
    ]);
    // Without the gas band the step can't be left.
    expect(validateStep(energie, 'postcode', run.answers, {}).errors).toEqual({});
    expect(
      validateStep(energie, 'postcode', { ...run.answers, business_gas_band: undefined }, {})
        .errors,
    ).toEqual({ business_gas_band: 'required' });
  });

  it('finds the start and the next step, skipping hidden steps', () => {
    const both = product('both');
    expect(startStep(energie, {})).toBe('product');
    expect(startStep(energie, {}, { preselected: true })).toBe('postcode');
    expect(nextStep(energie, 'supplier', product('electricity'))).toBe('meter_type');
    expect(nextStep(energie, 'supplier', product('gas'))).toBe('meters_solar');
    expect(nextStep(energie, 'knows_consumption', { ...both, knows_consumption: 'yes' })).toBe(
      'consumption_kwh',
    );
    // Without an energy type the kWh step has no visible field, so it's skipped.
    expect(nextStep(energie, 'knows_consumption', { knows_consumption: 'yes' })).toBe('contact');
    expect(nextStep(energie, 'knows_consumption', { knows_consumption: 'no' })).toBe('household');
    expect(nextStep(energie, 'contact', {})).toBeNull();
    expect(() => nextStep(energie, 'nope', {})).toThrow(FlowError);
  });

  it('builds the path so far up to the first unanswered step', () => {
    expect(pathSoFar(energie, {})).toEqual(['product']);
    const answers = { ...script.product, ...script.postcode, ...script.supplier };
    expect(pathSoFar(energie, answers)).toEqual(['product', 'postcode', 'supplier', 'meter_type']);
    expect(previousStep(energie, 'meter_type', answers)).toBe('supplier');
    expect(previousStep(energie, 'product', answers)).toBeNull();
    expect(() => previousStep(energie, 'household', { knows_consumption: 'yes' })).toThrow(
      'not on the visitor',
    );
    expect(() => progress(energie, 'household', {})).toThrow('not on the visitor');
    expect(isStepAnswered(energie, 'supplier', answers)).toBe(true);
    expect(isStepAnswered(energie, 'meter_type', answers)).toBe(false);
  });

  it('shows a step only when it has a visible field', () => {
    const step: Step = {
      id: 'a',
      title: 'A',
      fields: [{ id: 'a', type: 'yes_no', visibleIf: { var: 'flag' } }],
      next: [{ goto: 'b' }],
    };
    const flow = smallFlow([step, question('b', [])]);
    expect(isStepShown(flow, 'a', {})).toBe(false);
    // Conditions only read fields: "flag" is no field of this flow.
    expect(isStepShown(flow, 'a', { flag: true })).toBe(false);
    expect(startStep(flow, {})).toBe('b');
    expect(pathSoFar(flow, {})).toEqual(['b']);
    const flagged = smallFlow([
      { id: 'f', title: 'F', fields: [{ id: 'flag', type: 'checkbox' }], next: [{ goto: 'a' }] },
      step,
      question('b', []),
    ]);
    expect(isStepShown(flagged, 'a', {})).toBe(false);
    expect(isStepShown(flagged, 'a', { flag: true })).toBe(true);
    expect(pathSoFar(flagged, { flag: true })).toEqual(['f', 'a', 'b']);
    expect(pathSoFar(flagged, {})).toEqual(['f', 'b']);
  });

  it('evaluates a step off the path against every answer of the path', () => {
    const answers = { ...product('gas'), knows_consumption: 'yes' };
    expect(pathSoFar(energie, answers)).toEqual(['product', 'postcode']);
    // household is on the other branch: never walked, yet its fields are known.
    expect(visibleFields(energie, 'household', answers).map((f) => f.id)).toEqual([
      'household_size',
      'home_type',
    ]);
    expect(isStepShown(energie, 'meter_type', answers)).toBe(false);
    expect(() => nextStep(energie, 'household', answers)).toThrow('not on the visitor');
    expect(() => visibleFields(energie, 'nope', answers)).toThrow('unknown step "nope"');
  });

  it('reads derived values as derived.<key>, a missing preselect as false', () => {
    const flow = smallFlow([question('a', [])]);
    expect(conditionData(flow, { a: 'yes', stray: 'x' }, { region: 'flanders' })).toEqual({
      a: 'yes',
      derived: { region: 'flanders', preselected: false },
    });
    expect(conditionData(flow, {})).toEqual({ derived: { preselected: false } });
  });
});

describe('flow engine: states a valid flow never reaches', () => {
  const stuck = smallFlow([
    question('a', [{ if: { '==': [{ var: 'a' }, 'yes'] }, goto: 'b' }]),
    question('b', []),
  ]);
  const loop = smallFlow([question('a', [{ goto: 'b' }]), question('b', [{ goto: 'a' }])]);
  const hiddenLoop = smallFlow([
    question('a', [{ goto: 'b' }]),
    question('b', [{ goto: 'c' }], { visibleIf: false }),
    question('c', [{ goto: 'b' }], { visibleIf: false }),
  ]);

  it('throws on a missing fallback, a loop, or an unknown step', () => {
    expect(() => nextStep(stuck, 'a', { a: 'no' })).toThrow('no way on from step "a"');
    expect(() => pathSoFar(loop, { a: 'yes', b: 'yes' })).toThrow('loop at step "a"');
    expect(() => nextStep(hiddenLoop, 'a', {})).toThrow('loop at step "b"');
    expect(() => estimatedTotalSteps(loop, {})).toThrow('loop at step "a"');
    expect(() => getStep(loop, 'x')).toThrow('unknown step "x" in flow "test"');
  });

  it('throws on a loop on a branch the visitor did not take (estimate)', () => {
    const flow = smallFlow([
      question('a', [{ if: { '==': [{ var: 'a' }, 'yes'] }, goto: 'b' }, { goto: 'c' }]),
      question('b', [{ goto: 'd' }]),
      question('c', []),
      question('d', [{ goto: 'b' }]),
    ]);
    expect(pathSoFar(flow, { a: 'no' })).toEqual(['a', 'c']);
    expect(estimatedTotalSteps(flow, { a: 'no' })).toBe(2);
    expect(() => estimatedTotalSteps(flow, {})).toThrow('loop at step "b"');
  });

  it('has no start step when no step is shown', () => {
    expect(startStep(smallFlow([question('a', [], { visibleIf: false })]), {})).toBeNull();
  });

  it('ends the flow when only hidden steps are left', () => {
    const flow = smallFlow([
      question('a', [{ goto: 'b' }]),
      question('b', [], { visibleIf: false }),
    ]);
    expect(nextStep(flow, 'a', {})).toBeNull();
    expect(estimatedTotalSteps(flow, {})).toBe(1);
  });

  it('decides conditions on questions of a branch the visitor did not take', () => {
    const flow = smallFlow([
      question('a', [{ if: { '==': [{ var: 'a' }, 'yes'] }, goto: 'b' }, { goto: 'c' }]),
      question('b', [{ goto: 'd' }]),
      question('c', [{ goto: 'd' }]),
      question('d', [], { visibleIf: { '==': [{ var: 'b' }, 'yes'] } }),
    ]);
    expect(estimatedTotalSteps(flow, {})).toBe(3);
    // After "no", b can't be reached any more: d is decided hidden.
    expect(estimatedTotalSteps(flow, { a: 'no' })).toBe(2);
    expect(estimatedTotalSteps(flow, { a: 'no', c: 'yes' })).toBe(2);
    expect(estimatedTotalSteps(flow, { a: 'yes' })).toBe(3);
    expect(pathSoFar(flow, { a: 'no', c: 'yes' })).toEqual(['a', 'c']);
  });

  it('treats a missing derived value as undecided while the postcode can be given', () => {
    const inFlanders = { visibleIf: { '==': [{ var: 'derived.region' }, 'flanders'] } };
    const flow = smallFlow([
      {
        id: 'p',
        title: 'P',
        fields: [{ id: 'postcode', type: 'postcode', required: true }],
        next: [{ goto: 'b' }],
      },
      question('b', [], inFlanders),
    ]);
    expect(estimatedTotalSteps(flow, {})).toBe(2);
    expect(estimatedTotalSteps(flow, { postcode: '9000' }, { region: 'wallonia' })).toBe(1);
    expect(estimatedTotalSteps(flow, { postcode: '9000' }, { region: 'flanders' })).toBe(2);
    expect(estimatedTotalSteps(flow, { postcode: '9000' })).toBe(1);
    // Without a postcode question nothing can still give a region.
    const none = smallFlow([question('a', [{ goto: 'b' }]), question('b', [], inFlanders)]);
    expect(estimatedTotalSteps(none, {})).toBe(1);
  });
});

describe('flow engine: review fixes (PR 14)', () => {
  it('engine-var-default-decided-early: a var default does not decide an open question', () => {
    const flow = smallFlow([
      question('a', [{ goto: 'b' }]),
      question('b', [{ goto: 'c' }], { visibleIf: { '==': [{ var: ['a', 'no'] }, 'yes'] } }),
      question('c', []),
    ]);
    expect(progress(flow, 'a', {})).toEqual({ step: 1, total: 3 });
    expect(progress(flow, 'b', { a: 'yes' })).toEqual({ step: 2, total: 3 });
    expect(progress(flow, 'c', { a: 'no' })).toEqual({ step: 2, total: 2 });
  });

  it('engine-raw-number-conditions: conditions see typed numbers parsed', () => {
    const flow = smallFlow([
      {
        id: 'n',
        title: 'N',
        fields: [{ id: 'kwh', type: 'number', unit: 'kWh', required: true, min: 0, max: 100000 }],
        next: [{ if: { '>=': [{ var: 'kwh' }, 10000] }, goto: 'high' }, { goto: 'low' }],
      },
      question('high', [{ goto: 'end' }]),
      question('low', [{ goto: 'end' }], { visibleIf: { '<': [{ var: 'kwh' }, 5000] } }),
      question('end', []),
    ]);
    for (const kwh of ['12.000', '12000', ' 12 000 ', 12000]) {
      expect(nextStep(flow, 'n', { kwh }), String(kwh)).toBe('high');
    }
    expect(nextStep(flow, 'n', { kwh: '3.500' })).toBe('low');
    expect(nextStep(flow, 'n', { kwh: '7.000' })).toBe('end');
    expect(estimatedTotalSteps(flow, { kwh: '3.500' })).toBe(3);
    expect(estimatedTotalSteps(flow, { kwh: '25.000' })).toBe(3);
    expect(pathSoFar(flow, { kwh: '25.000', high: 'no' })).toEqual(['n', 'high', 'end']);
    // A value that doesn't validate is read as typed (the step can't be left with it anyway).
    expect(nextStep(flow, 'n', { kwh: '12,5' })).toBe('end');
  });

  it('engine-preselect-without-energy-type: refuses a lead without an implied answer', () => {
    const derived = { region: 'flanders', preselected: true };
    const { answers } = play(energie, { product: {} }, derived, { energy_type: 'gas' });
    const context = {
      lead_id: 'l',
      event_id: 'e',
      submitted_at: '2026-10-01T09:30:00.000Z',
      derived,
      tracking: {},
      cookies: { analytics: false, marketing: false },
      page: '/vergelijken/energie',
      test: false,
    };
    expect(buildSubmission(energie, answers, context).answers.energy_type).toBe('gas');
    const { energy_type: _, ...without } = answers;
    expect(() => buildSubmission(energie, without, context)).toThrow(
      '"energy_type" is missing: the step that asks it ("product") was skipped',
    );
    // Flows whose products the choice doesn't imply anything for don't need it.
    expect(() =>
      buildSubmission(
        zonnepanelen,
        {
          postcode: '3000',
          ownership: 'owner',
          ...script.contact,
        },
        context,
      ),
    ).not.toThrow();

    // Only a skipped question counts: not one on a branch not taken, nor a choice without it.
    const pick = (id: string): Step['fields'][number] => ({
      id,
      type: 'single_choice',
      options: [
        { code: 'x', label: 'X', sets: { kind: 'x' } },
        { code: 'n', label: 'N' },
      ],
    });
    const branch = [
      question('a', [{ if: { '==': [{ var: 'a' }, 'yes'] }, goto: 's' }, { goto: 'c' }]),
      { id: 's', title: 'S', fields: [pick('second')], next: [{ goto: 'c' }] },
      question('c', []),
    ];
    const skippable: Step = {
      id: 'p',
      title: 'P',
      visibleIf: { '!': [{ var: 'derived.preselected' }] },
      fields: [pick('first')],
      next: [{ goto: 'a' }],
    };
    const send = (flow: Flow, given: Answers) => () => buildSubmission(flow, given, context);
    expect(send(smallFlow(branch), { a: 'no', c: 'yes' })).not.toThrow();
    const both = smallFlow([skippable, ...branch]);
    expect(send(both, { a: 'yes', second: 'n', c: 'yes' })).not.toThrow();
    expect(send(both, { a: 'yes', second: 'x', c: 'yes' })().answers).toMatchObject({ kind: 'x' });
    expect(send(both, { a: 'no', c: 'yes' })).toThrow('"kind" is missing');
  });

  it('engine-optional-field-y-grows: an optional field on the current step stays open', () => {
    const flow = smallFlow([
      {
        id: 'a',
        title: 'A',
        fields: [
          { id: 'a', type: 'yes_no', required: true },
          { id: 'ev', type: 'checkbox' },
        ],
        next: [{ goto: 'o' }],
      },
      {
        id: 'o',
        title: 'O',
        fields: [{ id: 'remark', type: 'text' }],
        next: [{ goto: 'b' }],
      },
      question('b', [{ goto: 'c' }], { visibleIf: { var: 'ev' } }),
      question('c', []),
    ]);
    expect(progress(flow, 'a', {})).toEqual({ step: 1, total: 4 });
    expect(progress(flow, 'a', { a: 'yes' })).toEqual({ step: 1, total: 4 });
    expect(progress(flow, 'a', { a: 'yes', ev: true })).toEqual({ step: 1, total: 4 });
    // On the next step ev is decided: unticked hides b.
    expect(progress(flow, 'o', { a: 'yes' })).toEqual({ step: 2, total: 3 });
    expect(progress(flow, 'o', { a: 'yes', ev: true })).toEqual({ step: 2, total: 4 });
  });

  it('engine-missing-derived-never-decided: a missing preselect is false, region follows the postcode', () => {
    const preselect = smallFlow([
      question('a', [{ goto: 'b' }]),
      question('b', [{ goto: 'c' }], { visibleIf: { var: 'derived.preselected' } }),
      question('c', []),
    ]);
    expect(pathSoFar(preselect, { a: 'yes', c: 'yes' })).toEqual(['a', 'c']);
    expect(progress(preselect, 'c', { a: 'yes', c: 'yes' })).toEqual({ step: 2, total: 2 });
    expect(progress(preselect, 'a', {})).toEqual({ step: 1, total: 2 });
    expect(progress(preselect, 'a', {}, { preselected: true })).toEqual({ step: 1, total: 3 });

    const region = smallFlow([
      {
        id: 'p',
        title: 'P',
        fields: [{ id: 'postcode', type: 'postcode', required: true, payload: 'derived' }],
        next: [{ goto: 'b' }],
      },
      question('b', [{ goto: 'c' }], {
        visibleIf: { '==': [{ var: 'derived.region' }, 'flanders'] },
      }),
      question('c', []),
    ]);
    // While the postcode can still be given, the region is undecided.
    expect(progress(region, 'p', {})).toEqual({ step: 1, total: 3 });
    // After it, a region the island could not work out is decided missing.
    expect(progress(region, 'c', { postcode: '9000' })).toEqual({ step: 2, total: 2 });
    const flanders = { region: 'flanders' };
    expect(progress(region, 'b', { postcode: '9000' }, flanders)).toEqual({ step: 2, total: 3 });
  });

  it('engine-stale-hidden-routing: answers of hidden fields never route', () => {
    const flow = smallFlow([
      {
        id: 'et0',
        title: 'Et',
        fields: [
          { id: 'et0', type: 'yes_no', required: true },
          {
            id: 'et',
            type: 'single_choice',
            required: true,
            options: [
              { code: 'e', label: 'E' },
              { code: 'g', label: 'G' },
            ],
          },
        ],
        next: [{ goto: 'k' }],
      },
      {
        id: 'k',
        title: 'K',
        fields: [
          {
            id: 'k',
            type: 'yes_no',
            required: true,
            visibleIf: { '==': [{ var: 'et' }, 'e'] },
          },
        ],
        next: [{ if: { '==': [{ var: 'k' }, 'yes'] }, goto: 'a' }, { goto: 'b' }],
      },
      question('a', [{ goto: 'end' }]),
      question('b', [{ goto: 'end' }]),
      question('end', []),
    ]);
    const answers = { et0: 'yes', et: 'g', k: 'yes', a: 'yes', b: 'no' };
    expect(nextStep(flow, 'et0', answers)).toBe('b');
    expect(pathSoFar(flow, answers)).toEqual(['et0', 'b', 'end']);
    const cleared = clearAbandoned(flow, answers);
    expect(cleared).toEqual({ et0: 'yes', et: 'g', b: 'no' });
    expect(clearAbandoned(flow, cleared)).toEqual(cleared);
    expect(progress(flow, 'b', answers)).toEqual({ step: 2, total: 3 });
  });

  it('validate-constructor-field-id: answers are read as own properties only', () => {
    const step: Step = {
      id: 's',
      title: 'S',
      fields: [
        {
          id: 'constructor',
          type: 'select',
          required: true,
          options: [{ code: 'x', label: 'X' }],
        },
      ],
      next: [],
    };
    const flow = smallFlow([step]);
    expect(isStepAnswered(flow, 's', {})).toBe(false);
    expect(validateStep(flow, 's', {}).errors).toEqual({ constructor: 'required' });
    expect(pathSoFar(flow, {})).toEqual(['s']);
    expect(clearAbandoned(flow, {})).toEqual({});
    expect(answerLabels(flow, {})).toEqual({});
    expect(answerLabels(flow, { constructor: 'x' })).toEqual({ constructor: 'X' });
  });
});

describe('flow engine: validateStep (field validators, brief §7.5)', () => {
  const both = product('both');
  const none = { valid: true, errors: {}, warnings: {}, suggestions: {} };

  it('requires only visible fields', () => {
    expect(validateStep(energie, 'consumption_kwh', product('gas')).errors).toEqual({
      gas_kwh: 'required',
    });
    expect(validateStep(energie, 'consumption_kwh', both)).toEqual({
      valid: false,
      errors: { electricity_kwh: 'required', gas_kwh: 'required' },
      warnings: {},
      suggestions: {},
    });
  });

  it('checks numbers: integers, "3.500", ranges and soft warnings', () => {
    const check = (electricity_kwh: unknown) =>
      validateStep(energie, 'consumption_kwh', {
        ...both,
        gas_kwh: 12000,
        electricity_kwh,
      } as Answers);
    expect(check('3.500')).toEqual(none);
    expect(check(3500).valid).toBe(true);
    expect(check(3.5).errors).toEqual({ electricity_kwh: 'number_not_integer' });
    expect(check('3,5').errors).toEqual({ electricity_kwh: 'number_not_integer' });
    expect(check('veel').errors).toEqual({ electricity_kwh: 'number_invalid' });
    expect(check(true).errors).toEqual({ electricity_kwh: 'invalid_type' });
    expect(check(50).errors).toEqual({ electricity_kwh: 'number_too_low' });
    expect(check(100001).errors).toEqual({ electricity_kwh: 'number_too_high' });
    expect(check(300)).toEqual({ ...none, warnings: { electricity_kwh: 'outside_typical' } });
    expect(check(25000).warnings).toEqual({ electricity_kwh: 'outside_typical' });
    // Gas has no soft range.
    expect(
      validateStep(energie, 'consumption_kwh', { ...product('gas'), gas_kwh: 149000 }),
    ).toEqual(none);
  });

  it('checks choice codes', () => {
    const check = (answers: Answers, id: string) =>
      validateStep(energie, id, { ...both, ...answers }).errors;
    expect(check({ supplier: 'Luminus' }, 'supplier')).toEqual({ supplier: 'option_unknown' });
    expect(check({ meter_type: 'dual' }, 'meter_type')).toEqual({});
    expect(check({ digital_meter: 'ja', has_solar: true }, 'meters_solar')).toEqual({
      digital_meter: 'option_unknown',
      has_solar: 'invalid_type',
    });
  });

  it('checks the contact step: text, formats, call moment, consent', () => {
    const valid = script.contact!;
    const check = (answers: Record<string, unknown>) =>
      validateStep(energie, 'contact', { ...valid, ...answers } as Answers).errors;
    expect(validateStep(energie, 'contact', valid)).toEqual(none);
    expect(check({ first_name: '  ' })).toEqual({ first_name: 'required' });
    expect(check({ first_name: 'J'.repeat(61) })).toEqual({ first_name: 'text_too_long' });
    expect(check({ last_name: 12 })).toEqual({ last_name: 'invalid_type' });
    expect(check({ phone: '123' })).toEqual({ phone: 'phone_invalid' });
    expect(check({ phone: '0032 9 123 45 67' })).toEqual({ phone: 'phone_landline' });
    expect(check({ email: 'nee' })).toEqual({ email: 'email_invalid' });
    expect(check({ email: 42 })).toEqual({ email: 'invalid_type' });
    expect(check({ terms: false })).toEqual({ terms: 'required' });
    expect(check({ newsletter: 'yes' })).toEqual({ newsletter: 'invalid_type' });
    expect(check({ newsletter: false })).toEqual({});
    expect(check({ call_moment: undefined })).toEqual({ call_moment: 'required' });
    expect(check({ call_moment: { day: 'wed' } })).toEqual({ call_moment: 'slot_required' });
    expect(check({ call_moment: { slot: '13-14' } })).toEqual({ call_moment: 'day_required' });
    expect(check({ call_moment: { day: 'sat', slot: '13-14' } })).toEqual({
      call_moment: 'day_unknown',
    });
    expect(check({ call_moment: { day: 'wed', slot: '17-18' } })).toEqual({
      call_moment: 'slot_unknown',
    });
    expect(check({ call_moment: 'wed' })).toEqual({ call_moment: 'invalid_type' });
    expect(check({ first_name: null, call_moment: null })).toEqual({
      first_name: 'required',
      call_moment: 'required',
    });
  });

  it('passes on e-mail suggestions, valid or not', () => {
    expect(
      validateStep(energie, 'contact', { ...script.contact!, email: 'jan@gmial.com' }),
    ).toEqual({
      ...none,
      suggestions: { email: 'jan@gmail.com' },
    });
    expect(
      validateStep(energie, 'contact', { ...script.contact!, email: 'jan@gmail,com' }),
    ).toEqual({
      valid: false,
      errors: { email: 'email_invalid' },
      warnings: {},
      suggestions: { email: 'jan@gmail.com' },
    });
  });

  it('lets optional fields stay empty but checks what is given', () => {
    const step: Step = {
      id: 'optional',
      title: 'Optioneel',
      fields: [
        {
          id: 'moment',
          type: 'day_slot',
          days: [{ code: 'mon', label: 'Maandag' }],
          slots: [{ code: '09-10', label: '09-10' }],
        },
        { id: 'postcode', type: 'postcode' },
        { id: 'remark', type: 'text' },
        { id: 'landline', type: 'phone', allowLandlines: true },
      ],
      next: [],
    };
    const flow = smallFlow([step]);
    expect(validateStep(flow, 'optional', {})).toEqual(none);
    expect(validateStep(flow, 'optional', { moment: { day: ' ', slot: '' } })).toEqual(none);
    expect(validateStep(flow, 'optional', { moment: { slot: '09-10' } }).errors).toEqual({
      moment: 'day_required',
    });
    expect(
      validateStep(flow, 'optional', { moment: { day: 'tue', slot: '09-10' } }).errors,
    ).toEqual({
      moment: 'day_unknown',
    });
    expect(validateStep(flow, 'optional', { postcode: '90' }).errors).toEqual({
      postcode: 'postcode_invalid',
    });
    // Text without a maxLength gets the validators' safety limit (TEXT_MAX_LENGTH).
    expect(validateStep(flow, 'optional', { remark: 'x'.repeat(100) }).valid).toBe(true);
    expect(validateStep(flow, 'optional', { remark: 'x'.repeat(101) }).errors).toEqual({
      remark: 'text_too_long',
    });
    expect(validateStep(flow, 'optional', { landline: '09 123 45 67' }).valid).toBe(true);
  });

  it('counts an answer as given the way the validators count it as empty', () => {
    const step: Step = {
      id: 'required',
      title: 'Verplicht',
      fields: [
        {
          id: 'moment',
          type: 'day_slot',
          required: true,
          days: [{ code: 'mon', label: 'Maandag' }],
          slots: [{ code: '09-10', label: '09-10' }],
        },
        { id: 'agree', type: 'consent', required: true },
        { id: 'name', type: 'text', required: true },
      ],
      next: [],
    };
    const flow = smallFlow([step]);
    const given = { moment: { day: 'mon', slot: '09-10' }, agree: true, name: 'An' };
    const answered = (answers: Record<string, unknown>) =>
      isStepAnswered(flow, 'required', { ...given, ...answers } as Answers);
    expect(answered({})).toBe(true);
    expect(answered({ moment: { day: 'mon', slot: ' ' } })).toBe(false);
    expect(answered({ moment: null })).toBe(false);
    expect(answered({ agree: false })).toBe(false);
    expect(answered({ name: '   ' })).toBe(false);
    // Format isn't checked: a malformed value counts as given (validateStep reports it).
    expect(answered({ moment: 'mon' })).toBe(true);
    expect(validateStep(flow, 'required', { ...given, moment: 'mon' }).errors).toEqual({
      moment: 'invalid_type',
    });
  });
});

describe('flow engine: clearAbandoned (brief §7.1)', () => {
  const full = { ...Object.values(script).reduce((all, step) => ({ ...all, ...step }), {}) };

  it('drops the answers of the branch the visitor left', () => {
    const cleared = clearAbandoned(energie, { ...full, knows_consumption: 'no' });
    expect(cleared).not.toHaveProperty('electricity_kwh');
    expect(cleared).not.toHaveProperty('gas_kwh');
    expect(cleared).toMatchObject({ household_size: '2', heat_pump: 'no' });
    const yes = clearAbandoned(energie, full);
    expect(yes).not.toHaveProperty('household_size');
    expect(yes).toHaveProperty('electricity_kwh', '3.500');
  });

  it('drops answers of fields and steps that became hidden', () => {
    const gas = clearAbandoned(energie, { ...full, ...product('gas') });
    expect(gas).not.toHaveProperty('meter_type');
    expect(gas).not.toHaveProperty('has_solar');
    expect(gas).not.toHaveProperty('electricity_kwh');
    expect(gas).toMatchObject({ energy_type: 'gas', gas_kwh: 12000 });
    const personal = clearAbandoned(energie, {
      ...full,
      is_business: false,
      business_electricity_band: 'over_100k',
    });
    expect(personal).not.toHaveProperty('business_electricity_band');
    expect(clearAbandoned(energie, { ...full, stray: 'x' })).not.toHaveProperty('stray');
  });

  it('keeps implied answers in line with the chosen option', () => {
    // A stale energy_type is corrected by the chosen card.
    expect(clearAbandoned(energie, { product_choice: 'both', energy_type: 'gas' })).toEqual({
      product_choice: 'both',
      energy_type: 'both',
    });
    // Choosing another product: the island switches flows; energy_type goes.
    expect(clearAbandoned(energie, { product_choice: 'zonnepanelen', energy_type: 'gas' })).toEqual(
      { product_choice: 'zonnepanelen' },
    );
    expect(clearAbandoned(energie, { product_choice: 'nope', energy_type: 'gas' })).toEqual({
      product_choice: 'nope',
    });
    // A preselect: the product step is skipped, energy_type stays when this flow allows it.
    const preselected = { preselected: true };
    expect(
      clearAbandoned(energie, { product_choice: 'gas', energy_type: 'both' }, preselected),
    ).toEqual({ energy_type: 'both' });
    expect(clearAbandoned(energie, { energy_type: 'solar' }, preselected)).toEqual({});
    expect(clearAbandoned(zonnepanelen, { energy_type: 'both' }, preselected)).toEqual({});
  });

  it('clears chains in one pass: a hidden answer never shows the next question', () => {
    const flow = smallFlow([
      question('a', [{ goto: 'b' }]),
      question('b', [{ goto: 'c' }], { visibleIf: { '==': [{ var: 'a' }, 'yes'] } }),
      question('c', [], { visibleIf: { '==': [{ var: 'b' }, 'yes'] } }),
    ]);
    expect(clearAbandoned(flow, { a: 'no', b: 'yes', c: 'yes' })).toEqual({ a: 'no' });
    expect(clearAbandoned(flow, { a: 'yes', b: 'yes', c: 'yes' })).toEqual({
      a: 'yes',
      b: 'yes',
      c: 'yes',
    });
    // The same on one step: a field's condition sees the visible fields before it.
    const chained = smallFlow([
      {
        id: 's',
        title: 'S',
        fields: [
          { id: 'a', type: 'yes_no', required: true },
          { id: 'b', type: 'yes_no', visibleIf: { '==': [{ var: 'a' }, 'yes'] } },
          { id: 'c', type: 'yes_no', visibleIf: { '==': [{ var: 'b' }, 'yes'] } },
        ],
        next: [],
      },
    ]);
    const stale = { a: 'no', b: 'yes', c: 'yes' };
    expect(visibleFields(chained, 's', stale).map((f) => f.id)).toEqual(['a']);
    expect(clearAbandoned(chained, stale)).toEqual({ a: 'no' });
    expect(visibleFields(chained, 's', { ...stale, a: 'yes' }).map((f) => f.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('allows implied values of options without a product in every flow', () => {
    const flow = smallFlow([
      {
        id: 'a',
        title: 'A',
        fields: [
          {
            id: 'a',
            type: 'single_choice',
            options: [
              { code: 'x', label: 'X', sets: { kind: 'x' } },
              { code: 'y', label: 'Y', product: 'zonnepanelen', sets: { kind: 'y' } },
            ],
          },
        ],
        next: [],
      },
    ]);
    expect(clearAbandoned(flow, { kind: 'x' }, {})).toEqual({ kind: 'x' });
    expect(clearAbandoned(flow, { kind: 'y' }, {})).toEqual({});
  });
});

describe('flow engine: buildSubmission (brief §9.2)', () => {
  const context: SubmissionContext = {
    lead_id: '0b6f5a4e-1111-4c2d-9a9a-000000000001',
    event_id: '0b6f5a4e-2222-4c2d-9a9a-000000000002',
    submitted_at: '2026-10-01T09:30:00.000Z',
    derived: { region: 'flanders', province: 'oost-vlaanderen', preselected: false },
    tracking: { gclid: 'abc', entry_path: '/vergelijken/energie' },
    cookies: { analytics: true, marketing: false },
    page: '/vergelijken/energie',
    test: false,
  };

  it('sends the codes and normalised values of shown fields, routed by payload', () => {
    const { answers } = play(energie);
    const submission = buildSubmission(energie, { ...answers, household_size: '3' }, context);
    expect(submission).toEqual({
      schema_version: SCHEMA_VERSION,
      lead_id: context.lead_id,
      event_id: context.event_id,
      submitted_at: context.submitted_at,
      product: 'energie',
      flow_id: 'energie',
      flow_version: 1,
      answers: {
        energy_type: 'both',
        is_business: false,
        supplier: 'luminus',
        meter_type: 'dual',
        digital_meter: 'yes',
        has_solar: 'no',
        social_tariff: 'no',
        budget_meter: 'no',
        knows_consumption: 'yes',
        electricity_kwh: 3500,
        gas_kwh: 12000,
      },
      derived: { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' },
      contact: {
        first_name: 'Jan',
        last_name: 'Peeters',
        phone_e164: '+32475123456',
        phone_display: '+32 475 12 34 56',
        email: 'jan.peeters@example.be',
      },
      call_preference: { day: 'wed', slot: '13-14' },
      consent: { cookies: { analytics: true, marketing: false }, terms: true, newsletter: false },
      tracking: expect.objectContaining({
        gclid: 'abc',
        fbc: '',
        entry_path: '/vergelijken/energie',
      }),
      meta: { page: '/vergelijken/energie', test: false },
    });
    expect(Object.keys(submission.tracking)).toEqual([...TRACKING_KEYS]);
    expect(Object.keys(submission.answers)[0]).toBe('energy_type');
  });

  const optional = smallFlow([
    {
      id: 'extra',
      title: 'Extra',
      fields: [
        { id: 'postcode', type: 'postcode', payload: 'derived' },
        { id: 'remark', type: 'text' },
        { id: 'count', type: 'number', unit: 'stuks', min: 0, max: 10 },
        { id: 'landline', type: 'phone', allowLandlines: true },
        {
          id: 'moment',
          type: 'day_slot',
          payload: 'call_preference',
          days: [{ code: 'mon', label: 'Maandag' }],
          slots: [{ code: '09-10', label: '09-10' }],
        },
        { id: 'newsletter', type: 'checkbox', payload: 'consent' },
        { id: 'internal', type: 'text', payload: 'none' },
      ],
      next: [],
    },
  ]);

  it('leaves out optional fields left empty; unchecked boxes are false', () => {
    const submission = buildSubmission(
      optional,
      { postcode: ' 3000 ', remark: '  ', moment: { day: '', slot: '' }, internal: 'x' },
      { ...context, derived: {} },
    );
    expect(submission.answers).toEqual({});
    expect(submission.derived).toEqual({ postcode: '3000' });
    expect(submission.contact).toEqual({});
    expect(submission.call_preference).toBeNull();
    expect(submission.consent).toEqual({ cookies: context.cookies, newsletter: false });
  });

  it('sends a phone number as <id>_e164 and <id>_display wherever it goes', () => {
    const submission = buildSubmission(
      optional,
      { remark: ' Graag  na 17u ', count: '3', landline: '09 123 45 67' },
      { ...context, derived: {} },
    );
    expect(submission.answers).toEqual({
      remark: 'Graag na 17u',
      count: 3,
      landline_e164: '+3291234567',
      landline_display: '+32 9 123 45 67',
    });
  });

  it('refuses a shown field that does not validate (the island validates every step)', () => {
    const { answers } = play(energie);
    expect(() => buildSubmission(energie, { ...answers, gas_kwh: 'veel' }, context)).toThrow(
      'field "gas_kwh" is not valid: number_invalid',
    );
    expect(() => buildSubmission(energie, { ...answers, terms: false }, context)).toThrow(
      FlowError,
    );
    // A required field on a shown step left empty.
    expect(() =>
      buildSubmission(
        zonnepanelen,
        { product_choice: 'zonnepanelen', postcode: '3000', ownership: 'owner', first_name: 'An' },
        context,
      ),
    ).toThrow('field "last_name" is not valid: required');
    // An optional field with an invalid value.
    expect(() => buildSubmission(optional, { remark: 'x'.repeat(101) }, context)).toThrow(
      'field "remark" is not valid: text_too_long',
    );
    // Hidden fields aren't sent, so their values aren't checked.
    expect(
      buildSubmission(energie, { ...answers, household_size: 'nope' }, context).answers,
    ).not.toHaveProperty('household_size');
  });

  it('gives the Dutch labels of coded answers for the server', () => {
    expect(
      answerLabels(energie, {
        supplier: 'luminus',
        meter_type: 'dual',
        digital_meter: 'yes',
        has_solar: 'no',
        knows_consumption: 'maybe',
        budget_meter: 'nope',
        electricity_kwh: 3500,
      }),
    ).toEqual({
      supplier: 'Luminus',
      meter_type: 'Dag/nachtmeter (tweevoudig tarief)',
      digital_meter: 'Ja',
    });
    expect(answerLabels(energie, { digital_meter: 'maybe' })).toEqual({});
  });
});
