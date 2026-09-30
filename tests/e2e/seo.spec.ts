import { expect, test } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

test('every page has a description, canonical and share tags', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    site.seo.defaultDescription,
  );
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toMatch(/^https?:\/\/[^/]+\/$/);

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImage).toMatch(/^https?:\/\//);
  const image = await request.get(new URL(ogImage!).pathname);
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );

  for (const href of [
    '/favicon.svg',
    '/favicon-32.png',
    '/apple-touch-icon.png',
    '/site.webmanifest',
  ]) {
    expect((await request.get(href)).ok(), href).toBe(true);
  }
});

test('the homepage publishes Organization, WebSite and FAQPage structured data', async ({
  page,
}) => {
  await page.goto('/');
  const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
    (text) => JSON.parse(text) as { '@type': string; mainEntity?: Array<{ name: string }> },
  );
  expect(blocks.map((block) => block['@type'])).toEqual(['Organization', 'WebSite', 'FAQPage']);

  // Only the questions the page shows (answered ones) go into FAQPage.
  const shown = await page.locator('#veelgestelde-vragen summary').allTextContents();
  const faq = blocks.find((block) => block['@type'] === 'FAQPage')!;
  expect(faq.mainEntity!.map((question) => question.name)).toEqual(
    shown.map((text) => text.trim()),
  );
});

test('page titles use the template, the homepage uses the site name', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(site.name);
  await page.goto('/styleguide');
  await expect(page).toHaveTitle(site.seo.titleTemplate.replace('{title}', 'Styleguide'));
});
