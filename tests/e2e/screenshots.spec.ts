import { test } from '@playwright/test';

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
