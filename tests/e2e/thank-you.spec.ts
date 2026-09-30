// The thank-you pages (brief §5, §11): /bedankt/<product>, one copy, three URLs, noindex and out
// of the sitemap. They render for a direct visit too (tracking), with nothing personal on them,
// and without the celebration. Landing here from the form's "Verstuur" is covered in
// form.spec.ts and form-submit.spec.ts.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import thanks from '../../src/content/pages/bedankt.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };

const block = thanks.sections[0]!;
const PRODUCTS = ['energie', 'zonnepanelen', 'thuisbatterij'] as const;

/** How many elements on the page carry the form card's view-transition name. */
const namedFormCard = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('*')].filter(
        (element) => getComputedStyle(element).viewTransitionName === 'form-card',
      ).length,
  );

/** Clicks the header CTA "Gratis beginnen" (in the menu on mobile). */
async function clickHeaderCta(page: Page) {
  const menu = page.getByRole('button', { name: site.header.menuLabel });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator('header')
    .getByRole('link', { name: site.header.cta.label })
    .filter({ visible: true })
    .click();
}

/**
 * Records the thank-you card's view-transition name at `pagereveal` (window.__revealName) and
 * at `pageswap` (sessionStorage, it outlives the page). These listeners are added before the
 * page's own scripts, so they see the name before the page clears it.
 */
async function recordCardNames(page: Page) {
  await page.addInitScript(() => {
    const name = () => {
      const card = document.querySelector('[data-morph="form-card"]');
      return card && location.pathname.startsWith('/bedankt/')
        ? getComputedStyle(card).viewTransitionName
        : undefined;
    };
    addEventListener('pagereveal', () => {
      (window as unknown as { __revealName?: string }).__revealName = name();
    });
    addEventListener('pageswap', () => {
      const value = name();
      if (value !== undefined) sessionStorage.setItem('e2e:swapName', value);
    });
  });
}

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
    // A direct visit: the card isn't named form-card (only an arrival from the form is), and
    // nothing else on the page is either.
    await expect(page.locator('[data-morph="form-card"]')).toHaveCSS(
      'view-transition-name',
      'none',
    );
    expect(await namedFormCard(page)).toBe(0);
    // A direct visit never celebrates: only a lead the endpoint accepted does
    // (src/scripts/celebrate.ts; form-submit.spec.ts).
    await page.waitForLoadState('load');
    await expect(page.locator('[data-celebration]')).not.toHaveAttribute('data-celebrate');
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

test.describe('the form card morph runs one way: from the form into the thank-you card', () => {
  test('arriving from the form, the card carries form-card for the transition only', async ({
    page,
  }) => {
    await recordCardNames(page);
    await page.goto('/vergelijken/energie');
    await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
    // How the form's "Verstuur" navigates (FormIsland.tsx): the one-time marker, then
    // window.location.assign.
    await page.evaluate(() => {
      sessionStorage.setItem('voordeelvinder:morph', 'form-card');
      window.location.assign('/bedankt/energie');
    });
    await page.waitForURL('**/bedankt/energie');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(block.title);
    const card = page.locator('[data-morph="form-card"]');
    const revealed = await page.evaluate(
      () => (window as unknown as { __revealName?: string }).__revealName,
    );
    // Named when the new page is captured (pagereveal: Chromium, Safari 18.2+), then cleared
    // once the transition is over.
    expect(revealed).toBe('form-card');
    await expect(card).toHaveCSS('view-transition-name', 'none');
    // Leaving, the card is never named: nothing morphs back into a form card.
    await clickHeaderCta(page);
    await page.waitForURL('**/vergelijken');
    expect(await page.evaluate(() => sessionStorage.getItem('e2e:swapName'))).toBe('none');
  });

  test('a direct visit, then the header CTA to /vergelijken: the card is never named', async ({
    page,
  }) => {
    await recordCardNames(page);
    await page.goto('/bedankt/energie');
    const card = page.locator('[data-morph="form-card"]');
    await expect(card).toHaveCSS('view-transition-name', 'none');
    expect(await namedFormCard(page)).toBe(0);
    const revealed = await page.evaluate(
      () => (window as unknown as { __revealName?: string }).__revealName,
    );
    expect(revealed).toBe('none');

    expect(site.header.cta.href).toBe('/vergelijken');
    await clickHeaderCta(page);
    await page.waitForURL('**/vergelijken');
    await expect(page.locator('section[data-morph="form-card"]')).toHaveCSS(
      'view-transition-name',
      'form-card',
    );
    expect(await page.evaluate(() => sessionStorage.getItem('e2e:swapName'))).toBe('none');
  });
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
