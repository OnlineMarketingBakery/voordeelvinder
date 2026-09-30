// The form motion (brief §6.1, docs/MOTION.md): auto-advance on a tap or click but never on
// keyboard input, the whole path with reduced motion (the suite's default) and with motion on,
// and no layout shift when the island hydrates. The engine behaviour is in form.spec.ts.
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import { AUTO_ADVANCE_DELAY_MS } from '../../src/lib/form/motion';

const { buttons } = copy;

/** Opens a form page and waits until the island has hydrated and restored its session. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  // The form is inert until the stored session is restored: "Volgende" is enabled then.
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
}

/**
 * Page errors of the app. WebKit reports a fetch it cancels because the page navigates away
 * ("... due to access control checks") as a page error: Astro's viewport prefetch of the
 * consent links, cut off by "Verstuur". Not an error of the page.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    if (!/^Fetch API cannot load .* due to access control checks\.$/.test(error.message)) {
      errors.push(error.message);
    }
  });
  return errors;
}

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
const next = (page: Page) => page.getByRole('button', { name: buttons.next, exact: true });
const submit = (page: Page) => page.getByRole('button', { name: buttons.submit, exact: true });
const radio = (page: Page, name: string, group?: string) =>
  (group ? page.getByRole('radiogroup', { name: group }) : page).getByRole('radio', {
    name,
    exact: true,
  });
const control = (page: Page, name: string, options?: { exact?: boolean }) =>
  page.getByLabel(name, options).and(page.locator('input, select, textarea'));

/** A tap or click on an answer card, the way people pick one (a real pointer on the label). */
async function tap(page: Page, name: string, group?: string) {
  await radio(page, name, group).locator('xpath=ancestor::label[1]').click();
}

/**
 * A tap on a card and then a click on a button in the same task, well within the auto-advance
 * delay (a real click after a real tap could take longer than 300 ms on a slow runner).
 */
async function tapThenClick(page: Page, card: string, button: string) {
  await page.evaluate(
    ([cardName, buttonName]) => {
      const input = [...document.querySelectorAll<HTMLInputElement>('main input[type=radio]')].find(
        (candidate) => candidate.closest('label')?.textContent?.trim() === cardName,
      );
      const label = input?.closest('label');
      const target = [...document.querySelectorAll<HTMLButtonElement>('main button')].find(
        (candidate) => candidate.textContent?.trim() === buttonName,
      );
      if (!label || !target) throw new Error(`no card "${cardName}" or button "${buttonName}"`);
      label.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0 }),
      );
      label.click();
      target.click();
    },
    [card, button],
  );
}

/** Longer than the auto-advance delay plus a step change: enough to see it didn't happen. */
const settle = (page: Page) => page.waitForTimeout(AUTO_ADVANCE_DELAY_MS * 3);

async function fillContact(page: Page) {
  await control(page, 'Voornaam').fill('Jan');
  await control(page, 'Achternaam').fill('Peeters');
  await control(page, 'Telefoonnummer').fill('0475 12 34 56');
  await control(page, 'E-mail', { exact: true }).fill('jan.peeters@example.be');
  await tap(page, 'Woensdag');
  await tap(page, '13:00–14:00');
  const terms = page.getByRole('checkbox', { name: /Ik ga akkoord/ });
  await terms.locator('xpath=ancestor::label[1]').click({ position: { x: 17, y: 20 } });
  await expect(terms).toBeChecked();
}

/** The solar flow by taps: auto-advance where the step has one choice, "Volgende" elsewhere. */
async function solarByTaps(page: Page) {
  await open(page, '/vergelijken/zonnepanelen');
  await control(page, 'Wat is je postcode?').fill('3000');
  await next(page).click();
  await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
  await tap(page, 'Eigenaar');
  await expect(heading(page)).toHaveText('Wat voor dak heb je?');
  await expect(heading(page)).toBeFocused();
  // Two questions: no auto-advance.
  await tap(page, 'Hellend dak');
  await tap(page, 'Zuid');
  await settle(page);
  await expect(heading(page)).toHaveText('Wat voor dak heb je?');
  await next(page).click();
  await expect(heading(page)).toHaveText('Ken je je jaarlijks energieverbruik?');
  await tap(page, 'Ja');
  await expect(heading(page)).toHaveText('Je jaarverbruik');
  await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
  await next(page).click();
  await expect(heading(page)).toHaveText('Wil je ook een thuisbatterij?');
  await tap(page, 'Nee');
  await expect(heading(page)).toHaveText('Jouw gegevens');
  // The last step never advances or submits by itself.
  await fillContact(page);
  await settle(page);
  await expect(heading(page)).toHaveText('Jouw gegevens');
  await submit(page).click();
  await page.waitForURL('**/bedankt/zonnepanelen');
}

test.describe('form motion: auto-advance', () => {
  test('a click on a card of a single-choice step moves on by itself', async ({ page }) => {
    await open(page, '/vergelijken');
    await tap(page, 'Zonnepanelen');
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    // Like "Volgende": the new title has focus, "Volgende" is still there.
    await expect(heading(page)).toBeFocused();
    await expect(next(page)).toBeVisible();
  });

  test('never on keyboard input', async ({ page }) => {
    await open(page, '/vergelijken');
    const first = radio(page, 'Elektriciteit');
    await first.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await expect(radio(page, 'Gas')).toBeChecked();
    await settle(page);
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    // A tap after the keyboard still advances.
    await tap(page, 'Thuisbatterij');
    await expect(heading(page)).toHaveText('Wat is je postcode?');
  });

  test('a click and a quick "Volgende" move one step, never two', async ({ page }) => {
    await open(page, '/vergelijken');
    await tapThenClick(page, 'Zonnepanelen', buttons.next);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await settle(page);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
  });

  test('a double click on a card moves one step and skips none', async ({ page }) => {
    await open(page, '/vergelijken/thuisbatterij');
    await control(page, 'Wat is je postcode?').fill('3000');
    await next(page).click();
    await expect(heading(page)).toHaveText('Heb je zonnepanelen?');
    // The first click at t=0; the step changes about 300 ms later, and the second half of the
    // double click (about 330 ms after the first) lands on a card of the new step.
    const first = Date.now();
    await tap(page, 'Ja');
    await page.waitForFunction(
      (title) => document.querySelector('main h2')?.textContent?.trim() === title,
      'Hoeveel zonnepanelen heb je ongeveer?',
      { polling: 'raf' },
    );
    await page.waitForTimeout(Math.max(0, first + 330 - Date.now()));
    await tap(page, 'Minder dan 10');
    // Well inside a double click (500 ms): otherwise the test proves nothing.
    expect(Date.now() - first).toBeLessThan(AUTO_ADVANCE_DELAY_MS + 500);
    // The click picked the card (visibly), but the form stays on the step it never showed long.
    await expect(radio(page, 'Minder dan 10')).toBeChecked();
    await settle(page);
    await expect(heading(page)).toHaveText('Hoeveel zonnepanelen heb je ongeveer?');
    // "Volgende" (or a later tap) moves on as usual.
    await next(page).click();
    await expect(heading(page)).toHaveText('Heb je een digitale meter?');
  });

  test('"Terug" right after a click cancels the pending step', async ({ page }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await next(page).click();
    await expect(heading(page)).toHaveText('Ben je eigenaar van de woning?');
    await tapThenClick(page, 'Huurder', buttons.back);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await settle(page);
    await expect(heading(page)).toHaveText('Wat is je postcode?');
  });
});

test.describe('form motion: reduced motion (the suite default)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the whole path completes, auto-advance included', async ({ page }) => {
    const errors = collectErrors(page);
    await solarByTaps(page);
    expect(errors).toEqual([]);
  });
});

test.describe('form motion: the double-tap guard', () => {
  test.use({ reducedMotion: 'reduce' });

  test('covers only the step an auto-advance showed: a tap right after a "Volgende" advances', async ({
    page,
  }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('3000');
    await next(page).click();
    await tap(page, 'Eigenaar');
    await expect(heading(page)).toHaveText('Wat voor dak heb je?');
    await tap(page, 'Hellend dak');
    await tap(page, 'Zuid');
    await next(page).click();
    await tap(page, 'Ja');
    // Straight after that auto-advance: answer, "Volgende" and a tap, well within the guard.
    await expect(heading(page)).toHaveText('Je jaarverbruik');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    await next(page).click();
    await expect(heading(page)).toHaveText('Wil je ook een thuisbatterij?');
    await tap(page, 'Nee');
    await expect(heading(page)).toHaveText('Jouw gegevens');
  });
});

test.describe('form motion: motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('clicking through as fast as possible skips no step and submits once', async ({ page }) => {
    const errors = collectErrors(page);
    const thankYou: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.url().includes('/bedankt/')) {
        thankYou.push(request.url());
      }
    });
    await solarByTaps(page);
    await page.waitForLoadState('networkidle');
    expect(thankYou).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  test('an error shakes the field and still focuses it at once', async ({ page }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await next(page).click();
    await expect(control(page, 'Wat is je postcode?')).toBeFocused();
    // The message under the field (the aria-live region repeats it for screen readers).
    await expect(
      page.locator('#veld-postcode-fout').getByText(copy.errors.required, { exact: true }),
    ).toBeVisible();
  });
});

test.describe('form motion: hydration', () => {
  /** Boxes of the parts that could move at hydration, rounded to whole pixels. */
  const boxes = (page: Page) =>
    page.evaluate(() =>
      // The form card, the progress fill (translateX) and the step title.
      ['section[data-morph="form-card"]', '[class*="bg-purple-700/13"] > div', 'main h2'].map(
        (selector) => {
          const box = document.querySelector(selector)!.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height].map(Math.round);
        },
      ),
    );

  test('the island hydrates without moving anything', async ({ browser, page, baseURL }) => {
    const path = '/vergelijken/zonnepanelen';
    const staticContext = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const staticPage = await staticContext.newPage();
    await staticPage.setViewportSize(page.viewportSize()!);
    await staticPage.goto(path);
    const before = await boxes(staticPage);
    await staticContext.close();

    await open(page, path);
    await page.waitForTimeout(AUTO_ADVANCE_DELAY_MS); // the lazy Motion chunk, if any
    expect(await boxes(page)).toEqual(before);
  });

  test('no layout shift while the form loads (Chromium reports them)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only');
    await page.addInitScript(() => {
      const shifts: number[] = [];
      (window as unknown as { __shifts: number[] }).__shifts = shifts;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number })[]) {
          shifts.push(entry.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await open(page, '/vergelijken');
    await page.waitForTimeout(1000);
    const total = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce((sum, value) => sum + value, 0),
    );
    expect(total).toBeLessThan(0.01);
  });
});
