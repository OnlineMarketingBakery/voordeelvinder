import { expect, test } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

// Full-page screenshots for PR descriptions (brief §4.6). Saved per project under
// test-results/screenshots/ and uploaded as a CI artifact.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'zonnepanelen', path: '/zonnepanelen' },
  { name: 'thuisbatterij', path: '/thuisbatterij' },
  { name: 'styleguide', path: '/styleguide' },
  { name: 'vergelijken', path: '/vergelijken' },
  { name: 'vergelijken-energie', path: '/vergelijken/energie' },
  { name: 'vergelijken-energie-both', path: '/vergelijken/energie?energie=both' },
  { name: 'vergelijken-zonnepanelen', path: '/vergelijken/zonnepanelen' },
  { name: 'vergelijken-thuisbatterij', path: '/vergelijken/thuisbatterij' },
  { name: 'bedankt-energie', path: '/bedankt/energie' },
  { name: 'bedankt-zonnepanelen', path: '/bedankt/zonnepanelen' },
  { name: 'bedankt-thuisbatterij', path: '/bedankt/thuisbatterij' },
];

for (const { name, path } of PAGES) {
  test(`screenshot: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    // Islands (the form) have hydrated and applied the URL (?energie=).
    await page.locator('astro-island[ssr]').first().waitFor({ state: 'detached' });
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}/${name}.png`,
      fullPage: true,
      // CSS pixels, not device pixels: long pages at DPR 3 exceed WebKit's 32,767px limit.
      scale: 'css',
    });
  });
}

// The mobile menu drawer, open: the viewport, not the page behind it.
test('screenshot: menu-open', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'the drawer is the menu below 1024px');
  await page.goto('/zonnepanelen');
  await page.getByRole('button', { name: site.header.menuLabel, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: site.header.menuLabel });
  await expect(drawer.locator('[data-menu-panel]')).toHaveCSS('opacity', '1');
  // The fox is only fetched once the drawer shows.
  await expect(drawer.locator('img')).toHaveJSProperty('complete', true);
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}/menu-open.png`,
    scale: 'css',
  });
});
