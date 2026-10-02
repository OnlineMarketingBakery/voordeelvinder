// Parses and validates the form's POST body for /api/lead (brief §9.1 steps 2 and 5,
// docs/PAYLOAD.md "Where each part comes from"). Nothing the browser computed is trusted: the
// body's shape is checked strictly (unknown keys are rejected), the posted values are turned
// back into the engine's answers, and the submission is rebuilt from scratch with the server's
// own flow: clearAbandoned drops answers of hidden fields and branches not taken, validateStep
// checks every shown step with the shared field validators, and buildSubmission derives the
// region and province from the postcode and the phone's E.164 and display formats.
//
// Issues name the place and an error code, never a submitted value: they may be logged, and
// the body holds personal data (brief §13).
import { z } from 'zod';

import {
  buildSubmission,
  clearAbandoned,
  FlowError,
  pathSoFar,
  SCHEMA_VERSION,
  TRACKING_KEYS,
  validateStep,
  type Submission,
  type TrackingKey,
} from '../../lib/flow/engine';
import type { Field, Flow } from '../../lib/flow/schema';
import { cleanTrackingValue } from '../../lib/flow/tracking';
import { PRODUCTS, type AnswerValue, type Derived, type Product } from '../../lib/flow/types';
import { derive } from '../../lib/flow/validators/postcode';
import { serverFlowVariants } from './flows';

/** The honeypot: a hidden text input that people leave empty and bots fill in (§9.1 step 3). */
export const HONEYPOT_FIELD = 'website';
/** The Cloudflare Turnstile response token (§9.1 step 4). */
export const TURNSTILE_FIELD = 'turnstile_token';

/** Upper bounds for posted strings: far above any valid value, so they only stop abuse. */
const MAX_KEY = 100;
const MAX_VALUE = 1000;
const MAX_TRACKING = 2048;
/** Turnstile tokens are at most 2048 characters (Cloudflare docs). */
const MAX_TOKEN = 2048;
const MAX_ISSUE = 200;

const key = z.string().max(MAX_KEY);
/** Tracking values are cleaned, not refused (src/lib/flow/tracking.ts): at most 512 characters. */
const trackingValue = z.string().max(MAX_TRACKING).default('').transform(cleanTrackingValue);
const trackingShape = Object.fromEntries(
  TRACKING_KEYS.map((name) => [name, trackingValue]),
) as Record<TrackingKey, typeof trackingValue>;

/** The body: the form's Submission (engine.ts) plus the honeypot and the Turnstile token. */
export const leadRequestBody = z.strictObject({
  schema_version: z.literal(SCHEMA_VERSION),
  lead_id: z.uuid(),
  event_id: z.uuid(),
  submitted_at: z.iso.datetime(),
  product: z.enum(PRODUCTS),
  flow_id: z.string().max(MAX_KEY),
  flow_version: z.int().positive(),
  answers: z.record(key, z.union([z.string().max(MAX_VALUE), z.number(), z.boolean()])),
  derived: z.record(key, z.string().max(MAX_VALUE)),
  contact: z.record(key, z.string().max(MAX_VALUE)),
  call_preference: z
    .strictObject({ day: z.string().max(MAX_KEY), slot: z.string().max(MAX_KEY) })
    .nullable(),
  consent: z
    .object({ cookies: z.strictObject({ analytics: z.boolean(), marketing: z.boolean() }) })
    .catchall(z.boolean()),
  tracking: z.strictObject(trackingShape),
  meta: z.strictObject({
    page: z
      .string()
      .max(MAX_TRACKING)
      .regex(/^\/\S*$/, 'a path such as /vergelijken/energie'),
    test: z.boolean(),
  }),
  [HONEYPOT_FIELD]: z.string().max(MAX_VALUE).optional(),
  [TURNSTILE_FIELD]: z.string().max(MAX_TOKEN).optional(),
});

export type LeadRequestBody = z.infer<typeof leadRequestBody>;

export type LeadRequestResult =
  | {
      ok: true;
      /** Rebuilt by the server from the posted answers and its own flow. */
      submission: Submission;
      /** The honeypot was filled in: pretend success and store nothing (§9.1 step 3). */
      honeypot: boolean;
      /** The Turnstile token as posted ("" when missing), for verifyTurnstile. */
      turnstileToken: string;
    }
  | { ok: false; status: 400; issues: string[] };

/** The parts of the body a field's value is posted in (its `payload`, brief §9.2). */
type Part = 'answers' | 'contact' | 'consent' | 'derived' | 'call_preference';

/** Where a field's value is posted, or null for `payload: none` (never sent). */
function partOf(field: Field): Part | null {
  const target = field.payload ?? 'answers';
  return target === 'none' ? null : target;
}

/** The keys a field is posted under: a phone as `<id>_e164` and `<id>_display`. */
function postedKeys(field: Field): string[] {
  return field.type === 'phone' ? [`${field.id}_e164`, `${field.id}_display`] : [field.id];
}

/** The key the engine reads a field's answer back from: a phone from its E.164 form. */
function sourceKey(field: Field): string {
  return postedKeys(field)[0]!;
}

function allFields(flow: Flow): Field[] {
  return flow.steps.flatMap((step) => step.fields);
}

/**
 * Answers implied by an option's `sets` (energy_type) and the values this flow allows for
 * them: the options of this product (or of none), as the engine allows them.
 */
export function impliedValues(flow: Flow): Map<string, Set<string>> {
  const implied = new Map<string, Set<string>>();
  for (const field of allFields(flow)) {
    if (field.type !== 'single_choice') continue;
    for (const option of field.options) {
      for (const [name, value] of Object.entries(option.sets ?? {})) {
        const values = implied.get(name) ?? new Set<string>();
        if (option.product === undefined || option.product === flow.product) values.add(value);
        implied.set(name, values);
      }
    }
  }
  return implied;
}

/**
 * The keys of the payload's `answers` for this flow (what rules can read): the fields posted in
 * `answers` (a phone under both of its keys) and the implied answers the flow allows.
 */
export function submittedAnswerKeys(flow: Flow): Set<string> {
  const keys = new Set<string>();
  for (const field of allFields(flow)) {
    if (partOf(field) === 'answers') postedKeys(field).forEach((name) => keys.add(name));
  }
  for (const [name, values] of impliedValues(flow)) if (values.size > 0) keys.add(name);
  return keys;
}

/** The keys each part of the body may hold for this flow. */
function allowedKeys(flow: Flow): Record<Exclude<Part, 'call_preference'>, Set<string>> {
  const allowed = {
    answers: submittedAnswerKeys(flow),
    contact: new Set<string>(),
    consent: new Set<string>(['cookies']),
    derived: new Set<string>(['region', 'province']),
  };
  for (const field of allFields(flow)) {
    const part = partOf(field);
    if (part === 'contact' || part === 'consent' || part === 'derived') {
      postedKeys(field).forEach((name) => allowed[part].add(name));
    }
  }
  return allowed;
}

function own(record: Readonly<Record<string, unknown>>, name: string): unknown {
  return Object.hasOwn(record, name) ? record[name] : undefined;
}

function issueText(path: string, message: string): string {
  const text = `${path}: ${message}`;
  return text.length > MAX_ISSUE ? `${text.slice(0, MAX_ISSUE - 1)}…` : text;
}

/**
 * Paths of own "__proto__" keys (JSON.parse makes them): Zod's records drop them silently, so
 * they are rejected here, like any other unknown field.
 */
function protoKeys(value: unknown, path = ''): string[] {
  if (typeof value !== 'object' || value === null) return [];
  return Object.keys(value).flatMap((name) => {
    const inner = path === '' ? name : `${path}.${name}`;
    if (name === '__proto__') return [inner];
    return path.split('.').length > 3
      ? []
      : protoKeys((value as Record<string, unknown>)[name], inner);
  });
}

function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) =>
    issueText(issue.path.length > 0 ? issue.path.join('.') : '(body)', issue.message),
  );
}

/** The engine's answers (by field id, plus implied answers) from the posted parts. */
function engineAnswers(flow: Flow, body: LeadRequestBody): Record<string, AnswerValue> {
  const answers: Record<string, AnswerValue> = {};
  for (const field of allFields(flow)) {
    const part = partOf(field);
    if (part === null) continue;
    if (part === 'call_preference') {
      if (body.call_preference) answers[field.id] = { ...body.call_preference };
      continue;
    }
    const value = own(body[part], sourceKey(field));
    if (value !== undefined) answers[field.id] = value as AnswerValue;
  }
  for (const name of impliedValues(flow).keys()) {
    const value = own(body.answers, name);
    if (typeof value === 'string') answers[name] = value;
  }
  return answers;
}

/**
 * Where a field's error is reported: the place in the body the value came from, e.g.
 * `answers.meter_type` or `contact.phone_e164`.
 */
function issuePath(field: Field): string {
  const part = partOf(field) ?? 'answers';
  return part === 'call_preference' ? part : `${part}.${sourceKey(field)}`;
}

/**
 * The flags a rebuilt submission is walked with. The choice steps that set them (product,
 * energy_choice) post nothing (`payload: none`); only their implied answer (energy_type) is
 * sent. So the server walks every flow as preselected with the implied answers as given, which
 * skips those steps; every other step and field is the same on either path.
 */
const SERVER_FLAGS: Derived = { preselected: true, energy_preselected: true };

/**
 * Parses the POST body of /api/lead and rebuilds the submission with the server's flows.
 * 400 with the issues when the body has unknown keys, bad codes, a missing required answer, a
 * value that doesn't validate (phone, postcode, e-mail…) or doesn't match the flow's version.
 */
export function parseLeadRequest(
  body: unknown,
  flows: Record<Product, Flow>,
  variants: readonly Flow[] = serverFlowVariants(),
): LeadRequestResult {
  const forbidden = protoKeys(body);
  if (forbidden.length > 0) {
    return {
      ok: false,
      status: 400,
      issues: forbidden.map((path) => issueText(path, 'unknown field')),
    };
  }
  const parsed = leadRequestBody.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, issues: zodIssues(parsed.error) };
  const data = parsed.data;
  // The product's flow, or a variant of it (the single-page energy form) named by flow_id.
  const flow =
    variants.find(
      (candidate) => candidate.id === data.flow_id && candidate.product === data.product,
    ) ?? flows[data.product];
  const issues: string[] = [];

  if (data.flow_id !== flow.id) {
    issues.push(issueText('flow_id', `is not the ${data.product} flow`));
  }
  if (data.flow_version !== flow.version) {
    issues.push(
      issueText('flow_version', `the server's ${data.product} flow is version ${flow.version}`),
    );
  }

  const allowed = allowedKeys(flow);
  for (const part of ['answers', 'contact', 'consent', 'derived'] as const) {
    for (const name of Object.keys(data[part])) {
      if (!allowed[part].has(name)) issues.push(issueText(`${part}.${name}`, 'unknown field'));
    }
  }
  for (const [name, values] of impliedValues(flow)) {
    // Not allowed in this flow at all (energy_type for solar panels): reported above.
    const value = own(data.answers, name);
    if (value === undefined || values.size === 0) continue;
    if (typeof value !== 'string' || !values.has(value)) {
      issues.push(issueText(`answers.${name}`, 'option_unknown'));
    }
  }
  if (issues.length > 0) return { ok: false, status: 400, issues };

  const answers = engineAnswers(flow, data);
  const postcodeField = allFields(flow).find((field) => field.type === 'postcode');
  const derived: Derived = {
    ...SERVER_FLAGS,
    ...(postcodeField ? derive(answers, postcodeField.id) : {}),
  };
  const kept = clearAbandoned(flow, answers, derived);

  const fieldsById = new Map(allFields(flow).map((field) => [field.id, field]));
  for (const stepId of pathSoFar(flow, kept, derived)) {
    const { errors } = validateStep(flow, stepId, kept, derived);
    for (const [fieldId, code] of Object.entries(errors)) {
      issues.push(issueText(issuePath(fieldsById.get(fieldId)!), code));
    }
  }
  if (issues.length > 0) return { ok: false, status: 400, issues };

  let submission: Submission;
  try {
    submission = buildSubmission(flow, kept, {
      lead_id: data.lead_id,
      event_id: data.event_id,
      submitted_at: data.submitted_at,
      derived,
      tracking: data.tracking,
      cookies: data.consent.cookies,
      page: data.meta.page,
      test: data.meta.test,
    });
  } catch (error) {
    if (!(error instanceof FlowError)) throw error;
    return { ok: false, status: 400, issues: [issueText('answers', error.message)] };
  }
  return {
    ok: true,
    submission,
    honeypot: (data[HONEYPOT_FIELD] ?? '').trim() !== '',
    turnstileToken: data[TURNSTILE_FIELD] ?? '',
  };
}
