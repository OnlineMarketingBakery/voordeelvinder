// The form island's framework-free helpers (src/lib/form): session storage, the start state
// from the URL and the stored session, messages, labels and the submit context (sendLead and
// Turnstile: tests/unit/form-submit.test.ts). Run against the real flows and copy
// (src/content/flows/nl).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildSubmission, getStep, visibleFields } from '../../src/lib/flow/engine';
import { resolveFlow } from '../../src/lib/flow/resolve';
import {
  flowCopyFile,
  flowFile,
  sharedStepsFile,
  type Field,
  type Flow,
} from '../../src/lib/flow/schema';
import type { Product } from '../../src/lib/flow/types';
import {
  engineDerived,
  flowAfter,
  impliedKeys,
  productOf,
  settersOf,
  storableAnswers,
  withAnswer,
  withoutImplied,
} from '../../src/lib/form/answers';
import {
  firstInvalidStep,
  restoreStart,
  serverStart,
  startFlags,
  urlPreselects,
  type RestoreInput,
} from '../../src/lib/form/initial';
import {
  choiceOptions,
  consentSegments,
  domId,
  fieldLabel,
  fieldSpan,
  formIconKeys,
  UI_ICONS,
  YES_NO_ICONS,
} from '../../src/lib/form/labels';
import {
  errorMessage,
  liveText,
  progressLabel,
  suggestionLabel,
  warningMessage,
} from '../../src/lib/form/messages';
import {
  clearAllSessions,
  clearSession,
  flowFingerprint,
  flowFingerprints,
  newId,
  parseSession,
  readSession,
  serializeSession,
  sessionStore,
  STORAGE_VERSION,
  storageKey,
  writeSession,
  type StoredSession,
} from '../../src/lib/form/storage';
import {
  firstStepBack,
  isRepeatSubmit,
  productPagePath,
  STEP_GUARD_MS,
  submissionContext,
  thanksPath,
} from '../../src/lib/form/submit';
import type { FormFlows } from '../../src/lib/form/types';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON from the content files */

const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const read = (name: string): any => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));
const sharedData = read('_shared.json');
const real = (name: Product, shared: unknown = sharedData): Flow =>
  resolveFlow(flowFile.parse(read(`${name}.json`)), sharedStepsFile.parse(shared));

const energie = real('energie');
const zonnepanelen = real('zonnepanelen');
const thuisbatterij = real('thuisbatterij');
const all: FormFlows = { energie, zonnepanelen, thuisbatterij };
const copy = flowCopyFile.parse(read('_copy.json'));

const field = (flow: Flow, stepId: string, id: string): Field =>
  getStep(flow, stepId).fields.find((candidate) => candidate.id === id)!;

const LEAD = '0b6f5a4e-1111-4c2d-9a9a-000000000001';
const EVENT = '0b6f5a4e-2222-4c2d-9a9a-000000000002';

function session(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    version: STORAGE_VERSION,
    product: 'energie',
    flow: flowFingerprint(energie),
    step: null,
    answers: {},
    leadId: LEAD,
    eventId: EVENT,
    ...overrides,
  };
}

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

/** restoreStart with the page's query, as Form.astro passes it (urlPreselects). */
function restore({ search, ...input }: Omit<RestoreInput, 'preselect'> & { search: string }) {
  const flow = input.flows[input.product]!;
  return restoreStart({ ...input, preselect: urlPreselects(flow, search, input.preselected) });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('form session storage', () => {
  const versions = { energie: flowFingerprint(energie) };

  it('keys the session per form page', () => {
    expect(storageKey('vergelijken')).toBe('voordeelvinder:form:vergelijken');
    expect(storageKey('energie')).toBe('voordeelvinder:form:energie');
  });

  it('round-trips a session', () => {
    const stored = session({
      step: 'contact',
      answers: {
        product_choice: 'both',
        postcode: '9000',
        is_business: false,
        gas_kwh: 12000,
        call_moment: { day: 'wed', slot: '13-14' },
      },
    });
    expect(parseSession(serializeSession(stored), versions)).toEqual(stored);
  });

  it('ignores another storage version, an older flow version and unknown flows', () => {
    expect(
      parseSession(JSON.stringify({ ...session(), version: STORAGE_VERSION + 1 }), versions),
    ).toBeNull();
    // The version 1 record (flowVersion, no fingerprint).
    const { flow: _flow, ...v1 } = session();
    expect(
      parseSession(JSON.stringify({ ...v1, version: 1, flowVersion: energie.version }), versions),
    ).toBeNull();
    expect(parseSession(JSON.stringify(session({ flow: 'v0+gas' })), versions)).toBeNull();
    expect(parseSession(JSON.stringify({ ...session(), flow: 1 }), versions)).toBeNull();
    expect(parseSession(JSON.stringify(session({ product: 'zonnepanelen' })), versions)).toBeNull();
    expect(parseSession(JSON.stringify({ ...session(), product: 'water' }), versions)).toBeNull();
  });

  it('ignores unreadable records and records without valid ids', () => {
    expect(parseSession(null, versions)).toBeNull();
    expect(parseSession('', versions)).toBeNull();
    expect(parseSession('{not json', versions)).toBeNull();
    expect(parseSession('[]', versions)).toBeNull();
    expect(parseSession(JSON.stringify(session({ leadId: 'x' })), versions)).toBeNull();
    expect(parseSession(JSON.stringify({ ...session(), eventId: 3 }), versions)).toBeNull();
  });

  it('drops answers with an unexpected key or value, one by one', () => {
    const raw = JSON.stringify({
      ...session(),
      step: 'Not A Step',
      answers: {
        postcode: '9000',
        list: ['a'],
        nested: { day: { deep: true } },
        other: { colour: 'red' },
        Upper: 'x',
        nan: null,
        ok_slot: { slot: '09-10' },
      },
    });
    const parsed = parseSession(raw.replace('"Upper"', '"__proto__"'), versions);
    expect(parsed?.answers).toEqual({ postcode: '9000', ok_slot: { slot: '09-10' } });
    expect(parsed?.step).toBeNull();
    expect(Object.getPrototypeOf(parsed!.answers)).toBe(Object.prototype);
  });

  it('reads, writes and clears through the store, and never throws', () => {
    const store = memoryStore();
    expect(writeSession(store, 'energie', session({ step: 'postcode' }))).toBe(true);
    expect(readSession(store, 'energie', versions)?.step).toBe('postcode');
    clearSession(store, 'energie');
    expect(store.data.size).toBe(0);

    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      key: () => {
        throw new Error('blocked');
      },
      length: 1,
    };
    expect(readSession(broken, 'energie', versions)).toBeNull();
    expect(writeSession(broken, 'energie', session())).toBe(false);
    expect(() => clearSession(broken, 'energie')).not.toThrow();
    expect(() => clearAllSessions(broken)).not.toThrow();
    expect(readSession(null, 'energie', versions)).toBeNull();
    expect(writeSession(null, 'energie', session())).toBe(false);
  });

  it('clears the session of every form page after a submit, and nothing else', () => {
    const store = memoryStore();
    writeSession(store, 'vergelijken', session({ answers: { first_name: 'Jan' } }));
    writeSession(store, 'energie', session());
    store.setItem('voordeelvinder:formulier', 'keep');
    store.setItem('voordeelvinder:thanks', 'keep');
    store.setItem('other', 'keep');
    clearAllSessions(store);
    expect([...store.data.keys()].sort()).toEqual([
      'other',
      'voordeelvinder:formulier',
      'voordeelvinder:thanks',
    ]);
    const broken = {
      ...memoryStore(),
      key: () => {
        throw new Error('blocked');
      },
      length: 1,
    };
    expect(() => clearAllSessions(broken)).not.toThrow();
    expect(() => clearAllSessions(null)).not.toThrow();
  });

  it('fingerprints the flow by version and the switches that are on', () => {
    const noGas = real('energie', { ...sharedData, switches: { gas: false } });
    expect(flowFingerprint(energie)).toBe(`v${energie.version}+gas`);
    expect(flowFingerprint(noGas)).toBe(`v${energie.version}`);
    expect(flowFingerprint({ ...energie, version: energie.version + 1 })).not.toBe(
      flowFingerprint(energie),
    );
    expect(flowFingerprints({ energie, zonnepanelen })).toEqual({
      energie: flowFingerprint(energie),
      zonnepanelen: flowFingerprint(zonnepanelen),
    });
  });

  it('ignores a session stored with gas on once the gas switch is off', () => {
    const store = memoryStore();
    writeSession(store, 'vergelijken', session({ answers: { product_choice: 'gas' } }));
    const noGas = real('energie', { ...sharedData, switches: { gas: false } });
    expect(readSession(store, 'vergelijken', flowFingerprints({ energie }))).not.toBeNull();
    expect(readSession(store, 'vergelijken', flowFingerprints({ energie: noGas }))).toBeNull();
  });

  it('finds sessionStorage only when it works', () => {
    // Newer Node versions have a global sessionStorage; start from "none" on every version.
    vi.stubGlobal('sessionStorage', undefined);
    expect(sessionStore()).toBeNull();
    const store = memoryStore();
    vi.stubGlobal('sessionStorage', store);
    expect(sessionStore()).toBe(store);
    vi.stubGlobal('sessionStorage', {
      ...store,
      setItem: () => {
        throw new Error('private mode');
      },
    });
    expect(sessionStore()).toBeNull();
  });

  it('generates UUID v4 ids, also without crypto.randomUUID', () => {
    const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newId()).toMatch(v4);
    const fallback = newId({ getRandomValues: (array) => crypto.getRandomValues(array) });
    expect(fallback).toMatch(v4);
    expect(newId()).not.toBe(newId());
  });
});

describe('form start state', () => {
  it('server-renders the first shown step of the page', () => {
    expect(serverStart(all, 'energie', false)).toEqual({
      product: 'energie',
      answers: {},
      step: 'product',
      flags: { preselected: false, energy_preselected: false },
    });
    expect(serverStart({ energie }, 'energie', true).step).toBe('energy_choice');
    expect(serverStart({ zonnepanelen }, 'zonnepanelen', true).step).toBe('postcode');
    expect(serverStart({ thuisbatterij }, 'thuisbatterij', true).step).toBe('postcode');
  });

  it('?energie=both skips the energy question and sets energy_preselected', () => {
    const start = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=both&utm_source=meta',
      stored: null,
    });
    expect(start.step).toBe('postcode');
    expect(start.flags).toEqual({ preselected: true, energy_preselected: true });
    expect(start.answers).toEqual({ energy_type: 'both' });
  });

  it('?energie=gas hides the electricity questions', () => {
    const start = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=gas',
      stored: null,
    });
    const derived = engineDerived(start.flags, start.answers);
    expect(visibleFields(energie, 'meters_solar', start.answers, derived).map((f) => f.id)).toEqual(
      ['digital_meter'],
    );
    expect(
      visibleFields(energie, 'consumption_kwh', start.answers, derived).map((f) => f.id),
    ).toEqual(['gas_kwh']);
  });

  it('drops an unknown ?energie= value, and gas while the gas switch is off', () => {
    const unknown = urlPreselects(energie, '?energie=solar', true);
    expect(unknown).toEqual({});
    const start = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=solar',
      stored: null,
    });
    expect(start.step).toBe('energy_choice');
    expect(start.flags.energy_preselected).toBe(false);

    const noGas = real('energie', { ...sharedData, switches: { gas: false } });
    expect(urlPreselects(noGas, '?energie=gas', true)).toEqual({});
    expect(urlPreselects(noGas, '?energie=electricity', true)).toEqual({
      energy_type: 'electricity',
    });
  });

  it('ignores ?energie= on /vergelijken (no preselect) and normalises its case', () => {
    expect(urlPreselects(energie, '?energie=both', false)).toEqual({});
    expect(urlPreselects(energie, '?energie=BOTH', true)).toEqual({ energy_type: 'both' });
    const start = restore({
      flows: all,
      product: 'energie',
      preselected: false,
      search: '?energie=both',
      stored: null,
    });
    expect(start.step).toBe('product');
    expect(start.flags).toEqual({ preselected: false, energy_preselected: false });
  });

  it('a new ?energie= replaces a stored energy choice; an invalid one keeps it', () => {
    const stored = session({
      step: 'supplier',
      answers: { energy_choice: 'gas', postcode: '9000', is_business: false },
    });
    const withUrl = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=electricity',
      stored,
    });
    expect(withUrl.answers).toEqual({
      postcode: '9000',
      is_business: false,
      energy_type: 'electricity',
    });
    expect(withUrl.step).toBe('supplier');

    const invalid = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=water',
      stored,
    });
    expect(invalid.answers.energy_choice).toBe('gas');
    expect(invalid.step).toBe('supplier');
  });

  it('restores the stored step when it is on the path, else the first open step', () => {
    const answers = { product_choice: 'electricity', postcode: '9000', supplier: 'engie' };
    const onPath = restore({
      flows: all,
      product: 'energie',
      preselected: false,
      search: '',
      stored: session({ step: 'postcode', answers }),
    });
    expect(onPath.step).toBe('postcode');
    // Hand-edited or stale: a step the answers don't reach yet.
    const offPath = restore({
      flows: all,
      product: 'energie',
      preselected: false,
      search: '',
      stored: session({ step: 'contact', answers }),
    });
    expect(offPath.step).toBe('meter_type');
    expect(onPath.answers).toEqual(answers);
  });

  it('/vergelijken continues in the product the visitor chose on step 1', () => {
    const start = restore({
      flows: all,
      product: 'energie',
      preselected: false,
      search: '',
      stored: session({
        product: 'zonnepanelen',
        flow: flowFingerprint(zonnepanelen),
        step: 'ownership',
        answers: { product_choice: 'zonnepanelen', postcode: '3000', is_business: false },
      }),
    });
    expect(start.product).toBe('zonnepanelen');
    expect(start.step).toBe('ownership');
  });

  it('never restores implied answers from storage', () => {
    const start = restore({
      flows: all,
      product: 'energie',
      preselected: false,
      search: '',
      stored: session({ answers: { product_choice: 'gas', energy_type: 'both' } }),
    });
    expect(start.answers).toEqual({ product_choice: 'gas' });
  });

  it('server-renders the URL preselect, with the same flags as the restore', () => {
    const both = urlPreselects(energie, '?energie=both', true);
    const server = serverStart({ energie }, 'energie', true, both);
    expect(server).toEqual({
      product: 'energie',
      answers: { energy_type: 'both' },
      step: 'postcode',
      flags: { preselected: true, energy_preselected: true },
    });
    const client = restoreStart({
      flows: { energie },
      product: 'energie',
      preselected: true,
      preselect: both,
      stored: null,
    });
    expect(client).toEqual(server);
    // No (valid) preselect: the energy question, and no energy_preselected.
    expect(serverStart({ energie }, 'energie', true, {}).step).toBe('energy_choice');
    const noGas = real('energie', { ...sharedData, switches: { gas: false } });
    const dropped = serverStart(
      { energie: noGas },
      'energie',
      true,
      urlPreselects(noGas, '?energie=gas', true),
    );
    expect(dropped.step).toBe('energy_choice');
    expect(dropped.flags.energy_preselected).toBe(false);
    // /vergelijken never takes a preselect.
    expect(serverStart(all, 'energie', false, { energy_type: 'both' })).toEqual(
      serverStart(all, 'energie', false),
    );
    expect(startFlags(true, { energy_type: 'gas' })).toEqual({
      preselected: true,
      energy_preselected: true,
    });
    expect(startFlags(false, { energy_type: 'gas' }).energy_preselected).toBe(false);
  });

  it('resumes at the first step whose stored answers no longer validate', () => {
    const answers = {
      postcode: '12',
      is_business: false,
      supplier: 'engie',
      meter_type: 'single',
    };
    const start = restore({
      flows: { energie },
      product: 'energie',
      preselected: true,
      search: '?energie=both',
      stored: session({ step: 'meters_solar', answers }),
    });
    expect(start.step).toBe('postcode');
    expect(start.answers.postcode).toBe('12');
    const derived = engineDerived(start.flags, start.answers);
    expect(firstInvalidStep(energie, start.answers, derived)).toBe('postcode');
    expect(firstInvalidStep(energie, start.answers, derived, 'postcode')).toBeNull();
    const fixed = { ...start.answers, postcode: '9000' };
    expect(firstInvalidStep(energie, fixed, engineDerived(start.flags, fixed))).toBe(
      'meters_solar', // the open step: nothing answered yet
    );
  });

  it('restores a gas-on session into a gas-off flow at step 1, not at the contact step', () => {
    const answers = {
      product_choice: 'gas',
      postcode: '9000',
      is_business: false,
      supplier: 'engie',
      digital_meter: 'yes',
      social_tariff: 'no',
      budget_meter: 'no',
      knows_consumption: 'yes',
      gas_kwh: 12000,
      first_name: 'Jan',
    };
    const stored = session({ step: 'contact', answers });
    const input = { product: 'energie', preselected: false, search: '', stored } as const;
    expect(restore({ ...input, flows: all }).step).toBe('contact');
    const noGas = real('energie', { ...sharedData, switches: { gas: false } });
    const start = restore({ ...input, flows: { ...all, energie: noGas } });
    expect(start.step).toBe('product');
  });
});

describe('form answers', () => {
  const home = { preselected: false, energy_preselected: false };

  it('knows the implied keys and the fields that set them', () => {
    expect([...impliedKeys(energie)]).toEqual(['energy_type']);
    expect([...settersOf(energie, ['energy_type'])]).toEqual(['product_choice', 'energy_choice']);
    expect([...settersOf(energie, [])]).toEqual([]);
  });

  it('stores only own answers of the visible path', () => {
    const answers = {
      product_choice: 'electricity',
      energy_type: 'electricity',
      postcode: '9000',
      is_business: false,
      business_electricity_band: 'over_100k',
      gas_kwh: 5000,
    };
    expect(storableAnswers(energie, answers, engineDerived(home, answers))).toEqual({
      product_choice: 'electricity',
      postcode: '9000',
      is_business: false,
    });
    expect(withoutImplied(energie, { energy_type: 'gas', supplier: undefined, x: 1 })).toEqual({
      x: 1,
    });
  });

  it('works out the postcode values for the engine', () => {
    expect(engineDerived(home, { postcode: ' 9000 ' })).toEqual({
      ...home,
      postcode: '9000',
      region: 'flanders',
      province: 'oost-vlaanderen',
    });
    expect(engineDerived(home, { postcode: '90' })).toEqual(home);
  });

  it('sets and removes one answer', () => {
    expect(withAnswer({ a: 'x' }, 'b', 'y')).toEqual({ a: 'x', b: 'y' });
    expect(withAnswer({ a: 'x', b: 'y' }, 'b', undefined)).toEqual({ a: 'x' });
  });

  it('switches flows on a product card of step 1', () => {
    const choice = field(energie, 'product', 'product_choice');
    expect(productOf(choice, 'zonnepanelen')).toBe('zonnepanelen');
    expect(productOf(choice, 'both')).toBe('energie');
    expect(productOf(choice, 'unknown')).toBeUndefined();
    expect(productOf(field(energie, 'supplier', 'supplier'), 'engie')).toBeUndefined();
  });

  it('builds a submission from own answers: energy_type comes from the chosen card', () => {
    const answers = {
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
      gas_kwh: '12000',
      first_name: 'Jan',
      last_name: 'Peeters',
      phone: '0475 12 34 56',
      email: 'jan@example.be',
      call_moment: { day: 'wed', slot: '13-14' },
      terms: true,
    };
    const derived = engineDerived(home, answers);
    const submission = buildSubmission(
      energie,
      answers,
      submissionContext({
        leadId: LEAD,
        eventId: EVENT,
        derived,
        page: '/vergelijken',
        search: '?test=1',
        now: new Date('2026-10-01T09:30:00.000Z'),
      }),
    );
    expect(submission.answers.energy_type).toBe('both');
    expect(submission.answers.electricity_kwh).toBe(3500);
    expect(submission.derived).toEqual({
      postcode: '9000',
      region: 'flanders',
      province: 'oost-vlaanderen',
    });
    expect(submission.contact.phone_e164).toBe('+32475123456');
    expect(submission.meta).toEqual({ page: '/vergelijken', test: true });
    expect(submission.lead_id).toBe(LEAD);
  });
});

describe('form messages', () => {
  it('uses the per-type "required" message when the copy has one', () => {
    expect(errorMessage(copy, field(energie, 'product', 'product_choice'), 'required')).toBe(
      'Kies een antwoord.',
    );
    expect(errorMessage(copy, field(energie, 'supplier', 'supplier'), 'required')).toBe(
      'Kies een antwoord uit de lijst.',
    );
    expect(errorMessage(copy, field(energie, 'postcode', 'postcode'), 'required')).toBe(
      'Vul dit veld in.',
    );
    expect(errorMessage(copy, field(energie, 'postcode', 'postcode'), 'postcode_invalid')).toBe(
      copy.errors.postcode_invalid,
    );
  });

  it('fills in the placeholders, numbers as Belgians write them', () => {
    const kwh = field(energie, 'consumption_kwh', 'electricity_kwh');
    expect(errorMessage(copy, kwh, 'number_too_high')).toBe('Geef hoogstens 100.000 kWh in.');
    expect(errorMessage(copy, kwh, 'number_too_low')).toBe('Geef minstens 100 kWh in.');
    const name = field(energie, 'contact', 'first_name');
    expect(errorMessage(copy, name, 'text_too_long')).toBe('Gebruik hoogstens 100 tekens.');
    const custom = { ...name, maxLength: 40 } as Field;
    expect(errorMessage(copy, custom, 'text_too_long')).toBe('Gebruik hoogstens 40 tekens.');
  });

  it('shows a warning only when the copy has one', () => {
    const kwh = field(energie, 'consumption_kwh', 'electricity_kwh');
    expect(warningMessage(copy, kwh, 'outside_typical')).toBeUndefined();
    expect(
      warningMessage({ warnings: { outside_typical: 'Klopt {max}?' } }, kwh, 'outside_typical'),
    ).toBe('Klopt 100.000?');
  });

  it('builds the progress and suggestion lines', () => {
    expect(progressLabel(copy, { step: 2, total: 9 })).toBe('Stap 2 van 9');
    expect(suggestionLabel(copy, 'jan@gmail.com')).toBe('Bedoel je jan@gmail.com?');
  });
});

describe('form labels and icons', () => {
  it('yes/no cards use copy.yesNo and the check/cross icons', () => {
    expect(choiceOptions(field(energie, 'knows_consumption', 'knows_consumption'), copy)).toEqual([
      { code: 'yes', label: 'Ja', icon: YES_NO_ICONS.yes, tone: 'yes' },
      { code: 'no', label: 'Nee', icon: YES_NO_ICONS.no, tone: 'no' },
    ]);
    const own = { id: 'x', type: 'yes_no', labels: { yes: 'Wel', no: 'Niet' } } as Field;
    expect(choiceOptions(own, copy).map((option) => option.label)).toEqual(['Wel', 'Niet']);
    expect(choiceOptions(field(energie, 'supplier', 'supplier'), copy)).toEqual([]);
  });

  it('single-choice cards keep their codes, labels and icons', () => {
    const options = choiceOptions(field(energie, 'product', 'product_choice'), copy);
    expect(options.map((option) => [option.code, option.icon])).toEqual([
      ['electricity', 'renewable-energy'],
      ['gas', 'home'],
      ['both', 'home-bolt'],
      ['zonnepanelen', 'solar-panel'],
      ['thuisbatterij', 'car-battery'],
    ]);
  });

  it('labels a field without label by the step title', () => {
    const step = getStep(energie, 'meters_solar');
    expect(fieldLabel(step, step.fields[0]!)).toEqual({
      text: 'Heb je een digitale meter?',
      byTitle: true,
    });
    expect(fieldLabel(step, step.fields[1]!)).toEqual({
      text: 'Heb je zonnepanelen?',
      byTitle: false,
    });
  });

  it('turns the first occurrence of each consent link text into a link', () => {
    const terms = field(energie, 'contact', 'terms');
    if (terms.type !== 'consent') throw new Error('terms is a consent');
    const segments = consentSegments(terms.label!, terms.links);
    expect(segments.map((segment) => segment.href ?? null)).toEqual([
      null,
      '/algemene-voorwaarden',
      null,
      '/privacybeleid',
      null,
    ]);
    expect(segments.map((segment) => segment.text).join('')).toBe(terms.label);
    expect(consentSegments('a b a', [{ text: 'a', href: '/x' }])).toEqual([
      { text: 'a', href: '/x' },
      { text: ' b a' },
    ]);
    expect(
      consentSegments('abc', [
        { text: 'bc', href: '/2' },
        { text: 'ab', href: '/1' },
        { text: 'zz', href: '/3' },
      ]),
    ).toEqual([{ text: 'ab', href: '/1' }, { text: 'c' }]);
    expect(consentSegments('plain')).toEqual([{ text: 'plain' }]);
  });

  it('lists every icon the island needs, so the page can resolve them', () => {
    expect(formIconKeys(all)).toEqual(
      [
        'car-battery',
        'home',
        'home-bolt',
        'renewable-energy',
        'solar-panel',
        YES_NO_ICONS.yes,
        YES_NO_ICONS.no,
        UI_ICONS.back,
        UI_ICONS.next,
      ].sort(),
    );
  });

  it('pairs the short contact inputs and builds stable ids', () => {
    const spans = getStep(energie, 'contact').fields.map((f) => [f.id, fieldSpan(f)]);
    expect(spans).toEqual([
      ['first_name', 'half'],
      ['last_name', 'half'],
      ['phone', 'half'],
      ['email', 'half'],
      ['call_moment', 'full'],
      ['terms', 'full'],
      ['newsletter', 'full'],
    ]);
    expect(domId.option('call_moment', '09-10')).toBe('veld-call_moment-09-10');
    expect(domId.error('postcode')).toBe('veld-postcode-fout');
  });
});

describe('form flow switch', () => {
  const productField = field(energie, 'product', 'product_choice');

  it('switches flow on /vergelijken when a card of another product is chosen', () => {
    expect(flowAfter(all, 'energie', false, productField, 'zonnepanelen')).toBe('zonnepanelen');
    expect(flowAfter(all, 'zonnepanelen', false, productField, 'gas')).toBe('energie');
    expect(flowAfter(all, 'energie', false, productField, 'both')).toBe('energie');
    expect(flowAfter(all, 'energie', false, productField, undefined)).toBe('energie');
    // Preselected, or the product's flow is not on this page: stay.
    expect(flowAfter(all, 'energie', true, productField, 'zonnepanelen')).toBe('energie');
    expect(flowAfter({ energie }, 'energie', false, productField, 'zonnepanelen')).toBe('energie');
    expect(flowAfter(all, 'energie', false, field(energie, 'supplier', 'supplier'), 'engie')).toBe(
      'energie',
    );
  });
});

describe('form submit', () => {
  it('knows the thank-you page and the product pages', () => {
    expect(thanksPath('energie')).toBe('/bedankt/energie');
    expect(productPagePath('energie')).toBe('/');
    expect(productPagePath('zonnepanelen')).toBe('/zonnepanelen');
  });

  it('builds the context without tracking or cookie consent yet', () => {
    const context = submissionContext({
      leadId: LEAD,
      eventId: EVENT,
      derived: { preselected: true },
      page: '/vergelijken/energie',
      search: '',
      now: new Date('2026-10-01T09:30:00.000Z'),
    });
    expect(context).toEqual({
      lead_id: LEAD,
      event_id: EVENT,
      submitted_at: '2026-10-01T09:30:00.000Z',
      derived: { preselected: true },
      tracking: {},
      cookies: { analytics: false, marketing: false },
      page: '/vergelijken/energie',
      test: false,
    });
  });

  it('ignores the second "Volgende" of a double click', () => {
    expect(isRepeatSubmit(null, 1000)).toBe(false);
    expect(isRepeatSubmit(1000, 1000)).toBe(true);
    expect(isRepeatSubmit(1000, 1000 + STEP_GUARD_MS - 1)).toBe(true);
    expect(isRepeatSubmit(1000, 1000 + STEP_GUARD_MS)).toBe(false);
    expect(isRepeatSubmit(1000, 900)).toBe(false);
    expect(STEP_GUARD_MS).toBeGreaterThanOrEqual(300);
    expect(STEP_GUARD_MS).toBeLessThanOrEqual(400);
  });

  it('re-announces the same live message', () => {
    expect(liveText('', 'Kies een antwoord.')).toBe('Kies een antwoord.');
    expect(liveText('Kies een antwoord.', 'Kies een antwoord.')).toBe('Kies een antwoord.\u00a0');
    expect(liveText('Kies een antwoord.\u00a0', 'Kies een antwoord.')).toBe('Kies een antwoord.');
  });

  it('"Terug" on the first step: product page, previous page or home', () => {
    const base = {
      productPage: '/zonnepanelen',
      fallback: '/',
      origin: 'https://voordeelvinder.be',
      historyLength: 3,
    };
    expect(firstStepBack({ ...base, preselected: true, referrer: '' })).toEqual({
      kind: 'href',
      href: '/zonnepanelen',
    });
    expect(
      firstStepBack({ ...base, preselected: false, referrer: 'https://voordeelvinder.be/' }),
    ).toEqual({ kind: 'history' });
    expect(
      firstStepBack({ ...base, preselected: false, referrer: 'https://facebook.com/' }),
    ).toEqual({ kind: 'href', href: '/' });
    expect(firstStepBack({ ...base, preselected: false, referrer: 'not a url' })).toEqual({
      kind: 'href',
      href: '/',
    });
    expect(
      firstStepBack({
        ...base,
        preselected: false,
        referrer: 'https://voordeelvinder.be/',
        historyLength: 1,
      }),
    ).toEqual({ kind: 'href', href: '/' });
  });
});
