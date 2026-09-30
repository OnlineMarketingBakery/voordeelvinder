// Shared fixtures for the server tests: a temp backup directory, a quiet logger that records
// what it was given, an environment and a submission. Only fake values.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Submission } from '../../../src/lib/flow/engine';
import { TRACKING_KEYS, type Tracking } from '../../../src/lib/flow/engine';
import { parseServerEnv, type ServerEnv } from '../../../src/server/env';
import type { LogFields, Logger, LogLevel } from '../../../src/server/log';

export const FAKE_SECRET = 'test-webhook-secret-0000';

export async function tempDir(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'vv-backup-'));
  return { dir: join(root, 'backups'), cleanup: () => rm(root, { recursive: true, force: true }) };
}

export type LogEntry = { level: LogLevel; event: string; fields: LogFields };

export function recordingLogger(): Logger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log = ((level, event, fields = {}) => {
    entries.push({ level, event, fields });
  }) as Logger & { entries: LogEntry[] };
  log.entries = entries;
  return log;
}

export function testEnv(overrides: Record<string, string | undefined> = {}): ServerEnv {
  return parseServerEnv({
    SITE_ENV: 'ci',
    PUBLIC_SITE_URL: 'http://localhost:4321',
    LEAD_BACKUP_DIR: './lead-backups',
    ...overrides,
  });
}

export function sampleSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    schema_version: 1,
    lead_id: '0b6f6a1e-7f5a-4c1e-9a53-3f1f3c2d8e01',
    event_id: '9d1c2b3a-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
    submitted_at: '2026-10-01T09:30:00.000Z',
    product: 'energie',
    flow_id: 'energie',
    flow_version: 1,
    answers: { energy_type: 'both', supplier: 'luminus' },
    derived: { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' },
    contact: {
      first_name: 'Test',
      last_name: 'Persoon',
      phone_e164: '+32475000000',
      phone_display: '+32 475 00 00 00',
      email: 'test@example.be',
    },
    call_preference: { day: 'wed', slot: '13-14' },
    consent: { terms: true, newsletter: false, cookies: { analytics: false, marketing: false } },
    tracking: Object.fromEntries(TRACKING_KEYS.map((key) => [key, ''])) as Tracking,
    meta: { page: '/vergelijken/energie', test: false },
    ...overrides,
  };
}

export function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:4321/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
