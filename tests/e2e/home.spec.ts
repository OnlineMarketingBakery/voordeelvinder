import { expect, test } from '@playwright/test';

import home from '../../src/content/pages/home.json' with { type: 'json' };
import type { Section } from '../../src/schemas/page';

// The JSON import types every block as one loose union; read the hero with its schema type.
type HeroBlock = Extract<Section, { type: 'hero' }>;
const hero = home.sections.find((s) => s.type === 'hero') as unknown as HeroBlock;

test.describe('home hero', () => {
  test('shows the only h1, the copy and the CTA to the form', async ({ page }) => {
    await page.goto('/');
    const section = page.getByRole('region', { name: hero.title });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(section.getByRole('heading', { level: 1 })).toHaveText(hero.title);
    await expect(section).toContainText(hero.eyebrow!.text);
    await expect(section).toContainText('voordeligst');
    const cta = section.getByRole('link', { name: hero.cta.label });
    await expect(cta).toHaveAttribute('href', hero.cta.href);
    await expect(cta).toBeVisible();
  });

  test('loads the mascot as the priority image, in modern formats', async ({ page }) => {
    await page.goto('/');
    const mascot = page.locator('img[fetchpriority="high"]');
    await expect(mascot).toHaveCount(1);
    await expect(mascot).toHaveAttribute('loading', 'eager');
    await expect(page.locator('picture source[type="image/avif"]').first()).toBeAttached();
    await expect
      .poll(() => mascot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  });

  test('lists the three USPs', async ({ page }) => {
    await page.goto('/');
    const items = page.getByRole('region', { name: hero.title }).getByRole('listitem');
    await expect(items).toHaveCount(hero.usps!.length);
    for (const usp of hero.usps!) {
      await expect(items.filter({ hasText: usp.label.at(-1)! })).toHaveCount(1);
    }
  });

  test('never hides an LCP candidate (h1, body copy) while waiting for motion', async ({
    page,
  }) => {
    // A short phone viewport: the art is below the fold, so the body copy is the largest text.
    await page.setViewportSize({ width: 360, height: 600 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const section = page.getByRole('region', { name: hero.title });
    await expect(section.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
    await expect(section.locator('h1 + p')).toHaveCSS('opacity', '1');
  });
});

test.describe('home sections', () => {
  test('every in-page link in the header and footer has a target', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('header a[href^="/#"], footer a[href^="/#"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
    const ids = [...new Set(hrefs.map((href) => href.slice(2)))];
    // FAQ (#veelgestelde-vragen) arrives with the next home PR.
    const pending = new Set(['veelgestelde-vragen']);
    for (const id of ids.filter((id) => !pending.has(id))) {
      await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
    }
  });

  test('shows one h2 per section, in order', async ({ page }) => {
    await page.goto('/');
    const expected = home.sections.filter((s) => s.type !== 'hero').map((s) => s.title);
    await expect(page.locator('main h2')).toHaveText(expected);
  });
});
