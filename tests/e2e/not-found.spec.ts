import { readdirSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import notFound from '../../src/content/pages/404.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };

const block = notFound.sections[0]!;

test('an unknown URL answers 404 with the friendly page', async ({ page }) => {
  const response = await page.goto('/deze-pagina-bestaat-niet');
  expect(response?.status()).toBe(404);
  expect(response?.headers()['content-type']).toContain('text/html');

  await expect(page).toHaveTitle(site.seo.titleTemplate.replace('{title}', notFound.seo.title));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(block.title);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  // Served at any URL: no canonical of its own.
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const main = page.locator('main');
  await expect(main.getByRole('link', { name: block.primaryCta.label })).toHaveAttribute(
    'href',
    block.primaryCta.href,
  );
  await expect(main.getByRole('link', { name: block.secondaryLink.label })).toHaveAttribute(
    'href',
    block.secondaryLink.href,
  );
});

test('the 404 page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/deze-pagina-bestaat-niet');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('an unknown campaign variant is a 404, not an empty page', async ({ request }) => {
  const response = await request.get('/l/bestaat-niet');
  expect(response.status()).toBe(404);
});

test('the sitemap leaves out the 404 and campaign variants', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toMatch(/\/404|\/l\//);
});

// No variants ship yet (no campaign copy); these run once a file exists in src/content/landing.
const variants = readdirSync('src/content/landing')
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .map((file) => file.slice(0, -'.md'.length));

for (const slug of variants) {
  test(`/l/${slug} is noindex and keeps the ad's query string on the form links`, async ({
    page,
  }) => {
    const query = 'utm_source=e2e&utm_campaign=test&gclid=e2e-click';
    const response = await page.goto(`/l/${slug}?${query}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    const links = page.locator('main a[href^="/vergelijken"]');
    expect(await links.count()).toBeGreaterThan(0);
    for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/vergelijken\/(energie|zonnepanelen|thuisbatterij)\?/);
      expect(href).toContain(query);
    }
  });
}
