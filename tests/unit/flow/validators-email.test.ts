import { describe, expect, it } from 'vitest';

import {
  COMMON_DOMAINS,
  editDistance,
  normaliseEmail,
  suggestDomain,
  validateEmail,
  type FieldConfig,
} from '../../../src/lib/flow/validators';

const field: FieldConfig = { id: 'email', type: 'email', required: true };

describe('validateEmail: format', () => {
  it.each([
    ['jan@telenet.be', 'jan@telenet.be'],
    ['  Jan.Peeters@Telenet.BE ', 'jan.peeters@telenet.be'],
    ['jan+vergelijk@gmail.com', 'jan+vergelijk@gmail.com'],
    ["o'brien@example.co.uk", "o'brien@example.co.uk"],
    ['info@mijn-bedrijf.be', 'info@mijn-bedrijf.be'],
    ['a@b.io', 'a@b.io'],
    ['jan_de.smet-2@sub.domein.vlaanderen', 'jan_de.smet-2@sub.domein.vlaanderen'],
    ['j@123.be', 'j@123.be'],
  ])('accepts %j', (input, value) => {
    expect(validateEmail(input, field)).toEqual({ ok: true, value });
  });

  it.each([
    'jan',
    'jan@',
    '@telenet.be',
    'jan@telenet',
    'jan@telenet.',
    'jan@.be',
    'jan@telenet..be',
    'jan@-telenet.be',
    'jan@telenet-.be',
    'jan@telenet.b',
    'jan@telenet.b3',
    'jan@@telenet.be',
    'jan@tel@enet.be',
    'jan peeters@telenet.be',
    'jan@tele net.be',
    '.jan@telenet.be',
    'jan.@telenet.be',
    'jan..peeters@telenet.be',
    '"jan"@telenet.be',
    'josé@telenet.be',
    'jan@[127.0.0.1]',
    'jan@telenet.be.',
    `${'a'.repeat(65)}@telenet.be`,
    `jan@${'a'.repeat(250)}.be`,
    `jan@${'a'.repeat(64)}.be`,
  ])('rejects %j', (input) => {
    expect(validateEmail(input, field)).toMatchObject({ ok: false, code: 'email_invalid' });
  });

  it('accepts the longest local part and address', () => {
    expect(validateEmail(`${'a'.repeat(64)}@telenet.be`, field).ok).toBe(true);
    const long = `j@${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(60)}`;
    expect(long).toHaveLength(254);
    expect(validateEmail(long, field).ok).toBe(true);
  });

  it('requires a value only when the field is required', () => {
    expect(validateEmail(' ', field)).toEqual({ ok: false, code: 'required' });
    expect(validateEmail(undefined, { ...field, required: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects non-strings', () => {
    expect(validateEmail(42, field)).toEqual({ ok: false, code: 'invalid_type' });
  });

  it('normalises by trimming and lowercasing', () => {
    expect(normaliseEmail('  JAN@Gmail.com\n')).toBe('jan@gmail.com');
  });
});

describe('validateEmail: typo suggestions', () => {
  it.each([
    ['jan@gmial.com', 'jan@gmail.com'],
    ['jan@gmal.com', 'jan@gmail.com'],
    ['jan@gnail.com', 'jan@gmail.com'],
    ['jan@gmail.co', 'jan@gmail.com'],
    ['jan@gmail.con', 'jan@gmail.com'],
    ['jan@gmail.cm', 'jan@gmail.com'],
    ['jan@gmail.be', 'jan@gmail.com'],
    ['jan@gmail.nl', 'jan@gmail.com'],
    ['jan@gmial.be', 'jan@gmail.com'],
    ['Jan@Hotmial.com', 'jan@hotmail.com'],
    ['jan@hotmal.com', 'jan@hotmail.com'],
    ['jan@hotmial.be', 'jan@hotmail.be'],
    ['jan@hotmail.bw', 'jan@hotmail.be'],
    ['jan@outlok.com', 'jan@outlook.com'],
    ['jan@outlook.bee', 'jan@outlook.be'],
    ['jan@yaho.com', 'jan@yahoo.com'],
    ['jan@yahooo.com', 'jan@yahoo.com'],
    ['jan@telnet.be', 'jan@telenet.be'],
    ['jan@telenet.com', 'jan@telenet.be'],
    ['jan@teleent.be', 'jan@telenet.be'],
    ['jan@skynet.com', 'jan@skynet.be'],
    ['jan@skyne.be', 'jan@skynet.be'],
    ['jan@proximis.be', 'jan@proximus.be'],
    ['jan@icloud.be', 'jan@icloud.com'],
    ['jan@iclould.com', 'jan@icloud.com'],
    ['jan@liv.be', 'jan@live.be'],
    ['jan@pandora.nl', 'jan@pandora.be'],
    // Short provider names: only a TLD typo is suggested.
    ['jan@me.co', 'jan@me.com'],
    ['jan@msn.cm', 'jan@msn.com'],
  ])('suggests a correction for %j', (input, suggestion) => {
    expect(validateEmail(input, field)).toEqual({
      ok: true,
      value: input.toLowerCase(),
      suggestion,
    });
  });

  it.each([
    'jan@gmail.com',
    'jan@hotmail.fr',
    'jan@hotmail.nl',
    'jan@hotmail.de',
    'jan@outlook.de',
    'jan@live.de',
    'jan@live.nl',
    'jan@mail.com',
    'jan@email.com',
    'jan@mail.be',
    'jan@ymail.com',
    'jan@gmx.com',
    'jan@mac.com',
    'jan@yahoo.fr',
    'jan@kpn.nl',
    'jan@bedrijf.be',
    'jan@ugent.be',
    // Short names are too close to me.com / msn.com for one edit to mean a typo.
    'jan@msc.com',
    'jan@ms.com',
    'jan@ge.com',
    'jan@mi.com',
    // Real Microsoft country domains one letter from the .be ones.
    'jan@live.se',
    'jan@live.ie',
    'jan@hotmail.se',
    'jan@outlook.ie',
    // A real domain missing a provider's first letter is another word, not a typo.
    'jan@cloud.be',
    // Providers with a real domain under another TLD.
    'jan@proximus.com',
    'jan@scarlet.nl',
  ])('makes no suggestion for %j', (input) => {
    expect(validateEmail(input, field)).toEqual({ ok: true, value: input });
  });

  it.each([
    ['jan@gmail', 'jan@gmail.com'],
    ['jan@gmail,com', 'jan@gmail.com'],
    ['jan@telenet,be', 'jan@telenet.be'],
    ['jan@gmial,com', 'jan@gmail.com'],
    ['jan@bedrijf,be', 'jan@bedrijf.be'],
    ['jan@telenet.b e', 'jan@telenet.be'],
    ['jan@telenet', 'jan@telenet.be'],
    // Without a TLD, a provider with a real domain elsewhere is still completed.
    ['jan@scarlet', 'jan@scarlet.be'],
    ['jan@proximus', 'jan@proximus.be'],
    ['jan@proximis', 'jan@proximus.be'],
  ])('suggests a fix for the invalid %j', (input, suggestion) => {
    expect(validateEmail(input, field)).toEqual({ ok: false, code: 'email_invalid', suggestion });
  });

  it('makes no suggestion when the fix would still be invalid', () => {
    expect(validateEmail('ja n@gmial.com', field)).toEqual({ ok: false, code: 'email_invalid' });
    expect(validateEmail('gmial.com', field)).toEqual({ ok: false, code: 'email_invalid' });
  });
});

describe('suggestDomain', () => {
  it('never corrects a common domain', () => {
    for (const domain of COMMON_DOMAINS) expect(suggestDomain(domain)).toBeUndefined();
  });

  it('ignores unknown domains far from any common one', () => {
    expect(suggestDomain('')).toBeUndefined();
    expect(suggestDomain('voordeelvinder.be')).toBeUndefined();
  });
});

describe('editDistance', () => {
  it.each([
    ['', '', 0],
    ['', 'abc', 3],
    ['abc', '', 3],
    ['gmail', 'gmail', 0],
    ['gmial', 'gmail', 1],
    ['gmal', 'gmail', 1],
    ['gmaill', 'gmail', 1],
    ['gnail', 'gmail', 1],
    ['ca', 'abc', 3],
    ['be', 'com', 3],
  ])('%j → %j is %i', (a, b, distance) => {
    expect(editDistance(a, b)).toBe(distance);
  });
});
