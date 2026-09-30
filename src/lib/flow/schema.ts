// The shape of a flow file (brief §7.2) and of the shared steps file. Used by the `flows` and
// `flowSteps` content collections and by validate:flows, which adds the checks a schema can't
// express (graph, vars, locales: src/lib/flow/validate.ts).
//
// Files (per locale folder, e.g. src/content/flows/nl/):
//   _shared.json      { "switches"?, "steps": [Step, …] }: steps defined once for every flow
//                     (brief §7.1), and the config switches options can depend on (`requires`)
//   _copy.json        the form's interface copy: buttons, progress, error messages (flowCopyFile)
//   <product>.json    a flow; its `steps` mix own steps and references { "use": "<shared id>" }
//
// A reference takes the shared step as is and sets its own `next` (where the flow goes on
// differs per flow). The contact step is the one shared step without a `next`.
//
// Build time only (Zod, node:fs via asset-keys): the engine imports these types, not the file.
import { z } from 'zod';

import { iconKeys, imageKeys } from '../asset-keys';
import { inspectLogic, isOperator, type JsonValue } from './logic';
import { PRODUCTS } from './types';
import { ERROR_CODES, WARNING_CODES } from './validators/errors';
import { FIELD_TYPES } from './validators/types';

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

/**
 * Names every plain object has (constructor, toString, __proto__, …): as a field id, reading
 * `answers[id]` would find the built-in instead of "no answer yet".
 */
const OBJECT_BUILT_INS: ReadonlySet<string> = new Set(Object.getOwnPropertyNames(Object.prototype));

/** Step and field ids: snake_case, stable (they're answer keys in the payload). */
export const flowId = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'a snake_case id such as meter_type')
  .refine((id) => id !== 'derived', '"derived" is reserved for derived values')
  .refine((id) => !OBJECT_BUILT_INS.has(id), {
    error: (issue) => `"${String(issue.input)}" is reserved (a built-in property of every object)`,
  });

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

/**
 * A JSONLogic condition (src/lib/flow/logic.ts): one operation, only known operators,
 * well-formed. A list or a literal at the top is rejected: a list is truthy whatever it holds
 * ([false] too) and a literal never changes, so either would make a branch dead or always taken.
 */
export const condition = jsonValue.superRefine((rule, ctx) => {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    ctx.addIssue({
      code: 'custom',
      message:
        'a condition is one JSONLogic operation, such as { "var": "has_solar" } (not a list or a literal)',
    });
    return;
  }
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
  /**
   * Offered only while this switch in _shared.json `switches` is on (brief §7.3: gas is a config
   * switch). resolveFlow leaves the option out otherwise; an unknown switch fails validate:flows.
   */
  requires: flowId.optional(),
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
  z
    .strictObject({
      ...fieldBase,
      type: z.literal('consent'),
      /**
       * Words of the label rendered as links, e.g. { "text": "privacybeleid", "href":
       * "/privacybeleid" }: the first occurrence of `text` in the label becomes the link.
       */
      links: z
        .array(
          z.strictObject({
            text,
            href: z
              .string()
              .regex(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/, 'a site path such as /privacybeleid'),
          }),
        )
        .optional(),
    })
    .superRefine((f, ctx) => {
      for (const [index, link] of (f.links ?? []).entries()) {
        if (!f.label?.includes(link.text)) {
          ctx.addIssue({
            code: 'custom',
            path: ['links', index, 'text'],
            message: `"${link.text}" does not occur in the label`,
          });
        }
      }
    }),
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

/**
 * An entry of a flow's `steps`: a reference when it has `use`, an own step otherwise. The branch
 * is picked before parsing so an error names the key (steps.2.title), where a union of the two
 * would only say "Invalid input".
 */
const flowStep = z.unknown().transform((entry, ctx): StepRef | Step => {
  const isRef = typeof entry === 'object' && entry !== null && 'use' in entry;
  const parsed = isRef ? stepRef.safeParse(entry) : step.safeParse(entry);
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  }
  return z.NEVER;
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
  steps: z.array(flowStep).min(1),
});

export const sharedStepsFile = z.strictObject({
  /**
   * Config switches for this locale, e.g. { "gas": true }: an option with `"requires": "gas"` is
   * only offered while the switch is on (resolve.ts).
   */
  switches: z.record(flowId, z.boolean()).optional(),
  steps: z.array(step).min(1),
});

/** Copy with placeholders: every `{token}` listed must occur in it. */
const template = (...tokens: string[]) =>
  text.refine((value) => tokens.every((token) => value.includes(`{${token}}`)), {
    message: `must contain ${tokens.map((token) => `{${token}}`).join(' and ')}`,
  });

/** A CONTENT-TODO row, e.g. "2.4": the copy is a fallback until that row is resolved. */
const todoRow = z.string().regex(/^\d+\.\d+[a-z]?$/, 'a docs/CONTENT-TODO.md row such as 2.4');

/** The purple side panel of one product's form (Figma 88:7430): title, body and mascot. */
const panelCopy = z.strictObject({
  /** The form page's h1. */
  title: text,
  body: text,
  /** An image key (src/assets/images), e.g. "mascot/fox-laptop-energy". Decorative. */
  image: z.enum(imageKeys),
  todo: todoRow.optional(),
});

/** SEO fields of a form page. */
const formPageSeo = z.strictObject({ title: text, description: text.optional() });

/**
 * The form's interface copy per locale (<locale>/_copy.json): what the island shows around the
 * questions. Error messages are keyed by the validators' error codes (validators/errors.ts);
 * they may use the placeholders {min}, {max} and {unit} (number fields) and {maxLength} (text).
 */
export const flowCopyFile = z.strictObject({
  /** The fixed country code shown in front of phone fields (brief §6: +32, no picker). */
  phonePrefix: text,
  /** The side panel per product flow (on /vergelijken it follows the chosen product). */
  panel: z.strictObject({
    energie: panelCopy,
    zonnepanelen: panelCopy,
    thuisbatterij: panelCopy,
  }),
  /** SEO of /vergelijken and /vergelijken/<product>. */
  pages: z.strictObject({
    vergelijken: formPageSeo,
    energie: formPageSeo,
    zonnepanelen: formPageSeo,
    thuisbatterij: formPageSeo,
  }),
  buttons: z.strictObject({ back: text, next: text, submit: text }),
  /** "Stap {step} van {total}" (brief §7.6; engine progress()). */
  progress: template('step', 'total'),
  /** Card labels of yes_no fields without their own `labels`. */
  yesNo: z.strictObject({ yes: text, no: text }),
  /** One message per error code. */
  errors: z.record(z.enum(ERROR_CODES), text),
  /** A more specific "required" message per field type, e.g. "Kies een antwoord." for cards. */
  requiredByType: z.partialRecord(z.enum(FIELD_TYPES), text).optional(),
  /** Per warning code; needed once a number field has softMin/softMax (validate:flows). */
  warnings: z.partialRecord(z.enum(WARNING_CODES), text).optional(),
  /** The e-mail typo suggestion, e.g. "Bedoel je {suggestion}?". */
  emailSuggestion: template('suggestion'),
});

export type Option = z.infer<typeof option>;
export type Field = z.infer<typeof field>;
export type FieldType = Field['type'];
export type NextEntry = z.infer<typeof nextEntry>;
export type Step = z.infer<typeof step>;
export type StepRef = z.infer<typeof stepRef>;
export type FlowFile = z.infer<typeof flowFile>;
export type SharedStepsFile = z.infer<typeof sharedStepsFile>;
export type FlowCopy = z.infer<typeof flowCopyFile>;
export type FormPanelCopy = z.infer<typeof panelCopy>;

/** A flow with its shared steps filled in (src/lib/flow/resolve.ts): what the engine runs. */
export type Flow = Omit<FlowFile, 'steps'> & { steps: Step[] };
