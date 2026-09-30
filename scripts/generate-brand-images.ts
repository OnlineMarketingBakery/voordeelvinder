// Generates the favicons, app icons and the default share (Open Graph) image from the logo
// files in src/assets/brand, the site font and site.json. Not designed in Figma: these are
// proposals (docs/CONTENT-TODO.md §5.9). Run after the logo or tagline changes:
//   npm run brand:images
// Outputs are committed: public/favicon.svg, public/favicon-32.png, public/apple-touch-icon.png,
// public/icon-192.png, public/icon-512.png, src/assets/og/default.png.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path));
const dataUri = (path: string, type: string) =>
  `data:${type};base64,${read(path).toString('base64')}`;

const site = JSON.parse(read('src/content/site.json').toString()) as {
  footer: { tagline: string };
};
const badge = dataUri('src/assets/brand/logo-badge.svg', 'image/svg+xml');
const wordmark = dataUri('src/assets/brand/logo-wordmark-white.svg', 'image/svg+xml');
const font = dataUri(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  'font/woff2',
);
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? '';
const purple = token('--color-purple-600');

const page = (body: string, size: { width: number; height: number }) => `<!doctype html>
<html><head><style>
  @font-face { font-family: Bricolage; src: url(${font}) format('woff2'); font-weight: 200 800; }
  html, body { margin: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden; }
  body { background: ${purple}; font-family: Bricolage, sans-serif; color: #fff; }
</style></head><body>${body}</body></html>`;

const icon = (size: number) =>
  page(
    `<div style="display:grid;place-items:center;width:100%;height:100%">
       <img src="${badge}" style="height:${Math.round(size * 0.82)}px">
     </div>`,
    { width: size, height: size },
  );

const og = page(
  `<div style="display:flex;align-items:center;gap:56px;height:100%;padding:0 96px;box-sizing:border-box">
     <img src="${badge}" style="height:360px">
     <div>
       <img src="${wordmark}" style="height:64px;display:block">
       <p style="margin:32px 0 0;font-size:40px;line-height:1.25;letter-spacing:-0.02em;max-width:560px">${site.footer.tagline}</p>
     </div>
   </div>`,
  { width: 1200, height: 630 },
);

const browser = await chromium.launch();
async function render(html: string, width: number, height: number, out: string) {
  const tab = await browser.newPage({ viewport: { width, height } });
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(root, out), type: 'png' });
  await tab.close();
  console.log(`wrote ${out}`);
}

mkdirSync(join(root, 'src/assets/og'), { recursive: true });
await render(og, 1200, 630, 'src/assets/og/default.png');
for (const [size, out] of [
  [32, 'public/favicon-32.png'],
  [180, 'public/apple-touch-icon.png'],
  [192, 'public/icon-192.png'],
  [512, 'public/icon-512.png'],
] as const) {
  await render(icon(size), size, size, out);
}
await browser.close();

copyFileSync(join(root, 'src/assets/brand/logo-badge.svg'), join(root, 'public/favicon.svg'));
console.log('wrote public/favicon.svg');
