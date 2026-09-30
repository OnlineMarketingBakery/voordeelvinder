// The checks behind `npm run validate:flows` (brief §7.1), on already-read files so they stay
// testable; scripts/validate-flows.ts does the reading and the exit code.
//
// Paths are checked by a graph search that treats every `next` entry as possibly taken, and
// every step as possibly shown, instead of enumerating answers. That over-approximates the
// visitor's real paths, so it can report a path no answer combination reaches, but it never
// misses a real one. Together with "the last entry of every `next` has no `if`" (a condition
// that holds for no answer would otherwise strand the visitor), "the contact step is the only
// step without a `next`" and "no loops", it proves that every path reaches the contact step.
import type { z } from 'zod';

import type { JsonValue, Rule } from './logic';
import { resolveFlow } from './resolve';
import {
  CONTACT_STEP_ID,
  flowCopyFile,
  flowFile,
  sharedStepsFile,
  type Field,
  type Flow,
  type FlowFile,
  type SharedStepsFile,
  type Step,
} from './schema';
import { DERIVED_KEYS, REGIONS } from './types';

/** A file as read from disk: its path relative to the flows folder (nl/energie.json). */
export type SourceFile = { path: string; data: unknown };
export type LocaleSources = {
  locale: string;
  shared?: SourceFile;
  /** _copy.json: the form's interface copy (schema flowCopyFile). */
  copy?: SourceFile;
  flows: SourceFile[];
};
export type FlowIssue = { file: string; message: string };

/** The locale the others are compared with (brief §7.1: codes identical across locales). */
export const REFERENCE_LOCALE = 'nl';

function schemaIssues(file: string, error: z.ZodError): FlowIssue[] {
  return error.issues.map((issue) => ({
    file,
    message: `${issue.path.length > 0 ? issue.path.join('.') : '(file)'}: ${issue.message}`,
  }));
}

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

/** The code lists of a field: options, or days and slots. */
function codeLists(field: Field): Record<string, string[]> {
  switch (field.type) {
    case 'single_choice':
    case 'select':
      return { options: field.options.map((option) => option.code) };
    case 'day_slot':
      return {
        days: field.days.map((option) => option.code),
        slots: field.slots.map((option) => option.code),
      };
    default:
      return {};
  }
}

/** Keys set by options' `sets`: key → the fields that set it and every value it can get. */
function impliedKeys(flow: Flow): Map<string, { setters: string[]; values: Set<string> }> {
  const keys = new Map<string, { setters: string[]; values: Set<string> }>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) {
        for (const [key, value] of Object.entries(option.sets ?? {})) {
          const entry = keys.get(key) ?? { setters: [], values: new Set<string>() };
          if (!entry.setters.includes(field.id)) entry.setters.push(field.id);
          entry.values.add(value);
          keys.set(key, entry);
        }
      }
    }
  }
  return keys;
}

const PAYLOAD_TYPES: Partial<Record<NonNullable<Field['payload']>, readonly Field['type'][]>> = {
  contact: ['text', 'phone', 'email'],
  consent: ['consent', 'checkbox'],
  call_preference: ['day_slot'],
  derived: ['postcode'],
};

/**
 * A condition and what it may read from its own step (`readable`: field ids). A step's
 * visibleIf reads none of them (they're shown only if it holds), a field's visibleIf only the
 * fields above it (never itself: it would stay hidden until answered), and a next entry all.
 */
type Condition = {
  step: Step;
  where: string;
  rule: Rule;
  readable: ReadonlySet<string>;
  field?: Field;
};

function conditions(flow: Flow): Condition[] {
  return flow.steps.flatMap((step) => {
    const ids = step.fields.map((field) => field.id);
    return [
      ...(step.visibleIf !== undefined
        ? [
            {
              step,
              where: `step "${step.id}" visibleIf`,
              rule: step.visibleIf,
              readable: new Set<string>(),
            },
          ]
        : []),
      ...step.fields.flatMap((field, index) =>
        field.visibleIf !== undefined
          ? [
              {
                step,
                where: `field "${field.id}" visibleIf`,
                rule: field.visibleIf,
                readable: new Set(ids.slice(0, index)),
                field,
              },
            ]
          : [],
      ),
      ...step.next.flatMap((entry, index) =>
        entry.if !== undefined
          ? [
              {
                step,
                where: `step "${step.id}" next[${index}]`,
                rule: entry.if,
                readable: new Set(ids),
              },
            ]
          : [],
      ),
    ];
  });
}

/** Calls `visit` for every operation in a rule. */
function visitOperations(rule: JsonValue, visit: (op: string, args: JsonValue[]) => void): void {
  if (Array.isArray(rule)) {
    rule.forEach((item) => visitOperations(item, visit));
    return;
  }
  if (typeof rule !== 'object' || rule === null) return;
  for (const [op, raw] of Object.entries(rule)) {
    const args = Array.isArray(raw) ? raw : [raw];
    visit(op, args);
    args.forEach((arg) => visitOperations(arg, visit));
  }
}

/** The path of a `{ "var": "x" }` node, or null. */
function varPath(node: JsonValue | undefined): string | null {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return null;
  const keys = Object.keys(node);
  if (keys.length !== 1 || keys[0] !== 'var') return null;
  // The schema only lets literal string paths through.
  const raw = node.var;
  return String(Array.isArray(raw) ? raw[0] : raw);
}

/** The step ids from which `target` can be reached (the target itself excluded). */
function ancestors(flow: Flow, target: string): Set<string> {
  const found = new Set<string>();
  const queue = [target];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const step of flow.steps) {
      if (!found.has(step.id) && step.next.some((entry) => entry.goto === current)) {
        found.add(step.id);
        queue.push(step.id);
      }
    }
  }
  found.delete(target);
  return found;
}

/** Every check on one resolved flow; `file` tells shared references from own steps. */
export function checkFlow(flow: Flow, file: FlowFile): string[] {
  const problems: string[] = [];
  const stepIds = flow.steps.map((step) => step.id);
  const stepSet = new Set(stepIds);
  const byId = new Map(flow.steps.map((step) => [step.id, step]));

  for (const id of duplicates(stepIds)) problems.push(`step id "${id}" is used twice`);

  // Field ids: answers are one flat object, so a field id is unique across the flow.
  const fieldStep = new Map<string, string>();
  const fieldById = new Map<string, Field>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      const other = fieldStep.get(field.id);
      if (other !== undefined) {
        problems.push(`field id "${field.id}" is used twice (steps "${other}" and "${step.id}")`);
      } else {
        fieldStep.set(field.id, step.id);
        fieldById.set(field.id, field);
      }
      for (const [list, codes] of Object.entries(codeLists(field))) {
        for (const code of duplicates(codes)) {
          problems.push(`field "${field.id}": ${list} code "${code}" is used twice`);
        }
      }
      const allowed = field.payload && PAYLOAD_TYPES[field.payload];
      if (allowed && !allowed.includes(field.type)) {
        problems.push(
          `field "${field.id}": payload "${field.payload}" is for ${allowed.join('/')} fields`,
        );
      }
      // A call moment is an object ({ day, slot }): it only fits call_preference (or none).
      if (field.type === 'day_slot' && !['call_preference', 'none'].includes(field.payload ?? '')) {
        problems.push(`field "${field.id}": a day_slot needs payload "call_preference"`);
      }
    }
  }
  const callFields = flow.steps.flatMap((step) =>
    step.fields.filter((field) => field.payload === 'call_preference'),
  );
  if (callFields.length > 1) problems.push('more than one field has payload "call_preference"');

  const implied = impliedKeys(flow);
  for (const key of implied.keys()) {
    if (fieldById.has(key)) {
      problems.push(`"${key}" is both a field id and set by an option's "sets"`);
    }
  }

  // Targets.
  let targetsOk = stepSet.has(flow.firstStep);
  if (!targetsOk) problems.push(`firstStep "${flow.firstStep}" is not a step of this flow`);
  for (const step of flow.steps) {
    for (const entry of step.next) {
      if (!stepSet.has(entry.goto)) {
        problems.push(`step "${step.id}": goto "${entry.goto}" is not a step of this flow`);
        targetsOk = false;
      }
    }
  }

  // The shared contact step ends every flow.
  const usesContact = file.steps.some((entry) => 'use' in entry && entry.use === CONTACT_STEP_ID);
  if (!usesContact) {
    problems.push(
      `the flow must end with the shared "${CONTACT_STEP_ID}" step ({ "use": "${CONTACT_STEP_ID}" })`,
    );
  }
  const contact = byId.get(CONTACT_STEP_ID);
  if (contact) {
    if (contact.visibleIf !== undefined) {
      problems.push(`the "${CONTACT_STEP_ID}" step is always shown: it can't have a visibleIf`);
    }
    // The engine also skips a step none of whose fields is shown, and a lead needs every
    // required contact field (name, phone, call moment, consent) answered.
    for (const field of contact.fields) {
      if (field.required === true && field.visibleIf !== undefined) {
        problems.push(
          `the "${CONTACT_STEP_ID}" step is always shown: its required field "${field.id}" can't have a visibleIf`,
        );
      }
    }
    if (contact.fields.every((field) => field.visibleIf !== undefined)) {
      problems.push(
        `the "${CONTACT_STEP_ID}" step needs a field without a visibleIf, or it can be skipped`,
      );
    }
    if (contact.next.length > 0) {
      problems.push(`the "${CONTACT_STEP_ID}" step is the last step: it can't have a next`);
    }
  }

  // Dead ends: the contact step is the only way out, and every step has a fallback.
  for (const step of flow.steps) {
    if (step.next.length === 0 && step.id !== CONTACT_STEP_ID) {
      problems.push(
        `step "${step.id}" is a dead end: it has no next, so its path never reaches "${CONTACT_STEP_ID}"`,
      );
    }
    const fallback = step.next.findIndex((entry) => entry.if === undefined);
    if (step.next.length > 0 && fallback === -1) {
      problems.push(
        `step "${step.id}" can be a dead end: its last next entry needs no "if" (a fallback)`,
      );
    }
    if (fallback !== -1 && fallback < step.next.length - 1) {
      problems.push(`step "${step.id}": next entries after the one without "if" are never used`);
    }
  }

  // Graph checks need every goto to exist.
  if (targetsOk) {
    const state = new Map<string, 'open' | 'done'>();
    const reported = new Set<string>();
    const visit = (id: string, trail: string[]): void => {
      if (state.get(id) === 'done') return;
      if (state.get(id) === 'open') {
        const loop = [...trail.slice(trail.indexOf(id)), id];
        const key = [...new Set(loop)].sort().join(',');
        if (!reported.has(key)) {
          reported.add(key);
          problems.push(`loop: ${loop.join(' → ')}`);
        }
        return;
      }
      state.set(id, 'open');
      for (const entry of byId.get(id)!.next) visit(entry.goto, [...trail, id]);
      state.set(id, 'done');
    };
    visit(flow.firstStep, []);
    for (const id of stepIds) {
      if (!state.has(id)) problems.push(`step "${id}" can't be reached from firstStep`);
    }
  }

  // Conditions: known vars, asked before they're read, literals that are real codes.
  const derivedKeys: readonly string[] = DERIVED_KEYS;
  const codesOf = (path: string): readonly string[] | null => {
    if (path === 'derived.region') return REGIONS;
    const [head = '', sub] = path.split('.');
    const field = fieldById.get(head);
    if (field?.type === 'day_slot' && (sub === 'day' || sub === 'slot')) {
      return (sub === 'day' ? field.days : field.slots).map((option) => option.code);
    }
    if (sub !== undefined) return null;
    if (field?.type === 'yes_no') return ['yes', 'no'];
    if (field?.type === 'single_choice' || field?.type === 'select') {
      return field.options.map((option) => option.code);
    }
    const values = implied.get(head)?.values;
    return values ? [...values] : null;
  };
  const known = (path: string): boolean => {
    const [head = '', sub, ...rest] = path.split('.');
    if (rest.length > 0) return false;
    if (head === 'derived') return sub !== undefined && derivedKeys.includes(sub);
    if (sub !== undefined) {
      return fieldById.get(head)?.type === 'day_slot' && (sub === 'day' || sub === 'slot');
    }
    return fieldById.has(head) || implied.has(head);
  };

  for (const { step, where, rule, readable, field } of conditions(flow)) {
    const before = targetsOk ? ancestors(flow, step.id) : null;
    const seen = new Set<string>();
    visitOperations(rule, (op, args) => {
      if (op === 'var') {
        const path = varPath({ var: args })!;
        if (seen.has(path)) return;
        seen.add(path);
        if (!known(path)) {
          problems.push(
            `${where}: unknown var "${path}" (not a field, an implied answer or derived.${DERIVED_KEYS.join('|derived.')})`,
          );
          return;
        }
        const head = path.split('.')[0]!;
        if (head === 'derived' || before === null) return;
        // The fields that give it a value: the field itself, or those whose options set it.
        const askedBy = fieldStep.has(head) ? [head] : implied.get(head)!.setters;
        const inTime = askedBy.some((id) => before.has(fieldStep.get(id)!) || readable.has(id));
        if (inTime) return;
        if (field !== undefined && askedBy.includes(field.id)) {
          problems.push(`${where}: reads its own value ("${path}"), so it is never shown`);
          return;
        }
        const askedOn = [...new Set(askedBy.map((id) => fieldStep.get(id)!))];
        problems.push(
          `${where}: reads "${path}" before it is asked (step "${askedOn.join('", "')}")`,
        );
        return;
      }
      const comparisons = ['==', '!=', '===', '!=='];
      let path: string | null = null;
      let literals: JsonValue[] = [];
      if (comparisons.includes(op) && args.length === 2) {
        const [a, b] = args;
        path = varPath(a) ?? varPath(b);
        literals = varPath(a) !== null ? [b!] : [a!];
      } else if (op === 'in' && Array.isArray(args[1])) {
        path = varPath(args[0]);
        literals = args[1];
      }
      if (path === 'derived.preselected' || path === 'derived.energy_preselected') {
        for (const literal of literals) {
          if (typeof literal !== 'string' && typeof literal !== 'number') continue;
          problems.push(
            `${where}: compares "${path}" with ${JSON.stringify(literal)}, which is not true or false`,
          );
        }
        return;
      }
      const codes = path === null ? null : codesOf(path);
      if (!codes) return;
      for (const literal of literals) {
        if (literal === null || typeof literal === 'object') continue;
        if (typeof literal !== 'string' || !codes.includes(literal)) {
          problems.push(
            `${where}: compares "${path}" with ${JSON.stringify(literal)}, which is not one of its codes (${codes.join(', ')})`,
          );
        }
      }
    });
  }
  return problems;
}

/** The config switches of a locale, in a stable order (they must match across locales). */
function switchesSignature(shared: SharedStepsFile | undefined): string {
  const switches = shared?.switches ?? {};
  return Object.keys(switches)
    .sort()
    .map((name) => `${name}=${switches[name]}`)
    .join(', ');
}

/**
 * What must be identical across locales: per flow, its settings (incl. the switches), every
 * step's fields and branching, and every field's codes, payload target and required flag. Only
 * the copy differs, so the lead payload, the rules and the paths are the same in every locale.
 */
function codeSignature(flow: Flow, switches: string): Map<string, string> {
  const signature = new Map<string, string>([
    ['product', flow.product],
    ['version', String(flow.version)],
    ['firstStep', flow.firstStep],
    ['switches', switches],
  ]);
  for (const step of flow.steps) {
    signature.set(`step "${step.id}" fields`, step.fields.map((field) => field.id).join(', '));
    if (step.visibleIf !== undefined) {
      signature.set(`step "${step.id}" visibleIf`, JSON.stringify(step.visibleIf));
    }
    signature.set(
      `step "${step.id}" next`,
      step.next
        .map(
          (entry) =>
            `${entry.if === undefined ? '(always)' : JSON.stringify(entry.if)} → ${entry.goto}`,
        )
        .join(', '),
    );
    for (const field of step.fields) {
      signature.set(`field "${field.id}" type`, field.type);
      signature.set(`field "${field.id}" payload`, field.payload ?? 'answers');
      signature.set(`field "${field.id}" required`, String(field.required ?? false));
      if (field.visibleIf !== undefined) {
        signature.set(`field "${field.id}" visibleIf`, JSON.stringify(field.visibleIf));
      }
      const lists = codeLists(field);
      if (field.type === 'yes_no') lists.options = ['yes', 'no'];
      for (const [list, codes] of Object.entries(lists)) {
        signature.set(`field "${field.id}" ${list}`, codes.join(', '));
      }
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) {
        if (option.product === undefined && option.sets === undefined && !option.requires) continue;
        signature.set(
          `field "${field.id}" option "${option.code}"`,
          `product ${option.product ?? '-'}, sets ${JSON.stringify(option.sets ?? {})}` +
            (option.requires ? `, requires ${option.requires}` : ''),
        );
      }
    }
  }
  return signature;
}

/** A flow resolved with every switch on (what the checks see), and its locale's switches. */
type Resolved = { path: string; flow: Flow; switches: string };

/** A flow's name: its file name without the folder and ".json". */
function flowName(path: string): string {
  return path
    .split('/')
    .pop()!
    .replace(/\.json$/, '');
}

function checkLocales(
  locales: LocaleSources[],
  byLocale: Map<string, Map<string, Resolved>>,
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const reference = locales.find(({ locale }) => locale === REFERENCE_LOCALE);
  if (!reference) return issues;
  const referenceFlows = byLocale.get(REFERENCE_LOCALE)!;
  for (const { locale, flows } of locales) {
    if (locale === REFERENCE_LOCALE) continue;
    const names = new Set(flows.map(({ path }) => flowName(path)));
    const referenceNames = new Set(reference.flows.map(({ path }) => flowName(path)));
    for (const name of referenceNames) {
      if (!names.has(name)) {
        issues.push({
          file: `${locale}/${name}.json`,
          message: `missing: ${REFERENCE_LOCALE}/${name}.json has no ${locale} version`,
        });
      }
    }
    for (const name of names) {
      if (!referenceNames.has(name)) {
        issues.push({
          file: `${locale}/${name}.json`,
          message: `no ${REFERENCE_LOCALE} version of this flow`,
        });
      }
    }
    // Only flows that are valid in both locales can be compared.
    for (const [name, { path, flow, switches }] of byLocale.get(locale)!) {
      const ref = referenceFlows.get(name);
      if (!ref) continue;
      const expected = codeSignature(ref.flow, ref.switches);
      const actual = codeSignature(flow, switches);
      for (const key of new Set([...expected.keys(), ...actual.keys()])) {
        const want = expected.get(key);
        const got = actual.get(key);
        if (want === got) continue;
        issues.push({
          file: path,
          message: `${key} must match ${ref.path}: "${want ?? '(none)'}" there, "${got ?? '(none)'}" here`,
        });
      }
    }
  }
  return issues;
}

/** Choice fields the switches, as set, leave without any option (a visitor couldn't answer). */
function switchIssues(flow: Flow): string[] {
  return flow.steps.flatMap((step) =>
    step.fields.flatMap((field) =>
      field.type === 'single_choice' && field.options.length === 0
        ? [`field "${field.id}": the switches in _shared.json leave it without options`]
        : [],
    ),
  );
}

/** The copy file's schema, and messages the locale's flows need beyond the required ones. */
function copyIssues(copyFile: SourceFile, flows: Flow[]): FlowIssue[] {
  const parsed = flowCopyFile.safeParse(copyFile.data);
  if (!parsed.success) return schemaIssues(copyFile.path, parsed.error);
  const soft = flows.some((flow) =>
    flow.steps.some((step) =>
      step.fields.some(
        (field) =>
          field.type === 'number' && (field.softMin !== undefined || field.softMax !== undefined),
      ),
    ),
  );
  if (soft && !parsed.data.warnings?.outside_typical) {
    return [
      {
        file: copyFile.path,
        message: 'warnings.outside_typical is needed: a number field has softMin/softMax',
      },
    ];
  }
  return [];
}

/** Validates every locale's shared steps, copy and flows; an empty list means all is well. */
export function validateFlowSources(locales: LocaleSources[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const byLocale = new Map<string, Map<string, Resolved>>();

  for (const { locale, shared: sharedFile, copy: copyFile, flows } of locales) {
    let shared: SharedStepsFile | undefined;
    if (sharedFile) {
      const parsed = sharedStepsFile.safeParse(sharedFile.data);
      if (parsed.success) {
        shared = parsed.data;
        for (const id of duplicates(shared.steps.map((step) => step.id))) {
          issues.push({ file: sharedFile.path, message: `step id "${id}" is used twice` });
        }
      } else {
        issues.push(...schemaIssues(sharedFile.path, parsed.error));
      }
    }
    const resolved = new Map<string, Resolved>();
    byLocale.set(locale, resolved);
    const products = new Set<string>();
    const choices: ProductChoice[] = [];

    for (const { path, data } of flows) {
      // A flow with schema errors still has its product: those errors are the useful ones.
      const declared = flowFile.shape.product.safeParse(
        (data as { product?: unknown } | null)?.product,
      );
      if (declared.success) products.add(declared.data);
      const parsed = flowFile.safeParse(data);
      if (!parsed.success) {
        issues.push(...schemaIssues(path, parsed.error));
        continue;
      }
      const file = parsed.data;
      const name = flowName(path);
      if (file.id !== name) {
        issues.push({
          file: path,
          message: `id "${file.id}" must equal the file name ("${name}")`,
        });
      }
      if (file.locale !== undefined && file.locale !== locale) {
        issues.push({
          file: path,
          message: `locale "${file.locale}" must equal the folder ("${locale}")`,
        });
      }
      // With a broken _shared.json, its schema errors are the useful ones.
      if (sharedFile && !shared) continue;
      // Checked with every switch on: switches only take options away, so every path of the
      // flow as configured is a path of this one. The configured one must still be answerable.
      let flow: Flow;
      let configured: Flow;
      try {
        flow = resolveFlow(file, shared, { allSwitchesOn: true });
        configured = resolveFlow(file, shared);
      } catch (error) {
        issues.push({ file: path, message: (error as Error).message });
        continue;
      }
      const problems = [...checkFlow(flow, file), ...switchIssues(configured)];
      issues.push(...problems.map((message) => ({ file: path, message })));
      resolved.set(name, { path, flow, switches: switchesSignature(shared) });
      // resolveFlow keeps the order: a step from a reference lives in _shared.json.
      flow.steps.forEach((step, index) => {
        const where = 'use' in file.steps[index]! ? sharedFile!.path : path;
        choices.push(...productChoices(step, where));
      });
    }
    if (copyFile) {
      issues.push(
        ...copyIssues(
          copyFile,
          [...resolved.values()].map(({ flow }) => flow),
        ),
      );
    }
    issues.push(...missingProductFlows(locale, choices, products));
  }
  return [...issues, ...checkLocales(locales, byLocale)];
}

/** An option that continues in another product's flow, and the file that defines it. */
type ProductChoice = { file: string; field: string; code: string; product: string };

function productChoices(step: Step, file: string): ProductChoice[] {
  return step.fields.flatMap((field) =>
    field.type !== 'single_choice'
      ? []
      : field.options.flatMap((option) =>
          option.product === undefined
            ? []
            : [{ file, field: field.id, code: option.code, product: option.product }],
        ),
  );
}

/** Options whose product has no flow in the locale, each reported once (shared steps repeat). */
function missingProductFlows(
  locale: string,
  choices: ProductChoice[],
  products: ReadonlySet<string>,
): FlowIssue[] {
  const reported = new Set<string>();
  const issues: FlowIssue[] = [];
  for (const { file, field, code, product } of choices) {
    const key = JSON.stringify([file, field, code]);
    if (products.has(product) || reported.has(key)) continue;
    reported.add(key);
    issues.push({
      file,
      message: `field "${field}": option "${code}" continues in the "${product}" flow, but ${locale} has no flow with product "${product}"`,
    });
  }
  return issues;
}
