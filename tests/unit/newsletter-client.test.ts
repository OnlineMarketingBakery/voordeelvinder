// The footer newsletter's pure parts (src/lib/newsletter.ts; Turnstile: turnstile-client.test.ts): what the
// browser checks and sends must be exactly what POST /api/newsletter accepts.
import { describe, expect, it } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import {
  checkEmail,
  errorField,
  newsletterBody,
  outcomeOf,
  suggestionText,
  type NewsletterCopy,
  type NewsletterError,
} from '../../src/lib/newsletter';
import { parseNewsletterRequest } from '../../src/server/newsletter';

const copy: NewsletterCopy = site.footer.newsletter;

const ERRORS: NewsletterError[] = [
  'email_required',
  'email_invalid',
  'consent_required',
  'invalid_request',
  'verification_failed',
  'rate_limited',
  'unavailable',
  'network',
];

describe('checkEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(checkEmail('  Jan@Example.BE ')).toEqual({ ok: true, email: 'jan@example.be' });
  });

  it('tells an empty field from an invalid address', () => {
    expect(checkEmail('   ')).toEqual({ ok: false, error: 'email_required' });
    expect(checkEmail('jan@')).toEqual({ ok: false, error: 'email_invalid' });
  });

  it('suggests a correction without changing the value', () => {
    expect(checkEmail('jan@gmial.com')).toEqual({
      ok: true,
      email: 'jan@gmial.com',
      suggestion: 'jan@gmail.com',
    });
    expect(checkEmail('jan@gmail,com')).toEqual({
      ok: false,
      error: 'email_invalid',
      suggestion: 'jan@gmail.com',
    });
  });
});

describe('newsletterBody', () => {
  const base = {
    email: 'jan@example.be',
    website: '',
    token: 'XXXX.DUMMY.TOKEN.XXXX',
    pathname: '/zonnepanelen',
    search: '',
  };

  it('is accepted as is by the endpoint (strict schema)', () => {
    const body = newsletterBody(base);
    expect(body).toEqual({
      email: 'jan@example.be',
      consent: true,
      website: '',
      turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
      page: '/zonnepanelen',
      test: false,
    });
    expect(parseNewsletterRequest(JSON.parse(JSON.stringify(body)))).toEqual({
      ok: true,
      request: body,
    });
  });

  it('passes on ?test=1 and the honeypot, and keeps `page` within the limit', () => {
    const body = newsletterBody({
      ...base,
      website: 'https://spam.example',
      pathname: `/${'a'.repeat(400)}`,
      search: '?utm_source=meta&test=1',
    });
    expect(body.test).toBe(true);
    expect(body.website).toBe('https://spam.example');
    expect(body.page).toHaveLength(300);
    expect(parseNewsletterRequest(body).ok).toBe(true);
    expect(newsletterBody({ ...base, pathname: '' }).page).toBe('/');
  });
});

describe('outcomeOf', () => {
  it('maps the endpoint status codes to what the visitor is told', () => {
    expect(outcomeOf(200)).toBe('success');
    expect(outcomeOf(429)).toBe('rate_limited');
    expect(outcomeOf(403)).toBe('verification_failed');
    for (const status of [400, 413, 415]) expect(outcomeOf(status)).toBe('invalid_request');
    for (const status of [404, 405, 500, 502, 503]) expect(outcomeOf(status)).toBe('unavailable');
  });

  it('points field errors at their field', () => {
    expect(errorField('email_required')).toBe('email');
    expect(errorField('email_invalid')).toBe('email');
    expect(errorField('invalid_request')).toBe('email');
    expect(errorField('consent_required')).toBe('consent');
    expect(errorField('rate_limited')).toBeUndefined();
    expect(errorField('network')).toBeUndefined();
  });
});

describe('newsletter copy (site.json)', () => {
  it('has a message for every error and fills in the suggestion', () => {
    for (const error of ERRORS) expect(copy.errors[error]).toBeTruthy();
    expect(Object.keys(copy.errors).sort()).toEqual([...ERRORS].sort());
    expect(suggestionText(copy, 'jan@gmail.com')).toContain('jan@gmail.com');
  });

  it('is enabled and links the consent to the privacy policy', () => {
    expect(site.footer.newsletter.enabled).toBe(true);
    const { label, links } = site.footer.newsletter.consent;
    expect(links).toContainEqual({ text: 'privacybeleid', href: '/privacybeleid' });
    for (const link of links) expect(label).toContain(link.text);
  });
});
