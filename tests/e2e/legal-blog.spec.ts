import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

// Legal pages: neutral placeholders (CONTENT-TODO 3.1, 3.2), one per footer link.
for (const { label, href } of site.footer.legal.items) {
  test.describe(href, () => {
    test('opens from the footer, with its h1 and the placeholder notice', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.getByRole('contentinfo').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}/?$`));

      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(page).toHaveTitle(
        site.seo.titleTemplate.replace('{title}', (await h1.textContent())!.trim()),
      );
      await expect(page.getByRole('note')).toHaveText(site.legal.placeholderNotice);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
      expect(errors).toEqual([]);
    });

    test('has no serious accessibility violations', async ({ page }) => {
      await page.goto(href);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  });
}

// No real posts yet (CONTENT-TODO 2.14): only the designer's sample posts, drafts that a
// non-production build (like this one) shows and production leaves out.
test('the blog shows the sample posts outside production', async ({ page, request }) => {
  expect((await request.get('/blog/pagina/2')).status()).toBe(404);
  await page.goto('/blog');
  await expect(
    page
      .getByRole('main')
      .getByRole('heading', { name: 'Betaal jij te veel voor energie? Zo ontdek je het' })
      .first(),
  ).toBeVisible();
  // The header links to it (on a phone inside the closed menu drawer).
  await page.goto('/');
  expect(
    await page.locator('header a[href="/blog"], header a[href="/blog/"]').count(),
  ).toBeGreaterThan(0);
});
