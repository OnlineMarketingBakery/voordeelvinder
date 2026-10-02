// The generic flow engine (brief §7.1): pure functions over a resolved Flow (resolve.ts), the
// visitor's answers and the derived values. It knows nothing about products; the form island
// renders what these functions return. Framework-free: the island bundles this file.
//
// Conditions (`visibleIf`, `next[].if`) see answers by field id plus `derived.<key>`, but only
// the answers the visitor can see: the engine walks the flow from its first step and a
// condition reads the fields that are visible before it (on earlier shown steps, and earlier on
// its own step), with numbers parsed ("3.500" → 3500). Answers of hidden fields, skipped steps
// and branches not taken are never read, so a stale answer never routes the visitor.
// A step is shown when its `visibleIf` holds and at least one of its fields is visible; a step
// that isn't shown is skipped by following its `next` (brief §7.2).
import { evaluate, inspectLogic, readPath, truthy, type Rule } from './logic';
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

/** An own property only: a field id such as "constructor" never reads Object.prototype. */
function own<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function holds(rule: Rule | undefined, data: unknown): boolean {
  return rule === undefined || truthy(evaluate(rule, data));
}

export function getStep(flow: Flow, id: string): Step {
  const step = flow.steps.find((candidate) => candidate.id === id);
  if (!step) throw new FlowError(`unknown step "${id}" in flow "${flow.id}"`);
  return step;
}

/** The validators' view of a flow field (src/lib/flow/validators/types.ts). */
function fieldConfig(field: Field): FieldConfig {
  const base = { id: field.id, type: field.type, required: field.required };
  switch (field.type) {
    case 'single_choice':
    case 'select':
      return { ...base, options: field.options.map(({ code }) => ({ code })) };
    case 'number': {
      const { min, max, softMin, softMax, decimals } = field;
      return { ...base, min, max, softMin, softMax, decimals };
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

type ImpliedKeys = Map<string, { setters: string[]; allowed: Set<string> }>;

/** Keys set by options' `sets`, with the fields that set them and the values this flow allows. */
function impliedKeys(flow: Flow): ImpliedKeys {
  const keys: ImpliedKeys = new Map();
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
 * What conditions see while the engine walks the flow: `data` (answers of the visible fields
 * so far, numbers parsed, implied answers and `derived`) and `kept` (the same answers as given).
 */
type Scope = {
  answers: Answers;
  implied: ImpliedKeys;
  data: Record<string, unknown>;
  kept: Record<string, AnswerValue>;
};

function newScope(flow: Flow, answers: Answers, derived: Derived): Scope {
  const implied = impliedKeys(flow);
  // The island knows at mount whether the product came from the URL: missing means false.
  const data: Record<string, unknown> = {
    derived: {
      ...derived,
      preselected: derived.preselected === true,
      energy_preselected: derived.energy_preselected === true,
    },
  };
  // Implied answers start as given (a preselect) when this flow allows them; a visible field
  // that sets them takes over (admit).
  for (const [key, { allowed }] of implied) {
    const value = own(answers, key);
    if (typeof value === 'string' && allowed.has(value)) data[key] = value;
  }
  return { answers, implied, data, kept: {} };
}

/** How a condition reads an answer: a number as parsed when it validates, else as given. */
function conditionValue(field: Field, value: AnswerValue): unknown {
  if (field.type !== 'number') return value;
  const result = validateField(value, fieldConfig(field));
  return result.ok ? result.value : value;
}

/** Makes a visible field's answer (and what its chosen option implies) readable. */
function admit(scope: Scope, field: Field): void {
  const value = own(scope.answers, field.id);
  if (value === undefined) return;
  scope.kept[field.id] = value;
  scope.data[field.id] = conditionValue(field, value);
  if (field.type !== 'single_choice') return;
  const option = field.options.find((candidate) => candidate.code === value);
  for (const [key, { setters, allowed }] of scope.implied) {
    if (!setters.includes(field.id)) continue;
    const set = option?.sets?.[key];
    scope.data[key] = set !== undefined && allowed.has(set) ? set : undefined;
  }
}

/**
 * The visible fields of a step, admitted in order: each field's `visibleIf` sees the fields
 * before it. None when the step's own `visibleIf` fails.
 */
function enterStep(scope: Scope, step: Step): Field[] {
  if (!holds(step.visibleIf, scope.data)) return [];
  const fields: Field[] = [];
  for (const field of step.fields) {
    if (!holds(field.visibleIf, scope.data)) continue;
    fields.push(field);
    admit(scope, field);
  }
  return fields;
}

/** The `goto` of the first `next` entry that holds; null after the last step. */
function exit(step: Step, data: unknown): string | null {
  if (step.next.length === 0) return null;
  const entry = step.next.find((candidate) => holds(candidate.if, data));
  if (!entry) throw new FlowError(`no way on from step "${step.id}"`);
  return entry.goto;
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

function answered(fields: Field[], answers: Answers): boolean {
  return fields.every((field) => !field.required || hasValue(field, own(answers, field.id)));
}

type Visit = { shown: boolean; fields: Field[] };

type Trace = {
  /** Every step the walk passed, shown or skipped, in order, with its visible fields. */
  visits: Map<string, Visit>;
  /** Shown steps, in order. */
  shown: string[];
  /** The first shown step that isn't answered yet, else null. */
  frontier: string | null;
  /** The scope after the last step walked. */
  scope: Scope;
};

/** Walks the visitor's path from the first step (to the end, or to the frontier). */
function trace(flow: Flow, answers: Answers, derived: Derived, stopAtOpen: boolean): Trace {
  const scope = newScope(flow, answers, derived);
  const visits = new Map<string, Visit>();
  const shown: string[] = [];
  let frontier: string | null = null;
  let current: string | null = flow.firstStep;
  while (current !== null) {
    if (visits.has(current)) throw new FlowError(`loop at step "${current}"`);
    const step = getStep(flow, current);
    const fields = enterStep(scope, step);
    visits.set(current, { shown: fields.length > 0, fields });
    if (fields.length > 0) {
      shown.push(current);
      if (frontier === null && !answered(fields, answers)) {
        frontier = current;
        if (stopAtOpen) break;
      }
    }
    current = exit(step, scope.data);
  }
  for (const key of scope.implied.keys()) {
    const value = scope.data[key];
    if (typeof value === 'string') scope.kept[key] = value;
  }
  return { visits, shown, frontier, scope };
}

/** A step as the walk saw it; a step off the visitor's path sees every answer of the path. */
function visitOf(flow: Flow, id: string, answers: Answers, derived: Derived): Visit {
  const step = getStep(flow, id);
  const { visits, scope } = trace(flow, answers, derived, false);
  const visit = visits.get(id);
  if (visit) return visit;
  const fields = enterStep({ ...scope, data: { ...scope.data }, kept: {} }, step);
  return { shown: fields.length > 0, fields };
}

/**
 * What conditions see at the end of the visitor's path: the answers of visible fields (numbers
 * parsed), the implied answers and `derived` (a missing `preselected` is false).
 */
export function conditionData(
  flow: Flow,
  answers: Answers,
  derived: Derived = {},
): Record<string, unknown> {
  return trace(flow, answers, derived, false).scope.data;
}

/** The fields of a step that are shown for these answers. */
export function visibleFields(
  flow: Flow,
  stepId: string,
  answers: Answers,
  derived: Derived = {},
): Field[] {
  return visitOf(flow, stepId, answers, derived).fields;
}

/** Whether a step is shown: its `visibleIf` holds and it has a visible field. */
export function isStepShown(
  flow: Flow,
  stepId: string,
  answers: Answers,
  derived: Derived = {},
): boolean {
  return visitOf(flow, stepId, answers, derived).shown;
}

/** Every visible required field of the step has an answer (format not checked). */
export function isStepAnswered(
  flow: Flow,
  stepId: string,
  answers: Answers,
  derived: Derived = {},
): boolean {
  return answered(visibleFields(flow, stepId, answers, derived), answers);
}

/** The first step shown (the product step, or the one after it when it's skipped). */
export function startStep(flow: Flow, answers: Answers, derived: Derived = {}): string | null {
  return trace(flow, answers, derived, true).shown[0] ?? null;
}

/**
 * The step after `currentStepId`, skipping steps that aren't shown; null after the last.
 * Throws for a step the visitor's path doesn't pass.
 */
export function nextStep(
  flow: Flow,
  currentStepId: string,
  answers: Answers,
  derived: Derived = {},
): string | null {
  getStep(flow, currentStepId);
  const { visits } = trace(flow, answers, derived, false);
  const order = [...visits.keys()];
  const index = order.indexOf(currentStepId);
  if (index === -1) throw new FlowError(`step "${currentStepId}" is not on the visitor's path`);
  return order.slice(index + 1).find((id) => visits.get(id)!.shown) ?? null;
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
  return trace(flow, answers, derived, true).shown;
}

/** The shown step before `currentStepId` ("Terug"); null on the first shown step. */
export function previousStep(
  flow: Flow,
  currentStepId: string,
  answers: Answers,
  derived: Derived = {},
): string | null {
  const { shown } = trace(flow, answers, derived, false);
  const index = shown.indexOf(currentStepId);
  if (index === -1) throw new FlowError(`step "${currentStepId}" is not on the visitor's path`);
  return index === 0 ? null : shown[index - 1]!;
}

/** Derived values worked out from the postcode (brief §7.5): open while the postcode is. */
const FROM_POSTCODE: readonly string[] = ['postcode', 'region', 'province'];

/**
 * Y in "Stap X van Y": the number of shown steps on the longest path that is still possible
 * given the answers so far. A condition counts as undecided while it reads a value that is
 * missing and could still be given: a field on the step the visitor is on (`currentStepId`), on
 * the first unanswered step, or on a step reachable from either, an answer implied by such a
 * field, or a value derived from the postcode while the postcode can still be given (a var
 * default doesn't decide it). Undecided steps count as shown and undecided branches are all
 * possible. Moving forward only shrinks the set of steps that can still be reached, so
 * answering only ever removes possibilities: Y never goes up while the visitor moves forward
 * (the bar never goes back), and X never overtakes it. Once every step is answered, Y is the
 * length of the visitor's path.
 */
export function estimatedTotalSteps(
  flow: Flow,
  answers: Answers,
  derived: Derived = {},
  currentStepId?: string,
): number {
  const { frontier, scope } = trace(flow, answers, derived, false);
  const { data } = scope;
  // Fields that can still be answered: on the current or first unanswered step or after it.
  const open = new Set<string>();
  for (const start of [currentStepId, frontier]) {
    if (start === undefined || start === null) continue;
    for (const id of reachableFrom(flow, start)) {
      for (const field of getStep(flow, id).fields) open.add(field.id);
    }
  }
  for (const [key, { setters }] of scope.implied) {
    if (setters.some((id) => open.has(id))) open.add(key);
  }
  const postcodeOpen = flow.steps.some((step) =>
    step.fields.some((field) => field.type === 'postcode' && open.has(field.id)),
  );
  const isOpen = (path: string) => {
    const [head = '', key = ''] = path.split('.');
    return head === 'derived' ? postcodeOpen && FROM_POSTCODE.includes(key) : open.has(head);
  };
  const decide = (rule: Rule | undefined): boolean | undefined => {
    if (rule === undefined) return true;
    const undecided = inspectLogic(rule).vars.some(
      ({ path }) => isOpen(path) && isEmpty(readPath(data, path)),
    );
    return undecided ? undefined : truthy(evaluate(rule, data));
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
  const total = estimatedTotalSteps(flow, answers, derived, currentStepId);
  return { step, total: Math.max(step, total) };
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
export function validateStep(
  flow: Flow,
  stepId: string,
  answers: Answers,
  derived: Derived = {},
): StepValidation {
  const errors: Record<string, ErrorCode> = {};
  const warnings: Record<string, WarningCode> = {};
  const suggestions: Record<string, string> = {};
  for (const field of visibleFields(flow, stepId, answers, derived)) {
    const result = validateField(own(answers, field.id), fieldConfig(field));
    // The validators only return ERROR_CODES and WARNING_CODES (validators/errors.ts).
    if (!result.ok) errors[field.id] = result.code as ErrorCode;
    else if (result.warning) warnings[field.id] = result.warning as WarningCode;
    if (result.suggestion) suggestions[field.id] = result.suggestion;
  }
  return { valid: Object.keys(errors).length === 0, errors, warnings, suggestions };
}

/**
 * The answers with "no" for every yes/no shown as a checkbox (`display: "checkbox"`) that has
 * no answer yet: an unticked box is an answer, unlike two cards nobody picked.
 */
export function withCheckboxDefaults(flow: Flow, answers: Answers): Answers {
  let filled: Record<string, AnswerValue | undefined> | null = null;
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'yes_no' || field.display !== 'checkbox') continue;
      if (own(answers, field.id) !== undefined) continue;
      filled ??= { ...answers };
      filled[field.id] = 'no';
    }
  }
  return filled ?? answers;
}

/**
 * The answers without those of hidden fields, skipped steps and abandoned branches (brief §7.1
 * "Clearing old answers"). Answers implied by a chosen option (`sets`) follow that option; when
 * the choosing step is skipped (a preselect), they stay if this flow allows the value. Since
 * conditions never read such answers, one pass is enough: clearing changes no condition.
 */
export function clearAbandoned(flow: Flow, answers: Answers, derived: Derived = {}): Answers {
  return trace(flow, answers, derived, false).scope.kept;
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
 * validate (such as a required one left empty) throws a FlowError. So does a missing implied
 * answer (energy_type) whose question was skipped, as a preselect without it would do: the
 * lead would lack an answer this flow always asks.
 */
export function buildSubmission(
  flow: Flow,
  answers: Answers,
  context: SubmissionContext,
): Submission {
  const { visits, scope } = trace(flow, answers, context.derived, false);
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

  for (const [key, { setters, allowed }] of scope.implied) {
    const value = own(scope.kept, key);
    if (typeof value === 'string') {
      submission.answers[key] = value;
      continue;
    }
    if (allowed.size === 0) continue;
    const sets = (step: Step | Visit) => step.fields.some((field) => setters.includes(field.id));
    const skipped = [...visits].filter(([id, visit]) => !visit.shown && sets(getStep(flow, id)));
    if (skipped.length > 0 && ![...visits.values()].some(sets)) {
      const steps = skipped.map(([id]) => id).join('", "');
      throw new FlowError(`"${key}" is missing: the step that asks it ("${steps}") was skipped`);
    }
  }
  for (const { fields } of visits.values()) {
    for (const field of fields) {
      const target = field.payload ?? 'answers';
      if (target === 'none') continue;
      const value = submittedValue(field, own(scope.kept, field.id));
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
      const value = own(answers, field.id);
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
