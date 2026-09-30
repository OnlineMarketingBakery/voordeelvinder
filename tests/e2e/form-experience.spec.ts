// The form's motion language in the browser (docs/MOTION.md): the steps bar (its buttons and the
// draggable pill jump back, the step titles it shows: never after a jump, hoverable, Escape
// hides them), the outgoing step's copy (visual only: outside the form, aria-hidden, inert, gone
// after the transition, where the step was even mid-slide), reduced motion (no slide) and no
// sideways scroll while steps slide. The pure parts are in tests/unit/form-experience.test.ts.
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import { STEP_GUARD_MS } from '../../src/lib/form/submit';
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
/** A finished step's button on the steps bar, and the title the bar shows for it. */
const stepButton = (page: Page, step: number, title: string) =>
  bar(page).getByRole('button', { name: jump(step, title) });
const barTitle = (page: Page, title: string) => bar(page).getByText(title, { exact: true });

const POSTCODE = 'Wat is je postcode?';
const OWNERSHIP = 'Ben je eigenaar van de woning?';

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
    // Forward again (after the double-click guard a jump starts): the answers are still there.
    await page.waitForTimeout(STEP_GUARD_MS);
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

test.describe('form experience: the steps bar titles (WCAG 1.4.13)', () => {
  test('a jump leaves no step title behind on the bar', async ({ page }) => {
    await toRoof(page);
    // Pointing at a finished step shows its title; a click jumps there (its button goes).
    await stepButton(page, 1, POSTCODE).hover();
    await expect(barTitle(page, POSTCODE)).toBeVisible();
    await stepButton(page, 1, POSTCODE).click();
    await expect(heading(page)).toHaveText(POSTCODE);
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
    // Forward again to the step the jump left: nothing points at the bar, so no title shows.
    for (const title of [OWNERSHIP, 'Wat voor dak heb je?']) {
      await page.waitForTimeout(STEP_GUARD_MS);
      await next(page).click();
      await expect(heading(page)).toHaveText(title);
    }
    await expect(bar(page).getByRole('button')).toHaveCount(2);
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
  });

  test('the pointer can move from a finished step onto its title', async ({ page }) => {
    await toRoof(page);
    const first = stepButton(page, 1, POSTCODE);
    const title = barTitle(page, POSTCODE);
    await first.hover();
    await expect(title).toBeVisible();
    const button = await first.boundingBox();
    const label = await title.boundingBox();
    if (!button || !label) throw new Error('no box for the step or its title');
    // Straight up from the step (its title starts over the step's centre), over the gap between
    // them: the title stays.
    const x = label.x + 4;
    await page.mouse.move(x, button.y + button.height / 2);
    await page.mouse.move(x, label.y + label.height / 2, { steps: 8 });
    await expect(title).toBeVisible();
    // Off the title: it goes.
    await page.mouse.move(x, label.y - 40);
    await expect(title).toHaveCount(0);
  });

  test('Escape hides the title of a focused step until the focus comes back', async ({ page }) => {
    await toRoof(page);
    // A pick with the keyboard first: focus moved from here on is keyboard focus (:focus-visible).
    await choose(page, 'Plat dak');
    const first = stepButton(page, 1, POSTCODE);
    await first.focus();
    await expect(barTitle(page, POSTCODE)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
    await expect(first).toBeFocused();
    // Still focused: it stays hidden, also after the pointer came and went over another step.
    await stepButton(page, 2, OWNERSHIP).hover();
    await expect(barTitle(page, OWNERSHIP)).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(barTitle(page, OWNERSHIP)).toHaveCount(0);
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
    // Focus on another step, and back: their titles show again.
    await stepButton(page, 2, OWNERSHIP).focus();
    await expect(barTitle(page, OWNERSHIP)).toBeVisible();
    await first.focus();
    await expect(barTitle(page, POSTCODE)).toBeVisible();
  });

  test('Escape hides the title of a pointed step until the pointer comes back', async ({
    page,
  }) => {
    await toRoof(page);
    const first = stepButton(page, 1, POSTCODE);
    await first.hover();
    await expect(barTitle(page, POSTCODE)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
    // Moving over the same step keeps it hidden.
    const box = await first.boundingBox();
    if (!box) throw new Error('no box for the step');
    await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 - 2);
    await expect(barTitle(page, POSTCODE)).toHaveCount(0);
    // Pointing at another step, and back at this one, shows the titles again.
    await stepButton(page, 2, OWNERSHIP).hover();
    await expect(barTitle(page, OWNERSHIP)).toBeVisible();
    await first.hover();
    await expect(barTitle(page, POSTCODE)).toBeVisible();
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

  test('a step left while it still slides in leaves from where it is on screen', async ({
    page,
  }) => {
    await toRoof(page);
    await page.waitForTimeout(600);
    const back = await page
      .getByRole('button', { name: copy.buttons.back, exact: true })
      .elementHandle();
    if (!back) throw new Error('no "Terug" button');
    const result = await page.evaluate(async (button) => {
      type Box = { x: number; y: number; width: number };
      const boxOf = (element: Element): Box => {
        const { x, y, width } = element.getBoundingClientRect();
        return { x, y, width };
      };
      // Each copy of an outgoing step as it first shows: nothing has been painted since the
      // copy was made, so its slide out is at its first keyframe.
      const copies: Box[] = [];
      const layer = document.querySelector('section[data-morph="form-card"] > div[inert]')!;
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            const copy = (node as Element).firstElementChild;
            if (copy) copies.push(boxOf(copy));
          }
        }
      });
      observer.observe(layer, { childList: true });
      const frames = async (count: number) => {
        for (let frame = 0; frame < count; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      };
      // "Terug" twice, about 80 ms apart: the second leaves the ownership step mid-slide.
      (button as HTMLButtonElement).click();
      await frames(5);
      const step = document
        .getElementById('formulier-stap-titel')!
        .closest('form > div > div > div')!;
      const transform = getComputedStyle(step).transform;
      const sliding = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
      const before = boxOf(step);
      (button as HTMLButtonElement).click();
      await frames(1);
      observer.disconnect();
      return { before, sliding, copies };
    }, back);
    await expect(heading(page)).toHaveText(POSTCODE);
    // The ownership step was still sliding in (not at its place yet)...
    expect(Math.abs(result.sliding)).toBeGreaterThan(1);
    // ...and its copy first shows exactly there, not as far off again.
    expect(result.copies).toHaveLength(2);
    const [, leaving] = result.copies;
    // WebKit samples a frame or two apart; the bug this guards against was hundreds of px.
    expect(Math.abs(leaving!.x - result.before.x)).toBeLessThanOrEqual(24);
    expect(Math.abs(leaving!.y - result.before.y)).toBeLessThanOrEqual(24);
    expect(Math.abs(leaving!.width - result.before.width)).toBeLessThanOrEqual(24);
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
