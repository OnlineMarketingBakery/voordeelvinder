import { describe, expect, it } from 'vitest';

import {
  evaluate,
  inspectLogic,
  isOperator,
  LogicError,
  OPERATORS,
  readPath,
  truthy,
  unresolvedVars,
  type Rule,
} from '../../src/lib/flow/logic';

const data = {
  energy_type: 'both',
  kwh: 3500,
  zero: 0,
  is_business: false,
  call_moment: { day: 'wed', slot: '13-14' },
  list: ['a', 'b'],
  derived: { region: 'flanders', preselected: true },
};

const run = (rule: Rule) => evaluate(rule, data);

describe('JSONLogic subset: evaluate', () => {
  it('returns literals, and evaluates arrays element by element', () => {
    expect(run('x')).toBe('x');
    expect(run(3)).toBe(3);
    expect(run(null)).toBe(null);
    expect(run([1, { var: 'kwh' }])).toEqual([1, 3500]);
  });

  it('reads vars by dotted path, with defaults', () => {
    expect(run({ var: 'energy_type' })).toBe('both');
    expect(run({ var: ['energy_type'] })).toBe('both');
    expect(run({ var: 'derived.region' })).toBe('flanders');
    expect(run({ var: 'call_moment.day' })).toBe('wed');
    expect(run({ var: 'list.1' })).toBe('b');
    expect(run({ var: 'missing' })).toBe(null);
    expect(run({ var: 'missing.deeper' })).toBe(null);
    expect(run({ var: ['missing', 'fallback'] })).toBe('fallback');
    expect(run({ var: ['zero', 5] })).toBe(0);
    expect(run({ var: '' })).toBe(data);
  });

  it('never resolves inherited properties', () => {
    expect(run({ var: 'constructor' })).toBe(null);
    expect(run({ var: 'energy_type.length' })).toBe(null);
    expect(readPath(data, '__proto__')).toBeUndefined();
  });

  it('compares loosely and strictly', () => {
    expect(run({ '==': [{ var: 'energy_type' }, 'both'] })).toBe(true);
    expect(run({ '==': [{ var: 'kwh' }, '3500'] })).toBe(true);
    expect(run({ '===': [{ var: 'kwh' }, '3500'] })).toBe(false);
    expect(run({ '===': [{ var: 'kwh' }, 3500] })).toBe(true);
    expect(run({ '!=': [{ var: 'energy_type' }, 'gas'] })).toBe(true);
    expect(run({ '!==': [{ var: 'kwh' }, 3500] })).toBe(false);
    // Arrays are only equal to themselves, never loosely to a string.
    expect(run({ '==': [['a'], 'a'] })).toBe(false);
    expect(run({ '==': [{ var: 'missing' }, null] })).toBe(true);
  });

  it('negates with JSONLogic truthiness', () => {
    expect(run({ '!': [{ var: 'is_business' }] })).toBe(true);
    expect(run({ '!': { var: 'derived.preselected' } })).toBe(false);
    expect(run({ '!!': [{ var: 'zero' }] })).toBe(false);
    expect(run({ '!!': [[]] })).toBe(false);
    expect(truthy([])).toBe(false);
    expect(truthy(['x'])).toBe(true);
    expect(truthy('')).toBe(false);
  });

  it('short-circuits and/or and returns the deciding value', () => {
    expect(run({ and: [true, { var: 'kwh' }] })).toBe(3500);
    expect(run({ and: [{ var: 'zero' }, { var: 'kwh' }] })).toBe(0);
    expect(run({ or: [{ var: 'zero' }, { var: 'energy_type' }] })).toBe('both');
    expect(run({ or: [false, { var: 'zero' }] })).toBe(0);
  });

  it('tests membership in arrays and strings', () => {
    expect(run({ in: [{ var: 'energy_type' }, ['electricity', 'both']] })).toBe(true);
    expect(run({ in: [{ var: 'energy_type' }, ['gas']] })).toBe(false);
    expect(run({ in: ['ot', 'both'] })).toBe(true);
    expect(run({ in: [{ var: 'kwh' }, 'both'] })).toBe(false);
    expect(run({ in: ['a', { var: 'kwh' }] })).toBe(false);
  });

  it('compares numbers only, with a "between" form', () => {
    expect(run({ '<': [{ var: 'kwh' }, 5000] })).toBe(true);
    expect(run({ '<': [100, { var: 'kwh' }, 5000] })).toBe(true);
    expect(run({ '<': [100, { var: 'kwh' }, 3500] })).toBe(false);
    expect(run({ '<=': [100, { var: 'kwh' }, 3500] })).toBe(true);
    expect(run({ '>': [{ var: 'kwh' }, 3500] })).toBe(false);
    expect(run({ '>=': [{ var: 'kwh' }, 3500] })).toBe(true);
    expect(run({ '<': ['1', 2] })).toBe(false);
    expect(run({ '>': [{ var: 'missing' }, 0] })).toBe(false);
  });

  it('picks the first branch of if that holds, else the else-branch', () => {
    expect(run({ if: [{ var: 'is_business' }, 'b', 'p'] })).toBe('p');
    expect(run({ if: [{ var: 'kwh' }, 'b', 'p'] })).toBe('b');
    expect(run({ if: [false, 1, { var: 'zero' }, 2, 3] })).toBe(3);
    expect(run({ if: [false, 1] })).toBe(null);
  });

  it('throws on rules it cannot run', () => {
    expect(() => run({ xor: [1, 2] })).toThrow(LogicError);
    expect(() => run({ '==': [1] })).toThrow('"==" takes 2 argument(s), got 1');
    expect(() => run({ and: [] })).toThrow('at least 1');
    expect(() => run({ '<': [1, 2, 3, 4] })).toThrow('2–3');
    expect(() => run({ var: 'a', '==': [1, 1] })).toThrow('exactly one operator, found var, ==');
    expect(() => run({})).toThrow('found none');
    expect(() => run({ var: [{ var: 'energy_type' }] })).toThrow('literal path');
  });
});

describe('JSONLogic subset: inspectLogic', () => {
  it('lists every var and operator, known or not', () => {
    const info = inspectLogic({
      and: [
        { in: [{ var: 'energy_type' }, ['gas', 'both']] },
        { xor: [{ var: ['is_business', false] }] },
        [{ var: 'derived.region' }],
      ],
    });
    expect(info.vars).toEqual([
      { path: 'energy_type', hasDefault: false },
      { path: 'is_business', hasDefault: true },
      { path: 'derived.region', hasDefault: false },
    ]);
    expect(info.operators).toEqual(['and', 'in', 'var', 'xor']);
    expect(info.issues).toEqual([]);
  });

  it('reports structural problems', () => {
    expect(inspectLogic({ a: 1, b: 2 }).issues).toEqual([
      'a rule needs exactly one operator, found a, b',
    ]);
    expect(inspectLogic({ '!': [] }).issues).toEqual(['"!" takes 1 argument(s), got 0']);
    expect(inspectLogic({ var: [1] }).issues).toEqual(['"var" needs a literal path']);
    expect(inspectLogic('literal')).toEqual({ vars: [], operators: [], issues: [] });
  });

  it('finds vars without a value', () => {
    const rule: Rule = {
      and: [{ var: 'energy_type' }, { var: 'missing' }, { var: ['absent', 1] }, { var: 'nil' }],
    };
    expect(unresolvedVars(rule, { ...data, nil: null })).toEqual(['missing', 'nil']);
  });

  it('knows its operators', () => {
    expect(OPERATORS).toContain('in');
    expect(isOperator('if')).toBe(true);
    expect(isOperator('cat')).toBe(false);
  });
});
