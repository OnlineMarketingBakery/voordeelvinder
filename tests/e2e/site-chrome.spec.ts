import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

const visibleNav = site.header.nav.filter((link) => !('requires' in link));

// The mobile menu (below 1024px, src/components/site/Header.astro): the button, the drawer (a
// modal dialog named by its eyebrow) and its close button. `exact`: "Menu sluiten" contains "Menu".
const menuButton = (page: Page) =>
  page.getByRole('button', { name: site.header.menuLabel, exact: true });
const drawer = (page: Page) => page.getByRole('dialog', { name: site.header.menuLabel });
const closeButton = (page: Page) =>
  drawer(page).getByRole('button', { name: site.header.closeLabel });
const drawerLink = (page: Page, name: string) =>
  drawer(page).getByRole('link', { name, exact: true });
const panel = (page: Page) => page.locator('[data-menu-panel]');

async function openMenu(page: Page) {
  await menuButton(page).click();
  await expect(drawer(page)).toBeVisible();
  await expect(closeButton(page)).toBeFocused();
}

/** The page's scroll lock: the class on <html> and what it does. */
const scrollLock = (page: Page) =>
  page.evaluate(() => ({
    locked: document.documentElement.classList.contains('menu-open'),
    overflow: getComputedStyle(document.documentElement).overflowY,
  }));

/** Where focus is: in the drawer, on the page itself (past the last stop), or anywhere else. */
const focusIn = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return 'page';
    return active.closest('#mobile-menu') ? 'drawer' : 'outside';
  });

/** Records every CSS transition and animation that starts from now on (motionLog). */
const recordMotion = (page: Page) =>
  page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { __motion: string[] }).__motion = log;
    const who = (target: EventTarget | null) =>
      target instanceof Element && target.hasAttribute('data-menu-panel')
        ? 'panel'
        : target instanceof Element
          ? target.tagName.toLowerCase()
          : '?';
    document.addEventListener(
      'transitionrun',
      (event) => log.push(`transition:${event.propertyName}:${who(event.target)}`),
      true,
    );
    document.addEventListener(
      'animationstart',
      (event) => log.push(`animation:${event.animationName}:${who(event.target)}`),
      true,
    );
  });
const motionLog = (page: Page) =>
  page.evaluate(() => (window as unknown as { __motion: string[] }).__motion);

/** The widest sideways overflow of the page, sampled every frame from now until stopped. */
const sampleOverflow = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __overflow: number; __sampling: boolean };
    w.__overflow = 0;
    w.__sampling = true;
    const sample = () => {
      const root = document.documentElement;
      w.__overflow = Math.max(w.__overflow, root.scrollWidth - root.clientWidth);
      if (w.__sampling) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
const stopSampling = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __overflow: number; __sampling: boolean };
    w.__sampling = false;
    return w.__overflow;
  });

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
    await expect(menuButton(page)).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
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

test.describe('header: the mobile menu drawer', () => {
  test.skip(({ isMobile }) => !isMobile, 'the drawer is the menu below 1024px');

  test('opens as a modal dialog with focus on its close button', async ({ page }) => {
    await page.goto('/');
    const button = menuButton(page);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(button).toHaveAttribute('aria-controls', 'mobile-menu');

    await openMenu(page);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    // Shown with showModal(): in the top layer, the page behind it inert.
    expect(await page.locator('#mobile-menu').evaluate((dialog) => dialog.matches(':modal'))).toBe(
      true,
    );
    const nav = drawer(page).getByRole('navigation', { name: site.header.navLabel });
    for (const link of visibleNav) {
      const row = nav.getByRole('link', { name: link.label, exact: true });
      await expect(row).toHaveAttribute('href', link.href);
      // The number (01, 02, …) and the arrow are decoration: the name is the label alone.
      await expect(row).toHaveAccessibleName(link.label);
    }
    await expect(drawer(page).getByRole('link', { name: site.header.cta.label })).toHaveAttribute(
      'href',
      site.header.cta.href,
    );
  });

  test('Escape closes it and returns focus to the menu button', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    expect((await scrollLock(page)).locked).toBe(false);
  });

  test('the close button and a tap beside the panel close it; focus returns', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await closeButton(page).click();
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();

    await openMenu(page);
    // The strip of dimmed page left of the panel (3rem at 390 px).
    await page.locator('[data-menu-backdrop]').click({ position: { x: 12, y: 400 } });
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    expect((await scrollLock(page)).locked).toBe(false);
  });

  test('Tab and Shift+Tab never leave the open drawer', async ({ page, browserName }) => {
    await page.goto('/');
    await openMenu(page);
    const stops: string[] = [];
    for (let press = 0; press < visibleNav.length + 4; press += 1) {
      await page.keyboard.press('Tab');
      expect(await focusIn(page)).not.toBe('outside');
      stops.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
    }
    for (let press = 0; press < visibleNav.length + 2; press += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusIn(page)).not.toBe('outside');
    }
    // Chromium tabs to links as well (WebKit only to buttons by default): every row and the CTA
    // were stops on the way round.
    if (browserName === 'chromium') {
      expect(stops).toEqual(
        expect.arrayContaining([...visibleNav.map((link) => link.label), site.header.cta.label]),
      );
    }
  });

  test('locks the page scroll while open, without a shift or sideways scroll', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('header').boundingBox();
    await openMenu(page);
    expect(await scrollLock(page)).toEqual({ locked: true, overflow: 'hidden' });
    expect(await page.locator('header').boundingBox()).toEqual(before);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);

    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    const after = await scrollLock(page);
    expect(after.locked).toBe(false);
    expect(after.overflow).not.toBe('hidden');
  });

  test('a link closes it and navigates; after going back it is closed', async ({ page }) => {
    await page.goto('/zonnepanelen');
    // Kept only if the way back is the back/forward cache (a reload starts a new window).
    await page.evaluate(() => {
      (window as unknown as { __kept: boolean }).__kept = true;
    });
    await openMenu(page);
    const link = visibleNav[0]!;
    await drawerLink(page, link.label).click();
    await expect(page).toHaveURL(new RegExp(`${link.href}$`));
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    expect((await scrollLock(page)).locked).toBe(false);

    await page.goBack();
    await expect(page).toHaveURL(/\/zonnepanelen\/?$/);
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    expect((await scrollLock(page)).locked).toBe(false);
    const restored = await page.evaluate(
      () => (window as unknown as { __kept?: boolean }).__kept === true,
    );
    test.info().annotations.push({
      type: 'back',
      description: restored ? 'restored from the back/forward cache' : 'reloaded',
    });
  });

  test('a link to a section of this page closes it and scrolls there', async ({ page }) => {
    await page.goto('/');
    // The in-page link whose section is furthest down, so the page has to scroll.
    const anchors = visibleNav.filter((link) => link.href.startsWith('/#'));
    const tops = await page.evaluate(
      (ids) => ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? 0),
      anchors.map((link) => link.href.slice(2)),
    );
    const link = anchors[tops.indexOf(Math.max(...tops))]!;

    await openMenu(page);
    await drawerLink(page, link.label).click();
    await expect(drawer(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${link.href}$`));
    await expect(page.locator(link.href.slice(1))).toBeInViewport();
    expect((await scrollLock(page)).locked).toBe(false);
    // Focus doesn't jump back to the menu button at the top of the page.
    await expect(menuButton(page)).not.toBeFocused();
  });

  test('pagehide and a restore from the back/forward cache close it at once', async ({ page }) => {
    await page.goto('/');
    for (const type of ['pagehide', 'pageshow'] as const) {
      await openMenu(page);
      const stillOpen = await page.evaluate((type) => {
        window.dispatchEvent(new PageTransitionEvent(type, { persisted: true }));
        return document.querySelector('dialog')?.open;
      }, type);
      // At once: no animation to wait for.
      expect(stillOpen, type).toBe(false);
      expect((await scrollLock(page)).locked, type).toBe(false);
      await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('growing past 1024 px closes it at once', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.setViewportSize({ width: 1100, height: 844 });
    await expect(page.locator('#mobile-menu')).not.toHaveAttribute('open');
    expect((await scrollLock(page)).locked).toBe(false);
    await expect(menuButton(page)).toBeHidden();
  });

  test('with reduced motion (the suite default) it only fades', async ({ page }) => {
    await page.goto('/');
    await recordMotion(page);
    await openMenu(page);
    await expect(panel(page)).toHaveCSS('opacity', '1');
    await expect(panel(page)).toHaveCSS('translate', 'none');
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();

    const started = await motionLog(page);
    expect(started).toContain('transition:opacity:panel');
    expect(started.filter((entry) => entry.startsWith('animation:'))).toEqual([]);
    expect(
      started.filter((entry) => /^transition:(translate|rotate|scale|transform):/.test(entry)),
    ).toEqual([]);
  });

  test('the open drawer has no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(panel(page)).toHaveCSS('opacity', '1');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the panel springs in and slides out; nothing scrolls sideways at 390 px', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await recordMotion(page);
      await sampleOverflow(page);
      await openMenu(page);
      await expect.poll(() => motionLog(page)).toContain('transition:translate:panel');
      // The links trail in, then the fox waves once it has popped up.
      await expect.poll(() => motionLog(page)).toContain('transition:translate:li');
      await expect.poll(() => motionLog(page)).toContain('animation:menu-wave:img');

      await closeButton(page).click();
      // The page is free at once; the dialog closes once the panel is out.
      expect((await scrollLock(page)).locked).toBe(false);
      await expect(drawer(page)).toBeHidden();
      await expect(menuButton(page)).toBeFocused();
      expect(await stopSampling(page)).toBeLessThanOrEqual(0);
    });
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
