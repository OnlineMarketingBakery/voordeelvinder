// Playwright stand-ins for what "Verstuur" talks to: POST /api/lead (page.route, so the form
// tests never depend on the endpoint, n8n or Cloudflare) and the Turnstile script
// (challenges.cloudflare.com), served as a local stub that hands out fake tokens.
import type { Page, Route } from '@playwright/test';

export const FAKE_TURNSTILE_TOKEN = 'e2e-turnstile-token';

/**
 * A window.turnstile stand-in: render() and reset() hand out `<token>-<n>` via the callback
 * after a moment, like the invisible widget. Records the renders on window.__turnstile.
 */
const turnstileStub = (token: string) => `(function () {
  var widgets = {};
  var count = 0;
  var issued = 0;
  var state = (window.__turnstile = { renders: 0, sitekeys: [] });
  function issue(id) {
    setTimeout(function () {
      var options = widgets[id];
      if (options) options.callback(${JSON.stringify(token)} + '-' + ++issued);
    }, 20);
  }
  window.turnstile = {
    render: function (element, options) {
      var id = 'widget-' + ++count;
      widgets[id] = options;
      state.renders += 1;
      state.sitekeys.push(options.sitekey);
      issue(id);
      return id;
    },
    reset: function (id) {
      issue(id);
    },
    remove: function (id) {
      delete widgets[id];
    },
  };
})();`;

/** Serves the Turnstile stub instead of Cloudflare's script. Returns the requested script URLs. */
export async function stubTurnstile(page: Page, token = FAKE_TURNSTILE_TOKEN) {
  const requested: string[] = [];
  await page.route('https://challenges.cloudflare.com/**', (route) => {
    requested.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: turnstileStub(token) });
  });
  return requested;
}

/** Makes the Turnstile script fail to load (blocked by an extension, offline). */
export async function blockTurnstile(page: Page) {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
}

/** One answer of the fake endpoint: a status (+ body, headers), or a network failure. */
export type LeadReply =
  { status: number; body?: unknown; headers?: Record<string, string> } | 'network';

const ok = (body: Record<string, unknown>): LeadReply => ({
  status: 200,
  body: { ok: true, redirect: `/bedankt/${String(body.product)}` },
});

/**
 * Answers POST /api/lead with `replies` in turn, then with OK (redirect to the posted product's
 * thank-you page). Returns the posted bodies. Registered later, it wins over an earlier stub.
 */
export async function stubLead(page: Page, replies: LeadReply[] = []) {
  const bodies: Record<string, unknown>[] = [];
  const queue = [...replies];
  await page.route('**/api/lead', async (route: Route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const body = request.postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    const reply = queue.shift() ?? ok(body);
    if (reply === 'network') return route.abort('internetdisconnected');
    return route.fulfill({
      status: reply.status,
      contentType: 'application/json',
      headers: reply.headers,
      body: JSON.stringify(reply.body ?? { ok: reply.status < 400 }),
    });
  });
  return bodies;
}
