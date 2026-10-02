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
    'Maak kennis met Foxy, onze speurneus',
    'Jij vult in. Wij vergelijken. Jij bespaart.',
    'Waar we voor staan',
    'Wat we nooit doen.',
    'Gratis? Waar zit dan het addertje?',
    'Veelgestelde vragen',
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

test('the FAQ page shows every group and its questions as FAQPage data', async ({ page }) => {
  await page.goto('/veelgestelde-vragen');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veelgestelde vragen');
  for (const group of [
    'Overstappen van energieleverancier',
    'Je energiefactuur en verbruik',
    'Contracten en prijzen',
    'Digitale meter en capaciteitstarief',
    'Verhuizen, sociaal tarief en andere situaties',
    'Over VoordeelVinder',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: group })).toBeVisible();
  }
  // The question that waits for the call-moment decision is not shown.
  await expect(page.getByText('Wie belt mij, en wanneer?')).toHaveCount(0);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = ld.map((text) => JSON.parse(text)).find((data) => data['@type'] === 'FAQPage');
  expect(faq.mainEntity.length).toBeGreaterThan(40);
});

test('"Veelgestelde vragen" in the header leads to the FAQ page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the desktop header link');
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Veelgestelde vragen' }).click();
  await expect(page).toHaveURL(/\/veelgestelde-vragen\/?$/);
});
