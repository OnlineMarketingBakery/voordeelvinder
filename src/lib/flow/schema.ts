// The shape of a flow file (brief §7.2) and of the shared steps file. Used by the `flows` and
// `flowSteps` content collections and by validate:flows, which adds the checks a schema can't
// express (graph, vars, locales: src/lib/flow/validate.ts).
//
// Files (per locale folder, e.g. src/content/flows/nl/):
//   _shared.json      { "steps": [Step, …] }: steps defined once for every flow (brief §7.1)
//   <product>.json    a flow; its `steps` mix own steps and references { "use": "<shared id>" }
//
// A reference takes the shared step as is and sets its own `next` (where the flow goes on
// differs per flow). The contact step is the one shared step without a `next`.
//
// Build time only (Zod, node:fs via asset-keys): the engine imports these types, not the file.
import { z } from 'zod';

import { iconKeys } from '../asset-keys';
import { inspectLogic, isOperator, type JsonValue } from './logic';
import { PRODUCTS } from './types';

/** The id of the shared contact step every flow ends with (brief §7.1). */
export const CONTACT_STEP_ID = 'contact';

/** Where a field's value goes in the submission (brief §9.2); default `answers`. */
export const PAYLOAD_TARGETS = [
  'answers',
  'contact',
  'consent',
  'call_preference',
  'derived',
  'none',
] as const;
export type PayloadTarget = (typeof PAYLOAD_TARGETS)[number];

const text = z.string().min(1);

/** Step and field ids: snake_case, stable (they're answer keys in the payload). */
export const flowId = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'a snake_case id such as meter_type')
  .refine((id) => id !== 'derived', '"derived" is reserved for derived values');

/** Option codes: the data contract with n8n and the lead sheet (AGENTS.md rule 4). */
export const optionCode = z
  .string()
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, 'a lowercase code such as dual, 5_plus or 09-10');

const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

/** A JSONLogic condition (src/lib/flow/logic.ts): only known operators, well-formed. */
export const condition = jsonValue.superRefine((rule, ctx) => {
  const info = inspectLogic(rule);
  for (const issue of info.issues) ctx.addIssue({ code: 'custom', message: issue });
  for (const op of info.operators.filter((name) => !isOperator(name))) {
    ctx.addIssue({ code: 'custom', message: `unknown JSONLogic operator "${op}"` });
  }
});

export const option = z.strictObject({
  code: optionCode,
  label: text,
  icon: z.enum(iconKeys).optional(),
  /** Choosing it continues in this product's flow (the shared product step, brief §7.3). */
  product: z.enum(PRODUCTS).optional(),
  /** Answers implied by choosing it, e.g. { "energy_type": "both" }; conditions can read them. */
  sets: z.record(flowId, optionCode).optional(),
});

/** Plain options (select, day_slot): no icon, no implied answers. */
const plainOption = z.strictObject({ code: optionCode, label: text });

const fieldBase = {
  id: flowId,
  /** The question; a single-field step can rely on the step title instead. */
  label: text.optional(),
  hint: text.optional(),
  visibleIf: condition.optional(),
  /** Only enforced while the field is shown (brief §7.6). */
  required: z.boolean().optional(),
  payload: z.enum(PAYLOAD_TARGETS).optional(),
};

const placeholder = text.optional();

export const field = z.discriminatedUnion('type', [
  z.strictObject({
    ...fieldBase,
    type: z.literal('single_choice'),
    options: z.array(option).min(2),
  }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('yes_no'),
    /** Card labels; the codes are always "yes" and "no". */
    labels: z.strictObject({ yes: text, no: text }).optional(),
  }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('select'),
    placeholder,
    options: z.array(plainOption).min(2),
  }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('text'),
    placeholder,
    /** The HTML autocomplete token, e.g. "given-name". */
    autocomplete: z.string().optional(),
    maxLength: z.int().positive().optional(),
  }),
  z
    .strictObject({
      ...fieldBase,
      type: z.literal('number'),
      placeholder,
      unit: text,
      min: z.number(),
      max: z.number(),
      /** Outside softMin–softMax the value is accepted with a warning (brief §7.3). */
      softMin: z.number().optional(),
      softMax: z.number().optional(),
    })
    .refine(
      (f) => {
        const bounds = [f.min, f.softMin ?? f.min, f.softMax ?? f.max, f.max];
        return f.min < f.max && bounds.every((value, i) => i === 0 || bounds[i - 1]! <= value);
      },
      { message: 'needs min < max and min ≤ softMin ≤ softMax ≤ max' },
    ),
  z.strictObject({ ...fieldBase, type: z.literal('postcode'), placeholder }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('phone'),
    placeholder,
    /** Also accept Belgian landlines (default: mobiles only, brief §7.5). */
    allowLandlines: z.boolean().optional(),
  }),
  z.strictObject({ ...fieldBase, type: z.literal('email'), placeholder }),
  z.strictObject({ ...fieldBase, type: z.literal('checkbox') }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('day_slot'),
    /** Two linked single-choice groups (brief §7.5): day codes mon…fri, slot codes 09-10…. */
    days: z.array(plainOption).min(1),
    slots: z.array(plainOption).min(1),
    dayLabel: text.optional(),
    slotLabel: text.optional(),
  }),
  z.strictObject({ ...fieldBase, type: z.literal('consent') }),
]);

export const nextEntry = z.strictObject({ if: condition.optional(), goto: flowId });

export const step = z.strictObject({
  id: flowId,
  title: text,
  subtitle: text.optional(),
  hint: text.optional(),
  /** When false the step is skipped: the engine follows its `next` without showing it. */
  visibleIf: condition.optional(),
  fields: z.array(field).min(1),
  /** Ordered: the first entry whose `if` holds (or has none) wins. Empty only for contact. */
  next: z.array(nextEntry).default([]),
});

/** A shared step used in a flow, with the flow's own `next`. */
export const stepRef = z.strictObject({
  use: flowId,
  next: z.array(nextEntry).optional(),
});

export const flowFile = z.strictObject({
  /** Equals the file name (energie.json → "energie"). */
  id: flowId,
  /** Bump when the questions change meaning; sent as `flow_version` (brief §9.2). */
  version: z.int().positive(),
  product: z.enum(PRODUCTS),
  /** Equals the folder (nl); optional. */
  locale: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
  firstStep: flowId,
  steps: z.array(z.union([stepRef, step])).min(1),
});

export const sharedStepsFile = z.strictObject({ steps: z.array(step).min(1) });

export type Option = z.infer<typeof option>;
export type Field = z.infer<typeof field>;
export type FieldType = Field['type'];
export type NextEntry = z.infer<typeof nextEntry>;
export type Step = z.infer<typeof step>;
export type StepRef = z.infer<typeof stepRef>;
export type FlowFile = z.infer<typeof flowFile>;
export type SharedStepsFile = z.infer<typeof sharedStepsFile>;

/** A flow with its shared steps filled in (src/lib/flow/resolve.ts): what the engine runs. */
export type Flow = Omit<FlowFile, 'steps'> & { steps: Step[] };
