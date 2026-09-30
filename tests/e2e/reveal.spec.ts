import { expect, test } from '@playwright/test';

// The styleguide's shadow list uses data-reveal-stagger (far below the fold).
const items = '[data-reveal-stagger] > *';

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('below-the-fold items start hidden and reveal once when scrolled into view', async ({
    page,
  }) => {
    await page.goto('/styleguide');
    const first = page.locator(items).first();
    await expect(first).toHaveAttribute('data-reveal-ready', '');
    await expect(first).toHaveCSS('opacity', '0');

    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveClass(/is-revealed/);
    await expect(first).toHaveCSS('opacity', '1');

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(first).toHaveClass(/is-revealed/);
  });
});

test('with reduced motion nothing is hidden', async ({ page }) => {
  await page.goto('/styleguide');
  await expect(page.locator('[data-reveal-ready]')).toHaveCount(0);
  await expect(page.locator(items).first()).toHaveCSS('opacity', '1');
});
