// Cron, daily (brief §9.1 step 10; docs/ops/ploi-staging.md): delete lead backup records older
// than 30 days from LEAD_BACKUP_DIR and compact the month files (src/server/lead/backup.ts).
// n8n and the lead sheet hold the long-term copy.
import { pruneBackups } from '../src/server/lead/backup';
import { consoleLogger } from '../src/server/log';
import { loadScriptEnv } from './lib/env';

const env = loadScriptEnv();
const result = await pruneBackups(env.LEAD_BACKUP_DIR, { maxAgeDays: 30 });

consoleLogger(result.removedPending > 0 ? 'warn' : 'info', 'backups_prune', {
  site_env: env.SITE_ENV,
  ...result,
});
