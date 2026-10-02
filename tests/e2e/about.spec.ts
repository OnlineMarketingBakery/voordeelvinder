// The About us page (Figma 100:2, src/content/pages/over-ons.json): its sections render, the
// header and footer "Over ons" lead here, nothing scrolls sideways and axe finds nothing serious.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import about from '../../src/content/pages/over-ons.json' with { type: 'json' };

test('About us renders every section as designed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/over-ons');
  const hero = about.sections[0] as { title: string };
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(hero.title);
  for (const title of [
    'Hoe VoordeelVinder ontstond',
    'Waar we voor staan',
    'Wat we nooit doen.',
    'Is VoordeelVinder iets voor mij?',
    'Niet zomaar een vergelijker',
  ]) {
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2, name: title }),
    ).toBeVisible();
  }
  const width = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(width).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('"Over ons" in the footer leads to the page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Over ons' }).click();
  await expect(page).toHaveURL(/\/over-ons\/?$/);
});

test('About us has no serious accessibility violations', async ({ page }) => {
  await page.goto('/over-ons');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
