// Moving through the form (Tanjil's form feedback 2026-09-30): "Opnieuw beginnen" with its undo,
// jumping back from the progress bar, and on a phone the next question of a two-question step
// coming into view; a double click or tap whose second half lands on content that just moved
// under the pointer. The rules themselves are unit-tested in tests/unit/form-navigation.test.ts;
// auto-advance on such steps is in form-motion.spec.ts.
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import { AUTO_ADVANCE_DELAY_MS, AUTO_ADVANCE_GUARD_MS } from '../../src/lib/form/motion';
import { UNDO_MS } from '../../src/lib/form/reset';
import { STEP_GUARD_MS } from '../../src/lib/form/submit';
import { stubLead, stubTurnstile } from '../support/form-submit';

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
  await stubLead(page);
});

const { buttons, reset } = copy;
const progress = (step: number, total: number) =>
  copy.progress.replace('{step}', String(step)).replace('{total}', String(total));
const jumpName = (step: number, title: string) =>
  copy.progressJump.replace('{step}', String(step)).replace('{title}', title);

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
const next = (page: Page) => page.getByRole('button', { name: buttons.next, exact: true });
const back = (page: Page) => page.getByRole('button', { name: buttons.back, exact: true });
const resetButton = (page: Page) => page.getByRole('button', { name: reset.button, exact: true });
const undoButton = (page: Page) => page.getByRole('button', { name: reset.undo, exact: true });
// The message above the buttons (the aria-live region, outside the form, says it too).
const notice = (page: Page) =>
  page.getByRole('main').locator('form').getByText(reset.done, { exact: true });
const live = (page: Page) => page.getByRole('main').locator('p[aria-live="polite"]');
const progressLine = (page: Page) => page.getByText(/^Stap \d+ van \d+$/);
const control = (page: Page, name: string) =>
  page.getByLabel(name).and(page.locator('input, select, textarea'));
const radio = (page: Page, name: string, group?: string) =>
  (group ? page.getByRole('radiogroup', { name: group }) : page).getByRole('radio', {
    name,
    exact: true,
  });

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
}

/** Picks a radio with the keyboard, so auto-advance can't race the test. */
async function choose(page: Page, name: string, group?: string) {
  const option = radio(page, name, group);
  await option.focus();
  await page.keyboard.press('Space');
  await expect(option).toBeChecked();
}

/** A tap or click on an answer card (a real pointer on its label). */
async function tap(page: Page, name: string, group?: string) {
  await radio(page, name, group).locator('xpath=ancestor::label[1]').click();
}

/** The time between the two halves of a double click or tap in these tests. */
const DOUBLE_CLICK_GAP_MS = 150;

/**
 * A double click on the button `button` (its name or text) whose second half, `gap` ms later,
 * lands on `target`: a card (its label) or a button of what took the first one's place. A step
 * change moves the content under the pointer, and which card lands there depends on the layout,
 * so the test names it. Both halves are a pointerdown and a click, in the page, so the gap holds
 * on a slow runner.
 */
async function doubleClickOnto(
  page: Page,
  button: string,
  target: string,
  gap = DOUBLE_CLICK_GAP_MS,
) {
  await page.evaluate(
    async ([first, second, wait]) => {
      const find = (name: string) =>
        [...document.querySelectorAll<HTMLInputElement>('main input[type=radio]')]
          .map((input) => input.closest('label'))
          .find((label) => label?.textContent?.trim() === name) ??
        [...document.querySelectorAll<HTMLButtonElement>('main button')].find(
          (candidate) =>
            candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name,
        );
      const press = (name: string) => {
        const element = find(name);
        if (!element) throw new Error(`nothing named "${name}"`);
        element.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0 }),
        );
        element.click();
      };
      press(first);
      await new Promise((resolve) => setTimeout(resolve, wait));
      press(second);
    },
    [button, target, gap] as const,
  );
}

/** Longer than the auto-advance delay plus a step change: enough to see it didn't happen. */
const settle = (page: Page) => page.waitForTimeout(AUTO_ADVANCE_DELAY_MS * 3);

async function goNext(page: Page, title: string) {
  await next(page).click();
  await expect(heading(page)).toHaveText(title);
}

type Stored = { step: string; answers: Record<string, unknown>; leadId: string; eventId: string };

const storedRaw = (page: Page, entry: string) =>
  page.evaluate((key) => sessionStorage.getItem(key), `voordeelvinder:form:${entry}`);

async function stored(page: Page, entry: string): Promise<Stored> {
  const raw = await storedRaw(page, entry);
  if (raw === null) throw new Error(`no stored session for ${entry}`);
  return JSON.parse(raw) as Stored;
}

/** /vergelijken/energie/stappen?energie=both up to the meter type, which is answered. */
async function toMeterType(page: Page) {
  await open(page, '/vergelijken/energie/stappen?energie=both');
  await control(page, 'Wat is je postcode?').fill('9000');
  await goNext(page, 'Wie is je huidige energieleverancier?');
  await control(page, 'Wie is je huidige energieleverancier?').selectOption('luminus');
  await goNext(page, 'Wat voor meter heb je?');
  await choose(page, 'Dag/nachtmeter (tweevoudig tarief)');
}

/** At 390x560, on the digital meter + solar step (two questions), scrolled to the top. */
async function toMetersOnPhone(page: Page) {
  await page.setViewportSize({ width: 390, height: 560 });
  await open(page, '/vergelijken/energie/stappen?energie=both');
  await control(page, 'Wat is je postcode?').fill('9000');
  await goNext(page, 'Wie is je huidige energieleverancier?');
  await control(page, 'Wie is je huidige energieleverancier?').selectOption('luminus');
  await goNext(page, 'Wat voor meter heb je?');
  await choose(page, 'Dagmeter (enkelvoudig tarief)');
  await goNext(page, 'Heb je een digitale meter?');
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe('form: "Opnieuw beginnen" and its undo', () => {
  test('shows only when there is something to reset', async ({ page }) => {
    await open(page, '/vergelijken/energie/stappen?energie=both');
    // The served first step with only the URL's energy type: nothing to reset.
    await expect(resetButton(page)).toHaveCount(0);
    const postcode = control(page, 'Wat is je postcode?');
    await postcode.fill('9');
    await expect(resetButton(page)).toBeVisible();
    await expect(resetButton(page)).toHaveAttribute('title', reset.button);
    await postcode.fill('');
    await expect(resetButton(page)).toHaveCount(0);
  });

  test('empties the form at once and the undo puts everything back', async ({ page }) => {
    await toMeterType(page);
    await expect.poll(async () => (await stored(page, 'energie')).step).toBe('meter_type');
    const before = (await storedRaw(page, 'energie'))!;
    const ids = await stored(page, 'energie');
    expect(ids.answers).toMatchObject({
      postcode: '9000',
      supplier: 'luminus',
      meter_type: 'dual',
    });

    await resetButton(page).click();
    // Back on the first step the URL serves (?energie=both skips the energy question).
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(progressLine(page)).toHaveText(progress(1, 9));
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('');
    await expect(live(page)).toHaveText(reset.done);
    await expect(notice(page)).toBeVisible();
    await expect(undoButton(page)).toBeVisible();
    // Nothing left to reset.
    await expect(resetButton(page)).toHaveCount(0);
    // The stored answers are gone and the lead has new ids.
    await expect.poll(async () => (await stored(page, 'energie')).answers).toEqual({});
    const fresh = await stored(page, 'energie');
    expect(fresh.step).toBe('postcode');
    expect(fresh.leadId).not.toBe(ids.leadId);
    expect(fresh.eventId).not.toBe(ids.eventId);

    await undoButton(page).click();
    await expect(heading(page)).toHaveText('Wat voor meter heb je?');
    await expect(heading(page)).toBeFocused();
    await expect(progressLine(page)).toHaveText(progress(3, 9));
    await expect(radio(page, 'Dag/nachtmeter (tweevoudig tarief)')).toBeChecked();
    await expect(live(page)).toHaveText(`Wat voor meter heb je?. ${progress(3, 9)}`);
    await expect(notice(page)).toHaveCount(0);
    // Exactly the session from before the reset, the old ids included.
    await expect.poll(() => storedRaw(page, 'energie')).toBe(before);
    await back(page).click();
    await expect(control(page, 'Wie is je huidige energieleverancier?')).toHaveValue('luminus');
    await back(page).click();
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('9000');
  });

  test('on /vergelijken it starts over at the product cards, and the undo returns to the chosen flow', async ({
    page,
  }) => {
    await open(page, '/vergelijken');
    await choose(page, 'Zonnepanelen');
    await goNext(page, 'Wat is je postcode?');
    await control(page, 'Wat is je postcode?').fill('3000');
    await goNext(page, 'Ben je eigenaar van de woning?');
    const solar = await stored(page, 'vergelijken');
    await resetButton(page).click();
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(progressLine(page)).toHaveText(progress(1, 10));
    await expect.poll(async () => (await stored(page, 'vergelijken')).answers).toEqual({});
    await undoButton(page).click();
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await expect.poll(async () => (await stored(page, 'vergelijken')).leadId).toBe(solar.leadId);
    await back(page).click();
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('3000');
  });

  test('works from the keyboard', async ({ page }) => {
    await toMeterType(page);
    await resetButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await undoButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Wat voor meter heb je?');
  });

  test('the undo goes after about 8 seconds, and waits while the pointer is on it', async ({
    page,
  }) => {
    await page.clock.install();
    await toMeterType(page);
    await resetButton(page).click();
    await expect(undoButton(page)).toBeVisible();
    // The pointer on the message holds the clock.
    await notice(page).hover();
    await page.clock.fastForward(UNDO_MS + 1000);
    await expect(undoButton(page)).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(UNDO_MS + 1000);
    await expect(notice(page)).toHaveCount(0);
    // The reset stays: the form is still empty.
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('');
  });

  test('a tap right before the reset never moves the fresh form on', async ({ page }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await goNext(page, 'Ben je eigenaar van de woning?');
    await page.evaluate(
      ([card, button]) => {
        const input = [
          ...document.querySelectorAll<HTMLInputElement>('main input[type=radio]'),
        ].find((candidate) => candidate.closest('label')?.textContent?.trim() === card);
        const label = input?.closest('label');
        const target = document.querySelector<HTMLButtonElement>(
          `main button[aria-label="${button}"]`,
        );
        if (!label || !target) throw new Error('no card or reset button');
        label.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0 }),
        );
        label.click();
        target.click();
      },
      ['Eigenaar', reset.button],
    );
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await settle(page);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
  });
});

test.describe('form: the second half of a double click lands on the new step', () => {
  test('after the reset button, a card of the fresh step is only picked', async ({ page }) => {
    await open(page, '/vergelijken');
    await choose(page, 'Zonnepanelen');
    await goNext(page, 'Wat is je postcode?');
    await control(page, 'Wat is je postcode?').fill('3000');
    await goNext(page, 'Ben je eigenaar van de woning?');
    // The five product cards push the buttons of this two-card step down, under the pointer.
    await doubleClickOnto(page, reset.button, 'Elektriciteit + gas');
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    // Picked, visibly (like any tap), but the fresh form doesn't move on by itself.
    await expect(radio(page, 'Elektriciteit + gas')).toBeChecked();
    await settle(page);
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
  });

  test('after the reset button, "Volgende" in its place is ignored: no errors', async ({
    page,
  }) => {
    await toMeterType(page);
    await doubleClickOnto(page, reset.button, buttons.next);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(page.locator('#veld-postcode-fout')).toHaveCount(0);
    await expect(live(page)).toHaveText(reset.done);
    // Pressed on purpose, once the guard is over, it validates as always.
    await page.waitForTimeout(STEP_GUARD_MS);
    await next(page).click();
    await expect(page.locator('#veld-postcode-fout')).toHaveText(copy.errors.required);
  });

  test('after "Ongedaan maken", a card of the restored step is only picked', async ({ page }) => {
    await toMeterType(page);
    await resetButton(page).click();
    await expect(undoButton(page)).toBeVisible();
    // The reset's own guard is over: what follows is the undo's.
    await page.waitForTimeout(AUTO_ADVANCE_GUARD_MS);
    // Any tap on a complete single-question step moves on, but not this one.
    await doubleClickOnto(page, reset.undo, 'Dagmeter (enkelvoudig tarief)');
    await expect(heading(page)).toHaveText('Wat voor meter heb je?');
    await expect(radio(page, 'Dagmeter (enkelvoudig tarief)')).toBeChecked();
    await settle(page);
    await expect(heading(page)).toHaveText('Wat voor meter heb je?');
  });

  test('after "Terug", a card of the answered step is only picked', async ({ page }) => {
    await open(page, '/vergelijken');
    await choose(page, 'Zonnepanelen');
    await goNext(page, 'Wat is je postcode?');
    await doubleClickOnto(page, buttons.back, 'Thuisbatterij');
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    await expect(radio(page, 'Thuisbatterij')).toBeChecked();
    await settle(page);
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
  });
});

test.describe('form: going back from the progress bar', () => {
  test('a completed step jumps back two steps and keeps the answers', async ({ page }) => {
    await toMeterType(page);
    await expect(progressLine(page)).toHaveText(progress(3, 9));
    // Only the steps before the current one.
    await expect(page.getByRole('button', { name: /^Ga terug naar stap/ })).toHaveCount(2);
    const first = page.getByRole('button', { name: jumpName(1, 'Wat is je postcode?') });
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(progressLine(page)).toHaveText(progress(1, 9));
    await expect(live(page)).toHaveText(`Wat is je postcode?. ${progress(1, 9)}`);
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('9000');
    // Nothing before the first step; the steps after it are never jump targets.
    await expect(page.getByRole('button', { name: /^Ga terug naar stap/ })).toHaveCount(0);
    // A "Volgende" right after a step change is the second half of a double click: wait it out.
    await page.waitForTimeout(STEP_GUARD_MS);
    await goNext(page, 'Wie is je huidige energieleverancier?');
    await expect(control(page, 'Wie is je huidige energieleverancier?')).toHaveValue('luminus');
    await page.waitForTimeout(STEP_GUARD_MS);
    await goNext(page, 'Wat voor meter heb je?');
    await expect(radio(page, 'Dag/nachtmeter (tweevoudig tarief)')).toBeChecked();
  });
});

test.describe('form: a two-question step on a phone', () => {
  test('a tap on the first question brings the second into view, focus stays', async ({ page }) => {
    await toMetersOnPhone(page);
    const second = page.locator('#veld-has_solar-vak');
    const inView = () =>
      second.evaluate((cell) => {
        const box = cell.getBoundingClientRect();
        const height = cell.firstElementChild!.getBoundingClientRect().height;
        return box.top >= 0 && box.top + height <= window.innerHeight + 1;
      });
    // The second question starts (at least partly) below the fold.
    expect(await inView()).toBe(false);
    await tap(page, 'Ja', 'Heb je een digitale meter?');
    await expect.poll(inView).toBe(true);
    await expect(heading(page)).toHaveText('Heb je een digitale meter?');
    // Nothing in the second question took focus.
    expect(await second.evaluate((cell) => cell.contains(document.activeElement))).toBe(false);
    // Its answer moves the step on (form-motion.spec.ts), once the visitor has read it: a tap
    // right after the scroll is the second half of a double tap (next test).
    await page.waitForTimeout(AUTO_ADVANCE_GUARD_MS);
    await tap(page, 'Nee', 'Heb je zonnepanelen?');
    await expect(heading(page)).toHaveText('Heb je een sociaal tarief?');
  });

  for (const gap of [DOUBLE_CLICK_GAP_MS, 250]) {
    test(`a second tap ${gap} ms later at the same point picks what scrolled under it, never moves on`, async ({
      page,
    }) => {
      await toMetersOnPhone(page);
      const card = await radio(page, 'Nee', 'Heb je een digitale meter?')
        .locator('xpath=ancestor::label[1]')
        .boundingBox();
      if (!card) throw new Error('no card');
      const x = card.x + card.width / 2;
      const y = card.y + card.height / 2;
      await page.mouse.click(x, y);
      await page.waitForTimeout(gap);
      await page.mouse.click(x, y);
      // The page scrolled the second question under the finger, and the tap picked its card
      // (visibly, like any tap)…
      await expect(
        page.getByRole('radiogroup', { name: 'Heb je zonnepanelen?' }).getByRole('radio', {
          checked: true,
        }),
      ).toHaveCount(1);
      // …but the step stays: the visitor hasn't read that question yet.
      await settle(page);
      await expect(heading(page)).toHaveText('Heb je een digitale meter?');
    });
  }
});
