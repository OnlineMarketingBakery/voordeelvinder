// Config switches (option `requires`), consent links and the copy file (_copy.json): schema,
// resolveFlow and validate:flows.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FlowResolveError, resolveFlow } from '../../src/lib/flow/resolve';
import { field, flowCopyFile, flowFile, sharedStepsFile } from '../../src/lib/flow/schema';
import { validateFlowSources, type LocaleSources } from '../../src/lib/flow/validate';
import { readFixture } from './flow-fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any -- mutating raw fixture JSON */

/** The valid fixture's shared steps with the gas cards behind a "gas" switch. */
function switched(gas: boolean) {
  const shared = structuredClone(readFixture('valid/nl/_shared.json')) as any;
  shared.switches = { gas };
  for (const option of shared.steps[0].fields[0].options) {
    if (option.code === 'gas' || option.code === 'both') option.requires = 'gas';
  }
  return shared;
}

const energieFile = () => structuredClone(readFixture('valid/nl/energie.json')) as any;

/**
 * A locale with the given energy flow, plus the fixture's solar and battery flows: validate:flows
 * needs a flow for every product the product step offers.
 */
function sources(shared: any, flow: any = energieFile(), locale = 'nl', copy?: unknown) {
  const others = ['thuisbatterij', 'zonnepanelen'].map((name) => {
    const data = structuredClone(readFixture(`valid/nl/${name}.json`)) as any;
    data.locale = locale;
    return { path: `${locale}/${name}.json`, data };
  });
  flow.locale = locale;
  return {
    locale,
    shared: { path: `${locale}/_shared.json`, data: shared },
    flows: [{ path: `${locale}/energie.json`, data: flow }, ...others],
    ...(copy === undefined ? {} : { copy: { path: `${locale}/_copy.json`, data: copy } }),
  } satisfies LocaleSources;
}

const messages = (...locales: LocaleSources[]) =>
  validateFlowSources(locales).map((issue) => `${issue.file}: ${issue.message}`);

const codes = (shared: any, options = {}) =>
  resolveFlow(flowFile.parse(energieFile()), sharedStepsFile.parse(shared), options)
    .steps[0]!.fields.flatMap((f) => (f.type === 'single_choice' ? f.options : []))
    .map((option) => option.code);

describe('config switches', () => {
  it('leaves out options whose switch is off', () => {
    expect(codes(switched(true))).toEqual([
      'electricity',
      'gas',
      'both',
      'zonnepanelen',
      'thuisbatterij',
    ]);
    expect(codes(switched(false))).toEqual(['electricity', 'zonnepanelen', 'thuisbatterij']);
    expect(codes(switched(false), { allSwitchesOn: true })).toHaveLength(5);
  });

  it('validates both settings, checking conditions with every switch on', () => {
    // The fixture compares energy_type with "gas" and "both": fine while gas is off.
    expect(messages(sources(switched(true)))).toEqual([]);
    expect(messages(sources(switched(false)))).toEqual([]);
  });

  it('rejects an unknown switch', () => {
    const shared = switched(true);
    shared.steps[0].fields[0].options[1].requires = 'gaz';
    const message =
      'field "product_choice": option "gas" requires the switch "gaz", which _shared.json "switches" does not define';
    expect(() => resolveFlow(flowFile.parse(energieFile()), sharedStepsFile.parse(shared))).toThrow(
      FlowResolveError,
    );
    // The product step is shared: every flow that uses it reports it.
    const everyFlow = ['energie', 'thuisbatterij', 'zonnepanelen'].map(
      (name) => `nl/${name}.json: ${message}`,
    );
    expect(messages(sources(shared))).toEqual(everyFlow);
    // Without any switches, every `requires` is unknown.
    delete shared.switches;
    expect(messages(sources(shared))).toEqual(everyFlow);
  });

  it('reports a choice the switches leave without options', () => {
    const flow = energieFile();
    const meter = flow.steps.find((s: any) => s.id === 'meter_type').fields[0];
    for (const option of meter.options) option.requires = 'gas';
    expect(messages(sources(switched(true), flow))).toEqual([]);
    expect(messages(sources(switched(false), flow))).toEqual([
      'nl/energie.json: field "meter_type": the switches in _shared.json leave it without options',
    ]);
  });

  it('must match across locales', () => {
    expect(messages(sources(switched(true)), sources(switched(true), energieFile(), 'fr'))).toEqual(
      [],
    );
    const fr = switched(false);
    expect(messages(sources(switched(true)), sources(fr, energieFile(), 'fr'))).toEqual(
      ['energie', 'thuisbatterij', 'zonnepanelen'].map(
        (name) =>
          `fr/${name}.json: switches must match nl/${name}.json: "gas=true" there, "gas=false" here`,
      ),
    );
    delete fr.steps[0].fields[0].options[1].requires;
    fr.switches.gas = true;
    expect(messages(sources(switched(true)), sources(fr, energieFile(), 'fr'))).toEqual(
      ['energie', 'thuisbatterij', 'zonnepanelen'].map(
        (name) =>
          `fr/${name}.json: field "product_choice" option "gas" must match nl/${name}.json: "product energie, sets {"energy_type":"gas"}, requires gas" there, "product energie, sets {"energy_type":"gas"}" here`,
      ),
    );
  });

  it('are booleans with snake_case names', () => {
    expect(sharedStepsFile.safeParse({ ...switched(true), switches: { gas: 'yes' } }).success).toBe(
      false,
    );
    expect(sharedStepsFile.safeParse({ ...switched(true), switches: { Gas: true } }).success).toBe(
      false,
    );
  });
});

describe('consent links', () => {
  const consent = (links: unknown) =>
    field.safeParse({
      id: 'terms',
      type: 'consent',
      label: 'Ik ga akkoord met het privacybeleid.',
      links,
    });

  it('link words of the label to site paths', () => {
    expect(consent([{ text: 'privacybeleid', href: '/privacybeleid' }]).success).toBe(true);
    const missing = consent([{ text: 'voorwaarden', href: '/algemene-voorwaarden' }]);
    expect(missing.error?.issues.map((issue) => issue.message)).toEqual([
      '"voorwaarden" does not occur in the label',
    ]);
    expect(consent([{ text: 'privacybeleid', href: 'https://example.com' }]).success).toBe(false);
    expect(consent([{ text: 'privacybeleid', href: '/privacybeleid', extra: 1 }]).success).toBe(
      false,
    );
  });
});

describe('the copy file (_copy.json)', () => {
  const path = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl', '_copy.json');
  const copy = (): any => JSON.parse(readFileSync(path, 'utf8'));

  it('needs every error code, the progress tokens and nothing unknown', () => {
    expect(flowCopyFile.safeParse(copy()).success).toBe(true);
    const noCode = copy();
    delete noCode.errors.slot_unknown;
    expect(flowCopyFile.safeParse(noCode).success).toBe(false);
    const extraCode = copy();
    extraCode.errors.not_a_code = 'x';
    expect(flowCopyFile.safeParse(extraCode).success).toBe(false);
    const progress = copy();
    progress.progress = 'Stap {step}';
    expect(flowCopyFile.safeParse(progress).error?.issues[0]?.message).toBe(
      'must contain {step} and {total}',
    );
    const suggestion = copy();
    suggestion.emailSuggestion = 'Bedoel je dit?';
    expect(flowCopyFile.safeParse(suggestion).success).toBe(false);
    const unknownType = copy();
    unknownType.requiredByType.radio = 'x';
    expect(flowCopyFile.safeParse(unknownType).success).toBe(false);
  });

  it('is checked by validate:flows, including warnings for soft ranges', () => {
    // The valid fixture has softMin/softMax on electricity_kwh.
    expect(messages(sources(switched(true), energieFile(), 'nl', copy()))).toEqual([
      'nl/_copy.json: warnings.outside_typical is needed: a number field has softMin/softMax',
    ]);
    const withWarning = copy();
    withWarning.warnings = { outside_typical: 'Klopt dit?' };
    expect(messages(sources(switched(true), energieFile(), 'nl', withWarning))).toEqual([]);
    const broken = copy();
    delete broken.buttons.submit;
    expect(messages(sources(switched(true), energieFile(), 'nl', broken))).toEqual([
      'nl/_copy.json: buttons.submit: Invalid input: expected string, received undefined',
    ]);
  });
});

describe('copy checks (PR 15 review)', () => {
  it('rejects placeholders the island cannot fill and requires the copy for the site', async () => {
    const { validateFlowSources } = await import('../../src/lib/flow/validate');
    const { loadFlowSources } = await import('../../scripts/lib/flow-sources');
    const { join } = await import('node:path');
    const { locales } = loadFlowSources(join(process.cwd(), 'src/content/flows'));
    const nl = locales.find((locale) => locale.locale === 'nl')!;
    const copy = structuredClone(nl.copy!.data) as { errors: Record<string, string> };
    copy.errors.required = 'Vul {veld} in.';
    copy.errors.text_too_long = 'Hoogstens {maxlength} tekens.';
    const broken = [{ ...nl, copy: { ...nl.copy!, data: copy } }];
    expect(validateFlowSources(broken).map(({ message }) => message)).toEqual([
      'errors.required: unknown placeholder {veld} (allowed: none)',
      'errors.text_too_long: unknown placeholder {maxlength} (allowed: {maxLength})',
    ]);
    const withoutCopy = [{ ...nl, copy: undefined }];
    expect(validateFlowSources(withoutCopy)).toEqual([]);
    expect(validateFlowSources(withoutCopy, { requireCopy: true })).toEqual([
      {
        file: 'nl/_copy.json',
        message: 'is missing: the form needs its interface copy for every locale with flows',
      },
    ]);
  });
});
