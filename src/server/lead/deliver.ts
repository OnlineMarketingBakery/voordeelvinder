// Backup, then forward (brief §9.1 steps 7 and 8), shared by /api/lead and /api/newsletter.
// The backup comes first so an n8n outage never loses a record; a forward that fails leaves it
// `pending_forward` for `npm run leads:retry`. Without a webhook the record is `backup_only`.
import { errorSummary, type Logger } from '../log';
import { markForwarded, storeBackup, type BackupKind, type BackupOptions } from './backup';
import { forward, type ForwardOptions } from './forward';

export type DeliverInput = {
  dir: string;
  id: string;
  kind: BackupKind;
  payload: unknown;
  /** The webhook; none means backup only. */
  url: string | undefined;
  secret: string | undefined;
  log: Logger;
  backup?: BackupOptions;
  forward?: Omit<ForwardOptions, 'secret'>;
};

export type DeliverResult = {
  backup: 'stored' | 'duplicate' | 'failed';
  forward: 'forwarded' | 'failed' | 'skipped';
  /** The record is safe: in the backup, or accepted by n8n. */
  saved: boolean;
};

export async function deliver(input: DeliverInput): Promise<DeliverResult> {
  const { dir, id, kind, payload, url, secret, log } = input;
  let file: string | undefined;
  let backup: DeliverResult['backup'];
  try {
    const stored = await storeBackup(
      dir,
      { id, kind, status: url ? 'pending_forward' : 'backup_only', payload },
      input.backup,
    );
    // Already stored (a double submit): it is (or will be) forwarded from that first record.
    if (stored.result === 'duplicate') {
      return { backup: 'duplicate', forward: 'skipped', saved: true };
    }
    file = stored.file;
    backup = 'stored';
  } catch (error) {
    log('error', `${kind}_backup_failed`, { id, error: errorSummary(error) });
    backup = 'failed';
  }

  if (!url) return { backup, forward: 'skipped', saved: backup === 'stored' };

  const result = await forward(url, payload, { ...input.forward, secret });
  if (result.status === 'failed') {
    log('warn', `${kind}_forward_failed`, { id, reason: result.reason, attempts: result.attempts });
    return { backup, forward: 'failed', saved: backup === 'stored' };
  }
  if (file) {
    try {
      await markForwarded(dir, [{ id, file }], input.backup);
    } catch (error) {
      // leads:retry will send it again; n8n deduplicates on the id.
      log('error', `${kind}_mark_forwarded_failed`, { id, error: errorSummary(error) });
    }
  }
  return { backup, forward: 'forwarded', saved: true };
}
