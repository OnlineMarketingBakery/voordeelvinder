import { describe, expect, it } from 'vitest';

import { parseInteger, validateNumber, type FieldConfig } from '../../../src/lib/flow/validators';

// Brief §7.3: electricity 100–100 000 kWh. The soft range is a test value, not a content decision.
const kwh: FieldConfig = {
  id: 'electricity_kwh',
  type: 'number',
  required: true,
  min: 100,
  max: 100_000,
  softMin: 500,
  softMax: 15_000,
};

describe('parseInteger', () => {
  it.each([
    ['3500', 3500],
    ['3.500', 3500],
    ['3 500', 3500],
    ['3 500', 3500],
    ['3 500', 3500],
    [' 3500 ', 3500],
    ['100.000', 100_000],
    ['1.000.000', 1_000_000],
    ['1 000 000', 1_000_000],
    ['03500', 3500],
    ['0', 0],
    ['-5', -5],
    ['12', 12],
    [3500, 3500],
  ])('reads %j as %i', (input, value) => {
    expect(parseInteger(input)).toEqual({ ok: true, value });
  });

  it.each([
    '3,5',
    '3.50',
    '3.5',
    '3500,00',
    '3500.0',
    '1.234,5',
    '3,500',
    '3.5000',
    '-2,5',
    '3.5.0',
    // A leading zero group is a decimal, not thousands: 0.500 is 0,5 and never 500.
    '0.500',
    '00.500',
    '-0.500',
    '0.000',
    3.5,
  ])('rejects the decimal %j', (input) => {
    expect(parseInteger(input)).toEqual({ ok: false, code: 'number_not_integer' });
  });

  it.each([
    'abc',
    '3500 kWh',
    'kWh 3500',
    '3500.',
    '.500',
    '35 00',
    '0 500',
    '1e5',
    '0x10',
    '+3500',
    '3500-',
    '',
    '9'.repeat(20),
    Number.NaN,
    Number.POSITIVE_INFINITY,
    2 ** 60,
  ])('rejects %j', (input) => {
    expect(parseInteger(input)).toEqual({ ok: false, code: 'number_invalid' });
  });
});

describe('validateNumber', () => {
  it('returns the integer', () => {
    expect(validateNumber('3.500', kwh)).toEqual({ ok: true, value: 3500 });
    expect(validateNumber(3500, kwh)).toEqual({ ok: true, value: 3500 });
  });

  it('enforces min and max (inclusive)', () => {
    expect(validateNumber('100', kwh)).toMatchObject({ ok: true, value: 100 });
    expect(validateNumber('100.000', kwh)).toMatchObject({ ok: true, value: 100_000 });
    expect(validateNumber('99', kwh)).toEqual({ ok: false, code: 'number_too_low' });
    expect(validateNumber('100.001', kwh)).toEqual({ ok: false, code: 'number_too_high' });
  });

  it('warns outside the typical range but accepts the value', () => {
    expect(validateNumber('499', kwh)).toEqual({
      ok: true,
      value: 499,
      warning: 'outside_typical',
    });
    expect(validateNumber('15.001', kwh)).toEqual({
      ok: true,
      value: 15_001,
      warning: 'outside_typical',
    });
    expect(validateNumber('500', kwh)).toEqual({ ok: true, value: 500 });
    expect(validateNumber('15.000', kwh)).toEqual({ ok: true, value: 15_000 });
  });

  it('works without any range', () => {
    const plain: FieldConfig = { id: 'n', type: 'number' };
    expect(validateNumber('-12', plain)).toEqual({ ok: true, value: -12 });
    expect(validateNumber('12', { ...plain, softMin: 20 })).toMatchObject({
      warning: 'outside_typical',
    });
    expect(validateNumber('30', { ...plain, softMax: 20 })).toMatchObject({
      warning: 'outside_typical',
    });
  });

  it('passes parse errors through', () => {
    expect(validateNumber('3,5', kwh)).toEqual({ ok: false, code: 'number_not_integer' });
    expect(validateNumber('veel', kwh)).toEqual({ ok: false, code: 'number_invalid' });
  });

  it('requires a value only when the field is required', () => {
    expect(validateNumber('', kwh)).toEqual({ ok: false, code: 'required' });
    expect(validateNumber(undefined, { ...kwh, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects other types', () => {
    expect(validateNumber(true, kwh)).toEqual({ ok: false, code: 'invalid_type' });
  });
});
