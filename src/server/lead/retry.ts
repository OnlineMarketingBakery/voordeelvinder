// Resending what n8n didn't accept (brief §9.1 step 8, §13), run by `npm run leads:retry` every
// 5 minutes. One attempt per record per run, oldest first; the next run tries again. A run
// stops after a few failures in a row (n8n is probably down: each attempt could take the full
// timeout). Records younger than `minAgeMs` are left to the request that is still forwarding
// them, so a slow n8n doesn't get the same lead twice.
import { errorSummary, type Logger } from '../log';
import { listPending, markForwarded, type BackupKind, type BackupOptions } from './backup';
import { forward, type ForwardOptions } from './forward';

export type RetryOptions = {
  dir: string;
  /** The webhook per kind of record; a kind without one is skipped. */
  urls: Readonly<Record<BackupKind, string | undefined>>;
  secret: string | undefined;
  log: Logger;
  now?: () => Date;
  /** Don't touch records younger than this (default 2 minutes). */
  minAgeMs?: number;
  /** Report records pending longer than this (default 30 minutes, brief §13). */
  alertAfterMs?: number;
  maxConsecutiveFailures?: number;
  backup?: BackupOptions;
  forward?: Omit<ForwardOptions, 'secret' | 'retries'>;
};

export type RetryResult = {
  pending: number;
  forwarded: number;
  failed: number;
  skipped: number;
  /** Records still pending after this run that are older than `alertAfterMs`. */
  overdue: number;
};

const MINUTE_MS = 60 * 1000;

export async function retryPending({
  dir,
  urls,
  secret,
  log,
  now = () => new Date(),
  minAgeMs = 2 * MINUTE_MS,
  alertAfterMs = 30 * MINUTE_MS,
  maxConsecutiveFailures = 3,
  backup,
  forward: forwardOptions,
}: RetryOptions): Promise<RetryResult> {
  const pending = await listPending(dir);
  const result: RetryResult = {
    pending: pending.length,
    forwarded: 0,
    failed: 0,
    skipped: 0,
    overdue: 0,
  };
  const started = now().getTime();
  const done = new Set<string>();
  let failuresInARow = 0;

  for (const { record, file } of pending) {
    if (started - Date.parse(record.stored_at) < minAgeMs) {
      result.skipped++;
      continue;
    }
    const url = urls[record.kind];
    if (!url) {
      result.skipped++;
      continue;
    }
    if (failuresInARow >= maxConsecutiveFailures) {
      result.skipped++;
      continue;
    }
    const sent = await forward(url, record.payload, { ...forwardOptions, secret, retries: 0 });
    if (sent.status === 'failed') {
      result.failed++;
      failuresInARow++;
      log('warn', 'retry_forward_failed', {
        id: record.id,
        kind: record.kind,
        reason: sent.reason,
      });
      continue;
    }
    failuresInARow = 0;
    try {
      await markForwarded(dir, [{ id: record.id, file }], backup);
      result.forwarded++;
      done.add(record.id);
      log('info', 'retry_forwarded', { id: record.id, kind: record.kind });
    } catch (error) {
      result.failed++;
      log('error', 'retry_mark_failed', { id: record.id, error: errorSummary(error) });
    }
  }

  for (const { record } of pending) {
    if (!done.has(record.id) && started - Date.parse(record.stored_at) > alertAfterMs) {
      result.overdue++;
    }
  }
  return result;
}
