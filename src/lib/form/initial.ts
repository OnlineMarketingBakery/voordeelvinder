// Where the form starts (docs/FLOWS.md, brief §7.6 "Preselect", "Persistence").
//
// The server renders the first step from the page and its URL preselect (serverStart; the
// preselected form pages render on demand so ?energie= is known): no storage, so hydration
// matches and nothing flashes without a stored session. Right after mounting, the island calls
// restoreStart once with the same preselect and the stored session: that puts the visitor back
// on the step they were on, or on the first earlier step whose answers no longer validate.
import { clearAbandoned, pathSoFar, startStep, validateStep } from '../flow/engine';
import type { Flow } from '../flow/schema';
import type { Answers, Derived, Product } from '../flow/types';
import { engineDerived, settersOf, withoutImplied } from './answers';
import type { StoredSession } from './storage';
import type { FormFlags, FormFlows } from './types';

/** URL parameters that preselect an implied answer (brief §7.6: ?energie=both). */
export const URL_PRESELECTS: Readonly<Record<string, string>> = { energie: 'energy_type' };

export type FormStart = {
  product: Product;
  /** The visitor's own answers plus the URL's preselected ones. */
  answers: Answers;
  step: string;
  flags: FormFlags;
};

function flowFor(flows: FormFlows, product: Product): Flow {
  const flow = flows[product];
  if (!flow) throw new Error(`no flow for "${product}"`);
  return flow;
}

function firstStep(flow: Flow, answers: Answers, flags: FormFlags): string {
  return startStep(flow, answers, engineDerived(flags, answers)) ?? flow.firstStep;
}

/**
 * The session flags (docs/FLOWS.md): `energy_preselected` only when a valid energy_type came
 * from the URL (`preselect` is urlPreselects' result, so it survived clearAbandoned).
 */
export function startFlags(preselected: boolean, preselect: Answers): FormFlags {
  return {
    preselected,
    energy_preselected: preselected && typeof preselect.energy_type === 'string',
  };
}

/**
 * The server-rendered state: the page's product, only the URL's preselected answers
 * (urlPreselects), and its first shown step.
 */
export function serverStart(
  flows: FormFlows,
  product: Product,
  preselected: boolean,
  preselect: Answers = {},
): FormStart {
  const answers = preselected ? { ...preselect } : {};
  const flags = startFlags(preselected, answers);
  return { product, answers, step: firstStep(flowFor(flows, product), answers, flags), flags };
}

/**
 * The first step on the visitor's path whose answers don't validate (validateStep), looking at
 * the steps before `before` only when it is given; null when they all do. A stored session can
 * hold answers the flow no longer accepts (content tightened without a version bump), and
 * buildSubmission refuses those.
 */
export function firstInvalidStep(
  flow: Flow,
  answers: Answers,
  derived: Derived,
  before?: string,
): string | null {
  for (const id of pathSoFar(flow, answers, derived)) {
    if (id === before) return null;
    if (!validateStep(flow, id, answers, derived).valid) return id;
  }
  return null;
}

/**
 * The URL's preselected answers that survive clearAbandoned (an unknown value, or gas while the
 * gas switch is off, is dropped). Only on a preselected page.
 */
export function urlPreselects(flow: Flow, search: string, preselected: boolean): Answers {
  if (!preselected) return {};
  const params = new URLSearchParams(search);
  const given: Record<string, string> = {};
  for (const [param, key] of Object.entries(URL_PRESELECTS)) {
    const value = params.get(param)?.trim().toLowerCase();
    if (value) given[key] = value;
  }
  if (Object.keys(given).length === 0) return {};
  const kept = clearAbandoned(flow, given, { preselected, energy_preselected: false });
  return Object.fromEntries(
    Object.keys(given).flatMap((key) => (kept[key] === undefined ? [] : [[key, kept[key]]])),
  );
}

export type RestoreInput = {
  flows: FormFlows;
  /** The page's product (energie on /vergelijken). */
  product: Product;
  preselected: boolean;
  /** The URL's preselected answers, as passed to serverStart (urlPreselects). */
  preselect: Answers;
  stored: StoredSession | null;
};

/**
 * The state right after mounting: the server's start plus the stored session. The visitor goes
 * back to the stored step when it is on their path, else to the first open step, but never past
 * a step whose stored answers don't validate: they resume there.
 */
export function restoreStart({
  flows,
  product,
  preselected,
  preselect,
  stored,
}: RestoreInput): FormStart {
  // On /vergelijken the stored flow is the one the visitor chose on step 1.
  const active = !preselected && stored && flows[stored.product] ? stored.product : product;
  const flow = flowFor(flows, active);
  const fromUrl: Answers = preselected ? preselect : {};
  const flags = startFlags(preselected, fromUrl);
  const same = stored?.product === active;

  // A stored choice of what the URL now preselects (energy_choice) is dropped: the URL wins.
  const own: Record<string, unknown> = same ? { ...withoutImplied(flow, stored.answers) } : {};
  for (const id of settersOf(flow, Object.keys(fromUrl))) delete own[id];
  const answers = { ...own, ...fromUrl } as Answers;

  const derived = engineDerived(flags, answers);
  const path = pathSoFar(flow, answers, derived);
  if (!same) return { product: active, answers, step: firstStep(flow, answers, flags), flags };
  const resume =
    stored.step && path.includes(stored.step)
      ? stored.step
      : (path[path.length - 1] ?? firstStep(flow, answers, flags));
  const step = firstInvalidStep(flow, answers, derived, resume) ?? resume;
  return { product: active, answers, step, flags };
}

/** ?test=1 marks the visit as a test (brief §9.4); the server decides `is_test`. */
export function isTestVisit(search: string): boolean {
  return new URLSearchParams(search).get('test') === '1';
}
