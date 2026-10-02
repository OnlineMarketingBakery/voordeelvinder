// The lead pipeline end to end (brief §9.1, §9.4, §12): the built server with the mock n8n and
// siteverify stand-in from tests/support (playwright.config.ts starts both). Every lead is a
// test lead here (SITE_ENV is never production in e2e).
//
// The API tests run once (Chromium desktop): they need no browser. The form test runs in every
// project: the real form posts to the real /api/lead (sendLead in src/lib/form/submit.ts); only
// Cloudflare's Turnstile script is the local stub (its token passes the siteverify stand-in).
// The other form specs stub /api/lead with page.route instead, so they never reach this server.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  E2E_BACKUP_DIR,
  E2E_RATE_LIMIT,
  E2E_WEBHOOK_SECRET,
  MOCK_N8N_URL,
} from '../support/e2e-env';
import { energyLeadBody } from '../support/energy-lead';
import { FAKE_TURNSTILE_TOKEN, stubTurnstile } from '../support/form-submit';
import type { ReceivedRequest } from '../support/mock-n8n';

/**
 * The top-level keys of the lead payload contract (docs/PAYLOAD.md, brief §9.2), including the
 * site's `outcome` and `outcome_reasons` (ADR 0010).
 */
const PAYLOAD_KEYS = [
  'answers',
  'brand',
  'call_preference',
  'consent',
  'contact',
  'derived',
  'event_id',
  'flow_version',
  'is_test',
  'labels',
  'lead_id',
  'meta',
  'outcome',
  'outcome_reasons',
  'product',
  'schema_version',
  'submitted_at',
  'tracking',
];

/** Makes Astro trust X-Forwarded-For, as behind Nginx (astro.config.ts allowedDomains). */
const fromIp = (ip: string) => ({
  'x-forwarded-for': ip,
  'x-forwarded-host': 'voordeelvinder.onlinemarketingbakery.nl',
  'x-forwarded-proto': 'https',
});

/** A fresh documentation-range IP per call, so tests never share a rate-limit bucket. */
let ipCounter = Math.floor(Math.random() * 200);
const freshIp = () => `198.51.100.${(ipCounter++ % 254) + 1}`;

async function received(request: APIRequestContext): Promise<ReceivedRequest[]> {
  return (await request.get(`${MOCK_N8N_URL}/_received`)).json();
}

async function webhookFor(request: APIRequestContext, id: string, key = 'lead_id') {
  await expect
    .poll(
      async () =>
        (await received(request)).filter((r) => (r.body as Record<string, unknown>)[key] === id)
          .length,
    )
    .toBe(1);
  return (await received(request)).find((r) => (r.body as Record<string, unknown>)[key] === id)!;
}

async function backupLines(): Promise<Record<string, unknown>[]> {
  const file = join(E2E_BACKUP_DIR, `${new Date().toISOString().slice(0, 7)}.jsonl`);
  const text = await readFile(file, 'utf8').catch(() => '');
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test.describe('POST /api/lead', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'API only: one project is enough',
  );

  test('forwards the §9.2 payload as a test lead, backs it up, and redirects', async ({
    request,
  }) => {
    const body = energyLeadBody();
    const response = await request.post('/api/lead', { data: body, headers: fromIp(freshIp()) });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });

    const webhook = await webhookFor(request, body.lead_id);
    expect(webhook.path).toBe('/webhook/lead');
    expect(webhook.headers['x-vv-secret']).toBe(E2E_WEBHOOK_SECRET);
    const payload = webhook.body as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(PAYLOAD_KEYS);
    expect(payload).toMatchObject({
      schema_version: 1,
      brand: 'voordeelvinder',
      lead_id: body.lead_id,
      event_id: body.event_id,
      is_test: true,
      product: 'energie',
      answers: { energy_type: 'both', supplier: 'luminus' },
      derived: { postcode: '9000', region: 'flanders', province: 'oost-vlaanderen' },
      contact: { phone_e164: '+32475000000' },
      meta: { page: '/vergelijken/energie' },
    });
    expect(Object.keys(payload.meta as object).sort()).toEqual([
      'ip',
      'page',
      'site_env',
      'user_agent',
    ]);
    expect((payload.meta as { site_env: string }).site_env).not.toBe('production');
    expect((payload.labels as Record<string, string>).supplier).toBe('Luminus');

    const lines = await backupLines();
    const record = lines.find((line) => line.id === body.lead_id);
    expect(record).toMatchObject({ kind: 'lead', status: 'pending_forward', payload });
    expect(lines).toContainEqual(
      expect.objectContaining({ id: body.lead_id, status: 'forwarded' }),
    );
  });

  test('a double submit is stored and forwarded once', async ({ request }) => {
    const body = energyLeadBody();
    const headers = fromIp(freshIp());
    const responses = await Promise.all([
      request.post('/api/lead', { data: body, headers }),
      request.post('/api/lead', { data: body, headers }),
    ]);
    for (const response of responses) expect(response.status()).toBe(200);
    await webhookFor(request, body.lead_id);
    const records = (await backupLines()).filter(
      (line) => line.id === body.lead_id && 'payload' in line,
    );
    expect(records).toHaveLength(1);
  });

  test('a resend of a stored lead gets the same success without a new Turnstile token', async ({
    request,
  }) => {
    const body = energyLeadBody();
    const headers = fromIp(freshIp());
    expect((await request.post('/api/lead', { data: body, headers })).status()).toBe(200);
    await webhookFor(request, body.lead_id);
    // The form resending after a lost response: the token is spent (the stand-in says "fail").
    const resend = await request.post('/api/lead', {
      data: { ...body, turnstile_token: 'fail' },
      headers,
    });
    expect(resend.status()).toBe(200);
    expect(await resend.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await webhookFor(request, body.lead_id);
  });

  test('a filled honeypot looks like success but stores and sends nothing', async ({ request }) => {
    const body = energyLeadBody({ website: 'https://spam.example' });
    const response = await request.post('/api/lead', { data: body, headers: fromIp(freshIp()) });
    expect(await response.json()).toEqual({ ok: true, redirect: '/bedankt/energie' });
    // Give a wrongly sent lead the time to arrive.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      (await received(request)).some(
        (r) => (r.body as { lead_id?: string }).lead_id === body.lead_id,
      ),
    ).toBe(false);
    expect((await backupLines()).some((line) => line.id === body.lead_id)).toBe(false);
  });

  test('a failed Turnstile check is refused with 403', async ({ request }) => {
    const response = await request.post('/api/lead', {
      data: energyLeadBody({ turnstile_token: 'fail' }),
      headers: fromIp(freshIp()),
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: 'verification_failed' });
  });

  test('unknown fields, bad codes and non-JSON are refused', async ({ request }) => {
    const headers = fromIp(freshIp());
    const unknown = await request.post('/api/lead', {
      data: { ...energyLeadBody(), extra: 'field' },
      headers,
    });
    expect(unknown.status()).toBe(400);
    const body = energyLeadBody();
    const badCode = await request.post('/api/lead', {
      data: { ...body, answers: { ...body.answers, supplier: 'not-a-supplier' } },
      headers,
    });
    expect(badCode.status()).toBe(400);
    // A same-origin form post (Astro's checkOrigin refuses a cross-site one with 403 before the
    // endpoint runs) reaches the endpoint, which only takes JSON.
    const form = await request.post('/api/lead', {
      form: { a: '1' },
      headers: { ...headers, origin: 'https://voordeelvinder.onlinemarketingbakery.nl' },
    });
    expect(form.status()).toBe(415);
    const crossSite = await request.post('/api/lead', { form: { a: '1' }, headers });
    expect(crossSite.status()).toBe(403);
    expect((await request.get('/api/lead')).status()).toBe(405);
  });

  test(`answers 429 with Retry-After after ${E2E_RATE_LIMIT} requests from one IP`, async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const headers = fromIp(freshIp());
    // Every request counts, also a rejected one: empty bodies are quick.
    for (let sent = 0; sent < E2E_RATE_LIMIT; sent += 50) {
      const batch = Array.from({ length: Math.min(50, E2E_RATE_LIMIT - sent) }, () =>
        request.post('/api/lead', { data: {}, headers }),
      );
      for (const response of await Promise.all(batch)) expect(response.status()).toBe(400);
    }
    const limited = await request.post('/api/lead', { data: energyLeadBody(), headers });
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    expect(await limited.json()).toEqual({ ok: false, error: 'rate_limited' });
    // Another visitor isn't affected.
    const other = await request.post('/api/lead', {
      data: energyLeadBody(),
      headers: fromIp(freshIp()),
    });
    expect(other.status()).toBe(200);
  });
});

test.describe('POST /api/newsletter', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'API only: one project is enough',
  );

  test('forwards a test sign-up to the newsletter webhook', async ({ request }) => {
    const email = `e2e-${Date.now()}@example.be`;
    const response = await request.post('/api/newsletter', {
      data: {
        email,
        consent: true,
        website: '',
        turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
        page: '/',
      },
      headers: fromIp(freshIp()),
    });
    expect(await response.json()).toEqual({ ok: true });
    const webhook = await webhookFor(request, email, 'email');
    expect(webhook.path).toBe('/webhook/newsletter');
    expect(webhook.body).toMatchObject({
      type: 'newsletter',
      is_test: true,
      consent: { newsletter: true },
    });
  });
});

test.describe('the energy form sends its lead', () => {
  async function fillEnergyForm(page: Page) {
    const main = page.getByRole('main');
    const heading = main.getByRole('heading', { level: 2 });
    const next = page.getByRole('button', { name: 'Volgende', exact: true });
    const control = (name: string, exact = false) =>
      page.getByLabel(name, { exact }).and(page.locator('input, select, textarea'));
    const choose = async (name: string, group?: string) => {
      const scope = group ? page.getByRole('radiogroup', { name: group }) : page;
      const radio = scope.getByRole('radio', { name, exact: true });
      await radio.focus();
      await page.keyboard.press('Space');
      await expect(radio).toBeChecked();
    };
    const goNext = async (title: string) => {
      await next.click();
      await expect(heading).toHaveText(title);
    };

    await page.goto('/vergelijken/energie/stappen?energie=both');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(main.locator('form button[type="submit"]')).toBeEnabled();
    await control('Wat is je postcode?').fill('9000');
    await goNext('Wie is je huidige energieleverancier?');
    await control('Wie is je huidige energieleverancier?').selectOption('luminus');
    await goNext('Wat voor meter heb je?');
    await choose('Dagmeter (enkelvoudig tarief)');
    await goNext('Heb je een digitale meter?');
    await choose('Ja', 'Heb je een digitale meter?');
    await choose('Nee', 'Heb je zonnepanelen?');
    await goNext('Heb je een sociaal tarief?');
    await choose('Nee', 'Heb je een sociaal tarief?');
    await choose('Weet ik niet', 'Heb je een budgetmeter?');
    await goNext('Ken je je jaarlijks energieverbruik?');
    await choose('Nee');
    await goNext('Hoeveel personen wonen er in je woning?');
    await control('Hoeveel personen wonen er in je woning?').selectOption('2');
    await control('Wat voor woning heb je?').selectOption('terraced');
    await goNext('Heb je een warmtepomp?');
    await choose('Nee', 'Heb je een warmtepomp?');
    await choose('Ja', 'Heb je een elektrische wagen?');
    await goNext('Jouw gegevens');
    await control('Voornaam').fill('Test');
    await control('Achternaam').fill('Persoon');
    await control('Telefoonnummer').fill('0475 00 00 00');
    await control('E-mail', true).fill('test.persoon@example.be');
    await choose('Woensdag');
    await choose('13:00–14:00');
    const terms = page.getByRole('checkbox', { name: /Ik ga akkoord/ });
    await terms.locator('xpath=ancestor::label[1]').click({ position: { x: 17, y: 20 } });
    await expect(terms).toBeChecked();
  }

  test('"Verstuur" posts once, the lead reaches n8n as a test lead, the visitor thanks', async ({
    page,
    request,
  }) => {
    await stubTurnstile(page);
    await fillEnergyForm(page);
    const posts: string[] = [];
    page.on('request', (sent) => {
      if (sent.url().endsWith('/api/lead') && sent.method() === 'POST')
        posts.push(sent.postData() ?? '');
    });
    const answered = page.waitForResponse(
      (response) => response.url().endsWith('/api/lead') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Verstuur', exact: true }).dblclick();
    expect((await answered).status()).toBe(200);
    await expect(page).toHaveURL(/\/bedankt\/energie\/?$/);
    expect(posts).toHaveLength(1);

    const sent = JSON.parse(posts[0]!) as { lead_id: string; turnstile_token?: string };
    const leadId = sent.lead_id;
    expect(sent.turnstile_token).toMatch(new RegExp(`^${FAKE_TURNSTILE_TOKEN}-\\d+$`));

    // The lead reaches the mock n8n as a test lead (SITE_ENV is never production here)…
    const webhook = await webhookFor(request, leadId);
    expect(webhook.body).toMatchObject({
      lead_id: leadId,
      is_test: true,
      product: 'energie',
      answers: { energy_type: 'both', supplier: 'luminus' },
      derived: { postcode: '9000', region: 'flanders' },
      meta: { page: '/vergelijken/energie/stappen' },
    });
    expect(Object.keys(webhook.body as object).sort()).toEqual(PAYLOAD_KEYS);
    expect(webhook.headers['x-vv-secret']).toBe(E2E_WEBHOOK_SECRET);

    // …is backed up before the forward, and marked forwarded after it…
    await expect
      .poll(async () =>
        (await backupLines()).filter((line) => line.id === leadId).map((line) => line.status),
      )
      .toEqual(['pending_forward', 'forwarded']);
    expect((await backupLines()).find((line) => line.id === leadId)).toMatchObject({
      kind: 'lead',
      payload: { lead_id: leadId, is_test: true },
    });

    // …and the thank-you page cheers, once: the form left the one-time lead-safe flag.
    const celebration = page.locator('[data-celebration]');
    await expect(celebration).toHaveAttribute('data-celebrate', '');
    expect(
      await page.evaluate(() => sessionStorage.getItem('voordeelvinder:lead-safe')),
    ).toBeNull();
  });
});

// The single-page energy form (Figma 193:2095, /vergelijken/energie): every section on one page,
// one "Vergelijken" that validates them all and sends the same lead as the step form.
test.describe('the single-page energy form sends its lead', () => {
  const pick = (page: Page, id: string) => page.locator(`label:has(> #${id})`).click();

  test('"Vergelijken" first shows the errors, then posts once and the lead reaches n8n', async ({
    page,
    request,
  }) => {
    await stubTurnstile(page);
    await page.goto('/vergelijken/energie?energie=both');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const submit = page.getByRole('button', { name: 'Vergelijken', exact: true });
    await expect(submit).toBeEnabled();
    await expect(page.locator('#veld-energy_type-both')).toBeChecked();

    // Nothing filled in: the first open question is focused and its error shows.
    await submit.click();
    await expect(page.locator('#veld-postcode')).toBeFocused();
    await expect(page.locator('#veld-postcode-fout')).toBeVisible();

    await page.locator('#veld-postcode').fill('9000');
    await page.locator('#veld-supplier').selectOption('luminus');
    await pick(page, 'veld-meter_type-dual');
    await pick(page, 'veld-digital_meter');
    await pick(page, 'veld-has_solar-yes');
    await page.locator('#veld-inverter_kw').fill('3,5');
    await page.locator('#veld-injection_day_kwh').fill('1200');
    await page.locator('#veld-injection_night_kwh').fill('300');
    await pick(page, 'veld-budget_meter-no');
    await pick(page, 'veld-knows_consumption-no');
    await pick(page, 'veld-home_type-terraced');
    await pick(page, 'veld-household_size-2');
    await pick(page, 'veld-heat_pump');
    await pick(page, 'veld-contract_type-fixed');
    await pick(page, 'veld-social_tariff-no');
    await page.locator('#veld-first_name').fill('Test');
    await page.locator('#veld-last_name').fill('Persoon');
    await page.locator('#veld-phone').fill('0475 00 00 00');
    await page.locator('#veld-email').fill('test.persoon@example.be');
    await pick(page, 'veld-call_moment-wed');
    await pick(page, 'veld-call_moment-13-14');
    await page.locator('label:has(> #veld-terms)').click({ position: { x: 12, y: 14 } });
    await expect(page.locator('#veld-terms')).toBeChecked();

    const posts: string[] = [];
    page.on('request', (sent) => {
      if (sent.url().endsWith('/api/lead') && sent.method() === 'POST')
        posts.push(sent.postData() ?? '');
    });
    await submit.dblclick();
    await expect(page).toHaveURL(/\/bedankt\/energie\/?$/);
    expect(posts).toHaveLength(1);
    const sent = JSON.parse(posts[0]!) as { lead_id: string; flow_id: string };
    expect(sent.flow_id).toBe('energie_vergelijker');

    const webhook = await webhookFor(request, sent.lead_id);
    expect(webhook.body).toMatchObject({
      is_test: true,
      product: 'energie',
      outcome: 'promo',
      answers: {
        energy_type: 'both',
        meter_type: 'dual',
        digital_meter: 'yes',
        inverter_kw: 3.5,
        injection_night_kwh: 300,
        home_battery: 'no',
        heat_pump: 'yes',
        electric_car: 'no',
        contract_type: 'fixed',
        social_tariff: 'no',
      },
      call_preference: { day: 'wed', slot: '13-14' },
      meta: { page: '/vergelijken/energie' },
    });
    expect(Object.keys(webhook.body as object).sort()).toEqual(PAYLOAD_KEYS);
  });
});
