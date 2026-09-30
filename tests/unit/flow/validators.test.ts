import { describe, expect, it } from 'vitest';

import {
  ERROR_CODES,
  FIELD_TYPES,
  WARNING_CODES,
  validateField,
  validators,
  type FieldConfig,
} from '../../../src/lib/flow/validators';

describe('validators', () => {
  it('has exactly one validator per field type', () => {
    expect(Object.keys(validators).sort()).toEqual([...FIELD_TYPES].sort());
  });

  it.each<[FieldConfig, unknown, unknown]>([
    [{ id: 'postcode', type: 'postcode' }, '9000', '9000'],
    [
      { id: 'phone', type: 'phone' },
      '0475 12 34 56',
      { e164: '+32475123456', display: '+32 475 12 34 56', kind: 'mobile' },
    ],
    [{ id: 'email', type: 'email' }, ' Jan@Telenet.be', 'jan@telenet.be'],
    [{ id: 'kwh', type: 'number' }, '3.500', 3500],
    [{ id: 'first_name', type: 'text' }, ' Jan ', 'Jan'],
    [{ id: 'supplier', type: 'select', options: [{ code: 'luminus' }] }, 'luminus', 'luminus'],
    [{ id: 'energy_type', type: 'single_choice', options: [{ code: 'gas' }] }, 'gas', 'gas'],
    [{ id: 'has_solar', type: 'yes_no' }, 'no', 'no'],
    [{ id: 'is_business', type: 'checkbox' }, true, true],
    [{ id: 'terms', type: 'consent', required: true }, true, true],
    [
      { id: 'call_preference', type: 'day_slot' },
      { day: 'wed', slot: '13-14' },
      { day: 'wed', slot: '13-14' },
    ],
  ])('validateField dispatches case %#', (field, input, value) => {
    expect(validateField(input, field)).toEqual({ ok: true, value });
    expect(validators[field.type](input, field)).toEqual({ ok: true, value });
  });

  it('only returns documented codes', () => {
    const results = [
      validateField('', { id: 'a', type: 'text', required: true }),
      validateField('x', { id: 'b', type: 'postcode' }),
      validateField('x', { id: 'c', type: 'phone' }),
      validateField('02 123 45 67', { id: 'c', type: 'phone' }),
      validateField('x', { id: 'd', type: 'email' }),
      validateField('3,5', { id: 'e', type: 'number' }),
      validateField('x', { id: 'e', type: 'number' }),
      validateField('1', { id: 'e', type: 'number', min: 2 }),
      validateField('3', { id: 'e', type: 'number', max: 2 }),
      validateField('x', { id: 'f', type: 'yes_no' }),
      validateField({ day: 'sun', slot: '09-10' }, { id: 'g', type: 'day_slot' }),
      validateField(1, { id: 'h', type: 'text' }),
    ];
    for (const result of results) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(ERROR_CODES).toContain(result.code);
    }
    const warned = validateField('1', { id: 'e', type: 'number', softMin: 2 });
    expect(warned.ok && warned.warning).toBe(WARNING_CODES[0]);
  });
});
