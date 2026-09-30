import { describe, expect, it } from 'vitest';

import {
  isTestEnvironment,
  newsletterWebhookUrl,
  parseServerEnv,
  TURNSTILE_TEST_SECRET,
  turnstileSecret,
} from '../../src/server/env';
import { TURNSTILE_TEST_SITE_KEYS } from '../../src/lib/turnstile';

const staging = {
  SITE_ENV: 'staging',
  PUBLIC_SITE_URL: 'https://voordeelvinder.onlinemarketingbakery.nl',
  LEAD_BACKUP_DIR: '/home/voordeelvinder-9eyyh/lead-backups',
  RATE_LIMIT_PER_HOUR: '10',
};

describe('parseServerEnv', () => {
  it('accepts a complete staging environment and coerces numbers', () => {
    const env = parseServerEnv(staging);
    expect(env.SITE_ENV).toBe('staging');
    expect(env.RATE_LIMIT_PER_HOUR).toBe(10);
  });

  it('applies local defaults', () => {
    const env = parseServerEnv({ SITE_ENV: 'local', PUBLIC_SITE_URL: 'http://localhost:4321' });
    expect(env.LEAD_BACKUP_DIR).toBe('./lead-backups');
    expect(env.RATE_LIMIT_PER_HOUR).toBe(10);
  });

  it('fails fast when SITE_ENV is missing or unknown', () => {
    expect(() => parseServerEnv({ ...staging, SITE_ENV: undefined })).toThrow(/SITE_ENV/);
    expect(() => parseServerEnv({ ...staging, SITE_ENV: 'prod' })).toThrow(/SITE_ENV/);
  });

  it('requires https and an absolute backup dir on deployed environments', () => {
    expect(() =>
      parseServerEnv({ ...staging, PUBLIC_SITE_URL: 'http://voordeelvinder.be' }),
    ).toThrow(/PUBLIC_SITE_URL/);
    expect(() => parseServerEnv({ ...staging, LEAD_BACKUP_DIR: './lead-backups' })).toThrow(
      /LEAD_BACKUP_DIR/,
    );
    expect(() =>
      parseServerEnv({ ...staging, SITE_ENV: 'production', LEAD_BACKUP_DIR: undefined }),
    ).toThrow(/LEAD_BACKUP_DIR/);
  });

  it('rejects a non-positive rate limit', () => {
    expect(() => parseServerEnv({ ...staging, RATE_LIMIT_PER_HOUR: '0' })).toThrow(
      /RATE_LIMIT_PER_HOUR/,
    );
  });

  it('never includes variable values in its error message', () => {
    const secret = 'not-a-url-but-a-secret-value';
    expect(() => parseServerEnv({ ...staging, N8N_LEAD_WEBHOOK_URL: secret })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secret) }),
    );
  });
});

describe('parseServerEnv: n8n and Turnstile (Phase 5)', () => {
  const secret = 'test-webhook-secret-0000';
  const production = {
    ...staging,
    SITE_ENV: 'production',
    PUBLIC_SITE_URL: 'https://voordeelvinder.be',
    N8N_LEAD_WEBHOOK_URL: 'https://n8n.example.test/webhook/lead',
    N8N_WEBHOOK_SECRET: secret,
    TURNSTILE_SECRET_KEY: '0x4AAAAAAAfakefakefakefakefake',
    PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAfakesitekey',
  };

  it('keeps them optional on local, CI and staging, and treats NAME= as not set', () => {
    const env = parseServerEnv({
      ...staging,
      N8N_LEAD_WEBHOOK_URL: '',
      N8N_WEBHOOK_SECRET: '',
      TURNSTILE_SECRET_KEY: '',
      PUBLIC_TURNSTILE_SITE_KEY: '',
    });
    expect(env.N8N_LEAD_WEBHOOK_URL).toBeUndefined();
    expect(env.TURNSTILE_SECRET_KEY).toBeUndefined();
    // The pages then render with the test site key (src/lib/turnstile.ts).
    expect(env.PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined();
    expect(turnstileSecret(env)).toBe(TURNSTILE_TEST_SECRET);
    expect(newsletterWebhookUrl(env)).toBeUndefined();
  });

  it('accepts a complete production environment', () => {
    const env = parseServerEnv(production);
    expect(turnstileSecret(env)).toBe(production.TURNSTILE_SECRET_KEY);
    expect(newsletterWebhookUrl(env)).toBe(production.N8N_LEAD_WEBHOOK_URL);
    expect(
      newsletterWebhookUrl(
        parseServerEnv({
          ...production,
          N8N_NEWSLETTER_WEBHOOK_URL: 'https://n8n.example.test/webhook/nl',
        }),
      ),
    ).toBe('https://n8n.example.test/webhook/nl');
  });

  it('requires the webhook, its secret and real Turnstile keys on production', () => {
    for (const key of [
      'N8N_LEAD_WEBHOOK_URL',
      'N8N_WEBHOOK_SECRET',
      'TURNSTILE_SECRET_KEY',
      'PUBLIC_TURNSTILE_SITE_KEY',
    ]) {
      expect(() => parseServerEnv({ ...production, [key]: undefined })).toThrow(key);
    }
    for (const test of ['1x', '2x', '3x']) {
      expect(() =>
        parseServerEnv({
          ...production,
          TURNSTILE_SECRET_KEY: `${test}0000000000000000000000000000000AA`,
        }),
      ).toThrow(/test key/);
    }
    expect(() => parseServerEnv({ ...production, PUBLIC_TURNSTILE_SITE_KEY: '' })).toThrow(
      /PUBLIC_TURNSTILE_SITE_KEY/,
    );
    for (const siteKey of TURNSTILE_TEST_SITE_KEYS) {
      expect(() => parseServerEnv({ ...production, PUBLIC_TURNSTILE_SITE_KEY: siteKey })).toThrow(
        /must not be a Cloudflare test key[\s\S]*PUBLIC_TURNSTILE_SITE_KEY/,
      );
    }
  });

  it('requires https webhooks and a secret with a webhook on staging', () => {
    expect(() =>
      parseServerEnv({ ...staging, N8N_LEAD_WEBHOOK_URL: 'http://n8n.example.test/webhook' }),
    ).toThrow(/N8N_LEAD_WEBHOOK_URL/);
    expect(() =>
      parseServerEnv({
        ...staging,
        N8N_NEWSLETTER_WEBHOOK_URL: 'http://n8n.example.test/webhook',
        N8N_WEBHOOK_SECRET: secret,
      }),
    ).toThrow(/N8N_NEWSLETTER_WEBHOOK_URL/);
    expect(() =>
      parseServerEnv({ ...staging, N8N_LEAD_WEBHOOK_URL: 'https://n8n.example.test/webhook' }),
    ).toThrow(/N8N_WEBHOOK_SECRET/);
    expect(() => parseServerEnv({ ...staging, N8N_WEBHOOK_SECRET: 'short' })).toThrow(
      /N8N_WEBHOOK_SECRET/,
    );
  });

  it('allows a plain-http mock webhook and a siteverify stand-in only on local and CI', () => {
    const local = {
      SITE_ENV: 'ci',
      PUBLIC_SITE_URL: 'http://localhost:4321',
      N8N_LEAD_WEBHOOK_URL: 'http://127.0.0.1:4390/webhook/lead',
      TURNSTILE_VERIFY_URL: 'http://127.0.0.1:4390/turnstile/siteverify',
    };
    expect(parseServerEnv(local).TURNSTILE_VERIFY_URL).toBe(local.TURNSTILE_VERIFY_URL);
    expect(() =>
      parseServerEnv({ ...staging, TURNSTILE_VERIFY_URL: local.TURNSTILE_VERIFY_URL }),
    ).toThrow(/TURNSTILE_VERIFY_URL/);
  });
});

describe('isTestEnvironment', () => {
  it('marks every environment except production as test (brief §9.4)', () => {
    expect(isTestEnvironment('local')).toBe(true);
    expect(isTestEnvironment('ci')).toBe(true);
    expect(isTestEnvironment('staging')).toBe(true);
    expect(isTestEnvironment('production')).toBe(false);
  });
});
