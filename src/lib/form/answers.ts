// Answers as the island keeps them (docs/FLOWS.md "How the form island reads them"): only the
// visitor's own answers are stored; implied answers (an option's `sets`, e.g. energy_type)
// are worked out by the engine from the chosen card, or come from the URL (?energie=).
import { clearAbandoned } from '../flow/engine';
import type { Field, Flow } from '../flow/schema';
import type { AnswerValue, Answers, Derived, Product } from '../flow/types';
import { derive } from '../flow/validators/postcode';
import type { FormFlags, FormFlows, OwnAnswers } from './types';

/** Keys set by options' `sets` in this flow (energy_type). */
export function impliedKeys(flow: Flow): Set<string> {
  const keys = new Set<string>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) {
        for (const key of Object.keys(option.sets ?? {})) keys.add(key);
      }
    }
  }
  return keys;
}

/** The ids of the fields whose options set one of `keys` (product_choice, energy_choice). */
export function settersOf(flow: Flow, keys: Iterable<string>): Set<string> {
  const wanted = new Set(keys);
  const setters = new Set<string>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'single_choice') continue;
      const sets = field.options.some((option) =>
        Object.keys(option.sets ?? {}).some((key) => wanted.has(key)),
      );
      if (sets) setters.add(field.id);
    }
  }
  return setters;
}

/** Drops undefined values and the implied keys: what may be stored. */
export function withoutImplied(flow: Flow, answers: Answers): OwnAnswers {
  const implied = impliedKeys(flow);
  const own: OwnAnswers = {};
  for (const [key, value] of Object.entries(answers)) {
    if (value !== undefined && !implied.has(key)) own[key] = value;
  }
  return own;
}

/**
 * What is stored in sessionStorage: the answers without those of abandoned branches, hidden
 * fields and skipped steps (clearAbandoned), and without implied answers.
 */
export function storableAnswers(flow: Flow, answers: Answers, derived: Derived): OwnAnswers {
  return withoutImplied(flow, clearAbandoned(flow, answers, derived));
}

/** `derived` for the engine: the session flags plus postcode, region and province. */
export function engineDerived(flags: FormFlags, answers: Answers): Derived {
  return { ...flags, ...derive(answers) };
}

/** The answers with one answer set, or removed when `value` is undefined. */
export function withAnswer(answers: Answers, id: string, value: AnswerValue | undefined): Answers {
  const next: Record<string, AnswerValue | undefined> = { ...answers };
  if (value === undefined) delete next[id];
  else next[id] = value;
  return next;
}

/**
 * The product whose flow continues after choosing `code` on `field` (the shared product step,
 * brief §7.3), or undefined when the option names none.
 */
export function productOf(field: Field, code: string): Product | undefined {
  if (field.type !== 'single_choice') return undefined;
  return field.options.find((option) => option.code === code)?.product;
}

/**
 * The flow the visitor is in after answering `value` on `field`: on /vergelijken (not
 * preselected), a card of another product on step 1 switches to that product's flow
 * (docs/FLOWS.md); otherwise `current` stays.
 */
export function flowAfter(
  flows: FormFlows,
  current: Product,
  preselected: boolean,
  field: Field,
  value: AnswerValue | undefined,
): Product {
  const switchTo = typeof value === 'string' ? productOf(field, value) : undefined;
  return !preselected && switchTo && flows[switchTo] ? switchTo : current;
}
