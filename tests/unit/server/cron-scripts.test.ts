// The cron entry points (npm run leads:retry / backups:prune) as Ploi runs them, on a temp dir.
import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { listPending, storeBackup } from '../../../src/server/lead/backup';
import { startMockN8n, type MockN8n } from '../../support/mock-n8n';
import { FAKE_SECRET, tempDir } from './fixtures';

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '..', '..', '..');
const TSX = join(ROOT, 'node_modules', '.bin', 'tsx');

type Outcome = { code: number; stdout: string; stderr: string };

async function script(name: string, env: Record<string, string>): Promise<Outcome> {
  try {
    const { stdout, stderr } = await run(TSX, [join(ROOT, 'scripts', name)], {
      cwd: ROOT,
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
  }
}

const events = (output: string) =>
  output
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe('cron scripts', () => {
  let mock: MockN8n;
  let dir: string;
  let cleanup: () => Promise<void>;
  let env: Record<string, string>;

  beforeAll(async () => {
    mock = await startMockN8n();
  });
  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
    env = {
      SITE_ENV: 'ci',
      PUBLIC_SITE_URL: 'http://localhost:4321',
      LEAD_BACKUP_DIR: dir,
      N8N_LEAD_WEBHOOK_URL: `${mock.url}/webhook/lead`,
      N8N_WEBHOOK_SECRET: FAKE_SECRET,
    };
  });
  afterEach(async () => {
    mock.received.length = 0;
    await cleanup();
  });
  afterAll(() => mock.close());

  const minutesAgo = (minutes: number) => () => new Date(Date.now() - minutes * 60_000);

  it('leads:retry resends pending records and exits 0', async () => {
    await storeBackup(
      dir,
      { id: 'lead-1', kind: 'lead', status: 'pending_forward', payload: { lead_id: 'lead-1' } },
      { now: minutesAgo(10) },
    );
    const result = await script('leads-retry.ts', env);
    expect(result.code).toBe(0);
    expect(mock.received.map((request) => request.body)).toEqual([{ lead_id: 'lead-1' }]);
    expect(events(result.stdout).at(-1)).toMatchObject({
      event: 'leads_retry',
      site_env: 'ci',
      forwarded: 1,
    });
    expect(await listPending(dir)).toEqual([]);
  }, 20_000);

  it('leads:retry reports an alert and exits 1 for records pending over 30 minutes', async () => {
    await storeBackup(
      dir,
      { id: 'lead-1', kind: 'lead', status: 'pending_forward', payload: {} },
      { now: minutesAgo(45) },
    );
    mock.respond({ status: 500 });
    const result = await script('leads-retry.ts', env);
    expect(result.code).toBe(1);
    expect(events(result.stderr).map((line) => line.event)).toEqual([
      'retry_forward_failed',
      'leads_retry',
      'alert',
    ]);
  }, 20_000);

  it('backups:prune deletes old records', async () => {
    await storeBackup(
      dir,
      { id: 'old', kind: 'lead', status: 'backup_only', payload: {} },
      { now: () => new Date(Date.now() - 40 * 24 * 60 * 60_000) },
    );
    const result = await script('backups-prune.ts', env);
    expect(result.code).toBe(0);
    expect(events(result.stdout).at(-1)).toMatchObject({ event: 'backups_prune', removed: 1 });
    expect(await readdir(dir)).toEqual([]);
  }, 20_000);
});
