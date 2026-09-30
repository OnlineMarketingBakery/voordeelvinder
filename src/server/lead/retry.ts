// Resending what n8n didn't accept (brief §9.1 step 8, §13), run by `npm run leads:retry` every
// 5 minutes. At most one attempt per record per run. Records are fair to each other:
// - each record keeps its own count of failed attempts (appended to its month file), and waits
//   longer after each one (retryDelayMs: 5, 10, 20, 40, then every 60 minutes);
// - records with the fewest failed attempts go first, oldest first among equals, so a record
//   that keeps failing never holds back a newer one;
// - a webhook that looks down (network errors, timeouts, 5xx, 408, 429 several times in a row)
//   is left alone for the rest of the run, since each attempt could take the full timeout. That
//   stops only that webhook's records; a refusal (another 4xx, a redirect) concerns only its
//   own record and stops nothing.
// Records younger than `minAgeMs` are left to the request that is still forwarding them, so a
// slow n8n doesn't get the same lead twice. Every record still pending after `alertAfterMs` is
// reported (`overdue`), whatever its backoff.
import { errorSummary, type Logger } from '../log';
import {
  listPending,
  markAttemptFailed,
  markForwarded,
  type BackupEntry,
  type BackupKind,
  type BackupOptions,
} from './backup';
import { forward, retriableReason, type ForwardOptions } from './forward';

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
  /** Failures in a row (n8n down) after which a webhook is left alone for the rest of the run. */
  maxConsecutiveFailures?: number;
  /** The wait after a record's n-th failed attempt (default retryDelayMs). */
  delayMs?: (attempts: number) => number;
  backup?: BackupOptions;
  forward?: Omit<ForwardOptions, 'secret' | 'retries'>;
};

export type RetryResult = {
  pending: number;
  forwarded: number;
  failed: number;
  /** Too young, no webhook for its kind, or its webhook looked down during this run. */
  skipped: number;
  /** Waiting for their next attempt after earlier failures (retryDelayMs). */
  deferred: number;
  /** Records still pending after this run that are older than `alertAfterMs`. */
  overdue: number;
};

const MINUTE_MS = 60 * 1000;
/** Cron starts a run a little early or late: a record due within this margin is due now. */
const CRON_MARGIN_MS = 30 * 1000;

/** The wait after a record's n-th failed attempt: 5, 10, 20, 40, then every 60 minutes. */
export function retryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(5 * MINUTE_MS * 2 ** (attempts - 1), 60 * MINUTE_MS);
}

export async function retryPending({
  dir,
  urls,
  secret,
  log,
  now = () => new Date(),
  minAgeMs = 2 * MINUTE_MS,
  alertAfterMs = 30 * MINUTE_MS,
  maxConsecutiveFailures = 3,
  delayMs = retryDelayMs,
  backup,
  forward: forwardOptions,
}: RetryOptions): Promise<RetryResult> {
  const pending = await listPending(dir);
  const result: RetryResult = {
    pending: pending.length,
    forwarded: 0,
    failed: 0,
    skipped: 0,
    deferred: 0,
    overdue: 0,
  };
  const started = now().getTime();
  const done = new Set<string>();

  const due: (BackupEntry & { url: string })[] = [];
  for (const entry of pending) {
    const url = urls[entry.record.kind];
    if (started - Date.parse(entry.record.stored_at) < minAgeMs || !url) {
      result.skipped++;
    } else if (
      entry.lastAttemptAt !== undefined &&
      started - Date.parse(entry.lastAttemptAt) < delayMs(entry.attempts) - CRON_MARGIN_MS
    ) {
      result.deferred++;
    } else {
      due.push({ ...entry, url });
    }
  }
  // Fewest failed attempts first, then oldest first (listPending's order; sort is stable).
  due.sort((a, b) => a.attempts - b.attempts);

  const failuresInARow = new Map<string, number>();
  for (const { record, file, url } of due) {
    if ((failuresInARow.get(url) ?? 0) >= maxConsecutiveFailures) {
      result.skipped++;
      continue;
    }
    const sent = await forward(url, record.payload, { ...forwardOptions, secret, retries: 0 });
    if (sent.status === 'failed') {
      result.failed++;
      if (retriableReason(sent.reason)) {
        failuresInARow.set(url, (failuresInARow.get(url) ?? 0) + 1);
      }
      log('warn', 'retry_forward_failed', {
        id: record.id,
        kind: record.kind,
        reason: sent.reason,
      });
      try {
        await markAttemptFailed(dir, [{ id: record.id, file, reason: sent.reason }], backup);
      } catch (error) {
        log('error', 'retry_attempt_mark_failed', { id: record.id, error: errorSummary(error) });
      }
      continue;
    }
    failuresInARow.set(url, 0);
    try {
      await markForwarded(dir, [{ id: record.id, file }], backup);
      result.forwarded++;
      done.add(record.id);
      log('info', 'retry_forwarded', { id: record.id, kind: record.kind });
    } catch (error) {
      // n8n has it, but the next run will send it again: n8n deduplicates on the id.
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
