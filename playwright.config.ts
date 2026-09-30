import { defineConfig, devices } from '@playwright/test';

import {
  E2E_BACKUP_DIR,
  E2E_RATE_LIMIT,
  E2E_WEBHOOK_SECRET,
  MOCK_N8N_PORT,
  MOCK_N8N_URL,
} from './tests/support/e2e-env';

const PORT = 4321;
const baseURL = `http://127.0.0.1:${PORT}`;
const CI = Boolean(process.env.CI);

const desktop = { viewport: { width: 1440, height: 900 } };
// devices['iPhone 13'] has a 390x664 viewport; the brief asks for 390x844.
const mobile = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'nl-BE',
    // Stable runs; a separate @motion-on project arrives with the form motion (Phase 4).
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], ...desktop } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], ...mobile } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], ...desktop } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], ...mobile } },
  ],
  // Tests run against the production build (`npm run build` first), started the same way as on Ploi.
  webServer: [
    {
      // The lead pipeline runs against a mock n8n, never a real webhook (brief §9.4).
      command: `npx tsx tests/support/mock-n8n.ts ${MOCK_N8N_PORT}`,
      url: `${MOCK_N8N_URL}/_health`,
      reuseExistingServer: !CI,
      timeout: 30_000,
    },
    {
      command: 'node server.mjs',
      url: `${baseURL}/api/health`,
      reuseExistingServer: !CI,
      timeout: 30_000,
      // SITE_ENV comes from the environment (CI) or .env, and must match the build's (never
      // production: every lead is a test lead). These win over .env (server.mjs).
      env: {
        HOST: '127.0.0.1',
        PORT: String(PORT),
        LEAD_BACKUP_DIR: E2E_BACKUP_DIR,
        RATE_LIMIT_PER_HOUR: String(E2E_RATE_LIMIT),
        N8N_LEAD_WEBHOOK_URL: `${MOCK_N8N_URL}/webhook/lead`,
        N8N_NEWSLETTER_WEBHOOK_URL: `${MOCK_N8N_URL}/webhook/newsletter`,
        N8N_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET,
        TURNSTILE_SECRET_KEY: '',
        TURNSTILE_VERIFY_URL: `${MOCK_N8N_URL}/turnstile/siteverify`,
      },
    },
  ],
});
