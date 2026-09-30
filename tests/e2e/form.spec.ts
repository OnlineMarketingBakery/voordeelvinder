// The form island (brief §7.6, §12): /vergelijken and /vergelijken/<product>. "Verstuur" posts
// the lead to /api/lead and goes to the thank-you page /bedankt/<product>. Here the endpoint and
// Turnstile are stand-ins (tests/support/form-submit.ts); what the form does with each answer
// of the endpoint is in form-submit.spec.ts, the endpoint itself in lead.spec.ts.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import thanks from '../../src/content/pages/bedankt.json' with { type: 'json' };
import { STEP_GUARD_MS } from '../../src/lib/form/submit';
import { stubLead, stubTurnstile } from '../support/form-submit';

// Every test: a fake /api/lead that answers OK, and the Turnstile stub instead of Cloudflare.
test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
  await stubLead(page);
});

const { buttons, errors, requiredByType } = copy;
const progress = (step: number, total: number) =>
  copy.progress.replace('{step}', String(step)).replace('{total}', String(total));

// "Volgende"/"Verstuur" (the form's submit button; the footer has a form too).
const formSubmit = (page: Page) => page.getByRole('main').locator('form button[type="submit"]');

/** Waits until the island has hydrated and restored its session ("Volgende" is enabled then). */
async function hydrated(page: Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(formSubmit(page)).toBeEnabled();
}

/** Opens a form page and waits until the island has hydrated and restored its session. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
}

/**
 * Right after "Volgende" moved on, another "Volgende" without an answer in between counts as a
 * double click and is ignored for STEP_GUARD_MS: wait that out before pressing it on purpose.
 */
const settle = (page: Page) => page.waitForTimeout(STEP_GUARD_MS + 50);

// The question title (the footer has h2s too).
const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
// An error line under a field (the live region, outside the form, repeats the first one).
const errorText = (page: Page, text: string) =>
  page.getByRole('main').locator('form').getByText(text);
// The island's aria-live region (step changes and failed validation).
const live = (page: Page) => page.getByRole('main').locator('p[aria-live="polite"]');
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

/**
 * Picks a radio with the keyboard (focus + Space). A tap or click on a card of a single-choice
 * step moves on by itself after 300 ms (auto-advance, brief §6.1), which would race the next
 * action here; tests/e2e/form-motion.spec.ts covers the taps.
 */
async function choose(page: Page, name: string, group?: string) {
  const scope = group ? page.getByRole('radiogroup', { name: group }) : page;
  const radio = scope.getByRole('radio', { name, exact: true });
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
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
    page.on('pageerror', (error) => {
      // WebKit reports a fetch it cancels because the page navigates away as a page error: the
      // viewport prefetch of the consent links, cut off by "Verstuur". Not an error of the page.
      if (!/^Fetch API cannot load .* due to access control checks\.$/.test(error.message)) {
        pageErrors.push(error.message);
      }
    });
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);
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
    await expect(errorText(page, requiredByType.single_choice)).toHaveCount(2);
    await tick(page, 'Dit is een zakelijk adres.', false);
    await goNext(page, 'Wie is je huidige energieleverancier?');
  });
});

test.describe('form: validation', () => {
  test('shows errors inline, focuses the first one and links it to its field', async ({ page }) => {
    await open(page, '/vergelijken');
    await next(page).click();
    await expect(errorText(page, requiredByType.single_choice)).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Elektriciteit', exact: true })).toBeFocused();
    await expect(heading(page)).toHaveText('Wat wil je vergelijken?');
    const group = page.getByRole('radiogroup', { name: 'Wat wil je vergelijken?' });
    await expect(group).toHaveAttribute('aria-invalid', 'true');
    await expect(group).toHaveAccessibleDescription(requiredByType.single_choice);
    // The focused radio carries the error too, and the error is announced.
    await expect(
      page.getByRole('radio', { name: 'Elektriciteit', exact: true }),
    ).toHaveAccessibleDescription(requiredByType.single_choice);
    await expect(live(page)).toHaveText(requiredByType.single_choice);
    // A second "Volgende" with the same error is announced again.
    await next(page).click();
    // (toHaveText trims whitespace, so read the raw text: a trailing no-break space.)
    await expect
      .poll(() => live(page).evaluate((element) => element.textContent))
      .toBe(`${requiredByType.single_choice}\u00a0`);

    await choose(page, 'Zonnepanelen');
    await expect(errorText(page, requiredByType.single_choice)).toHaveCount(0);
    await goNext(page, 'Wat is je postcode?');
    await settle(page);
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
    await expect(errorText(page, errors.phone_invalid)).toBeVisible();
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
    await expect(errorText(page, requiredByType.day_slot)).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Maandag' })).toHaveAccessibleDescription(
      requiredByType.day_slot,
    );
    await expect(errorText(page, requiredByType.consent)).toBeVisible();
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
  test('"Verstuur" sends the lead once and goes to the thank-you page', async ({
    page,
    baseURL,
  }) => {
    const bodies = await stubLead(page);
    await toContact(page);
    await fillContact(page);
    // Contact details typed on another form page in this tab must not outlive the lead.
    await page.evaluate(() =>
      sessionStorage.setItem('voordeelvinder:form:vergelijken', '{"first_name":"Jan"}'),
    );
    const origin = new URL(baseURL!).origin;
    const unexpected: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      // The one POST is the lead; the only other origin is the Turnstile script.
      if (request.method() === 'POST' && url.origin === origin && url.pathname === '/api/lead') {
        return;
      }
      if (url.origin === 'https://challenges.cloudflare.com' && request.method() === 'GET') return;
      if (url.origin !== origin || request.method() !== 'GET') {
        unexpected.push(`${request.method()} ${request.url()}`);
      }
    });
    const response = page.waitForResponse(
      (candidate) =>
        candidate.request().isNavigationRequest() && candidate.url().includes('/bedankt/'),
    );
    await submit(page).click();
    await page.waitForURL('**/bedankt/energie');
    // The thank-you page exists (a real 200, not the 404 page) and shows its h1.
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);
    expect(unexpected).toEqual([]);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      product: 'energie',
      contact: { first_name: 'Jan', last_name: 'Peeters', email: 'jan.peeters@example.be' },
      website: '',
    });
    expect(
      await page.evaluate(() =>
        Object.keys(sessionStorage).filter((key) => key.startsWith('voordeelvinder:form:')),
      ),
    ).toEqual([]);
  });

  test('the solar panel form lands on /bedankt/zonnepanelen', async ({ page }) => {
    await open(page, '/vergelijken/zonnepanelen');
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Ben je eigenaar van de woning?');
    await choose(page, 'Eigenaar');
    await goNext(page, 'Wat voor dak heb je?');
    await choose(page, 'Hellend dak', 'Wat voor dak heb je?');
    await choose(page, 'Zuid', 'Waar is je dak op gericht?');
    await goNext(page, 'Ken je je jaarlijks energieverbruik?');
    await choose(page, 'Ja');
    await goNext(page, 'Je jaarverbruik');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    await goNext(page, 'Wil je ook een thuisbatterij?');
    await choose(page, 'Nee');
    await goNext(page, 'Jouw gegevens');
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/zonnepanelen');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);
  });

  test('the home battery form lands on /bedankt/thuisbatterij', async ({ page }) => {
    await open(page, '/vergelijken/thuisbatterij');
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Heb je zonnepanelen?');
    await choose(page, 'Nee, nog niet');
    await goNext(page, 'Heb je een digitale meter?');
    await choose(page, 'Ja');
    await goNext(page, 'Ken je je jaarlijks energieverbruik?');
    await choose(page, 'Ja');
    await goNext(page, 'Je jaarverbruik');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    // The thank-you page is fetched ahead as soon as the contact step (the last) shows (brief
    // §6.1), not as a navigation.
    const prefetched = page.waitForRequest(
      (request) =>
        request.url().includes('/bedankt/thuisbatterij') && !request.isNavigationRequest(),
    );
    await goNext(page, 'Jouw gegevens');
    await prefetched;
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);
  });

  test('a double click submits once', async ({ page }) => {
    const bodies = await stubLead(page);
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
    expect(bodies).toHaveLength(1);
  });
});

test.describe('form: double clicks', () => {
  test('a double click on "Volgende" moves one step, without errors', async ({ page }) => {
    await open(page, '/vergelijken/energie?energie=both');
    await control(page, 'Wat is je postcode?').fill('9000');
    await next(page).dblclick();
    await expect(heading(page)).toHaveText('Wie is je huidige energieleverancier?');
    await page.waitForTimeout(STEP_GUARD_MS);
    await expect(heading(page)).toHaveText('Wie is je huidige energieleverancier?');
    await expect(errorText(page, requiredByType.select)).toHaveCount(0);
  });

  test('after "Terug", a double click never submits the contact step unseen', async ({ page }) => {
    await toContact(page);
    await fillContact(page);
    await back(page).click();
    await expect(heading(page)).toHaveText('Heb je een warmtepomp?');
    await next(page).dblclick();
    await expect(heading(page)).toHaveText('Jouw gegevens');
    await page.waitForTimeout(STEP_GUARD_MS + 250);
    expect(new URL(page.url()).pathname).toBe('/vergelijken/energie');
    await expect(submit(page)).toBeVisible();
  });
});

test.describe('form: server render and before hydration', () => {
  test('/vergelijken/energie renders the ?energie= start on the server', async ({ request }) => {
    // The progress numbers are separate spans (they roll): compare it as text.
    const text = (html: string) => html.replace(/<[^>]+>/g, '');
    const both = await (
      await request.get('/vergelijken/energie?energie=both&utm_source=meta')
    ).text();
    expect(both).toContain('>Wat is je postcode?</h2>');
    expect(text(both)).toContain(progress(1, 9));
    expect(both).not.toContain('>Wat wil je vergelijken?</h2>');
    expect(both).not.toContain('utm_source'); // only the validated preselect reaches the props
    expect(both).toContain('<link rel="canonical" href="');
    expect(both).toMatch(/<link rel="canonical" href="[^"]*\/vergelijken\/energie\/">/);

    const plain = await (await request.get('/vergelijken/energie')).text();
    expect(plain).toContain('>Wat wil je vergelijken?</h2>');
    expect(text(plain)).toContain(progress(1, 10));
    // An unknown value is dropped, like in the island.
    const unknown = await (await request.get('/vergelijken/energie?energie=water')).text();
    expect(unknown).toContain('>Wat wil je vergelijken?</h2>');

    expect((await request.get('/vergelijken/water')).status()).toBe(404);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    for (const product of ['energie', 'zonnepanelen', 'thuisbatterij']) {
      expect(sitemap).toContain(`/vergelijken/${product}/</loc>`);
    }
  });

  test('nothing submits natively before hydration, and nothing swaps after', async ({ page }) => {
    // Hold every script until the test lets go: the page stays server-rendered HTML.
    const held: Route[] = [];
    let release = false;
    await page.route('**/_astro/**/*.js', (route) => {
      if (release) return route.continue();
      held.push(route);
    });
    const path = '/vergelijken/energie?energie=both&utm_source=meta&test=1';
    await page.goto(path, { waitUntil: 'commit' });
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(progressLine(page)).toHaveText(progress(1, 9));
    await expect(page.locator('astro-island[ssr]')).toHaveCount(1);
    await expect(formSubmit(page)).toBeDisabled();

    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    const postcode = control(page, 'Wat is je postcode?');
    await postcode.fill('9000');
    await postcode.press('Enter');
    await page.evaluate(() =>
      document.querySelector<HTMLFormElement>('main form')!.requestSubmit(),
    );
    await page.waitForTimeout(500);
    expect(navigations).toEqual([]);
    expect(page.url()).toBe(new URL(path, page.url()).href);

    release = true;
    await Promise.all(held.map((route) => route.continue()));
    await hydrated(page);
    // The same step as the server rendered: no swap after hydration.
    await expect(heading(page)).toHaveText('Wat is je postcode?');
    await expect(progressLine(page)).toHaveText(progress(1, 9));
    await postcode.fill('9000');
    await goNext(page, 'Wie is je huidige energieleverancier?');
    expect(page.url()).toBe(new URL(path, page.url()).href);
  });

  test('every image on an on-demand form page loads', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });
    await open(page, '/vergelijken/energie?energie=both');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    const broken = await page.evaluate(() =>
      [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );
    expect(broken).toEqual([]);
    expect(failed).toEqual([]);
  });
});

test.describe('form: lead ids', () => {
  test('a card of another product on step 1 starts a new lead', async ({ page }) => {
    await open(page, '/vergelijken');
    const stored = () =>
      page.evaluate(() => {
        const raw = sessionStorage.getItem('voordeelvinder:form:vergelijken');
        return raw ? (JSON.parse(raw) as { leadId: string; eventId: string }) : null;
      });
    await choose(page, 'Elektriciteit');
    await expect.poll(stored).not.toBeNull();
    const energy = (await stored())!;
    await choose(page, 'Gas');
    await expect.poll(async () => (await stored())?.leadId).toBe(energy.leadId);
    await choose(page, 'Zonnepanelen');
    await expect.poll(async () => (await stored())?.leadId).not.toBe(energy.leadId);
    const solar = (await stored())!;
    expect(solar.eventId).not.toBe(energy.eventId);
  });
});

test.describe('form: accessibility and layout', () => {
  async function axe(page: Page, label: string) {
    // Error lines fade in (also with reduced motion): let them finish, or axe measures the
    // contrast of a half-transparent line.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    );
    await page.waitForTimeout(200);
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
    await settle(page);
    await next(page).click();
    await axe(page, 'number fields with errors');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    await control(page, 'Gas (kWh per jaar)').fill('12.000');
    await goNext(page, 'Jouw gegevens');
    await axe(page, 'contact, call moment and consent');
    await settle(page);
    await submit(page).click();
    await expect(errorText(page, requiredByType.consent)).toBeVisible();
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
    await settle(page);
    await submit(page).click();
    await expect(errorText(page, requiredByType.consent)).toBeVisible();
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
