// The form's motion language in the browser (docs/MOTION.md): the steps bar (its buttons and the
// draggable pill jump back), the outgoing step's copy (visual only: outside the form,
// aria-hidden, inert, gone after the transition), reduced motion (no slide) and no sideways
// scroll while steps slide. The pure parts are in tests/unit/form-experience.test.ts.
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import { stubLead, stubTurnstile } from '../support/form-submit';

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
  await stubLead(page);
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
}

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
const next = (page: Page) => page.getByRole('button', { name: copy.buttons.next, exact: true });
const control = (page: Page, name: string) =>
  page.getByLabel(name).and(page.locator('input, select, textarea'));
const bar = (page: Page) => page.locator('[data-steps-bar]');
const pill = (page: Page) => page.locator('[data-steps-pill]');
const jump = (step: number, title: string) =>
  copy.progressJump.replace('{step}', String(step)).replace('{title}', title);

/** A radio picked with the keyboard (no auto-advance racing the test). */
async function choose(page: Page, name: string) {
  const radio = page.getByRole('radio', { name, exact: true });
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
}

/** /vergelijken/zonnepanelen to its third step, "Wat voor dak heb je?". */
async function toRoof(page: Page) {
  await open(page, '/vergelijken/zonnepanelen');
  await control(page, 'Wat is je postcode?').fill('3000');
  await next(page).click();
  await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
  await choose(page, 'Eigenaar');
  await next(page).click();
  await expect(heading(page)).toHaveText('Wat voor dak heb je?');
}

/** The centre of an element's box, with the page scrolled to the top (the bar in view). */
async function centreOf(page: Page, selector: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

test.describe('form experience: the steps bar', () => {
  test('a finished step is a button back to it; the answers stay', async ({ page }) => {
    await toRoof(page);
    // Only the steps behind the visitor are buttons: postcode and ownership, not the roof.
    await expect(bar(page).getByRole('button')).toHaveCount(2);
    await bar(page)
      .getByRole('button', { name: jump(1, 'Wat is je postcode?') })
      .click();
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('3000');
    await expect(bar(page).getByRole('button')).toHaveCount(0);
    // Forward again: the answers are still there.
    await next(page).click();
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await expect(page.getByRole('radio', { name: 'Eigenaar', exact: true })).toBeChecked();
  });

  test('works with the keyboard, and the step change is announced', async ({ page }) => {
    await toRoof(page);
    const back = bar(page).getByRole('button', { name: jump(2, 'Ben je eigenaar van de woning?') });
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await expect(heading(page)).toBeFocused();
    await expect(page.getByRole('main').locator('p[aria-live="polite"]')).toContainText(
      'Ben je eigenaar van de woning?',
    );
  });

  test('dragging the pill back jumps to the step it is let go on', async ({ page }) => {
    await toRoof(page);
    const start = await centreOf(page, '[data-steps-pill]');
    const track = await bar(page).boundingBox();
    if (!track) throw new Error('no steps bar');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Sideways past the threshold, then over the first segment.
    await page.mouse.move(start.x - 16, start.y, { steps: 4 });
    await page.mouse.move(track.x + 6, start.y + 2, { steps: 10 });
    // While dragging, a label names the step the pill would go back to.
    await expect(bar(page).getByText('Wat is je postcode?', { exact: true })).toBeVisible();
    await expect(pill(page)).toHaveText('1');
    await page.mouse.up();
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(bar(page).getByText('Wat is je postcode?', { exact: true })).toHaveCount(0);
  });

  test('never drags forward, and a move up or down is no drag', async ({ page }) => {
    await toRoof(page);
    const start = await centreOf(page, '[data-steps-pill]');
    const track = await bar(page).boundingBox();
    if (!track) throw new Error('no steps bar');
    // Up and down first: the page may scroll, the pill stays.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 2, start.y + 30, { steps: 5 });
    await page.mouse.move(track.x + 6, start.y + 30, { steps: 5 });
    await page.mouse.up();
    await expect(heading(page)).toHaveText('Wat voor dak heb je?');
    // Forward: the pill stays on the current step, nothing moves on.
    const again = await centreOf(page, '[data-steps-pill]');
    await page.mouse.move(again.x, again.y);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width - 4, again.y, { steps: 10 });
    await page.mouse.up();
    await expect(heading(page)).toHaveText('Wat voor dak heb je?');
    await expect(pill(page)).toHaveText('3');
  });

  test('the pill stays put at hydration', async ({ page }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await expect(pill(page)).toHaveText('1');
    await expect(bar(page).getByRole('button')).toHaveCount(0);
  });
});

test.describe('form experience: reduced motion (the suite default)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the new step only fades in: no slide, no copy of the old one', async ({ page }) => {
    await page.addInitScript(() => {
      const log: string[] = [];
      (window as unknown as { __frames: string[] }).__frames = log;
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        log.push(JSON.stringify(keyframes));
        return animate.call(this, keyframes, options);
      };
    });
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await page.evaluate(() => {
      const w = window as unknown as { __frames: string[]; __copies: number };
      w.__frames.length = 0;
      w.__copies = 0;
      const layer = document.querySelector('section[data-morph="form-card"] > div[inert]')!;
      new MutationObserver(() => {
        w.__copies += layer.childElementCount;
      }).observe(layer, { childList: true });
    });
    await next(page).click();
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await page.waitForTimeout(500);
    const { frames, copies } = await page.evaluate(() => {
      const w = window as unknown as { __frames: string[]; __copies: number };
      return { frames: w.__frames, copies: w.__copies };
    });
    expect(copies).toBe(0);
    expect(frames.some((frame) => frame.includes('opacity'))).toBe(true);
    expect(frames.filter((frame) => /translate|scale|rotate|height/.test(frame))).toEqual([]);
  });
});

test.describe('form experience: motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the outgoing step is a visual copy outside the form, gone after the slide', async ({
    page,
  }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await page.evaluate(() => {
      const w = window as unknown as { __ghost: unknown };
      w.__ghost = null;
      const layer = document.querySelector('section[data-morph="form-card"] > div[inert]')!;
      const observer = new MutationObserver(() => {
        const frame = layer.firstElementChild as HTMLElement | null;
        const copy = frame?.firstElementChild as HTMLElement | null | undefined;
        if (!frame || !copy) return;
        observer.disconnect();
        const all = [copy, ...copy.querySelectorAll('*')];
        w.__ghost = {
          insideForm: frame.closest('form') !== null,
          frame: [frame.getAttribute('aria-hidden'), frame.inert],
          copy: [copy.getAttribute('aria-hidden'), copy.inert],
          // Nothing to find it by: no ids, names, labels, ARIA references or data hooks.
          ids: all.filter((element) => element.hasAttribute('id')).length,
          names: all.filter((element) => element.hasAttribute('name')).length,
          labels: copy.querySelectorAll('label').length,
          references: all.filter((element) =>
            [...element.attributes].some(
              (attribute) =>
                attribute.name !== 'aria-hidden' &&
                (attribute.name.startsWith('aria-') || attribute.name.startsWith('data-')),
            ),
          ).length,
          title: copy.querySelector('h2')?.textContent,
        };
      });
      observer.observe(layer, { childList: true });
    });
    await next(page).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __ghost: unknown }).__ghost))
      .toEqual({
        insideForm: false,
        frame: ['true', true],
        copy: ['true', true],
        ids: 0,
        names: 0,
        labels: 0,
        references: 0,
        title: 'Wat is je postcode?',
      });
    // Removed once it has faded out; screen readers only ever see the real step.
    await expect(page.locator('section[data-morph="form-card"] > div[inert] > *')).toHaveCount(0);
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await expect(page.getByRole('heading', { level: 2, name: 'Wat is je postcode?' })).toHaveCount(
      0,
    );
  });

  test('no sideways scroll at 390 px while steps slide in and out', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await page.evaluate(() => {
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
    await next(page).click();
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await page.waitForTimeout(600);
    await bar(page).getByRole('button').first().click();
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => {
      const w = window as unknown as { __overflow: number; __sampling: boolean };
      w.__sampling = false;
      return w.__overflow;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
