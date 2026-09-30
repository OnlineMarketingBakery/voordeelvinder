// Where the form starts (docs/FLOWS.md, brief §7.6 "Preselect", "Persistence").
//
// The server renders the first step from the page alone (serverStart): no URL query, no
// storage, so hydration matches. Right after mounting, the island calls restoreStart once with
// the URL and the stored session: that fixes the session flags (preselected,
// energy_preselected), applies ?energie= and puts the visitor back on the step they were on.
import { clearAbandoned, pathSoFar, startStep } from '../flow/engine';
import type { Flow } from '../flow/schema';
import type { Answers, Product } from '../flow/types';
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

/** The server-rendered state: the page's product, no answers, its first shown step. */
export function serverStart(flows: FormFlows, product: Product, preselected: boolean): FormStart {
  const flags: FormFlags = { preselected, energy_preselected: false };
  return { product, answers: {}, step: firstStep(flowFor(flows, product), {}, flags), flags };
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
  /** location.search */
  search: string;
  stored: StoredSession | null;
};

/** The state right after mounting: session flags fixed, URL preselect applied, session restored. */
export function restoreStart({
  flows,
  product,
  preselected,
  search,
  stored,
}: RestoreInput): FormStart {
  // On /vergelijken the stored flow is the one the visitor chose on step 1.
  const active = !preselected && stored && flows[stored.product] ? stored.product : product;
  const flow = flowFor(flows, active);
  const fromUrl = urlPreselects(flow, search, preselected);
  const flags: FormFlags = {
    preselected,
    energy_preselected: preselected && typeof fromUrl.energy_type === 'string',
  };

  // A stored choice of what the URL now preselects (energy_choice) is dropped: the URL wins.
  const own: Record<string, unknown> =
    stored?.product === active ? { ...withoutImplied(flow, stored.answers) } : {};
  for (const id of settersOf(flow, Object.keys(fromUrl))) delete own[id];
  const answers = { ...own, ...fromUrl } as Answers;

  const path = pathSoFar(flow, answers, engineDerived(flags, answers));
  const step =
    stored?.product === active && stored.step && path.includes(stored.step)
      ? stored.step
      : stored?.product === active
        ? (path[path.length - 1] ?? firstStep(flow, answers, flags))
        : firstStep(flow, answers, flags);
  return { product: active, answers, step, flags };
}

/** ?test=1 marks the visit as a test (brief §9.4); the server decides `is_test`. */
export function isTestVisit(search: string): boolean {
  return new URLSearchParams(search).get('test') === '1';
}
