// The form island (brief §7.6, §12): /vergelijken and /vergelijken/<product>. Phase 4: the submit
// builds the lead but sends nothing, and goes to /bedankt/<product> (a 404 until PR 18).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };

const { buttons, errors, requiredByType } = copy;
const progress = (step: number, total: number) =>
  copy.progress.replace('{step}', String(step)).replace('{total}', String(total));

/** Opens a form page and waits until the island has hydrated and restored its session. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

// The question title (the footer has h2s too).
const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
const progressLine = (page: Page) => page.getByText(/^Stap \d+ van \d+$/);
// A form control by its label (a question card is labelled by the same title as its input).
const control = (page: Page, name: string | RegExp, options?: { exact?: boolean }) =>
  page.getByLabel(name, options).and(page.locator('input, select, textarea'));
// A checkbox is ticked the way people do it: a click on its box (the input itself is
// visually hidden, and a forced click on it doesn't toggle it in WebKit).
async function tick(page: Page, name: string | RegExp, checked = true) {
  const box = page.getByRole('checkbox', { name });
  await box.locator('xpath=ancestor::label[1]').click({ position: { x: 17, y: 20 } });
  await expect(box).toBeChecked({ checked });
}
// macOS WebKit only tabs to text fields and links unless Option is held (the system's default
// "keyboard navigation" setting); Option+Tab behaves like Tab elsewhere.
const TAB = process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
const next = (page: Page) => page.getByRole('button', { name: buttons.next, exact: true });
const back = (page: Page) => page.getByRole('button', { name: buttons.back, exact: true });
const submit = (page: Page) => page.getByRole('button', { name: buttons.submit, exact: true });

/** Clicks the card of a radio (the whole card is the target, brief §7.6). */
async function choose(page: Page, name: string, group?: string) {
  const scope = group ? page.getByRole('radiogroup', { name: group }) : page;
  await scope.getByRole('radio', { name, exact: true }).check({ force: true });
}

/** "Volgende" with the keyboard. */
async function keyNext(page: Page) {
  await next(page).focus();
  await page.keyboard.press('Enter');
}

async function goNext(page: Page, title: string) {
  await next(page).click();
  await expect(heading(page)).toHaveText(title);
}

async function fillContact(page: Page) {
  await control(page, 'Voornaam').fill('Jan');
  await control(page, 'Achternaam').fill('Peeters');
  await control(page, 'Telefoonnummer').fill('0475 12 34 56');
  await control(page, 'E-mail', { exact: true }).fill('jan.peeters@example.be');
  await choose(page, 'Woensdag');
  await choose(page, '13:00–14:00');
  await tick(page, /Ik ga akkoord/);
}

/** From /vergelijken/energie?energie=both to the contact step, "Nee" path. */
async function toContact(page: Page) {
  await open(page, '/vergelijken/energie?energie=both');
  await control(page, 'Wat is je postcode?').fill('9000');
  await goNext(page, 'Wie is je huidige energieleverancier?');
  await control(page, 'Wie is je huidige energieleverancier?').selectOption('luminus');
  await goNext(page, 'Wat voor meter heb je?');
  await choose(page, 'Dagmeter (enkelvoudig tarief)');
  await goNext(page, 'Heb je een digitale meter?');
  await choose(page, 'Ja', 'Heb je een digitale meter?');
  await choose(page, 'Nee', 'Heb je zonnepanelen?');
  await goNext(page, 'Heb je een sociaal tarief?');
  await choose(page, 'Nee', 'Heb je een sociaal tarief?');
  await choose(page, 'Weet ik niet', 'Heb je een budgetmeter?');
  await goNext(page, 'Ken je je jaarlijks energieverbruik?');
  await choose(page, 'Nee');
  await goNext(page, 'Hoeveel personen wonen er in je woning?');
  await control(page, 'Hoeveel personen wonen er in je woning?').selectOption('2');
  await control(page, 'Wat voor woning heb je?').selectOption('terraced');
  await goNext(page, 'Heb je een warmtepomp?');
  await choose(page, 'Nee', 'Heb je een warmtepomp?');
  await choose(page, 'Ja', 'Heb je een elektrische wagen?');
  await goNext(page, 'Jouw gegevens');
}

test.describe('form: energy flow', () => {
  test('the "Ja" path end to end with the keyboard', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await open(page, '/vergelijken');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    await expect(progressLine(page)).toHaveText(progress(1, 10));

    // Arrow keys move through the cards and select them; nothing advances by itself.
    await page.getByRole('radio', { name: 'Elektriciteit', exact: true }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Elektriciteit + gas' })).toBeChecked();
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    await keyNext(page);

    // The new step's title gets focus; Tab reaches its first field.
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(heading(page)).toBeFocused();
    await expect(progressLine(page)).toHaveText(progress(2, 10));
    await page.keyboard.press(TAB);
    await expect(control(page, 'Wat is je postcode?')).toBeFocused();
    await page.keyboard.type('9000');
    await page.keyboard.press('Enter');

    await expect(heading(page)).toHaveText('Wie is je huidige energieleverancier?');
    await control(page, 'Wie is je huidige energieleverancier?').selectOption('engie');
    await keyNext(page);

    await expect(heading(page)).toHaveText('Wat voor meter heb je?');
    await page.keyboard.press(TAB);
    await page.keyboard.press('Space');
    await keyNext(page);

    await expect(heading(page)).toHaveText('Heb je een digitale meter?');
    await page.keyboard.press(TAB);
    await page.keyboard.press('Space'); // Ja
    await page.keyboard.press(TAB);
    await page.keyboard.press('ArrowDown'); // Nee
    await expect(
      page.getByRole('radiogroup', { name: 'Heb je zonnepanelen?' }).getByRole('radio', {
        name: 'Nee',
      }),
    ).toBeChecked();
    await keyNext(page);

    await expect(heading(page)).toHaveText('Heb je een sociaal tarief?');
    await page.keyboard.press(TAB);
    await page.keyboard.press('ArrowDown'); // Nee
    await page.keyboard.press(TAB);
    await page.keyboard.press('ArrowDown'); // Nee
    await keyNext(page);

    await expect(heading(page)).toHaveText('Ken je je jaarlijks energieverbruik?');
    await page.keyboard.press(TAB);
    await page.keyboard.press('Space'); // Ja
    await keyNext(page);

    await expect(heading(page)).toHaveText('Je jaarverbruik');
    await expect(progressLine(page)).toHaveText(progress(8, 9));
    await page.keyboard.press(TAB);
    await page.keyboard.type('3.500');
    await page.keyboard.press(TAB);
    await page.keyboard.type('12000');
    await page.keyboard.press('Enter');

    await expect(heading(page)).toHaveText('Jouw gegevens');
    await expect(progressLine(page)).toHaveText(progress(9, 9));
    await expect(submit(page)).toBeVisible();
    for (const [label, value] of [
      ['Voornaam', 'Jan'],
      ['Achternaam', 'Peeters'],
      ['Telefoonnummer', '475 12 34 56'],
      ['E-mail', 'jan.peeters@example.be'],
    ] as const) {
      await control(page, label, { exact: true }).focus();
      await page.keyboard.type(value);
    }
    await page.getByRole('radio', { name: 'Maandag' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight'); // Dinsdag
    await page.getByRole('radio', { name: '09:00–10:00' }).focus();
    await page.keyboard.press('Space');
    await page.getByRole('checkbox', { name: /Ik ga akkoord/ }).focus();
    await page.keyboard.press('Space');
    await submit(page).focus();
    await page.keyboard.press('Enter');

    await page.waitForURL('**/bedankt/energie');
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:form:vergelijken')),
    ).toBeNull();
    expect(pageErrors).toEqual([]);
  });

  test('/vergelijken/energie without ?energie= asks only the energy type', async ({ page }) => {
    await open(page, '/vergelijken/energie');
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    await expect(progressLine(page)).toHaveText(progress(1, 10));
    await expect(page.getByRole('radio')).toHaveCount(3);
    const names = await page
      .getByRole('radio')
      .evaluateAll((inputs) => inputs.map((input) => input.closest('label')!.textContent!.trim()));
    expect(names).toEqual(['Elektriciteit', 'Gas', 'Elektriciteit + gas']);
    await choose(page, 'Gas');
    await goNext(page, 'Wat is je postcode?');
  });

  test('?energie=gas skips the electricity questions', async ({ page }) => {
    await open(page, '/vergelijken/energie?energie=gas');
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(progressLine(page)).toHaveText(progress(1, 8));
    await control(page, 'Wat is je postcode?').fill('2000');
    await goNext(page, 'Wie is je huidige energieleverancier?');
    await control(page, 'Wie is je huidige energieleverancier?').selectOption('mega');
    // No meter type for gas only: straight to the digital meter, without the solar question.
    await goNext(page, 'Heb je een digitale meter?');
    await expect(page.getByRole('radiogroup')).toHaveCount(1);
    await expect(page.getByText('Heb je zonnepanelen?')).toHaveCount(0);
    await choose(page, 'Ja');
    await goNext(page, 'Heb je een sociaal tarief?');
    await choose(page, 'Nee', 'Heb je een sociaal tarief?');
    await choose(page, 'Nee', 'Heb je een budgetmeter?');
    await goNext(page, 'Ken je je jaarlijks energieverbruik?');
    await choose(page, 'Ja');
    await goNext(page, 'Je jaarverbruik');
    await expect(control(page, 'Gas (kWh per jaar)')).toBeVisible();
    await expect(control(page, 'Elektriciteit (kWh per jaar)')).toHaveCount(0);
  });

  test('the business checkbox reveals the consumption bands', async ({ page }) => {
    await open(page, '/vergelijken/energie?energie=both');
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
    await tick(page, 'Dit is een zakelijk adres.');
    await expect(page.getByRole('radiogroup')).toHaveCount(2);
    await control(page, 'Wat is je postcode?').fill('9000');
    await next(page).click();
    await expect(page.getByText(requiredByType.single_choice)).toHaveCount(2);
    await tick(page, 'Dit is een zakelijk adres.', false);
    await goNext(page, 'Wie is je huidige energieleverancier?');
  });
});

test.describe('form: validation', () => {
  test('shows errors inline, focuses the first one and links it to its field', async ({ page }) => {
    await open(page, '/vergelijken');
    await next(page).click();
    await expect(page.getByText(requiredByType.single_choice)).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Elektriciteit', exact: true })).toBeFocused();
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    const group = page.getByRole('radiogroup', { name: 'Wat wil je vergelijken?' });
    await expect(group).toHaveAttribute('aria-invalid', 'true');
    await expect(group).toHaveAccessibleDescription(requiredByType.single_choice);

    await choose(page, 'Zonnepanelen');
    await expect(page.getByText(requiredByType.single_choice)).toHaveCount(0);
    await goNext(page, 'Wat is je postcode?');
    await next(page).click();
    const postcode = control(page, 'Wat is je postcode?');
    await expect(postcode).toBeFocused();
    await expect(postcode).toHaveAttribute('aria-invalid', 'true');
    await expect(postcode).toHaveAccessibleDescription(errors.required);
    await postcode.fill('12');
    await next(page).click();
    await expect(postcode).toHaveAccessibleDescription(errors.postcode_invalid);
    await postcode.fill('3000');
    await goNext(page, 'Ben je eigenaar van de woning?');
  });

  test('the contact step validates on blur and suggests e-mail typos', async ({ page }) => {
    await toContact(page);
    const phone = control(page, 'Telefoonnummer');
    await phone.fill('04484620944');
    await phone.blur();
    await expect(page.getByText(errors.phone_invalid)).toBeVisible();
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toHaveValue('04484620944'); // never truncated or reformatted

    const email = control(page, 'E-mail', { exact: true });
    await email.fill('jan@gmial.com');
    await email.blur();
    const suggestion = page.getByRole('button', { name: 'Bedoel je jan@gmail.com?' });
    await suggestion.click();
    await expect(email).toHaveValue('jan@gmail.com');
    await expect(suggestion).toHaveCount(0);

    await submit(page).click();
    await expect(control(page, 'Voornaam')).toBeFocused();
    await expect(page.getByText(requiredByType.day_slot)).toBeVisible();
    await expect(page.getByText(requiredByType.consent)).toBeVisible();
    expect(page.url()).toContain('/vergelijken/energie');
  });
});

test.describe('form: navigation and persistence', () => {
  test('"Terug" keeps the answers', async ({ page }) => {
    await open(page, '/vergelijken/energie?energie=both');
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Wie is je huidige energieleverancier?');
    await control(page, 'Wie is je huidige energieleverancier?').selectOption('luminus');
    await goNext(page, 'Wat voor meter heb je?');
    await choose(page, 'Dag/nachtmeter (tweevoudig tarief)');
    await back(page).click();
    await expect(heading(page)).toHaveText('Wie is je huidige energieleverancier?');
    await expect(control(page, 'Wie is je huidige energieleverancier?')).toHaveValue('luminus');
    await goNext(page, 'Wat voor meter heb je?');
    await expect(
      page.getByRole('radio', { name: 'Dag/nachtmeter (tweevoudig tarief)' }),
    ).toBeChecked();
    await back(page).click();
    await back(page).click();
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('9000');
    // First shown step of a preselected form: back to the product page (the home page for energy).
    await back(page).click();
    await page.waitForURL((url) => url.pathname === '/');
  });

  test('a refresh restores the answers and the step', async ({ page }) => {
    await open(page, '/vergelijken');
    await choose(page, 'Thuisbatterij');
    await goNext(page, 'Wat is je postcode?');
    await expect(progressLine(page)).toHaveText(/^Stap 2 van /);
    await control(page, 'Wat is je postcode?').fill('3500');
    await goNext(page, 'Heb je zonnepanelen?');
    await page.reload();
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(heading(page)).toHaveText('Heb je zonnepanelen?');
    await back(page).click();
    await expect(control(page, 'Wat is je postcode?')).toHaveValue('3500');
    await back(page).click();
    await expect(page.getByRole('radio', { name: 'Thuisbatterij' })).toBeChecked();
  });

  test('a product page link skips step 1', async ({ page }) => {
    for (const product of ['zonnepanelen', 'thuisbatterij']) {
      await open(page, `/vergelijken/${product}`);
      await expect(heading(page)).toHaveText('Wat is je postcode?');
      await expect(progressLine(page)).toHaveText(/^Stap 1 van \d+$/);
      await expect(page.getByRole('radio', { name: 'Zonnepanelen' })).toHaveCount(0);
    }
  });
});

test.describe('form: submit', () => {
  test('"Verstuur" goes to the thank-you page and sends nothing', async ({ page, baseURL }) => {
    await toContact(page);
    await fillContact(page);
    const origin = new URL(baseURL!).origin;
    const unexpected: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin || request.method() !== 'GET') {
        unexpected.push(`${request.method()} ${request.url()}`);
      }
    });
    await submit(page).click();
    await page.waitForURL('**/bedankt/energie');
    expect(unexpected).toEqual([]);
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:form:energie')),
    ).toBeNull();
  });

  test('a double click submits once', async ({ page }) => {
    await toContact(page);
    await fillContact(page);
    const thankYou: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.url().includes('/bedankt/')) {
        thankYou.push(request.url());
      }
    });
    await submit(page).dblclick();
    await page.waitForURL('**/bedankt/energie');
    await page.waitForLoadState('networkidle');
    expect(thankYou).toHaveLength(1);
  });
});

test.describe('form: accessibility and layout', () => {
  async function axe(page: Page, label: string) {
    const results = await new AxeBuilder({ page }).include('main').analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }

  test('no serious axe violations on any step type', async ({ page }) => {
    await open(page, '/vergelijken');
    await axe(page, 'product cards');
    await next(page).click();
    await axe(page, 'product cards with an error');
    await choose(page, 'Elektriciteit + gas');
    await goNext(page, 'Wat is je postcode?');
    await tick(page, 'Dit is een zakelijk adres.');
    await axe(page, 'postcode, checkbox and revealed bands');
    await tick(page, 'Dit is een zakelijk adres.', false);
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Wie is je huidige energieleverancier?');
    await axe(page, 'select');
    await control(page, 'Wie is je huidige energieleverancier?').selectOption('bolt');
    await goNext(page, 'Wat voor meter heb je?');
    await axe(page, 'plain cards');
    await choose(page, 'Dagmeter + exclusief nacht');
    await goNext(page, 'Heb je een digitale meter?');
    await axe(page, 'yes/no cards');
    await choose(page, 'Ja', 'Heb je een digitale meter?');
    await choose(page, 'Ja', 'Heb je zonnepanelen?');
    await goNext(page, 'Heb je een sociaal tarief?');
    await choose(page, 'Nee', 'Heb je een sociaal tarief?');
    await choose(page, 'Nee', 'Heb je een budgetmeter?');
    await goNext(page, 'Ken je je jaarlijks energieverbruik?');
    await choose(page, 'Ja');
    await goNext(page, 'Je jaarverbruik');
    await next(page).click();
    await axe(page, 'number fields with errors');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    await control(page, 'Gas (kWh per jaar)').fill('12.000');
    await goNext(page, 'Jouw gegevens');
    await axe(page, 'contact, call moment and consent');
    await submit(page).click();
    await axe(page, 'contact with errors');
  });

  test('no horizontal scroll at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const noScroll = async (label: string) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, label).toBeLessThanOrEqual(0);
    };
    await open(page, '/vergelijken');
    await noScroll('step 1');
    await toContact(page);
    await noScroll('contact');
    await submit(page).click();
    await noScroll('contact with errors');
    // Start over: the same page would otherwise resume at the contact step (brief §7.6).
    await page.evaluate(() => sessionStorage.clear());
    await open(page, '/vergelijken/energie?energie=both');
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Wie is je huidige energieleverancier?');
    await noScroll('select');
    await control(page, 'Wie is je huidige energieleverancier?').selectOption('luminus');
    await goNext(page, 'Wat voor meter heb je?');
    await noScroll('long card labels');
  });
});
