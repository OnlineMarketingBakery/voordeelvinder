import { describe, expect, it } from 'vitest';

import { isTestEnvironment, parseServerEnv } from '../../src/server/env';

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

describe('isTestEnvironment', () => {
  it('marks every environment except production as test (brief §9.4)', () => {
    expect(isTestEnvironment('local')).toBe(true);
    expect(isTestEnvironment('ci')).toBe(true);
    expect(isTestEnvironment('staging')).toBe(true);
    expect(isTestEnvironment('production')).toBe(false);
  });
});
