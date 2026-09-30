// "Verstuur" and the lead endpoint (brief §6.1, §9.1, §9.4): what the form does with each answer
// of POST /api/lead, faked with page.route (tests/support/form-submit.ts): OK → the thank-you
// page celebrates; 503 → one retry with the same lead_id; 403, 429, 400 and no network → a
// message, the button unlocked and the answers kept (locked while sending). Also the honeypot
// (no cheer for its pretend OK), Turnstile (a local stub for Cloudflare's script, loaded only on
// the contact step, again after a failed load) and test mode (?test=1).
import { expect, test, type Page } from '@playwright/test';

import copy from '../../src/content/flows/nl/_copy.json' with { type: 'json' };
import thanks from '../../src/content/pages/bedankt.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };
import {
  blockTurnstile,
  FAKE_TURNSTILE_TOKEN,
  stubLead,
  stubTurnstile,
  type LeadReply,
} from '../support/form-submit';

const { buttons, submitErrors } = copy;

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });
const next = (page: Page) => page.getByRole('button', { name: buttons.next, exact: true });
const submit = (page: Page) => page.getByRole('button', { name: buttons.submit, exact: true });
const control = (page: Page, name: string | RegExp, options?: { exact?: boolean }) =>
  page.getByLabel(name, options).and(page.locator('input, select, textarea'));
// The message above the buttons, and the island's aria-live region.
const sendError = (page: Page) => page.locator('#formulier-verzendfout');
const live = (page: Page) => page.getByRole('main').locator('p[aria-live="polite"]');
const badge = (page: Page) => page.getByText(site.testMode.badge, { exact: true });
const celebration = (page: Page) => page.locator('[data-celebration]');

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('main form button[type="submit"]')).toBeEnabled();
}

/** Picks a radio with the keyboard (a tap would auto-advance, see form.spec.ts). */
async function choose(page: Page, name: string) {
  const radio = page.getByRole('radio', { name, exact: true });
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
}

async function goNext(page: Page, title: string) {
  await next(page).click();
  await expect(heading(page)).toHaveText(title);
}

/** The home battery flow (the shortest) up to the contact step. */
async function toContact(page: Page, query = '') {
  await open(page, `/vergelijken/thuisbatterij${query}`);
  await control(page, 'Wat is je postcode?').fill('9000');
  await goNext(page, 'Heb je zonnepanelen?');
  await choose(page, 'Nee, nog niet');
  await goNext(page, 'Heb je een digitale meter?');
  await choose(page, 'Ja');
  await goNext(page, 'Ken je je jaarlijks energieverbruik?');
  await choose(page, 'Ja');
  await goNext(page, 'Je jaarverbruik');
  await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
  await goNext(page, 'Jouw gegevens');
}

async function fillContact(page: Page) {
  await control(page, 'Voornaam').fill('Jan');
  await control(page, 'Achternaam').fill('Peeters');
  await control(page, 'Telefoonnummer').fill('0475 12 34 56');
  await control(page, 'E-mail', { exact: true }).fill('jan.peeters@example.be');
  await choose(page, 'Woensdag');
  await choose(page, '13:00–14:00');
  const terms = page.getByRole('checkbox', { name: /Ik ga akkoord/ });
  await terms.locator('xpath=ancestor::label[1]').click({ position: { x: 17, y: 20 } });
  await expect(terms).toBeChecked();
}

test.describe('form submit: the endpoint answers OK', () => {
  test('the lead is sent with the honeypot and a Turnstile token, and the thank-you page celebrates', async ({
    page,
  }) => {
    const scripts = await stubTurnstile(page);
    const bodies = await stubLead(page);
    await open(page, '/vergelijken/thuisbatterij');
    // Not on page load: the script loads when the contact step shows.
    await page.waitForLoadState('networkidle');
    expect(scripts).toEqual([]);
    await control(page, 'Wat is je postcode?').fill('9000');
    await goNext(page, 'Heb je zonnepanelen?');
    expect(scripts).toEqual([]);
    await choose(page, 'Nee, nog niet');
    await goNext(page, 'Heb je een digitale meter?');
    await choose(page, 'Ja');
    await goNext(page, 'Ken je je jaarlijks energieverbruik?');
    await choose(page, 'Ja');
    await goNext(page, 'Je jaarverbruik');
    await control(page, 'Elektriciteit (kWh per jaar)').fill('3500');
    await goNext(page, 'Jouw gegevens');
    await expect.poll(() => scripts.length).toBe(1);
    expect(scripts[0]).toMatch(
      /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/,
    );
    // Rendered once, with the always-passing test site key (no key is set off production).
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __turnstile?: object }).__turnstile))
      .toEqual({ renders: 1, sitekeys: ['1x00000000000000000000AA'] });

    // The honeypot: in the form, out of the tab order and hidden from assistive technology.
    const honeypot = page.locator('main form input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');
    await expect(honeypot.locator('xpath=ancestor::*[@aria-hidden="true"][1]')).toHaveCount(1);

    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);

    expect(bodies).toHaveLength(1);
    const [body] = bodies;
    expect(body).toMatchObject({
      schema_version: 1,
      product: 'thuisbatterij',
      website: '',
      meta: { page: '/vergelijken/thuisbatterij', test: false },
    });
    expect(String(body!.turnstile_token)).toMatch(new RegExp(`^${FAKE_TURNSTILE_TOKEN}-\\d+$`));

    // The lead is safe: the badge cheers, and the one-time flag is gone.
    await expect(celebration(page)).toHaveAttribute('data-celebrate', '');
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:lead-safe')),
    ).toBeNull();
    // A reload of the same page doesn't cheer again.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(thanks.sections[0]!.title);
    await page.waitForLoadState('load');
    await expect(celebration(page)).not.toHaveAttribute('data-celebrate');
  });

  test('a direct visit to /bedankt never celebrates', async ({ page }) => {
    await page.goto('/bedankt/energie');
    await page.waitForLoadState('load');
    await expect(celebration(page)).not.toHaveAttribute('data-celebrate');
    // Nor does a flag for another product (it is used up).
    await page.evaluate(() =>
      sessionStorage.setItem(
        'voordeelvinder:lead-safe',
        JSON.stringify({ event_id: 'x', product: 'zonnepanelen' }),
      ),
    );
    await page.goto('/bedankt/energie');
    await page.waitForLoadState('load');
    await expect(celebration(page)).not.toHaveAttribute('data-celebrate');
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:lead-safe')),
    ).toBeNull();
  });

  test('a 503 is retried once, with the same lead_id and a new Turnstile token', async ({
    page,
  }) => {
    await stubTurnstile(page);
    const bodies = await stubLead(page, [
      { status: 503, body: { ok: false, error: 'unavailable' } },
    ]);
    await toContact(page);
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    expect(bodies).toHaveLength(2);
    expect(bodies[1]!.lead_id).toBe(bodies[0]!.lead_id);
    expect(bodies[1]!.event_id).toBe(bodies[0]!.event_id);
    expect(bodies[0]!.turnstile_token).toBeTruthy();
    expect(bodies[1]!.turnstile_token).toBeTruthy();
    expect(bodies[1]!.turnstile_token).not.toBe(bodies[0]!.turnstile_token);
    await expect(celebration(page)).toHaveAttribute('data-celebrate', '');
  });

  test('without the Turnstile script the lead is still sent (the server decides)', async ({
    page,
  }) => {
    await blockTurnstile(page);
    const bodies = await stubLead(page);
    await toContact(page);
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toHaveProperty('turnstile_token');
  });

  test('a Turnstile script that failed to load is loaded again on "Verstuur"', async ({ page }) => {
    const scripts = await stubTurnstile(page);
    // The first request fails (offline for a moment, a blocker); later ones reach the stub.
    let failed = 0;
    await page.route('https://challenges.cloudflare.com/**', (route) => {
      if (failed > 0) return route.fallback();
      failed += 1;
      return route.abort();
    });
    const bodies = await stubLead(page);
    await toContact(page);
    await expect.poll(() => failed).toBe(1);
    expect(scripts).toEqual([]);
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    // Loaded again, and the lead went with a token.
    expect(scripts).toHaveLength(1);
    expect(bodies).toHaveLength(1);
    expect(String(bodies[0]!.turnstile_token)).toMatch(
      new RegExp(`^${FAKE_TURNSTILE_TOKEN}-\\d+$`),
    );
  });

  test('a filled honeypot gets a pretend OK: the thank-you page shows, without the cheer', async ({
    page,
  }) => {
    await stubTurnstile(page);
    const bodies = await stubLead(page);
    await toContact(page);
    await fillContact(page);
    // A bot fills every input, the hidden one too (the endpoint answers OK and stores nothing).
    await page.locator('main form input[name="website"]').evaluate((input: HTMLInputElement) => {
      input.value = 'https://spam.example';
    });
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    await page.waitForLoadState('load');
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ website: 'https://spam.example' });
    await expect(celebration(page)).not.toHaveAttribute('data-celebrate');
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:lead-safe')),
    ).toBeNull();
  });
});

test.describe('form submit: the lead could not be sent', () => {
  const failures: Array<{ name: string; replies: LeadReply[]; message: string; posts: number }> = [
    {
      name: '403 (Turnstile failed)',
      replies: [{ status: 403, body: { ok: false, error: 'verification_failed' } }],
      message: submitErrors.turnstile,
      posts: 1,
    },
    {
      name: '429 (rate limit)',
      replies: [
        {
          status: 429,
          body: { ok: false, error: 'rate_limited' },
          headers: { 'retry-after': '3600' },
        },
      ],
      message: submitErrors.rate_limit,
      posts: 1,
    },
    {
      name: '400 (invalid, e.g. a flow changed by a deploy)',
      replies: [{ status: 400, body: { ok: false, error: 'invalid_request' } }],
      message: submitErrors.invalid,
      posts: 1,
    },
    {
      name: '503 twice (unavailable)',
      replies: [
        { status: 503, body: { ok: false, error: 'unavailable' } },
        { status: 503, body: { ok: false, error: 'unavailable' } },
      ],
      message: submitErrors.unavailable,
      posts: 2,
    },
    {
      name: 'no network, twice',
      replies: ['network', 'network'],
      message: submitErrors.network,
      posts: 2,
    },
  ];

  for (const failure of failures) {
    test(`${failure.name}: a message, the button unlocked, the answers kept`, async ({ page }) => {
      await stubTurnstile(page);
      const bodies = await stubLead(page, failure.replies);
      await toContact(page);
      await fillContact(page);
      await submit(page).click();

      await expect(sendError(page)).toHaveText(failure.message);
      await expect(live(page)).toContainText(failure.message);
      expect(bodies).toHaveLength(failure.posts);
      // Still on the form, on the contact step, with every answer.
      expect(new URL(page.url()).pathname).toBe('/vergelijken/thuisbatterij');
      await expect(heading(page)).toHaveText('Jouw gegevens');
      await expect(control(page, 'Voornaam')).toHaveValue('Jan');
      await expect(control(page, 'E-mail', { exact: true })).toHaveValue('jan.peeters@example.be');
      await expect(page.getByRole('checkbox', { name: /Ik ga akkoord/ })).toBeChecked();
      expect(
        await page.evaluate(() => sessionStorage.getItem('voordeelvinder:form:thuisbatterij')),
      ).not.toBeNull();
      expect(
        await page.evaluate(() => sessionStorage.getItem('voordeelvinder:lead-safe')),
      ).toBeNull();
      // Unlocked: no spinner, and a second try sends again (the stub now answers OK).
      await expect(submit(page)).toBeEnabled();
      await expect(submit(page)).not.toHaveAttribute('aria-disabled', 'true');
      const reload = page.getByRole('button', { name: submitErrors.reload, exact: true });
      await expect(reload).toHaveCount(failure.message === submitErrors.invalid ? 1 : 0);
      await submit(page).click();
      await page.waitForURL('**/bedankt/thuisbatterij');
      expect(bodies).toHaveLength(failure.posts + 1);
      // The same lead every time.
      expect(new Set(bodies.map((body) => body.lead_id)).size).toBe(1);
    });
  }

  test('while sending, nothing changes; after a failure a corrected answer goes out', async ({
    page,
  }) => {
    await stubTurnstile(page);
    const bodies = await stubLead(page);
    // The first send waits until the test lets it fail (403); stubLead answers the next one.
    let fail!: () => void;
    const failing = new Promise<void>((resolve) => {
      fail = resolve;
    });
    await page.route('**/api/lead', async (route) => {
      if (route.request().method() !== 'POST' || bodies.length > 0) return route.fallback();
      bodies.push(route.request().postDataJSON() as Record<string, unknown>);
      await failing;
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'verification_failed' }),
      });
    });
    await toContact(page);
    await fillContact(page);
    await submit(page).click();
    await expect.poll(() => bodies.length).toBe(1);
    await expect(submit(page)).toHaveAttribute('aria-disabled', 'true');

    // Sending: text inputs are read-only (focus stays in them); chips and checkboxes don't change.
    const phone = control(page, 'Telefoonnummer');
    await expect(phone).not.toBeEditable();
    await phone.focus();
    await page.keyboard.type('9');
    await expect(phone).toBeFocused();
    await expect(phone).toHaveValue('0475 12 34 56');
    const thursday = page.getByRole('radio', { name: 'Donderdag', exact: true });
    await thursday.focus();
    await page.keyboard.press('Space');
    await expect(thursday).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'Woensdag', exact: true })).toBeChecked();
    const terms = page.getByRole('checkbox', { name: /Ik ga akkoord/ });
    await terms.locator('xpath=ancestor::label[1]').click({ position: { x: 17, y: 20 } });
    await expect(terms).toBeChecked();

    // It fails: everything unlocks, and the corrected number goes out with the next press.
    fail();
    await expect(sendError(page)).toHaveText(submitErrors.turnstile);
    await expect(phone).toBeEditable();
    await phone.fill('0476 65 43 21');
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.contact).toMatchObject({ phone_e164: '+32475123456' });
    expect(bodies[1]!.contact).toMatchObject({ phone_e164: '+32476654321' });
    expect(bodies[1]!.call_preference).toEqual({ day: 'wed', slot: '13-14' });
    expect(bodies[1]!.consent).toMatchObject({ terms: true });
  });

  test('changing an answer clears the message', async ({ page }) => {
    await stubTurnstile(page);
    await stubLead(page, [{ status: 403, body: { ok: false } }]);
    await toContact(page);
    await fillContact(page);
    await submit(page).click();
    await expect(sendError(page)).toHaveText(submitErrors.turnstile);
    await control(page, 'Voornaam').fill('Janneke');
    await expect(sendError(page)).toHaveCount(0);
  });

  test('"Pagina vernieuwen" after a 400 reloads the form with the answers', async ({ page }) => {
    await stubTurnstile(page);
    await stubLead(page, [{ status: 400, body: { ok: false, error: 'invalid_request' } }]);
    await toContact(page);
    await fillContact(page);
    await submit(page).click();
    await expect(sendError(page)).toHaveText(submitErrors.invalid);
    await page.getByRole('button', { name: submitErrors.reload, exact: true }).click();
    await page.waitForLoadState('load');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(heading(page)).toHaveText('Jouw gegevens');
    await expect(control(page, 'Voornaam')).toHaveValue('Jan');
  });
});

test.describe('form submit: test mode (?test=1)', () => {
  test('?test=1 shows the badge on every page for the session and marks the lead', async ({
    page,
  }) => {
    await stubTurnstile(page);
    const bodies = await stubLead(page);
    await page.goto('/?test=1');
    await expect(badge(page)).toBeVisible();
    // Not a control: never in the tab order.
    expect(await badge(page).evaluate((element) => element.tabIndex)).toBe(-1);
    // Kept for the session, without the parameter.
    await page.goto('/zonnepanelen');
    await expect(badge(page)).toBeVisible();
    await toContact(page);
    await expect(badge(page)).toBeVisible();
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    await expect(badge(page)).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ meta: { test: true } });

    // ?test=0 ends it.
    await page.goto('/?test=0');
    await expect(badge(page)).toBeHidden();
    await page.goto('/zonnepanelen');
    await expect(badge(page)).toBeHidden();
  });

  test('without ?test=1 there is no badge and the lead is not a test', async ({ page }) => {
    await stubTurnstile(page);
    const bodies = await stubLead(page);
    await page.goto('/');
    await expect(badge(page)).toBeHidden();
    await toContact(page);
    await expect(badge(page)).toBeHidden();
    await fillContact(page);
    await submit(page).click();
    await page.waitForURL('**/bedankt/thuisbatterij');
    expect(bodies[0]).toMatchObject({ meta: { test: false } });
  });
});
