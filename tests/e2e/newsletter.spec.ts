// The footer newsletter form in the browser (brief §5, §9.1): src/scripts/newsletter.ts and
// newsletter-form.ts. The endpoint and Cloudflare's Turnstile script are faked with
// page.route, so these tests check the form's own behaviour; tests/e2e/lead.spec.ts and the
// unit tests cover the endpoint itself.
import { expect, test, type Page, type Route } from '@playwright/test';

import site from '../../src/content/site.json' with { type: 'json' };

const newsletter = site.footer.newsletter;
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

/** A stand-in for Cloudflare's api.js: renders nothing, hands out a token at once. */
const FAKE_TURNSTILE = `
  (() => {
    const widgets = [];
    window.turnstile = {
      render(container, options) {
        widgets.push(options);
        setTimeout(() => options.callback(${JSON.stringify(TOKEN)}), 0);
        return String(widgets.length - 1);
      },
      reset(id) {
        const options = widgets[Number(id)];
        if (options) setTimeout(() => options.callback(${JSON.stringify(TOKEN)}), 0);
      },
    };
    const onload = new URL(document.currentScript.src).searchParams.get('onload');
    if (onload && typeof window[onload] === 'function') window[onload]();
  })();
`;

type Sent = Record<string, unknown>;

/** Fakes the endpoint; `answer` decides the response. Returns the bodies that were posted. */
async function fakeEndpoint(
  page: Page,
  answer: (route: Route) => Promise<void> = (route) => route.fulfill({ json: { ok: true } }),
): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE }),
  );
  await page.route('**/api/newsletter', async (route) => {
    sent.push(route.request().postDataJSON() as Sent);
    await answer(route);
  });
  return sent;
}

function form(page: Page) {
  const footer = page.locator('footer');
  return {
    email: footer.getByLabel(newsletter.label),
    consent: footer.getByRole('checkbox', { name: newsletter.consent.label }),
    button: footer.getByRole('button', { name: newsletter.button }),
    status: footer.locator('#newsletter-status'),
  };
}

async function signUp(page: Page, address = 'Jan@Example.BE') {
  const f = form(page);
  await f.email.fill(address);
  await f.consent.check();
  await f.button.click();
  return f;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('signs up: posts the request the endpoint expects and confirms', async ({ page }) => {
  const sent = await fakeEndpoint(page);
  const f = await signUp(page);

  await expect(f.status).toHaveText(newsletter.messages.success);
  expect(sent).toEqual([
    {
      email: 'jan@example.be',
      consent: true,
      website: '',
      turnstile_token: TOKEN,
      page: '/',
      test: false,
    },
  ]);
  // Done: the form is cleared for the next visitor.
  await expect(f.email).toHaveValue('');
  await expect(f.consent).not.toBeChecked();
});

test('the honeypot stays empty and out of reach', async ({ page }) => {
  const sent = await fakeEndpoint(page);
  const honeypot = page.locator('footer input[name="website"]');
  await expect(honeypot).toHaveAttribute('tabindex', '-1');
  await expect(honeypot).not.toBeInViewport();
  const f = await signUp(page);
  await expect(f.status).toHaveText(newsletter.messages.success);
  expect(sent[0]?.website).toBe('');
});

for (const [status, error] of [
  [429, 'rate_limited'],
  [503, 'unavailable'],
  [500, 'unavailable'],
  [403, 'verification_failed'],
  [400, 'invalid_request'],
] as const) {
  test(`${status}: says "${error}" and keeps the address`, async ({ page }) => {
    await fakeEndpoint(page, (route) =>
      route.fulfill({ status, json: { ok: false, error: 'whatever' } }),
    );
    const f = await signUp(page, 'jan@example.be');
    await expect(f.status).toHaveText(newsletter.errors[error]);
    await expect(f.email).toHaveValue('jan@example.be');
    await expect(f.consent).toBeChecked();
    await expect(f.button).not.toHaveAttribute('aria-disabled');
  });
}

test('a network error says so and keeps the address', async ({ page }) => {
  await fakeEndpoint(page, (route) => route.abort('internetdisconnected'));
  const f = await signUp(page, 'jan@example.be');
  await expect(f.status).toHaveText(newsletter.errors.network);
  await expect(f.email).toHaveValue('jan@example.be');
});

test('locks the button while sending: one request for a double click', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  const sent = await fakeEndpoint(page, async (route) => {
    await held;
    await route.fulfill({ json: { ok: true } });
  });
  const f = await signUp(page);

  await expect(f.button).toHaveAttribute('aria-disabled', 'true');
  await expect(f.status).toHaveText(newsletter.messages.sending);
  // Enter in the field and a click on the (aria-disabled, pointer-events: none) button.
  await f.email.press('Enter');
  await f.button.dispatchEvent('click');
  release();

  await expect(f.status).toHaveText(newsletter.messages.success);
  await expect(f.button).not.toHaveAttribute('aria-disabled');
  expect(sent).toHaveLength(1);
});

test('an invalid address is flagged inline and nothing is sent', async ({ page }) => {
  const sent = await fakeEndpoint(page);
  const f = await signUp(page, 'jan@');

  await expect(f.status).toHaveText(newsletter.errors.email_invalid);
  await expect(f.email).toHaveAttribute('aria-invalid', 'true');
  await expect(f.email).toHaveAttribute('aria-describedby', 'newsletter-status');
  await expect(f.email).toBeFocused();

  // Typing again clears the error.
  await f.email.fill('jan@example.be');
  await expect(f.email).not.toHaveAttribute('aria-invalid');
  await expect(f.status).toBeEmpty();
  expect(sent).toHaveLength(0);
});

test('an empty field and a missing consent are flagged', async ({ page }) => {
  const sent = await fakeEndpoint(page);
  const f = form(page);

  await f.button.click();
  await expect(f.status).toHaveText(newsletter.errors.email_required);

  await f.email.fill('jan@example.be');
  await f.button.click();
  await expect(f.status).toHaveText(newsletter.errors.consent_required);
  await expect(f.consent).toHaveAttribute('aria-invalid', 'true');
  await expect(f.consent).toBeFocused();
  expect(sent).toHaveLength(0);
});

test('suggests a typo fix on blur and applies it on click', async ({ page }) => {
  await fakeEndpoint(page);
  const f = form(page);
  await f.email.fill('jan@gmial.com');
  await f.email.blur();

  const suggestion = page.locator('footer').getByRole('button', {
    name: newsletter.messages.suggestion.replace('{suggestion}', 'jan@gmail.com'),
  });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(f.email).toHaveValue('jan@gmail.com');
  await expect(suggestion).toBeHidden();
});

test('Turnstile loads only once the e-mail field gets focus', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://challenges.cloudflare.com/')) scripts.push(request.url());
  });
  await fakeEndpoint(page);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  expect(scripts).toHaveLength(0);

  await form(page).email.focus();
  await expect.poll(() => scripts.length).toBe(1);
  expect(scripts[0]).toContain('render=explicit');
});
