// Moving through the form (Tanjil's form feedback 2026-09-30): auto-advance after a tap on steps
// with several choice questions (src/lib/form/navigation.ts + shouldAutoAdvance), the next open
// question, jumping back on the progress bar, and "Opnieuw beginnen" with its undo
// (src/lib/form/reset.ts). Run against the real flows and copy (src/content/flows/nl) and small
// hand-made flows. The browser behaviour is in tests/e2e/form-behaviour.spec.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FormIsland from '../../src/components/form/FormIsland';
import { ProgressCard } from '../../src/components/form/ProgressCard';
import { ResetButton } from '../../src/components/form/ResetControls';
import { getStep, pathSoFar, validateStep } from '../../src/lib/flow/engine';
import { resolveFlow } from '../../src/lib/flow/resolve';
import {
  flowCopyFile,
  flowFile,
  sharedStepsFile,
  type Field,
  type Flow,
  type Step,
} from '../../src/lib/flow/schema';
import type { Answers, Product } from '../../src/lib/flow/types';
import { engineDerived, flowAfter, withAnswer } from '../../src/lib/form/answers';
import { serverStart, startFlags, urlPreselects } from '../../src/lib/form/initial';
import { progressJumpLabel } from '../../src/lib/form/messages';
import { shouldAutoAdvance, type PickVia } from '../../src/lib/form/motion';
import { canJumpBack, nextOpenField, pickOutcome } from '../../src/lib/form/navigation';
import { canReset, freshStart, UNDO_MS } from '../../src/lib/form/reset';
import type { FormFlags, FormFlows } from '../../src/lib/form/types';
import { question, smallFlow } from './flow-fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON from the content files */

const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const read = (name: string): any => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));
const shared = sharedStepsFile.parse(read('_shared.json'));
const real = (name: Product): Flow => resolveFlow(flowFile.parse(read(`${name}.json`)), shared);
const energie = real('energie');
const zonnepanelen = real('zonnepanelen');
const thuisbatterij = real('thuisbatterij');
const all: FormFlows = { energie, zonnepanelen, thuisbatterij };
const { panel, pages: _pages, ...copy } = flowCopyFile.parse(read('_copy.json'));

const home: FormFlags = { preselected: false, energy_preselected: false };
const preselected: FormFlags = { preselected: true, energy_preselected: true };

/**
 * What the island decides on a tap: the answers with the pick stored, the step as it is then,
 * and whether it moves on by itself.
 */
function tap(
  flow: Flow,
  stepId: string,
  before: Answers,
  fieldId: string,
  code: string,
  { flags = preselected, via = 'pointer' as PickVia, enabled = true, busy = false } = {},
) {
  const answers = withAnswer(before, fieldId, code);
  const outcome = pickOutcome(flow, stepId, answers, engineDerived(flags, answers), fieldId);
  const auto = shouldAutoAdvance({
    enabled,
    via,
    fieldId,
    fields: outcome.fields,
    complete: outcome.complete,
    wasComplete: validateStep(flow, stepId, before, engineDerived(flags, before)).valid,
    isLast: outcome.isLast,
    busy,
  });
  return { answers, outcome, auto };
}

describe('auto-advance after a tap (real flows)', () => {
  const both: Answers = { energy_type: 'both' };

  it('moves a single-question step on at the first tap', () => {
    expect(tap(energie, 'product', {}, 'product_choice', 'both', { flags: home }).auto).toBe(true);
    expect(tap(energie, 'meter_type', both, 'meter_type', 'dual').auto).toBe(true);
    expect(tap(energie, 'knows_consumption', both, 'knows_consumption', 'no').auto).toBe(true);
  });

  it('moves the digital meter + solar step on once both are answered', () => {
    const first = tap(energie, 'meters_solar', both, 'digital_meter', 'yes');
    expect(first.outcome.fields.map((field) => field.id)).toEqual(['digital_meter', 'has_solar']);
    expect(first.outcome.complete).toBe(false);
    expect(first.auto).toBe(false);
    // The open question to show next on a phone.
    expect(first.outcome.nextOpen).toBe('has_solar');
    const second = tap(energie, 'meters_solar', first.answers, 'has_solar', 'no');
    expect(second.outcome.complete).toBe(true);
    expect(second.outcome.nextOpen).toBeNull();
    expect(second.auto).toBe(true);
  });

  it('in any order: the second question first, then the first', () => {
    const first = tap(energie, 'meters_solar', both, 'has_solar', 'yes');
    expect(first.auto).toBe(false);
    // Nothing open below it: back to the top of the step.
    expect(first.outcome.nextOpen).toBe('digital_meter');
    expect(tap(energie, 'meters_solar', first.answers, 'digital_meter', 'no').auto).toBe(true);
  });

  it('back on a complete step: a new last answer moves on, a new first answer waits', () => {
    const done = { ...both, digital_meter: 'yes', has_solar: 'no' };
    expect(tap(energie, 'meters_solar', done, 'has_solar', 'yes').auto).toBe(true);
    // Changing the first of the two leaves time to change the second (or press "Volgende").
    const first = tap(energie, 'meters_solar', done, 'digital_meter', 'no');
    expect(first.outcome.complete).toBe(true);
    expect(first.auto).toBe(false);
    expect(tap(energie, 'meters_solar', first.answers, 'has_solar', 'yes').auto).toBe(true);
    // A single-question step moves on at any tap, as before.
    const meter = { ...both, meter_type: 'dual' };
    expect(tap(energie, 'meter_type', meter, 'meter_type', 'single').auto).toBe(true);
  });

  it('gas only: the meter step has one question and moves on at once', () => {
    const gas = tap(energie, 'meters_solar', { energy_type: 'gas' }, 'digital_meter', 'yes');
    expect(gas.outcome.fields.map((field) => field.id)).toEqual(['digital_meter']);
    expect(gas.auto).toBe(true);
  });

  it('the tariff step (yes/no + single choice) and the appliances step', () => {
    const tariff = tap(energie, 'tariff_meter', both, 'social_tariff', 'no');
    expect(tariff.auto).toBe(false);
    expect(tap(energie, 'tariff_meter', tariff.answers, 'budget_meter', 'unknown').auto).toBe(true);
    for (const flow of [energie, zonnepanelen, thuisbatterij]) {
      const heat = tap(flow, 'appliances', both, 'heat_pump', 'no');
      expect(heat.auto, flow.id).toBe(false);
      expect(tap(flow, 'appliances', heat.answers, 'electric_car', 'yes').auto, flow.id).toBe(true);
    }
  });

  it('the roof step of the solar flow', () => {
    const roof = tap(zonnepanelen, 'roof', {}, 'roof_type', 'pitched');
    expect(roof.auto).toBe(false);
    expect(roof.outcome.nextOpen).toBe('roof_orientation');
    expect(tap(zonnepanelen, 'roof', roof.answers, 'roof_orientation', 'south').auto).toBe(true);
  });

  it('keeps "Volgende" on a step with a typing field: the business bands by the postcode', () => {
    const business = { energy_type: 'both', postcode: '9000', is_business: true };
    const bands = tap(energie, 'postcode', business, 'business_electricity_band', 'under_100k');
    expect(bands.outcome.fields.map((field) => field.type)).toEqual([
      'postcode',
      'checkbox',
      'single_choice',
      'single_choice',
    ]);
    expect(bands.auto).toBe(false);
    expect(bands.outcome.nextOpen).toBe('business_gas_band');
    const complete = tap(energie, 'postcode', bands.answers, 'business_gas_band', 'over_100k');
    expect(complete.outcome.complete).toBe(true);
    expect(complete.auto).toBe(false);
  });

  it('never on keyboard input, when switched off or while sending', () => {
    const done = { ...both, digital_meter: 'yes' };
    const pick = (options: Parameters<typeof tap>[5]) =>
      tap(energie, 'meters_solar', done, 'has_solar', 'no', options).auto;
    expect(pick({})).toBe(true);
    expect(pick({ via: 'keyboard' })).toBe(false);
    expect(pick({ enabled: false })).toBe(false);
    expect(pick({ busy: true })).toBe(false);
  });

  it('a card of another product on step 1 moves on in that product’s flow', () => {
    const field = getStep(energie, 'product').fields[0]!;
    const product = flowAfter(all, 'energie', false, field, 'zonnepanelen');
    expect(product).toBe('zonnepanelen');
    const pick = tap(all[product]!, 'product', {}, 'product_choice', 'zonnepanelen', {
      flags: home,
    });
    expect(pick.outcome.isLast).toBe(false);
    expect(pick.auto).toBe(true);
  });

  it('never on the last step', () => {
    const flow = smallFlow([question('a', [{ goto: 'b' }]), question('b', [])]);
    expect(tap(flow, 'a', {}, 'a', 'yes').auto).toBe(true);
    const last = tap(flow, 'b', { a: 'yes' }, 'b', 'yes');
    expect(last.outcome.isLast).toBe(true);
    expect(last.outcome.complete).toBe(true);
    expect(last.auto).toBe(false);
  });
});

describe('auto-advance and revealed questions', () => {
  const battery: Field = { id: 'has_battery', type: 'yes_no', required: true };
  const size: Field = {
    id: 'battery_size',
    type: 'single_choice',
    label: 'Hoe groot?',
    required: true,
    visibleIf: { '==': [{ var: 'has_battery' }, 'yes'] },
    options: [
      { code: 'small', label: 'Klein' },
      { code: 'large', label: 'Groot' },
    ],
  };
  const km: Field = {
    id: 'car_km',
    type: 'number',
    label: 'Kilometers per jaar',
    required: true,
    unit: 'km',
    min: 1,
    max: 100000,
    visibleIf: { '==': [{ var: 'has_battery' }, 'yes'] },
  };
  const flowWith = (...fields: Field[]) => {
    const step: Step = { id: 'battery', title: 'Heb je een batterij?', fields, next: [] };
    return smallFlow([
      question('start', [{ goto: 'battery' }]),
      { ...step, next: [{ goto: 'end' }] },
      question('end', []),
    ]);
  };

  it('waits while a pick reveals a question that is still open, then moves on', () => {
    const flow = flowWith(battery, size);
    expect(tap(flow, 'battery', {}, 'has_battery', 'no').auto).toBe(true);
    const yes = tap(flow, 'battery', {}, 'has_battery', 'yes');
    expect(yes.outcome.fields.map((field) => field.id)).toEqual(['has_battery', 'battery_size']);
    expect(yes.auto).toBe(false);
    expect(yes.outcome.nextOpen).toBe('battery_size');
    expect(tap(flow, 'battery', yes.answers, 'battery_size', 'large').auto).toBe(true);
  });

  it('keeps "Volgende" when a pick reveals a typing field', () => {
    const flow = flowWith(battery, km);
    expect(tap(flow, 'battery', {}, 'has_battery', 'no').auto).toBe(true);
    const yes = tap(flow, 'battery', {}, 'has_battery', 'yes');
    expect(yes.auto).toBe(false);
    expect(yes.outcome.nextOpen).toBe('car_km');
    // Typed in: complete, but a step with a number field still waits for "Volgende".
    const typed = tap(flow, 'battery', { ...yes.answers, car_km: '1200' }, 'has_battery', 'yes');
    expect(typed.outcome.complete).toBe(true);
    expect(typed.auto).toBe(false);
  });
});

describe('the next open question', () => {
  const fields = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('is the first field after the pick with an error, then from the top', () => {
    expect(nextOpenField(fields, { b: 'required', c: 'required' }, 'a')).toBe('b');
    expect(nextOpenField(fields, { c: 'required' }, 'a')).toBe('c');
    expect(nextOpenField(fields, { a: 'required' }, 'b')).toBe('a');
    // Never the picked field itself: it has just been answered.
    expect(nextOpenField(fields, { b: 'required' }, 'b')).toBeNull();
    expect(nextOpenField(fields, {}, 'a')).toBeNull();
    // A field that isn't on the step: from the top.
    expect(nextOpenField(fields, { c: 'required', a: 'required' }, 'x')).toBe('a');
  });
});

describe('jumping back on the progress bar', () => {
  const path = ['postcode', 'supplier', 'meter_type', 'meters_solar'];

  it('only to a step before the current one on the path', () => {
    expect(canJumpBack(path, 'meter_type', 'postcode')).toBe(true);
    expect(canJumpBack(path, 'meter_type', 'supplier')).toBe(true);
    expect(canJumpBack(path, 'meter_type', 'meter_type')).toBe(false);
    // Forward, also to an answered step after a "Terug": never.
    expect(canJumpBack(path, 'meter_type', 'meters_solar')).toBe(false);
    expect(canJumpBack(path, 'meter_type', 'contact')).toBe(false);
    expect(canJumpBack(path, 'postcode', 'postcode')).toBe(false);
    expect(canJumpBack(path, 'contact', 'postcode')).toBe(false);
  });

  it('follows the visitor’s real path (pathSoFar)', () => {
    const answers = {
      energy_type: 'both',
      postcode: '9000',
      is_business: false,
      supplier: 'luminus',
      meter_type: 'dual',
    };
    const real = pathSoFar(energie, answers, engineDerived(preselected, answers));
    expect(real).toEqual(['postcode', 'supplier', 'meter_type', 'meters_solar']);
    // Two steps back from the meter questions, and none of the skipped energy question.
    expect(canJumpBack(real, 'meters_solar', 'supplier')).toBe(true);
    expect(canJumpBack(real, 'meters_solar', 'energy_choice')).toBe(false);
  });

  it('names each step for assistive technology from the copy', () => {
    expect(copy.progressJump).toBe('Ga terug naar stap {step}: {title}');
    expect(progressJumpLabel(copy, { index: 0, title: 'Wat is je postcode?' })).toBe(
      'Ga terug naar stap 1: Wat is je postcode?',
    );
    const broken = read('_copy.json');
    broken.progressJump = 'Ga terug naar stap {step}';
    expect(flowCopyFile.safeParse(broken).success).toBe(false);
  });

  it('renders the steps before the current one as buttons, named by the label', () => {
    const steps = path.map((id) => ({ id, title: getStep(energie, id).title }));
    const html = renderToStaticMarkup(
      createElement(ProgressCard, {
        template: copy.progress,
        steps,
        current: 'meter_type',
        step: 3,
        total: 9,
        onJump: () => {},
        jumpLabel: (item) => progressJumpLabel(copy, item),
      }),
    );
    expect(html.match(/<button type="button"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Ga terug naar stap 1: Wat is je postcode?"');
    expect(html).toContain(
      'aria-label="Ga terug naar stap 2: Wie is je huidige energieleverancier?"',
    );
    expect(html).not.toContain('stap 3');
    const first = renderToStaticMarkup(
      createElement(ProgressCard, {
        template: copy.progress,
        steps: steps.slice(0, 1),
        current: 'postcode',
        step: 1,
        total: 9,
        onJump: () => {},
        jumpLabel: (item) => progressJumpLabel(copy, item),
      }),
    );
    expect(first).not.toContain('<button');
  });
});

describe('reset and undo', () => {
  const entries = [
    { name: '/vergelijken', flows: all, product: 'energie', preselected: false, search: '' },
    {
      name: '/vergelijken/energie',
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '',
    },
    {
      name: '/vergelijken/energie?energie=both',
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=both',
    },
    {
      name: '/vergelijken/zonnepanelen',
      flows: { zonnepanelen },
      product: 'zonnepanelen',
      preselected: true,
      search: '',
    },
    {
      name: '/vergelijken/thuisbatterij',
      flows: { thuisbatterij },
      product: 'thuisbatterij',
      preselected: true,
      search: '',
    },
  ] as const;

  it('goes back to the first step the page serves, the URL preselect kept', () => {
    for (const entry of entries) {
      const flows: FormFlows = entry.flows;
      const preselect = urlPreselects(flows[entry.product]!, entry.search, entry.preselected);
      const fresh = freshStart({
        flows,
        product: entry.product,
        preselected: entry.preselected,
        preselect,
      });
      expect(fresh, entry.name).toEqual(
        serverStart(flows, entry.product, entry.preselected, preselect),
      );
      // The session flags come out as they were set when the form mounted.
      expect(fresh.flags, entry.name).toEqual(startFlags(entry.preselected, preselect));
    }
    const both = freshStart({
      flows: { energie },
      product: 'energie',
      preselected: true,
      preselect: { energy_type: 'both' },
    });
    expect(both).toMatchObject({ step: 'postcode', answers: { energy_type: 'both' } });
  });

  it('shows the button only when there is something to reset', () => {
    const fresh = freshStart({
      flows: { energie },
      product: 'energie',
      preselected: true,
      preselect: { energy_type: 'both' },
    });
    // The served first step, with only the URL's answer: nothing to reset.
    expect(canReset(fresh, fresh)).toBe(false);
    expect(canReset(fresh, { step: 'postcode', answers: { energy_type: 'both' } })).toBe(false);
    // Empty, untouched or cleared answers don't count.
    for (const blank of [undefined, '', '   ', false, {}]) {
      const answers = { energy_type: 'both', postcode: blank };
      expect(canReset(fresh, { step: 'postcode', answers }), JSON.stringify(blank)).toBe(false);
    }
    // An answer of the visitor's own, or any later step.
    expect(
      canReset(fresh, { step: 'postcode', answers: { ...fresh.answers, postcode: '9' } }),
    ).toBe(true);
    expect(canReset(fresh, { step: 'postcode', answers: { is_business: true } })).toBe(true);
    expect(canReset(fresh, { step: 'supplier', answers: fresh.answers })).toBe(true);
    expect(canReset(fresh, { step: 'contact', answers: { call_moment: { day: 'wed' } } })).toBe(
      true,
    );
    // A different energy type than the URL's is the visitor's (a stored energy choice).
    expect(canReset(fresh, { step: 'postcode', answers: { energy_type: 'gas' } })).toBe(true);
  });

  it('offers the undo for about 8 seconds, with its copy', () => {
    expect(UNDO_MS).toBe(8000);
    expect(copy.reset).toEqual({
      button: 'Opnieuw beginnen',
      done: 'Formulier gewist',
      undo: 'Ongedaan maken',
    });
    const broken = read('_copy.json');
    delete broken.reset.undo;
    expect(flowCopyFile.safeParse(broken).success).toBe(false);
  });

  it('renders no reset button on the served first step, and a named round one otherwise', () => {
    const image = { src: '/fox.webp', width: 941, height: 842, sizes: '80px', sources: [] };
    const html = renderToStaticMarkup(
      createElement(FormIsland, {
        entry: 'vergelijken',
        flows: all,
        product: 'energie',
        preselected: false,
        preselect: {},
        copy,
        icons: {},
        panels: { energie: { title: panel.energie.title, body: panel.energie.body, image } },
        flag: { src: '/be.png', width: 96, height: 66 },
        backHref: '/',
      }),
    );
    expect(html).not.toContain(copy.reset.button);
    expect(html).not.toContain(copy.reset.done);
    const button = renderToStaticMarkup(
      createElement(ResetButton, { visible: true, label: copy.reset.button, onReset: () => true }),
    );
    expect(button).toContain(`aria-label="${copy.reset.button}"`);
    expect(button).toContain(`title="${copy.reset.button}"`);
    expect(button).toContain('rounded-full');
    expect(button).toContain('size-[52px]');
    expect(
      renderToStaticMarkup(
        createElement(ResetButton, {
          visible: false,
          label: copy.reset.button,
          onReset: () => true,
        }),
      ),
    ).toBe('');
  });
});
