import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveFlow } from '../../src/lib/flow/resolve';
import { field, flowFile, flowId, sharedStepsFile } from '../../src/lib/flow/schema';
import { validateFlowSources, type LocaleSources } from '../../src/lib/flow/validate';
import { loadFlowSources } from '../../scripts/lib/flow-sources';
import { FIXTURES, readFixture } from './flow-fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any -- mutating raw fixture JSON */

function validateDir(dir: string) {
  const { locales, issues } = loadFlowSources(join(FIXTURES, dir));
  return [...issues, ...validateFlowSources(locales)];
}

/** Messages per file, for readable expectations. */
function byFile(issues: { file: string; message: string }[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const { file, message } of issues) (grouped[file] ??= []).push(message);
  return grouped;
}

/** The valid fixture with the energy flow (and optionally the shared steps) changed. */
function mutated(change: (flow: any, shared: any) => void, { withShared = true } = {}) {
  const flow = structuredClone(readFixture('valid/nl/energie.json')) as any;
  const shared = structuredClone(readFixture('valid/nl/_shared.json')) as any;
  change(flow, shared);
  const locale: LocaleSources = {
    locale: 'nl',
    flows: [{ path: 'nl/energie.json', data: flow }],
    ...(withShared ? { shared: { path: 'nl/_shared.json', data: shared } } : {}),
  };
  return validateFlowSources([locale]).map(({ file, message }) => `${file}: ${message}`);
}

const step = (flow: any, id: string) => flow.steps.find((s: any) => s.id === id || s.use === id);

describe('validate:flows fixtures', () => {
  it('accepts the valid energy-like flows', () => {
    expect(validateDir('valid')).toEqual([]);
  });

  it('reports each broken rule', () => {
    expect(byFile(validateDir('broken'))).toEqual({
      'nl/bad_literal.json': [
        'step "a" next[0]: compares "a" with "ja", which is not one of its codes (yes, no)',
      ],
      'nl/dead_end.json': [
        'step "b" is a dead end: it has no next, so its path never reaches "contact"',
      ],
      'nl/duplicate_code.json': ['field "a": options code "one" is used twice'],
      'nl/late_var.json': ['step "a" visibleIf: reads "b" before it is asked (step "b")'],
      'nl/loop.json': ['loop: a → b → a'],
      'nl/missing_goto.json': ['step "a": goto "nowhere" is not a step of this flow'],
      'nl/no_fallback.json': [
        'step "a" can be a dead end: its last next entry needs no "if" (a fallback)',
      ],
      'nl/own_contact.json': [
        'the flow must end with the shared "contact" step ({ "use": "contact" })',
      ],
      'nl/unknown_operator.json': ['steps.0.next.0.if: unknown JSONLogic operator "xor"'],
      'nl/unknown_var.json': [
        'step "b" visibleIf: unknown var "energy_typ" (not a field, an implied answer or derived.postcode|derived.region|derived.province|derived.preselected)',
      ],
      'nl/unreachable.json': ['step "orphan" can\'t be reached from firstStep'],
      'nl/wrong_name.json': ['id "other_name" must equal the file name ("wrong_name")'],
    });
  });

  it('requires identical codes across locales', () => {
    expect(validateDir('locales')).toEqual([
      {
        file: 'fr/zonnepanelen.json',
        message: 'missing: nl/zonnepanelen.json has no fr version',
      },
      {
        file: 'fr/energie.json',
        message: 'field "a" options must match nl/energie.json: "one, two" there, "one, deux" here',
      },
    ]);
  });
});

describe('validate:flows across locales', () => {
  /** A locale folder with the valid energy flow, optionally changed. */
  const locale = (name: string, change: (flow: any, shared: any) => void = () => {}) => {
    const flow = structuredClone(readFixture('valid/nl/energie.json')) as any;
    const shared = structuredClone(readFixture('valid/nl/_shared.json')) as any;
    delete flow.locale;
    change(flow, shared);
    return {
      locale: name,
      shared: { path: `${name}/_shared.json`, data: shared },
      flows: [{ path: `${name}/energie.json`, data: flow }],
    } satisfies LocaleSources;
  };
  const messages = (...locales: LocaleSources[]) =>
    validateFlowSources(locales).map((issue) => `${issue.file}: ${issue.message}`);

  it('accepts identical codes, and needs nl as the reference', () => {
    expect(messages(locale('nl'), locale('fr'))).toEqual([]);
    expect(messages(locale('fr'))).toEqual([]);
  });

  it('reports flows without an nl version', () => {
    const fr = locale('fr');
    fr.flows.push({
      path: 'fr/zonnepanelen.json',
      data: readFixture('valid/nl/zonnepanelen.json'),
    });
    expect(messages(locale('nl'), fr)).toEqual([
      'fr/zonnepanelen.json: no nl version of this flow',
    ]);
  });

  it('reports every code difference', () => {
    const changed = locale('fr', (flow, shared) => {
      step(flow, 'appliances').fields.pop();
      step(flow, 'household').fields[0].type = 'single_choice';
      step(flow, 'supplier').fields.push({ id: 'new_field', type: 'text' });
      flow.version = 2;
      delete shared.steps[0].fields[0].options[0].product;
    });
    expect(messages(locale('nl'), changed)).toEqual([
      'fr/energie.json: version must match nl/energie.json: "1" there, "2" here',
      'fr/energie.json: field "product_choice" option "electricity" must match nl/energie.json: "product energie, sets {"energy_type":"electricity"}" there, "product -, sets {"energy_type":"electricity"}" here',
      'fr/energie.json: field "household_size" type must match nl/energie.json: "select" there, "single_choice" here',
      'fr/energie.json: field "electric_car" type must match nl/energie.json: "yes_no" there, "(none)" here',
      'fr/energie.json: field "electric_car" options must match nl/energie.json: "yes, no" there, "(none)" here',
      'fr/energie.json: field "new_field" type must match nl/energie.json: "(none)" there, "text" here',
    ]);
  });
});

describe('validate:flows checks', () => {
  it('checks the shared steps file and references to it', () => {
    expect(mutated((_, shared) => (shared.steps[0].title = ''))).toEqual([
      'nl/_shared.json: steps.0.title: Too small: expected string to have >=1 characters',
    ]);
    expect(mutated((_, shared) => shared.steps.push(shared.steps[2]))).toEqual([
      'nl/_shared.json: step id "contact" is used twice',
    ]);
    expect(mutated((flow) => (step(flow, 'postcode').use = 'post_code'))).toEqual([
      'nl/energie.json: step "post_code" is not defined in _shared.json',
    ]);
    expect(mutated(() => {}, { withShared: false })).toEqual([
      'nl/energie.json: step "product" is not defined in _shared.json',
    ]);
    expect(mutated((flow) => (flow.locale = 'fr'))).toEqual([
      'nl/energie.json: locale "fr" must equal the folder ("nl")',
    ]);
    expect(
      validateFlowSources([{ locale: 'nl', flows: [{ path: 'nl/x.json', data: 'x' }] }]),
    ).toEqual([
      { file: 'nl/x.json', message: '(file): Invalid input: expected object, received string' },
    ]);
  });

  it('checks ids, codes and payload targets', () => {
    expect(
      mutated((flow) => {
        step(flow, 'household').id = 'appliances';
        step(flow, 'meter_type').next = [{ goto: 'meters_solar' }];
      }),
    ).toContain('nl/energie.json: step id "appliances" is used twice');
    expect(mutated((flow) => (step(flow, 'appliances').fields[0].id = 'supplier'))).toEqual([
      'nl/energie.json: field id "supplier" is used twice (steps "supplier" and "appliances")',
    ]);
    expect(
      mutated((_, shared) => {
        const moment = shared.steps[2].fields[4];
        moment.days[1].code = 'mon';
        moment.slots[1].code = '09-10';
      }),
    ).toEqual([
      'nl/energie.json: field "call_moment": days code "mon" is used twice',
      'nl/energie.json: field "call_moment": slots code "09-10" is used twice',
    ]);
    expect(
      mutated((_, shared) => {
        shared.steps[2].fields[0].payload = 'call_preference';
      }),
    ).toEqual([
      'nl/energie.json: field "first_name": payload "call_preference" is for day_slot fields',
      'nl/energie.json: more than one field has payload "call_preference"',
    ]);
    expect(
      mutated((_, shared) => {
        shared.steps[2].fields[4].payload = 'answers';
      }),
    ).toEqual(['nl/energie.json: field "call_moment": a day_slot needs payload "call_preference"']);
    expect(
      mutated((_, shared) => {
        delete shared.steps[2].fields[4].payload;
      }),
    ).toContain('nl/energie.json: field "call_moment": a day_slot needs payload "call_preference"');
    expect(
      mutated((_, shared) => {
        shared.steps[0].fields[0].options[3].sets = { supplier: 'x' };
      }),
    ).toEqual(['nl/energie.json: "supplier" is both a field id and set by an option\'s "sets"']);
  });

  it('checks the graph: first step, contact, fallbacks, loops', () => {
    expect(mutated((flow) => (flow.firstStep = 'start'))).toEqual([
      'nl/energie.json: firstStep "start" is not a step of this flow',
    ]);
    expect(
      mutated((_, shared) => {
        shared.steps[2].visibleIf = { var: 'energy_type' };
        shared.steps[2].next = [{ goto: 'product' }];
      }),
    ).toEqual([
      'nl/energie.json: the "contact" step is always shown: it can\'t have a visibleIf',
      'nl/energie.json: the "contact" step is the last step: it can\'t have a next',
      'nl/energie.json: loop: product → postcode → supplier → meter_type → meters_solar → tariff_meter → knows_consumption → consumption_kwh → contact → product',
    ]);
    expect(
      mutated((flow) => {
        step(flow, 'supplier').next = [{ goto: 'meter_type' }, { goto: 'household' }];
      }),
    ).toEqual([
      'nl/energie.json: step "supplier": next entries after the one without "if" are never used',
    ]);
    // One loop, found along two entries, is reported once.
    expect(
      mutated((flow) => {
        step(flow, 'appliances').next = [
          { if: { '==': [{ var: 'heat_pump' }, 'yes'] }, goto: 'household' },
          { goto: 'household' },
        ];
      }),
    ).toEqual(['nl/energie.json: loop: household → appliances → household']);
  });

  it('checks vars: known, in time, compared with real codes', () => {
    const on = (id: string, rule: unknown) => (flow: any) => (step(flow, id).visibleIf = rule);
    expect(mutated(on('household', { '==': [{ var: 'call_moment.day' }, 'mon'] }))).toEqual([
      'nl/energie.json: step "household" visibleIf: reads "call_moment.day" before it is asked (step "contact")',
    ]);
    expect(
      mutated((_, shared) => {
        shared.steps[2].fields[6].visibleIf = {
          and: [
            { in: [{ var: 'call_moment.day' }, ['mon', 'sun']] },
            { '==': ['13-14', { var: 'call_moment.slot' }] },
            { '==': [{ var: 'derived.region' }, 'flanders'] },
            { '==': [{ var: 'supplier' }, { var: 'meter_type' }] },
            { '!=': [{ var: 'knows_consumption' }, null] },
            { '==': [{ var: 'digital_meter' }, true] },
            { '==': [{ var: 'energy_type' }, 'solar'] },
            { '>': [{ var: 'electricity_kwh' }, 3000] },
            { in: [{ var: 'supplier' }, 'luminus'] },
            { '==': [{ var: 'energy_type' }, 'gas'] },
            { '==': [{ '!!': [{ var: 'is_business' }] }, true] },
          ],
        };
      }),
    ).toEqual([
      'nl/energie.json: field "newsletter" visibleIf: compares "call_moment.day" with "sun", which is not one of its codes (mon, tue, wed, thu, fri)',
      'nl/energie.json: field "newsletter" visibleIf: compares "digital_meter" with true, which is not one of its codes (yes, no)',
      'nl/energie.json: field "newsletter" visibleIf: compares "energy_type" with "solar", which is not one of its codes (electricity, gas, both)',
    ]);
    const unknown = (path: string) =>
      `nl/energie.json: step "household" visibleIf: unknown var "${path}" (not a field, an implied answer or derived.postcode|derived.region|derived.province|derived.preselected)`;
    for (const path of ['call_moment.hour', 'supplier.name', 'a.b.c', 'derived', 'derived.city']) {
      expect(mutated(on('household', { var: path }))).toEqual([unknown(path)]);
    }
    expect(
      mutated((_, shared) => (shared.steps[0].visibleIf = { '!': { var: 'energy_type' } })),
    ).toEqual([
      'nl/energie.json: step "product" visibleIf: reads "energy_type" before it is asked (step "product")',
    ]);
    // With a broken goto the order check is skipped (it needs the graph).
    expect(
      mutated((flow) => {
        step(flow, 'household').visibleIf = { var: 'heat_pump' };
        step(flow, 'appliances').next = [{ goto: 'nowhere' }];
      }),
    ).toEqual(['nl/energie.json: step "appliances": goto "nowhere" is not a step of this flow']);
  });
});

describe('flow schema', () => {
  it('rejects malformed conditions, ids and number ranges', () => {
    const issues = (data: unknown) =>
      flowFile.safeParse(data).error?.issues.map((issue) => issue.message) ?? [];
    const flow = structuredClone(readFixture('valid/nl/energie.json')) as any;
    step(flow, 'supplier').visibleIf = { var: 1, '==': [] };
    expect(issues(flow)).toEqual(['a rule needs exactly one operator, found var, ==']);
    step(flow, 'supplier').visibleIf = { var: [1] };
    expect(issues(flow)).toEqual(['"var" needs a literal path']);
    expect(flowId.safeParse('derived').success).toBe(false);
    expect(flowId.safeParse('Meter').success).toBe(false);
    const number = { id: 'kwh', type: 'number', unit: 'kWh', min: 100, max: 1000 };
    expect(field.safeParse(number).success).toBe(true);
    expect(field.safeParse({ ...number, softMin: 50 }).success).toBe(false);
    expect(field.safeParse({ ...number, min: 1000 }).success).toBe(false);
    expect(field.safeParse({ ...number, softMin: 200, softMax: 150 }).success).toBe(false);
    expect(field.safeParse({ ...number, icon: 'money' }).success).toBe(false);
  });

  it('resolves shared steps, keeping their next unless the flow sets one', () => {
    const shared = sharedStepsFile.parse(readFixture('valid/nl/_shared.json'));
    const file = flowFile.parse(readFixture('valid/nl/energie.json'));
    const flow = resolveFlow(file, shared);
    expect(flow.steps.map((s) => s.id)[0]).toBe('product');
    expect(flow.steps.find((s) => s.id === 'postcode')!.next).toEqual([{ goto: 'supplier' }]);
    expect(flow.steps.find((s) => s.id === 'contact')!.next).toEqual([]);
    expect(() => resolveFlow(file, undefined)).toThrow('step "product" is not defined');
  });
});

describe('validate:flows loader and script', () => {
  const script = join(import.meta.dirname, '..', '..', 'scripts', 'validate-flows.ts');
  const run = (dir: string) =>
    spawnSync(process.execPath, ['--import', 'tsx', script, dir], { encoding: 'utf8' });

  it('reads locale folders and reports files it cannot use', () => {
    const root = mkdtempSync(join(tmpdir(), 'vv-flows-'));
    mkdirSync(join(root, 'nl'));
    mkdirSync(join(root, 'nederlands'));
    writeFileSync(join(root, 'energie.json'), '{}');
    writeFileSync(join(root, 'README.md'), '');
    writeFileSync(join(root, 'nl', 'broken.json'), '{ nope');
    writeFileSync(join(root, 'nl', '_shared.json'), '{ "steps": [] }');
    writeFileSync(join(root, 'nl', 'notes.txt'), '');
    const { locales, issues } = loadFlowSources(root);
    expect(issues.map((issue) => issue.file)).toEqual([
      'energie.json',
      'nederlands/',
      'nl/broken.json',
    ]);
    expect(issues[2]!.message).toMatch(/^not valid JSON/);
    expect(locales).toEqual([
      { locale: 'nl', flows: [], shared: { path: 'nl/_shared.json', data: { steps: [] } } },
    ]);
    expect(loadFlowSources(join(root, 'missing'))).toEqual({ locales: [], issues: [] });
  });

  it('exits 0 for valid flows and none, 1 with the problems otherwise', () => {
    const valid = run(join(FIXTURES, 'valid'));
    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain('2 flow(s) in 1 locale(s) are valid');
    const empty = run(mkdtempSync(join(tmpdir(), 'vv-flows-')));
    expect(empty.status).toBe(0);
    expect(empty.stdout).toContain('no flow files yet');
    const broken = run(join(FIXTURES, 'broken'));
    expect(broken.status).toBe(1);
    expect(broken.stderr).toContain('12 problem(s)');
    expect(broken.stderr).toContain('nl/loop.json: loop: a → b → a');
  });
});
