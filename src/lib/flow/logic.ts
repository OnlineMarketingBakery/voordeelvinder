// A small, typed subset of JSONLogic (https://jsonlogic.com) for flow conditions: `visibleIf`
// on steps and fields, and `if` in a step's `next` (brief §7.1, ADR 0006). Deterministic and
// framework-free (the form island runs it in the browser): no eval, no dependencies.
//
// A rule is a JSON value. An object with exactly one key is an operation (`{ "op": args }`,
// where a non-array argument means a single argument); arrays evaluate element by element;
// everything else is a literal. The semantics follow json-logic-js for the supported operators.

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type Rule = JsonValue;

/** Every supported operator. Anything else is rejected by the flow schema and at runtime. */
export const OPERATORS = [
  'var',
  '==',
  '!=',
  '===',
  '!==',
  '!',
  '!!',
  'and',
  'or',
  'in',
  '<',
  '<=',
  '>',
  '>=',
  'if',
] as const;
export type Operator = (typeof OPERATORS)[number];

/** Allowed argument counts per operator: [min, max]. */
const ARITY: Record<Operator, readonly [number, number]> = {
  var: [1, 2],
  '==': [2, 2],
  '!=': [2, 2],
  '===': [2, 2],
  '!==': [2, 2],
  '!': [1, 1],
  '!!': [1, 1],
  and: [1, Infinity],
  or: [1, Infinity],
  in: [2, 2],
  // Three arguments: "between", as in json-logic ({"<": [1, x, 10]}).
  '<': [2, 3],
  '<=': [2, 3],
  '>': [2, 2],
  '>=': [2, 2],
  if: [2, Infinity],
};

const operatorSet: ReadonlySet<string> = new Set(OPERATORS);

export function isOperator(name: string): name is Operator {
  return operatorSet.has(name);
}

/** Thrown for a rule the evaluator can't run; validate:flows keeps these out of content. */
export class LogicError extends Error {
  override name = 'LogicError';
}

/** JSONLogic truthiness: like JavaScript, except that an empty array is false. */
export function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

type Operation = { op: string; args: JsonValue[] };

function isObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The operation of an object rule, or a structural problem with it. */
function operation(rule: { [key: string]: JsonValue }): Operation | string {
  const keys = Object.keys(rule);
  if (keys.length !== 1) {
    return `a rule needs exactly one operator, found ${keys.length === 0 ? 'none' : keys.join(', ')}`;
  }
  const op = keys[0]!;
  const raw = rule[op]!;
  return { op, args: Array.isArray(raw) ? raw : [raw] };
}

function arityProblem(op: Operator, count: number): string | null {
  const [min, max] = ARITY[op];
  if (count >= min && count <= max) return null;
  const expected = max === Infinity ? `at least ${min}` : min === max ? `${min}` : `${min}–${max}`;
  return `"${op}" takes ${expected} argument(s), got ${count}`;
}

/** Reads a dotted path ("derived.region", "call_moment.day"); "" is the data itself. */
export function readPath(data: unknown, path: string): unknown {
  if (path === '') return data;
  let current: unknown = data;
  for (const segment of path.split('.')) {
    // Own properties only: "constructor" or "__proto__" never resolve to anything.
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function isPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

/** JavaScript `==` between primitives; arrays and objects are only equal to themselves. */
function looseEquals(a: unknown, b: unknown): boolean {
  // JSONLogic "==" is JavaScript's loose equality.
  if (isPrimitive(a) && isPrimitive(b)) return a == b;
  return a === b;
}

function numbers(values: unknown[]): values is number[] {
  return values.every((value) => typeof value === 'number' && Number.isFinite(value));
}

/** Evaluates a rule against `data` (answers plus `derived`). Throws LogicError on a bad rule. */
export function evaluate(rule: Rule, data: unknown): unknown {
  if (Array.isArray(rule)) return rule.map((item) => evaluate(item, data));
  if (!isObject(rule)) return rule;

  const parsed = operation(rule);
  if (typeof parsed === 'string') throw new LogicError(parsed);
  const { op, args } = parsed;
  if (!isOperator(op)) throw new LogicError(`unknown operator "${op}"`);
  const problem = arityProblem(op, args.length);
  if (problem) throw new LogicError(problem);

  const value = (index: number): unknown => evaluate(args[index]!, data);

  switch (op) {
    case 'var': {
      const path = args[0];
      if (typeof path !== 'string') throw new LogicError('"var" needs a literal path');
      const found = readPath(data, path);
      if (found !== undefined && found !== null) return found;
      return args.length > 1 ? value(1) : null;
    }
    case '==':
      return looseEquals(value(0), value(1));
    case '!=':
      return !looseEquals(value(0), value(1));
    case '===':
      return value(0) === value(1);
    case '!==':
      return value(0) !== value(1);
    case '!':
      return !truthy(value(0));
    case '!!':
      return truthy(value(0));
    case 'and': {
      let current: unknown;
      for (const arg of args) {
        current = evaluate(arg, data);
        if (!truthy(current)) return current;
      }
      return current;
    }
    case 'or': {
      let current: unknown;
      for (const arg of args) {
        current = evaluate(arg, data);
        if (truthy(current)) return current;
      }
      return current;
    }
    case 'in': {
      const needle = value(0);
      const haystack = value(1);
      if (Array.isArray(haystack)) return haystack.includes(needle);
      if (typeof haystack === 'string')
        return typeof needle === 'string' && haystack.includes(needle);
      return false;
    }
    case '<':
    case '<=': {
      const values = args.map((_, index) => value(index));
      if (!numbers(values)) return false;
      const ok = (a: number, b: number) => (op === '<' ? a < b : a <= b);
      return values.every((current, index) => index === 0 || ok(values[index - 1]!, current));
    }
    case '>':
    case '>=': {
      const values = [value(0), value(1)];
      if (!numbers(values)) return false;
      return op === '>' ? values[0]! > values[1]! : values[0]! >= values[1]!;
    }
    case 'if': {
      for (let index = 0; index + 1 < args.length; index += 2) {
        if (truthy(value(index))) return value(index + 1);
      }
      return args.length % 2 === 1 ? value(args.length - 1) : null;
    }
  }
}

/** A `var` in a rule: its path, and whether it has a default (then it's never "missing"). */
export type VarRef = { path: string; hasDefault: boolean };

export type LogicInfo = {
  /** Every `var`, in order of appearance (duplicates included). */
  vars: VarRef[];
  /** Every operator used, unknown ones included, in order of first appearance. */
  operators: string[];
  /** Structural problems: not exactly one key, a non-literal var path, a wrong argument count. */
  issues: string[];
};

/** Walks a rule without evaluating it: for validation (validate:flows) and progress estimates. */
export function inspectLogic(rule: Rule): LogicInfo {
  const info: LogicInfo = { vars: [], operators: [], issues: [] };
  const walk = (node: JsonValue): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isObject(node)) return;
    const parsed = operation(node);
    if (typeof parsed === 'string') {
      info.issues.push(parsed);
      return;
    }
    const { op, args } = parsed;
    if (!info.operators.includes(op)) info.operators.push(op);
    if (isOperator(op)) {
      const problem = arityProblem(op, args.length);
      if (problem) info.issues.push(problem);
    }
    if (op === 'var') {
      const [path, ...rest] = args;
      if (typeof path === 'string') info.vars.push({ path, hasDefault: rest.length > 0 });
      else info.issues.push('"var" needs a literal path');
      rest.forEach(walk);
      return;
    }
    args.forEach(walk);
  };
  walk(rule);
  return info;
}

/** The var paths (without a default) that have no value in `data`. */
export function unresolvedVars(rule: Rule, data: unknown): string[] {
  return inspectLogic(rule)
    .vars.filter(({ path, hasDefault }) => {
      if (hasDefault) return false;
      const found = readPath(data, path);
      return found === undefined || found === null;
    })
    .map(({ path }) => path);
}
