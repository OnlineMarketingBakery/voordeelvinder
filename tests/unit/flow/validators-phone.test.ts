import { describe, expect, it } from 'vitest';

import { parsePhone, validatePhone, type FieldConfig } from '../../../src/lib/flow/validators';

const field: FieldConfig = { id: 'phone', type: 'phone', required: true };
const withLandlines: FieldConfig = { ...field, allowLandlines: true };

const mobile = { e164: '+32475123456', display: '+32 475 12 34 56', kind: 'mobile' };

describe('parsePhone: Belgian mobiles', () => {
  it.each([
    // National format, every separator people use.
    '0475123456',
    '0475 12 34 56',
    '0475 123 456',
    '0475/12.34.56',
    '0475/123456',
    '0475.12.34.56',
    '0475-12-34-56',
    '(0475) 12 34 56',
    ' 0475 12 34 56 ',
    '0475 12 34 56',
    '0475\t12 34 56',
    '0475,12,34,56',
    // Typed after the fixed "+32" chip.
    '475123456',
    '475 12 34 56',
    // International.
    '+32475123456',
    '+32 475 12 34 56',
    '+32 (0)475 12 34 56',
    '+32(0)475123456',
    '+32 ( 0 ) 475 12 34 56',
    '+ 32 475 12 34 56',
    '+32-475-12-34-56',
    '+32.475.12.34.56',
    '0032475123456',
    '0032 475 12 34 56',
    '00 32 475 12 34 56',
    '0032 (0)475 12 34 56',
    // Bare country code, when that reading is valid.
    '32475123456',
    '32 475 12 34 56',
  ])('reads %j as +32 475 12 34 56', (input) => {
    expect(parsePhone(input)).toEqual({ ok: true, value: mobile });
  });

  it.each([
    ['0456 78 90 12', '+32456789012', '+32 456 78 90 12'],
    ['0499/99.99.99', '+32499999999', '+32 499 99 99 99'],
    ['+32 486 00 11 22', '+32486001122', '+32 486 00 11 22'],
    ['0032 468 12 34 56', '+32468123456', '+32 468 12 34 56'],
  ])('reads %j', (input, e164, display) => {
    expect(parsePhone(input)).toEqual({ ok: true, value: { e164, display, kind: 'mobile' } });
  });

  it('rejects a mobile one digit short: 045x–049x is never a (Liège) landline', () => {
    for (const input of ['047512345', '+3247512345', '47512345', '0470 12 34 5', '0450 12 34 5']) {
      expect(parsePhone(input)).toEqual({ ok: false, code: 'phone_invalid' });
      expect(parsePhone(input, { allowLandlines: true })).toEqual({
        ok: false,
        code: 'phone_invalid',
      });
    }
  });

  it('accepts its own output formats (the engine may re-validate a stored value)', () => {
    expect(parsePhone(mobile.e164)).toEqual({ ok: true, value: mobile });
    expect(parsePhone(mobile.display)).toEqual({ ok: true, value: mobile });
  });

  it.each([
    // Never truncate: too many digits.
    '04751234567',
    '0475 12 34 567',
    '+324751234567',
    '324751234567',
    // Never pad: too few digits.
    '04751234',
    '+324751234',
    // Never "fix" a trunk 0 inside the international format (no brackets).
    '+320475123456',
    '+32 0475 12 34 56',
    '00320475123456',
    '0032 0475 12 34 56',
    '320475123456',
    // Other countries and malformed prefixes.
    '+31612345678',
    '0031612345678',
    '+33612345678',
    '00475123456',
    '+0032475123456',
    '++32475123456',
    '0475+123456',
    // Not a number.
    'abc',
    '0475 12 34 5x',
    '0475_12_34_56',
    '+',
    '',
    '()',
    // Brackets that aren't the trunk convention: the digits stay as typed.
    '+32 (1)475 12 34 56',
    '+32 (00)475 12 34 56',
    // A mobile needs a 4.
    '0575 12 34 56',
  ])('rejects %j', (input) => {
    expect(parsePhone(input)).toEqual({ ok: false, code: 'phone_invalid' });
  });
});

describe('parsePhone: landlines', () => {
  it.each([
    ['02 123 45 67', '+3221234567', '+32 2 123 45 67'],
    ['02/123.45.67', '+3221234567', '+32 2 123 45 67'],
    ['03 234 56 78', '+3232345678', '+32 3 234 56 78'],
    ['04 123 45 67', '+3241234567', '+32 4 123 45 67'],
    ['04 444 55 66', '+3244445566', '+32 4 444 55 66'],
    ['09 222 33 44', '+3292223344', '+32 9 222 33 44'],
    ['050 12 34 56', '+3250123456', '+32 50 12 34 56'],
    ['011 22 33 44', '+3211223344', '+32 11 22 33 44'],
    ['+32 16 12 34 56', '+3216123456', '+32 16 12 34 56'],
    ['0032 89 12 34 56', '+3289123456', '+32 89 12 34 56'],
    ['080 12 34 56', '+3280123456', '+32 80 12 34 56'],
    ['3250123456', '+3250123456', '+32 50 12 34 56'],
    ['50123456', '+3250123456', '+32 50 12 34 56'],
    ['+32 (0)2 123 45 67', '+3221234567', '+32 2 123 45 67'],
  ])('reads %j when landlines are allowed', (input, e164, display) => {
    expect(parsePhone(input, { allowLandlines: true })).toEqual({
      ok: true,
      value: { e164, display, kind: 'landline' },
    });
    expect(parsePhone(input)).toEqual({ ok: false, code: 'phone_landline' });
  });

  it('still prefers the mobile reading when landlines are allowed', () => {
    expect(parsePhone('0475 12 34 56', { allowLandlines: true })).toEqual({
      ok: true,
      value: mobile,
    });
  });

  it.each([
    '070 12 34 56',
    '077 12 34 56',
    '078 12 34 56',
    '0800 12 345',
    '0900 12 345',
    '0903 12 345',
    '02 123 45 6',
    '02 123 45 678',
    '00 123 45 67',
  ])('rejects %j even when landlines are allowed', (input) => {
    expect(parsePhone(input, { allowLandlines: true })).toEqual({
      ok: false,
      code: 'phone_invalid',
    });
  });
});

describe('validatePhone', () => {
  it('returns the E.164 and display formats', () => {
    expect(validatePhone('0475 12 34 56', field)).toEqual({ ok: true, value: mobile });
  });

  it('rejects landlines by default and accepts them behind the flag', () => {
    expect(validatePhone('02 123 45 67', field)).toEqual({ ok: false, code: 'phone_landline' });
    expect(validatePhone('02 123 45 67', withLandlines)).toMatchObject({
      ok: true,
      value: { e164: '+3221234567', kind: 'landline' },
    });
  });

  it('returns the error code for an invalid number', () => {
    expect(validatePhone('0475 12 34', field)).toEqual({ ok: false, code: 'phone_invalid' });
  });

  it('requires a value only when the field is required', () => {
    expect(validatePhone('', field)).toEqual({ ok: false, code: 'required' });
    expect(validatePhone('   ', field)).toEqual({ ok: false, code: 'required' });
    expect(validatePhone(undefined, { ...field, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects non-strings', () => {
    expect(validatePhone(475123456, field)).toEqual({ ok: false, code: 'invalid_type' });
  });
});
