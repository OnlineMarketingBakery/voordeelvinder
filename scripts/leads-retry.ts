// Cron, every 5 minutes (brief §9.1 step 8, §13; docs/ops/ploi-staging.md): resend backup
// records marked pending_forward to n8n (src/server/lead/retry.ts). Records pending for more
// than 30 minutes are reported as an `alert` log line and make the job exit with code 1.
import { newsletterWebhookUrl } from '../src/server/env';
import { retryPending } from '../src/server/lead/retry';
import { consoleLogger } from '../src/server/log';
import { loadScriptEnv } from './lib/env';

const env = loadScriptEnv();
const result = await retryPending({
  dir: env.LEAD_BACKUP_DIR,
  urls: { lead: env.N8N_LEAD_WEBHOOK_URL, newsletter: newsletterWebhookUrl(env) },
  secret: env.N8N_WEBHOOK_SECRET,
  log: consoleLogger,
});

consoleLogger(result.failed > 0 ? 'warn' : 'info', 'leads_retry', {
  site_env: env.SITE_ENV,
  ...result,
});
if (result.overdue > 0) {
  consoleLogger('error', 'alert', {
    message: 'backup records pending for more than 30 minutes: check n8n',
    overdue: result.overdue,
  });
  process.exitCode = 1;
}
