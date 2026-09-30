import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

const visibleNav = site.header.nav.filter((link) => !('requires' in link));

test.describe('header', () => {
  test('desktop: logo, centred nav and CTA; "Blogs" hidden until there are posts', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop layout');
    await page.goto('/');
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: site.header.logoLabel })).toBeVisible();
    const nav = header.getByRole('navigation', { name: site.header.navLabel });
    for (const link of visibleNav) {
      await expect(nav.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
    await expect(nav.getByRole('link', { name: 'Blogs' })).toHaveCount(0);
    await expect(header.getByRole('link', { name: site.header.cta.label })).toHaveAttribute(
      'href',
      site.header.cta.href,
    );
    await expect(header.getByRole('button', { name: site.header.menuLabel })).toBeHidden();
  });

  test('mobile: the menu opens, closes on Escape and returns focus', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile layout');
    await page.goto('/');
    const button = page.getByRole('button', { name: site.header.menuLabel });
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu.getByRole('link', { name: visibleNav[0]!.label })).toBeVisible();
    await expect(menu.getByRole('link', { name: site.header.cta.label })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('mobile: tabbing out of the open menu closes it', async ({
    page,
    isMobile,
    browserName,
  }) => {
    test.skip(!isMobile || browserName === 'webkit', 'mobile layout; WebKit does not Tab to links');
    await page.goto('/');
    const button = page.getByRole('button', { name: site.header.menuLabel });
    await button.click();
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: site.header.cta.label }).focus();
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('stays on screen while scrolling and keeps its view-transition name', async ({ page }) => {
    await page.goto('/styleguide');
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect
      .poll(async () => (await page.locator('header').boundingBox())?.y)
      .toBeLessThanOrEqual(0);
    const name = await page
      .locator('header')
      .evaluate((el) => getComputedStyle(el).viewTransitionName);
    expect(name).toBe('site-header');
  });

  test('skip link moves focus to the main content', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: site.skipLink });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});

test.describe('footer', () => {
  test('shows tagline, columns, contact and the copyright year', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByText(site.footer.tagline)).toBeVisible();
    for (const heading of [
      site.footer.links.heading,
      site.footer.legal.heading,
      site.footer.contact.heading,
    ]) {
      await expect(footer.getByRole('heading', { name: heading })).toBeVisible();
    }
    // exact: the newsletter's consent line links "privacybeleid" too.
    for (const link of site.footer.legal.items) {
      await expect(footer.getByRole('link', { name: link.label, exact: true })).toHaveAttribute(
        'href',
        link.href,
      );
    }
    await expect(
      footer.getByRole('link', { name: new RegExp(site.contact.email.value) }),
    ).toHaveAttribute('href', `mailto:${site.contact.email.value}`);
    // Astro 7 drops whitespace across line breaks in templates; guard the label/value spacing.
    await expect(footer).toContainText(
      `${site.footer.contact.emailLabel} ${site.contact.email.value}`,
    );
    await expect(footer).toContainText(
      `${site.footer.contact.phoneLabel} ${site.contact.phone.display}`,
    );
    await expect(footer).toContainText(String(new Date().getFullYear()));
  });

  test('newsletter: field, button and the consent with its privacy link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    const { newsletter } = site.footer;
    const input = footer.getByLabel(newsletter.label);
    await expect(input).toHaveAttribute('placeholder', newsletter.placeholder);
    await expect(input).toBeEnabled();
    await expect(footer.getByRole('button', { name: newsletter.button })).toBeEnabled();
    const consent = footer.getByRole('checkbox', { name: newsletter.consent.label });
    await expect(consent).toBeVisible();
    await expect(consent).not.toBeChecked();
    for (const link of newsletter.consent.links) {
      await expect(footer.locator('label').getByRole('link', { name: link.text })).toHaveAttribute(
        'href',
        link.href,
      );
    }
    // More in tests/e2e/newsletter.spec.ts.
  });
});

test('home page with header and footer has no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
