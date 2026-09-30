import { describe, expect, it } from 'vitest';

import {
  derive,
  parsePostcode,
  provinceFor,
  regionFor,
  validatePostcode,
  type FieldConfig,
} from '../../../src/lib/flow/validators';

const field: FieldConfig = { id: 'postcode', type: 'postcode', required: true };

describe('validatePostcode', () => {
  it.each([
    ['9000', '9000'],
    [' 2000 ', '2000'],
    ['1000', '1000'],
    ['9999', '9999'],
    [3500, '3500'],
  ])('accepts %j', (input, value) => {
    expect(validatePostcode(input, field)).toEqual({ ok: true, value });
  });

  it.each([
    '0999',
    '0100',
    '999',
    '10000',
    '90 00',
    'B-9000',
    '9000a',
    '9.000',
    '-9000',
    '９０００',
    999,
    10000,
    9000.5,
  ])('rejects %j', (input) => {
    expect(validatePostcode(input, field)).toEqual({ ok: false, code: 'postcode_invalid' });
  });

  it('requires a value only when the field is required', () => {
    expect(validatePostcode('', field)).toEqual({ ok: false, code: 'required' });
    expect(validatePostcode(null, { ...field, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects other types', () => {
    expect(validatePostcode(['9000'], field)).toEqual({ ok: false, code: 'invalid_type' });
  });
});

describe('regions (brief §7.5)', () => {
  it.each([
    ['1000', 'brussels'],
    ['1299', 'brussels'],
    ['1300', 'wallonia'],
    ['1499', 'wallonia'],
    ['1500', 'flanders'],
    ['3999', 'flanders'],
    ['4000', 'wallonia'],
    ['7999', 'wallonia'],
    ['8000', 'flanders'],
    ['9999', 'flanders'],
  ])('%s is in %s', (postcode, region) => {
    expect(regionFor(postcode)).toBe(region);
  });
});

describe('provinces (bpost ranges)', () => {
  it.each([
    ['1000', 'brussel'],
    ['1299', 'brussel'],
    ['1300', 'waals-brabant'],
    ['1348', 'waals-brabant'],
    ['1499', 'waals-brabant'],
    ['1500', 'vlaams-brabant'],
    ['1800', 'vlaams-brabant'],
    ['1999', 'vlaams-brabant'],
    ['2000', 'antwerpen'],
    ['2999', 'antwerpen'],
    ['3000', 'vlaams-brabant'],
    ['3499', 'vlaams-brabant'],
    ['3500', 'limburg'],
    ['3790', 'limburg'],
    ['3999', 'limburg'],
    ['4000', 'luik'],
    ['4700', 'luik'],
    ['4999', 'luik'],
    ['5000', 'namen'],
    ['5999', 'namen'],
    ['6000', 'henegouwen'],
    ['6599', 'henegouwen'],
    ['6600', 'luxemburg'],
    ['6999', 'luxemburg'],
    ['7000', 'henegouwen'],
    ['7999', 'henegouwen'],
    ['8000', 'west-vlaanderen'],
    ['8999', 'west-vlaanderen'],
    ['9000', 'oost-vlaanderen'],
    ['9999', 'oost-vlaanderen'],
  ])('%s is in %s', (postcode, province) => {
    expect(provinceFor(postcode)).toBe(province);
  });

  it('puts every province in the region the brief gives its postcodes', () => {
    const flemish = [
      'vlaams-brabant',
      'antwerpen',
      'limburg',
      'west-vlaanderen',
      'oost-vlaanderen',
    ];
    for (let n = 1000; n <= 9999; n++) {
      const postcode = String(n);
      const province = provinceFor(postcode);
      const region = regionFor(postcode);
      if (province === 'brussel') expect(region).toBe('brussels');
      else expect(region).toBe(flemish.includes(province) ? 'flanders' : 'wallonia');
    }
  });
});

describe('parsePostcode', () => {
  it('normalises strings and numbers and returns null otherwise', () => {
    expect(parsePostcode(' 9000')).toBe('9000');
    expect(parsePostcode(9000)).toBe('9000');
    expect(parsePostcode('0900')).toBeNull();
    expect(parsePostcode(undefined)).toBeNull();
    expect(parsePostcode({})).toBeNull();
  });
});

describe('derive', () => {
  it('derives postcode, region and province from the answers', () => {
    expect(derive({ postcode: '9000', energy_type: 'both' })).toEqual({
      postcode: '9000',
      region: 'flanders',
      province: 'oost-vlaanderen',
    });
    expect(derive({ postcode: ' 1050 ' })).toEqual({
      postcode: '1050',
      region: 'brussels',
      province: 'brussel',
    });
  });

  it('reads another answer key when asked', () => {
    expect(derive({ zip: '4000' }, 'zip')).toEqual({
      postcode: '4000',
      region: 'wallonia',
      province: 'luik',
    });
  });

  it('derives nothing while the postcode is missing or invalid', () => {
    expect(derive({})).toEqual({});
    expect(derive({ postcode: '123' })).toEqual({});
  });
});
