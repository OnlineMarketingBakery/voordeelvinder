import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import home from '../../src/content/pages/home.json' with { type: 'json' };

test('home page renders its content in Dutch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'nl-BE');
  await expect(page).toHaveTitle(home.seo.title);
  const hero = home.sections.find((section) => section.type === 'hero');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(hero!.title);
  expect(errors).toEqual([]);
});

test('home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('health endpoint answers', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect((await response.json()).ok).toBe(true);
});
