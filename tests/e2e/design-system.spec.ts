import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the self-hosted font loads and is used for text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const loaded = await page.evaluate(() =>
    [...document.fonts].some((f) => f.family.includes('Bricolage') && f.status === 'loaded'),
  );
  expect(loaded).toBe(true);
  const family = await page
    .getByRole('heading', { level: 1 })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('Bricolage');

  const preload = page.locator('link[rel="preload"][as="font"][type="font/woff2"]');
  await expect(preload).toHaveCount(1);
});

test('the styleguide renders every token group and stays out of search', async ({ page }) => {
  await page.goto('/styleguide');
  for (const heading of ['Colours', 'Type', 'Radius', 'Shadows']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('pages opt in to native view transitions and navigate normally', async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  if (browserName === 'chromium') {
    const hasRule = await page.evaluate(() =>
      [...document.styleSheets].some((sheet) =>
        [...sheet.cssRules].some((rule) => rule.constructor.name === 'CSSViewTransitionRule'),
      ),
    );
    expect(hasRule).toBe(true);
  }

  await page.goto('/styleguide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Styleguide');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
