import { test } from '@playwright/test';

// Full-page screenshots for PR descriptions (brief §4.6). Saved per project under
// test-results/screenshots/ and uploaded as a CI artifact.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'zonnepanelen', path: '/zonnepanelen' },
  { name: 'thuisbatterij', path: '/thuisbatterij' },
  { name: 'styleguide', path: '/styleguide' },
];

for (const { name, path } of PAGES) {
  test(`screenshot: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}/${name}.png`,
      fullPage: true,
      // CSS pixels, not device pixels: long pages at DPR 3 exceed WebKit's 32,767px limit.
      scale: 'css',
    });
  });
}
