// The thank-you pages (brief §5, §11): /bedankt/<product>, one copy, three URLs, noindex and out
// of the sitemap. They render for a direct visit too (tracking), with nothing personal on them.
// Landing here from the form's "Verstuur" is covered in form.spec.ts.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import thanks from '../../src/content/pages/bedankt.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };

const block = thanks.sections[0]!;
const PRODUCTS = ['energie', 'zonnepanelen', 'thuisbatterij'] as const;

for (const product of PRODUCTS) {
  test(`/bedankt/${product} renders the thank-you card, noindex, for a direct visit`, async ({
    page,
  }) => {
    const response = await page.goto(`/bedankt/${product}`);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(site.seo.titleTemplate.replace('{title}', thanks.seo.title));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(block.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    // Its own URL as canonical: three pages, not duplicates of one another.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`^https?://[^/]+/bedankt/${product}/?$`),
    );

    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: block.cta.label })).toHaveAttribute(
      'href',
      block.cta.href,
    );
    // The morph targets for the form card and the panel mascot (Phase 7).
    await expect(page.locator('[data-morph="form-card"]')).toHaveCount(1);
    await expect(page.locator('[data-morph="form-mascot"]')).toHaveCount(1);
    // The card carries the form card's view-transition name, and nothing else on the page does,
    // so "Verstuur" morphs the form card into it.
    await expect(page.locator('[data-morph="form-card"]')).toHaveCSS(
      'view-transition-name',
      'form-card',
    );
    expect(
      await page.evaluate(
        () =>
          [...document.querySelectorAll('*')].filter(
            (element) => getComputedStyle(element).viewTransitionName === 'form-card',
          ).length,
      ),
    ).toBe(1);
    // Phase 4: every visit celebrates (src/scripts/celebrate.ts); Phase 5 gates it on the lead.
    await expect(page.locator('[data-celebration]')).toHaveAttribute('data-celebrate', '');
  });
}

test('a direct visit shows nothing personal, even with a stored form session', async ({ page }) => {
  await page.goto('/vergelijken/energie');
  await page.evaluate(() =>
    sessionStorage.setItem(
      'voordeelvinder:form:energie',
      JSON.stringify({
        version: 1,
        product: 'energie',
        step: 'contact',
        answers: { first_name: 'Janneke', email: 'janneke@example.be' },
      }),
    ),
  );
  await page.goto('/bedankt/energie');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(block.title);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('Janneke');
  expect(text).not.toContain('janneke@example.be');
});

test('the thank-you pages have no serious accessibility violations', async ({ page }) => {
  for (const product of PRODUCTS) {
    await page.goto(`/bedankt/${product}`);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, `${product}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }
});

test('the sitemap leaves out the thank-you pages', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toContain('/bedankt');
});

test('the badge keeps its designed size and both fox layers load', async ({ page }) => {
  await page.goto('/bedankt/energie');
  const badge = await page.locator('[data-morph="form-mascot"]').boundingBox();
  expect(badge?.width).toBeCloseTo(156, 0);
  expect(badge?.height).toBeCloseTo(156, 0);
  // Both layers use the same srcset, so the browser fetches the image once.
  const foxes = page.locator('[data-morph="form-mascot"] img');
  await expect(foxes).toHaveCount(2);
  for (const fox of await foxes.all()) {
    await expect
      .poll(() => fox.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
});
