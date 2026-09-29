// Cron, every 5 minutes (brief §9.1 step 8, §13): resend backup records marked pending_forward
// to n8n and alert when one is older than 30 minutes. Implemented with the lead endpoint in
// Phase 5; until then it only proves the cron job, .env loading and validation work.
import { loadScriptEnv } from './lib/env';

const env = loadScriptEnv();
console.log(
  `[leads:retry] ${new Date().toISOString()} SITE_ENV=${env.SITE_ENV}: nothing to do yet (Phase 5).`,
);
