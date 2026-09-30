// Settings of the e2e run (playwright.config.ts): the built server posts leads to the mock n8n
// (tests/support/mock-n8n.ts), never a real webhook (brief §9.4), and writes its backups to
// E2E_BACKUP_DIR. tests/e2e/lead.spec.ts reads both. Fake values only.
export const MOCK_N8N_PORT = 4390;
export const MOCK_N8N_URL = `http://127.0.0.1:${MOCK_N8N_PORT}`;
/** Relative to the repo root (the server's working directory). */
export const E2E_BACKUP_DIR = '.cache/e2e/lead-backups';
export const E2E_WEBHOOK_SECRET = 'e2e-mock-webhook-secret';
/**
 * High enough for every form test of every project: they all come from 127.0.0.1.
 * lead.spec.ts tests the limit from its own (forwarded) IP.
 */
export const E2E_RATE_LIMIT = 500;
