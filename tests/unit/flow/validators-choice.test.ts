import { describe, expect, it } from 'vitest';

import {
  DAYS,
  SLOTS,
  TEXT_MAX_LENGTH,
  validateBoolean,
  validateChoice,
  validateDaySlot,
  validateText,
  validateYesNo,
  type FieldConfig,
} from '../../../src/lib/flow/validators';

const meterType: FieldConfig = {
  id: 'meter_type',
  type: 'single_choice',
  required: true,
  options: [{ code: 'single' }, { code: 'dual' }],
};

describe('validateChoice (single_choice, select)', () => {
  it('accepts an option code', () => {
    expect(validateChoice('dual', meterType)).toEqual({ ok: true, value: 'dual' });
  });

  it('rejects codes that are not options, including labels and other casing', () => {
    expect(validateChoice('triple', meterType)).toEqual({ ok: false, code: 'option_unknown' });
    expect(validateChoice('Dual', meterType)).toEqual({ ok: false, code: 'option_unknown' });
    expect(validateChoice(' dual', meterType)).toEqual({ ok: false, code: 'option_unknown' });
  });

  it('rejects everything when the field has no options', () => {
    expect(validateChoice('dual', { id: 'x', type: 'select' })).toEqual({
      ok: false,
      code: 'option_unknown',
    });
  });

  it('requires a value only when the field is required', () => {
    expect(validateChoice(undefined, meterType)).toEqual({ ok: false, code: 'required' });
    expect(validateChoice('', meterType)).toEqual({ ok: false, code: 'required' });
    expect(validateChoice(null, { ...meterType, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects non-strings', () => {
    expect(validateChoice(1, meterType)).toEqual({ ok: false, code: 'invalid_type' });
  });
});

describe('validateYesNo', () => {
  const field: FieldConfig = { id: 'knows_consumption', type: 'yes_no', required: true };

  it('defaults to yes / no', () => {
    expect(validateYesNo('yes', field)).toEqual({ ok: true, value: 'yes' });
    expect(validateYesNo('no', field)).toEqual({ ok: true, value: 'no' });
    expect(validateYesNo('unknown', field)).toEqual({ ok: false, code: 'option_unknown' });
    expect(validateYesNo(true, field)).toEqual({ ok: false, code: 'invalid_type' });
  });

  it("uses the field's own options when it has them", () => {
    const budgetMeter = {
      ...field,
      options: [{ code: 'yes' }, { code: 'no' }, { code: 'unknown' }],
    };
    expect(validateYesNo('unknown', budgetMeter)).toEqual({ ok: true, value: 'unknown' });
  });
});

describe('validateBoolean (checkbox, consent)', () => {
  const terms: FieldConfig = { id: 'terms', type: 'consent', required: true };
  const newsletter: FieldConfig = { id: 'newsletter', type: 'consent' };
  const isBusiness: FieldConfig = { id: 'is_business', type: 'checkbox' };

  it('requires a required consent to be checked', () => {
    expect(validateBoolean(true, terms)).toEqual({ ok: true, value: true });
    expect(validateBoolean(false, terms)).toEqual({ ok: false, code: 'required' });
    expect(validateBoolean(undefined, terms)).toEqual({ ok: false, code: 'required' });
  });

  it('treats an unchecked optional box as false', () => {
    expect(validateBoolean(undefined, newsletter)).toEqual({ ok: true, value: false });
    expect(validateBoolean(null, isBusiness)).toEqual({ ok: true, value: false });
    expect(validateBoolean(false, isBusiness)).toEqual({ ok: true, value: false });
    expect(validateBoolean(true, isBusiness)).toEqual({ ok: true, value: true });
  });

  it('rejects anything but a boolean', () => {
    for (const value of ['true', 'on', 1, 0, '']) {
      expect(validateBoolean(value, newsletter)).toEqual({ ok: false, code: 'invalid_type' });
    }
  });
});

describe('validateText', () => {
  const firstName: FieldConfig = { id: 'first_name', type: 'text', required: true };

  it('trims and collapses whitespace', () => {
    expect(validateText('  Jan  ', firstName)).toEqual({ ok: true, value: 'Jan' });
    expect(validateText('Anne \t Marie\nDe  Smet', firstName)).toEqual({
      ok: true,
      value: 'Anne Marie De Smet',
    });
    expect(validateText('Zoë-Élise', firstName)).toEqual({ ok: true, value: 'Zoë-Élise' });
  });

  it('rejects control characters', () => {
    expect(validateText('Jan\u0000', firstName)).toEqual({ ok: false, code: 'text_invalid' });
    expect(validateText('Jan\u0085', firstName)).toEqual({ ok: false, code: 'text_invalid' });
  });

  it('limits the length (default and per field)', () => {
    expect(validateText('a'.repeat(TEXT_MAX_LENGTH), firstName).ok).toBe(true);
    expect(validateText('a'.repeat(TEXT_MAX_LENGTH + 1), firstName)).toEqual({
      ok: false,
      code: 'text_too_long',
    });
    expect(validateText('abcd', { ...firstName, maxLength: 3 })).toEqual({
      ok: false,
      code: 'text_too_long',
    });
  });

  it('requires a value only when the field is required', () => {
    expect(validateText('   ', firstName)).toEqual({ ok: false, code: 'required' });
    expect(validateText('', { ...firstName, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects non-strings', () => {
    expect(validateText(12, firstName)).toEqual({ ok: false, code: 'invalid_type' });
  });
});

describe('validateDaySlot', () => {
  const callMoment: FieldConfig = { id: 'call_preference', type: 'day_slot', required: true };
  const optional: FieldConfig = { ...callMoment, required: false };

  it('has the brief’s days and slots, including 13-14', () => {
    expect(DAYS).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(SLOTS).toEqual(['09-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16']);
  });

  it('accepts every day and slot and keeps only those two keys', () => {
    for (const day of DAYS) {
      for (const slot of SLOTS) {
        expect(validateDaySlot({ day, slot, extra: 1 }, callMoment)).toEqual({
          ok: true,
          value: { day, slot },
        });
      }
    }
  });

  it('requires both when the field is required', () => {
    expect(validateDaySlot(undefined, callMoment)).toEqual({ ok: false, code: 'required' });
    expect(validateDaySlot({}, callMoment)).toEqual({ ok: false, code: 'required' });
    expect(validateDaySlot({ day: '', slot: '' }, callMoment)).toEqual({
      ok: false,
      code: 'required',
    });
    expect(validateDaySlot({ day: 'wed' }, callMoment)).toEqual({
      ok: false,
      code: 'slot_required',
    });
    expect(validateDaySlot({ slot: '13-14' }, callMoment)).toEqual({
      ok: false,
      code: 'day_required',
    });
  });

  it('may be empty but never half filled when optional', () => {
    expect(validateDaySlot(null, optional)).toEqual({ ok: true, value: undefined });
    expect(validateDaySlot({}, optional)).toEqual({ ok: true, value: undefined });
    expect(validateDaySlot({ day: 'wed' }, optional)).toEqual({ ok: false, code: 'slot_required' });
  });

  it('rejects unknown codes', () => {
    expect(validateDaySlot({ day: 'sat', slot: '13-14' }, callMoment)).toEqual({
      ok: false,
      code: 'day_unknown',
    });
    expect(validateDaySlot({ day: 'wed', slot: '16-17' }, callMoment)).toEqual({
      ok: false,
      code: 'slot_unknown',
    });
    expect(validateDaySlot({ day: 3, slot: '13-14' }, callMoment)).toEqual({
      ok: false,
      code: 'day_unknown',
    });
    expect(validateDaySlot({ day: 'wed', slot: 13 }, callMoment)).toEqual({
      ok: false,
      code: 'slot_unknown',
    });
  });

  it('uses the field’s own days and slots when it has them', () => {
    const mornings = { ...callMoment, days: ['mon'], slots: ['09-10'] };
    expect(validateDaySlot({ day: 'mon', slot: '09-10' }, mornings)).toMatchObject({ ok: true });
    expect(validateDaySlot({ day: 'tue', slot: '09-10' }, mornings)).toMatchObject({
      code: 'day_unknown',
    });
    expect(validateDaySlot({ day: 'mon', slot: '10-11' }, mornings)).toMatchObject({
      code: 'slot_unknown',
    });
  });

  it('rejects values that are not an object', () => {
    for (const value of ['wed 13-14', ['wed', '13-14'], 3]) {
      expect(validateDaySlot(value, callMoment)).toEqual({ ok: false, code: 'invalid_type' });
    }
  });
});
