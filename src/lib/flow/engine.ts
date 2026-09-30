// The generic flow engine (brief §7.1): pure functions over a resolved Flow (resolve.ts), the
// visitor's answers and the derived values. It knows nothing about products; the form island
// renders what these functions return. Framework-free: the island bundles this file.
//
// Conditions (`visibleIf`, `next[].if`) see the answers by field id plus `derived.<key>`.
// A step is shown when its `visibleIf` holds and at least one of its fields is visible; a step
// that isn't shown is skipped by following its `next` (brief §7.2).
import { evaluate, truthy, unresolvedVars, type Rule } from './logic';
import type { Field, Flow, Step } from './schema';
import type { AnswerValue, Answers, DaySlotAnswer, Derived } from './types';
import {
  validateField,
  type ErrorCode,
  type FieldConfig,
  type PhoneNumber,
  type WarningCode,
} from './validators/index';
import { isEmpty } from './validators/shared';

export { ERROR_CODES, WARNING_CODES, type ErrorCode, type WarningCode } from './validators/index';

/** The payload contract version this engine builds (brief §9.2, docs/PAYLOAD.md). */
export const SCHEMA_VERSION = 1;

/** Thrown for states a valid flow (validate:flows) never gets into. */
export class FlowError extends Error {
  override name = 'FlowError';
}

/** What conditions are evaluated against: the answers plus `derived`. */
export function conditionData(answers: Answers, derived: Derived): Record<string, unknown> {
  return { ...answers, derived };
}

function holds(rule: Rule | undefined, data: unknown): boolean {
  return rule === undefined || truthy(evaluate(rule, data));
}

export function getStep(flow: Flow, id: string): Step {
  const step = flow.steps.find((candidate) => candidate.id === id);
  if (!step) throw new FlowError(`unknown step "${id}" in flow "${flow.id}"`);
  return step;
}

/** The fields of a step that are shown for these answers. */
export function visibleFields(step: Step, answers: Answers, derived: Derived = {}): Field[] {
  const data = conditionData(answers, derived);
  return step.fields.filter((field) => holds(field.visibleIf, data));
}

/** Whether a step is shown: its `visibleIf` holds and it has a visible field. */
export function isStepShown(step: Step, answers: Answers, derived: Derived = {}): boolean {
  return (
    holds(step.visibleIf, conditionData(answers, derived)) &&
    visibleFields(step, answers, derived).length > 0
  );
}

/** The `goto` of the first `next` entry that holds; null after the last step. */
function exit(step: Step, answers: Answers, derived: Derived): string | null {
  if (step.next.length === 0) return null;
  const data = conditionData(answers, derived);
  const entry = step.next.find((candidate) => holds(candidate.if, data));
  if (!entry) throw new FlowError(`no way on from step "${step.id}"`);
  return entry.goto;
}

/** From `id` on, the first step that is shown. */
function firstShownFrom(
  flow: Flow,
  id: string | null,
  answers: Answers,
  derived: Derived,
): string | null {
  const seen = new Set<string>();
  let current = id;
  while (current !== null) {
    if (seen.has(current)) throw new FlowError(`loop at step "${current}"`);
    seen.add(current);
    const step = getStep(flow, current);
    if (isStepShown(step, answers, derived)) return current;
    current = exit(step, answers, derived);
  }
  return null;
}

/** The first step shown (the product step, or the one after it when it's skipped). */
export function startStep(flow: Flow, answers: Answers, derived: Derived = {}): string | null {
  return firstShownFrom(flow, flow.firstStep, answers, derived);
}

/** The step after `currentStepId`, skipping steps that aren't shown; null after the last. */
export function nextStep(
  flow: Flow,
  currentStepId: string,
  answers: Answers,
  derived: Derived = {},
): string | null {
  const step = getStep(flow, currentStepId);
  return firstShownFrom(flow, exit(step, answers, derived), answers, derived);
}

/**
 * Whether a field's answer counts as given, by the validators' notion of empty (format not
 * checked): a whitespace-only string is empty, a checkbox or consent counts only when checked
 * (what a required one needs), a call moment needs both its day and its slot.
 */
function hasValue(field: Field, value: AnswerValue | undefined): boolean {
  if (field.type === 'checkbox' || field.type === 'consent') return value === true;
  if (field.type === 'day_slot' && typeof value === 'object' && value !== null) {
    const { day, slot } = value as DaySlotAnswer;
    return !isEmpty(day) && !isEmpty(slot);
  }
  return !isEmpty(value);
}

/** Every visible required field of the step has an answer (format not checked). */
export function isStepAnswered(step: Step, answers: Answers, derived: Derived = {}): boolean {
  return visibleFields(step, answers, derived).every(
    (field) => !field.required || hasValue(field, answers[field.id]),
  );
}

type Walk = {
  /** Shown steps, in order. */
  shown: string[];
  /** The first shown step that isn't answered yet (when stopping there), else null. */
  frontier: string | null;
};

function walk(flow: Flow, answers: Answers, derived: Derived, stopAtOpen: boolean): Walk {
  const shown: string[] = [];
  const seen = new Set<string>();
  let current: string | null = flow.firstStep;
  while (current !== null) {
    if (seen.has(current)) throw new FlowError(`loop at step "${current}"`);
    seen.add(current);
    const step = getStep(flow, current);
    if (isStepShown(step, answers, derived)) {
      shown.push(current);
      if (stopAtOpen && !isStepAnswered(step, answers, derived)) {
        return { shown, frontier: current };
      }
    }
    current = exit(step, answers, derived);
  }
  return { shown, frontier: null };
}

/** `from` and every step a `next` can lead to from it. */
function reachableFrom(flow: Flow, from: string): Set<string> {
  const found = new Set([from]);
  for (const id of found) {
    for (const entry of getStep(flow, id).next) found.add(entry.goto);
  }
  return found;
}

/**
 * The visitor's path: the shown steps from the start up to and including the first one that
 * isn't answered yet (or to the end). "Stap X": X = index of the current step + 1.
 */
export function pathSoFar(flow: Flow, answers: Answers, derived: Derived = {}): string[] {
  return walk(flow, answers, derived, true).shown;
}

/** The shown step before `currentStepId` ("Terug"); null on the first shown step. */
export function previousStep(
  flow: Flow,
  currentStepId: string,
  answers: Answers,
  derived: Derived = {},
): string | null {
  const { shown } = walk(flow, answers, derived, false);
  const index = shown.indexOf(currentStepId);
  if (index === -1) throw new FlowError(`step "${currentStepId}" is not on the visitor's path`);
  return index === 0 ? null : shown[index - 1]!;
}

/** Keys set by options' `sets`, with the fields that set them and the values this flow allows. */
function impliedKeys(flow: Flow): Map<string, { setters: string[]; allowed: Set<string> }> {
  const keys = new Map<string, { setters: string[]; allowed: Set<string> }>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) {
        for (const [key, value] of Object.entries(option.sets ?? {})) {
          const entry = keys.get(key) ?? { setters: [], allowed: new Set<string>() };
          if (!entry.setters.includes(field.id)) entry.setters.push(field.id);
          if (option.product === undefined || option.product === flow.product) {
            entry.allowed.add(value);
          }
          keys.set(key, entry);
        }
      }
    }
  }
  return keys;
}

/**
 * Y in "Stap X van Y": the number of shown steps on the longest path that is still possible
 * given the answers so far. A condition counts as undecided while it reads a value that is
 * missing and could still be given (a field on the first unanswered step or on a step reachable
 * from it, or a derived value not worked out yet); undecided steps count as shown and undecided
 * branches are all possible. Moving forward only shrinks the set of steps that can still be
 * reached, so answering only ever removes possibilities: Y never goes up while the visitor moves
 * forward (the bar never goes back), and X never overtakes it. Once every step is answered,
 * Y is the length of the visitor's path.
 */
export function estimatedTotalSteps(flow: Flow, answers: Answers, derived: Derived = {}): number {
  const data = conditionData(answers, derived);
  // Fields that can still be answered: on the first unanswered step or a step after it.
  const open = new Set<string>();
  const { frontier } = walk(flow, answers, derived, true);
  for (const id of frontier === null ? [] : reachableFrom(flow, frontier)) {
    for (const field of getStep(flow, id).fields) open.add(field.id);
  }
  for (const [key, { setters }] of impliedKeys(flow)) {
    if (setters.some((id) => open.has(id))) open.add(key);
  }
  const isOpen = (path: string) => path.startsWith('derived.') || open.has(path.split('.')[0]!);
  const decide = (rule: Rule | undefined): boolean | undefined => {
    if (rule === undefined) return true;
    if (unresolvedVars(rule, data).some(isOpen)) return undefined;
    return truthy(evaluate(rule, data));
  };
  const hidden = (step: Step) =>
    decide(step.visibleIf) === false ||
    step.fields.every((field) => decide(field.visibleIf) === false);

  const memo = new Map<string, number>();
  const longest = (id: string, stack: ReadonlySet<string>): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (stack.has(id)) throw new FlowError(`loop at step "${id}"`);
    const step = getStep(flow, id);
    const inner = new Set(stack).add(id);
    let rest = 0;
    for (const entry of step.next) {
      const taken = decide(entry.if);
      if (taken === false) continue;
      rest = Math.max(rest, longest(entry.goto, inner));
      if (taken === true) break;
    }
    const total = (hidden(step) ? 0 : 1) + rest;
    memo.set(id, total);
    return total;
  };
  return longest(flow.firstStep, new Set());
}

/** "Stap X van Y" for the current step (brief §7.6). */
export function progress(
  flow: Flow,
  currentStepId: string,
  answers: Answers,
  derived: Derived = {},
): { step: number; total: number } {
  const step = pathSoFar(flow, answers, derived).indexOf(currentStepId) + 1;
  if (step === 0) throw new FlowError(`step "${currentStepId}" is not on the visitor's path`);
  return { step, total: Math.max(step, estimatedTotalSteps(flow, answers, derived)) };
}

/** The validators' view of a flow field (src/lib/flow/validators/types.ts). */
function fieldConfig(field: Field): FieldConfig {
  const base = { id: field.id, type: field.type, required: field.required };
  switch (field.type) {
    case 'single_choice':
    case 'select':
      return { ...base, options: field.options.map(({ code }) => ({ code })) };
    case 'number': {
      const { min, max, softMin, softMax } = field;
      return { ...base, min, max, softMin, softMax };
    }
    case 'text':
      return { ...base, maxLength: field.maxLength };
    case 'phone':
      return { ...base, allowLandlines: field.allowLandlines };
    case 'day_slot':
      return {
        ...base,
        days: field.days.map(({ code }) => code),
        slots: field.slots.map(({ code }) => code),
      };
    default:
      return base;
  }
}

export type StepValidation = {
  valid: boolean;
  /** Field id → error code (ERROR_CODES); the form maps codes to copy from the flow content. */
  errors: Record<string, ErrorCode>;
  /** Field id → warning code (WARNING_CODES); warnings don't block the step. */
  warnings: Record<string, WarningCode>;
  /** Field id → a likely intended value ("jan@gmail.com" for "jan@gmial.com"), valid or not. */
  suggestions: Record<string, string>;
};

/**
 * Validates the visible fields of a step with the field validators (brief §7.5, §7.6: hidden
 * fields are never validated, so never required). Empty optional fields pass; given values are
 * always checked.
 */
export function validateStep(step: Step, answers: Answers, derived: Derived = {}): StepValidation {
  const errors: Record<string, ErrorCode> = {};
  const warnings: Record<string, WarningCode> = {};
  const suggestions: Record<string, string> = {};
  for (const field of visibleFields(step, answers, derived)) {
    const result = validateField(answers[field.id], fieldConfig(field));
    // The validators only return ERROR_CODES and WARNING_CODES (validators/errors.ts).
    if (!result.ok) errors[field.id] = result.code as ErrorCode;
    else if (result.warning) warnings[field.id] = result.warning as WarningCode;
    if (result.suggestion) suggestions[field.id] = result.suggestion;
  }
  return { valid: Object.keys(errors).length === 0, errors, warnings, suggestions };
}

function sameAnswers(a: Answers, b: Answers): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

function keepOnPath(flow: Flow, answers: Answers, derived: Derived): Answers {
  const kept: Record<string, AnswerValue> = {};
  const implied = impliedKeys(flow);
  const chosen = new Map<string, string | null>();
  for (const id of walk(flow, answers, derived, false).shown) {
    for (const field of visibleFields(getStep(flow, id), answers, derived)) {
      const value = answers[field.id];
      if (value === undefined) continue;
      kept[field.id] = value;
      if (field.type !== 'single_choice') continue;
      const option = field.options.find((candidate) => candidate.code === value);
      for (const [key, { setters }] of implied) {
        if (setters.includes(field.id)) chosen.set(key, option?.sets?.[key] ?? null);
      }
    }
  }
  for (const [key, { allowed }] of implied) {
    const value = chosen.has(key) ? chosen.get(key) : answers[key];
    if (typeof value === 'string' && allowed.has(value)) kept[key] = value;
  }
  return kept;
}

/**
 * The answers without those of hidden fields, skipped steps and abandoned branches (brief §7.1
 * "Clearing old answers"). Answers implied by a chosen option (`sets`) follow that option; when
 * the choosing step is skipped (a preselect), they stay if this flow allows the value. Repeats
 * until stable, since clearing one answer can hide another question.
 */
export function clearAbandoned(flow: Flow, answers: Answers, derived: Derived = {}): Answers {
  let current = answers;
  for (;;) {
    const next = keepOnPath(flow, current, derived);
    if (sameAnswers(next, current)) return next;
    current = next;
  }
}

/** The tracking fields sent with every lead (brief §9.2, §10). */
export const TRACKING_KEYS = [
  'fbc',
  'fbp',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'ttclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ga_client_id',
  'ga_session_id',
  'landing_page',
  'referrer',
  'entry_path',
] as const;
export type TrackingKey = (typeof TRACKING_KEYS)[number];
export type Tracking = Record<TrackingKey, string>;

export type CookieConsent = { analytics: boolean; marketing: boolean };
export type CallPreference = { day: string; slot: string };

/** What the form knows besides the answers; the server adds the rest (docs/PAYLOAD.md). */
export type SubmissionContext = {
  /** Generated once per form session (brief §7.6: a double click never sends twice). */
  lead_id: string;
  /** Shared by the browser and server Meta events (brief §9.3, §10). */
  event_id: string;
  /** ISO 8601. */
  submitted_at: string;
  derived: Derived;
  /** Missing keys are sent as "". */
  tracking: Partial<Tracking>;
  /** The cookie banner's state at submit time. */
  cookies: CookieConsent;
  /** The page the form was sent from, e.g. /vergelijken/energie. */
  page: string;
  /** The visitor arrived with ?test=1 (brief §9.4); the server decides `is_test`. */
  test: boolean;
};

export type SubmittedValue = string | number | boolean;

/** The form's POST body: the §9.2 payload without the parts only the server can add. */
export type Submission = {
  schema_version: typeof SCHEMA_VERSION;
  lead_id: string;
  event_id: string;
  submitted_at: string;
  product: Flow['product'];
  flow_id: string;
  flow_version: number;
  /** Codes (never labels) of the shown fields, and implied answers such as energy_type. */
  answers: Record<string, SubmittedValue>;
  /** postcode, region and province (the server recomputes them from the postcode). */
  derived: Record<string, string>;
  /**
   * Fields with payload "contact", normalised: first_name, last_name, email (lowercased) and the
   * phone as phone_e164 and phone_display.
   */
  contact: Record<string, string>;
  call_preference: CallPreference | null;
  /** Fields with payload "consent" (terms, newsletter) plus the cookie banner's state. */
  consent: { cookies: CookieConsent } & Record<string, boolean | CookieConsent>;
  tracking: Tracking;
  meta: { page: string; test: boolean };
};

/**
 * The normalised value of a shown field (validators): trimmed text, a lowercased e-mail, a
 * parsed number, a boolean, `{ day, slot }` or a phone number; undefined when left empty.
 * Throws when the value doesn't validate: the island validates every step before submitting.
 */
function submittedValue(field: Field, value: AnswerValue | undefined): unknown {
  const result = validateField(value, fieldConfig(field));
  if (!result.ok) throw new FlowError(`field "${field.id}" is not valid: ${result.code}`);
  return result.value;
}

/** The keys a value is sent under: a phone number as `<id>_e164` and `<id>_display`. */
function submittedEntries(field: Field, value: unknown): [string, SubmittedValue][] {
  if (field.type !== 'phone') return [[field.id, value as SubmittedValue]];
  const { e164, display } = value as PhoneNumber;
  return [
    [`${field.id}_e164`, e164],
    [`${field.id}_display`, display],
  ];
}

/**
 * The submission for the lead endpoint (brief §9.2): only the answers of shown fields
 * (abandoned ones are cleared first), as codes and normalised values (validators), routed by
 * each field's `payload`. Call it after every step validated: a shown field that doesn't
 * validate (such as a required one left empty) throws a FlowError.
 */
export function buildSubmission(
  flow: Flow,
  answers: Answers,
  context: SubmissionContext,
): Submission {
  const cleaned = clearAbandoned(flow, answers, context.derived);
  const { postcode, region, province } = context.derived;
  const submission: Submission = {
    schema_version: SCHEMA_VERSION,
    lead_id: context.lead_id,
    event_id: context.event_id,
    submitted_at: context.submitted_at,
    product: flow.product,
    flow_id: flow.id,
    flow_version: flow.version,
    answers: {},
    derived: Object.fromEntries(
      Object.entries({ postcode, region, province }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    contact: {},
    call_preference: null,
    consent: { cookies: context.cookies },
    tracking: Object.fromEntries(
      TRACKING_KEYS.map((key) => [key, context.tracking[key] ?? '']),
    ) as Tracking,
    meta: { page: context.page, test: context.test },
  };

  for (const key of impliedKeys(flow).keys()) {
    const value = cleaned[key];
    if (typeof value === 'string') submission.answers[key] = value;
  }
  for (const id of walk(flow, cleaned, context.derived, false).shown) {
    for (const field of visibleFields(getStep(flow, id), cleaned, context.derived)) {
      const target = field.payload ?? 'answers';
      if (target === 'none') continue;
      const value = submittedValue(field, cleaned[field.id]);
      if (value === undefined) continue;
      if (target === 'call_preference') submission.call_preference = value as CallPreference;
      else if (target === 'consent') submission.consent[field.id] = value === true;
      else {
        for (const [key, entry] of submittedEntries(field, value)) {
          if (target === 'answers') submission.answers[key] = entry;
          else submission[target][key] = String(entry);
        }
      }
    }
  }
  return submission;
}

/**
 * The Dutch label of each coded answer (§9.2 `labels`, "so the sheet is readable"). For the
 * server, which builds labels from its own copy of the flow instead of trusting the browser.
 */
export function answerLabels(
  flow: Flow,
  answers: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const step of flow.steps) {
    for (const field of step.fields) {
      const value = answers[field.id];
      if (typeof value !== 'string') continue;
      if (field.type === 'single_choice' || field.type === 'select') {
        const option = field.options.find((candidate) => candidate.code === value);
        if (option) labels[field.id] = option.label;
      } else if (field.type === 'yes_no' && field.labels && (value === 'yes' || value === 'no')) {
        labels[field.id] = field.labels[value];
      }
    }
  }
  return labels;
}
