// Cron, daily (brief §9.1 step 10): delete lead backup lines older than 30 days from
// LEAD_BACKUP_DIR. Implemented together with the backup format in Phase 5.
import { loadScriptEnv } from './lib/env';

const env = loadScriptEnv();
console.log(
  `[backups:prune] ${new Date().toISOString()} SITE_ENV=${env.SITE_ENV}: nothing to do yet (Phase 5).`,
);
