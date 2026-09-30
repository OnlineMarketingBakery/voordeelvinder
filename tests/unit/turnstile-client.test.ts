// Cloudflare Turnstile on the client (src/lib/turnstile.ts), shared by the form's contact step
// and the footer newsletter: the site key per environment, the one script loader and the widget
// that hands out each token once.
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createTurnstileWidget,
  isTurnstileTestSiteKey,
  loadTurnstile,
  resetTurnstileLoader,
  TURNSTILE_SCRIPT_SRC,
  TURNSTILE_TEST_SITE_KEY,
  TURNSTILE_TEST_SITE_KEYS,
  turnstileSiteKey,
  type TurnstileApi,
} from '../../src/lib/turnstile';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetTurnstileLoader();
});

describe('Turnstile', () => {
  /** A window.turnstile stand-in: the test calls `solve` to hand out a token. */
  function fakeApi() {
    let options: Record<string, unknown> = {};
    const api = {
      render: vi.fn((_container: HTMLElement, given: Record<string, unknown>) => {
        options = given;
        return 'widget-1';
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    } satisfies TurnstileApi;
    const solve = (token: string) => (options.callback as (value: string) => void)(token);
    const expire = () => (options['expired-callback'] as () => void)();
    return { api, solve, expire, options: () => options };
  }

  const container = {} as HTMLElement;

  it('uses the configured site key, else the test key off production', () => {
    expect(TURNSTILE_TEST_SITE_KEY).toBe('1x00000000000000000000AA');
    expect(turnstileSiteKey('0x4AAAAAAA-real', 'production')).toBe('0x4AAAAAAA-real');
    expect(turnstileSiteKey(' 0x4AAAAAAA-real ', 'staging')).toBe('0x4AAAAAAA-real');
    expect(turnstileSiteKey(undefined, 'staging')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('', 'ci')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('  ', 'local')).toBe(TURNSTILE_TEST_SITE_KEY);
  });

  it('fails hard on production without a real key', () => {
    expect(() => turnstileSiteKey(undefined, 'production')).toThrow(/PUBLIC_TURNSTILE_SITE_KEY/);
    expect(() => turnstileSiteKey(' ', 'production')).toThrow(/PUBLIC_TURNSTILE_SITE_KEY/);
    for (const key of TURNSTILE_TEST_SITE_KEYS) {
      expect(isTurnstileTestSiteKey(key)).toBe(true);
      expect(() => turnstileSiteKey(key, 'production')).toThrow(/PUBLIC_TURNSTILE_SITE_KEY/);
    }
    expect(isTurnstileTestSiteKey('0x4AAAAAAA-real')).toBe(false);
  });

  it('passes the action and size through', async () => {
    const { api, options } = fakeApi();
    createTurnstileWidget({
      container,
      siteKey: 'key',
      action: 'newsletter',
      size: 'flexible',
      api: Promise.resolve(api),
    });
    await Promise.resolve();
    expect(options()).toMatchObject({ action: 'newsletter', size: 'flexible', language: 'nl' });
  });

  it('renders with the site key, and hands out each token once', async () => {
    const { api, solve, options } = fakeApi();
    const widget = createTurnstileWidget({ container, siteKey: 'key', api: Promise.resolve(api) });
    await Promise.resolve();
    expect(api.render).toHaveBeenCalledOnce();
    expect(options()).toMatchObject({
      sitekey: 'key',
      appearance: 'interaction-only',
      'response-field': false,
    });
    const pending = widget.take(1000);
    solve('token-1');
    expect(await pending).toBe('token-1');
    // Taken: the widget is reset for the next send.
    expect(api.reset).toHaveBeenCalledWith('widget-1');
    solve('token-2');
    expect(await widget.take(1000)).toBe('token-2');
    widget.remove();
    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(await widget.take(1000)).toBeUndefined();
  });

  it('forgets an expired token, and stops waiting after the timeout', async () => {
    vi.useFakeTimers();
    const { api, solve, expire } = fakeApi();
    const widget = createTurnstileWidget({ container, siteKey: 'key', api: Promise.resolve(api) });
    await Promise.resolve();
    solve('old');
    expire();
    const pending = widget.take(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toBeUndefined();
  });

  it('answers undefined at once when the script failed or render threw', async () => {
    const failed = createTurnstileWidget({ container, siteKey: 'key', api: Promise.resolve(null) });
    expect(failed.broken).toBe(false);
    const waiting = failed.take(60_000);
    expect(await waiting).toBeUndefined();
    expect(failed.broken).toBe(true);
    expect(await failed.take(60_000)).toBeUndefined();

    const { api } = fakeApi();
    api.render.mockImplementation(() => {
      throw new Error('bad key');
    });
    const broken = createTurnstileWidget({ container, siteKey: 'key', api: Promise.resolve(api) });
    await Promise.resolve();
    expect(await broken.take(60_000)).toBeUndefined();
  });

  /** A document stand-in that records the script it is given. */
  function fakeDocument(win: { turnstile?: TurnstileApi } = {}) {
    const listeners = new Map<string, () => void>();
    const script = {
      src: '',
      async: false,
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      remove: vi.fn(),
    };
    const head = { append: vi.fn() };
    const doc = {
      defaultView: win,
      head,
      createElement: vi.fn(() => script),
    } as unknown as Document;
    return { doc, script, head, fire: (type: string) => listeners.get(type)?.() };
  }

  it('loads the script once, on demand, and resolves with window.turnstile', async () => {
    const win: { turnstile?: TurnstileApi } = {};
    const { doc, script, head, fire } = fakeDocument(win);
    const first = loadTurnstile(doc);
    const second = loadTurnstile(doc);
    expect(head.append).toHaveBeenCalledOnce();
    expect(script.src).toBe(TURNSTILE_SCRIPT_SRC);
    expect(TURNSTILE_SCRIPT_SRC).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );
    win.turnstile = fakeApi().api;
    fire('load');
    expect(await first).toBe(win.turnstile);
    expect(await second).toBe(win.turnstile);
  });

  it('resolves null when the script fails or hangs', async () => {
    const failing = fakeDocument();
    const failed = loadTurnstile(failing.doc);
    failing.fire('error');
    expect(await failed).toBeNull();
    expect(failing.script.remove).toHaveBeenCalled();

    vi.useFakeTimers();
    const hanging = fakeDocument();
    const hung = loadTurnstile(hanging.doc, 10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await hung).toBeNull();
  });
});
