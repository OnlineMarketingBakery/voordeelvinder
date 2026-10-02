// Launch check (Phase 8): axe on every page a visitor can reach, on every project (desktop and
// phone, Chromium and WebKit). Serious or critical violations fail.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/zonnepanelen',
  '/thuisbatterij',
  '/over-ons',
  '/vergelijken',
  '/vergelijken/energie',
  '/vergelijken/energie/stappen',
  '/vergelijken/zonnepanelen',
  '/vergelijken/thuisbatterij',
  '/bedankt/energie',
  '/privacybeleid',
  '/cookiebeleid',
  '/algemene-voorwaarden',
  '/blog',
  '/blog/betaal-jij-te-veel-voor-energie',
  '/bestaat-niet',
];

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
