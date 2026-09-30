// Cloudflare Turnstile on the client (src/lib/turnstile.ts), shared by the form's contact step
// and the footer newsletter: the site key per environment, the one script loader, the widget
// that hands out each token once, and the form's widget that renders again after a failed load.
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRecoveringTurnstileWidget,
  createTurnstileWidget,
  FIRST_TOKEN_WAIT_MS,
  isTurnstileTestSiteKey,
  loadTurnstile,
  resetTurnstileLoader,
  SCRIPT_TIMEOUT_MS,
  TOKEN_WAIT_MS,
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

  /** A document stand-in that records every script it is given; `fire` goes to the last one. */
  function fakeDocument(win: { turnstile?: TurnstileApi } = {}) {
    const scripts: Array<{
      src: string;
      async: boolean;
      listeners: Map<string, () => void>;
      addEventListener: (type: string, listener: () => void) => void;
      remove: ReturnType<typeof vi.fn>;
    }> = [];
    const head = { append: vi.fn() };
    const doc = {
      defaultView: win,
      head,
      createElement: vi.fn(() => {
        const listeners = new Map<string, () => void>();
        const script = {
          src: '',
          async: false,
          listeners,
          addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
          remove: vi.fn(),
        };
        scripts.push(script);
        return script;
      }),
    } as unknown as Document;
    const fire = (type: string) => scripts.at(-1)?.listeners.get(type)?.();
    return { doc, scripts, head, fire };
  }

  /** Lets the pending promise callbacks run (the widget renders once the script is there). */
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('loads the script once, on demand, and resolves with window.turnstile', async () => {
    const win: { turnstile?: TurnstileApi } = {};
    const { doc, scripts, head, fire } = fakeDocument(win);
    const first = loadTurnstile(doc);
    const second = loadTurnstile(doc);
    expect(head.append).toHaveBeenCalledOnce();
    expect(scripts[0]!.src).toBe(TURNSTILE_SCRIPT_SRC);
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
    expect(failing.scripts[0]!.remove).toHaveBeenCalled();

    vi.useFakeTimers();
    const hanging = fakeDocument();
    const hung = loadTurnstile(hanging.doc, 10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await hung).toBeNull();
  });

  it('tries again after a failed load, with a new script', async () => {
    const win: { turnstile?: TurnstileApi } = {};
    const page = fakeDocument(win);
    const failed = loadTurnstile(page.doc);
    page.fire('error');
    expect(await failed).toBeNull();
    // The network is back.
    const again = loadTurnstile(page.doc);
    expect(page.head.append).toHaveBeenCalledTimes(2);
    win.turnstile = fakeApi().api;
    page.fire('load');
    expect(await again).toBe(win.turnstile);
  });

  it('waits again for a script still loading after a timeout, and never appends it twice', async () => {
    vi.useFakeTimers();
    const win: { turnstile?: TurnstileApi } = {};
    const page = fakeDocument(win);
    const first = loadTurnstile(page.doc, SCRIPT_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(SCRIPT_TIMEOUT_MS);
    expect(await first).toBeNull();
    // Still loading: a later call waits for the same script, with a timeout of its own.
    const second = loadTurnstile(page.doc, SCRIPT_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(SCRIPT_TIMEOUT_MS - 1);
    expect(page.head.append).toHaveBeenCalledOnce();
    win.turnstile = fakeApi().api;
    page.fire('load');
    expect(await second).toBe(win.turnstile);
    // Arrived: every later call gets it at once, still from the one script.
    expect(await loadTurnstile(page.doc)).toBe(win.turnstile);
    expect(page.head.append).toHaveBeenCalledOnce();
    expect(page.scripts[0]!.remove).not.toHaveBeenCalled();
  });

  it('waits for the script and the challenge for the first token, then 5 s', async () => {
    vi.useFakeTimers();
    expect(FIRST_TOKEN_WAIT_MS).toBe(15_000);
    expect(FIRST_TOKEN_WAIT_MS).toBe(SCRIPT_TIMEOUT_MS + TOKEN_WAIT_MS);
    const win: { turnstile?: TurnstileApi } = {};
    const page = fakeDocument(win);
    const { api, solve } = fakeApi();
    const widget = createTurnstileWidget({
      container,
      siteKey: 'key',
      api: loadTurnstile(page.doc),
    });
    const first = widget.take();
    // The script takes 6 s, the challenge 3 s more: longer than 5 s, still in time.
    await vi.advanceTimersByTimeAsync(6_000);
    win.turnstile = api;
    page.fire('load');
    await vi.advanceTimersByTimeAsync(3_000);
    expect(api.render).toHaveBeenCalledOnce();
    solve('token-1');
    expect(await first).toBe('token-1');
    // After the first token only the challenge runs again: take() waits TOKEN_WAIT_MS.
    let answered = false;
    const second = widget.take().then((value) => {
      answered = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(TOKEN_WAIT_MS - 1);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await second).toBeUndefined();
  });

  it('a recovering widget renders again after the script failed, once the network is back', async () => {
    const win: { turnstile?: TurnstileApi } = {};
    const page = fakeDocument(win);
    const widget = createRecoveringTurnstileWidget({
      container,
      siteKey: 'key',
      action: 'lead',
      load: () => loadTurnstile(page.doc),
    });
    page.fire('error');
    expect(await widget.take(1000)).toBeUndefined();
    expect(widget.broken).toBe(true);

    const { api, solve, options } = fakeApi();
    const pending = widget.take(1000);
    // A new script (the failed one is gone), and a new widget once it is there.
    expect(page.head.append).toHaveBeenCalledTimes(2);
    expect(page.scripts[0]!.remove).toHaveBeenCalled();
    win.turnstile = api;
    page.fire('load');
    await settle();
    expect(api.render).toHaveBeenCalledOnce();
    expect(options()).toMatchObject({ sitekey: 'key', action: 'lead' });
    expect(widget.broken).toBe(false);
    solve('token-1');
    expect(await pending).toBe('token-1');
  });

  it('a recovering widget waits for a late script again, never loading it twice', async () => {
    vi.useFakeTimers();
    const win: { turnstile?: TurnstileApi } = {};
    const page = fakeDocument(win);
    const widget = createRecoveringTurnstileWidget({
      container,
      siteKey: 'key',
      load: () => loadTurnstile(page.doc),
    });
    // The script takes longer than its budget: the first widget gives up.
    const first = widget.take();
    await vi.advanceTimersByTimeAsync(SCRIPT_TIMEOUT_MS);
    expect(await first).toBeUndefined();
    expect(widget.broken).toBe(true);

    // "Verstuur" again: a new widget, waiting for the same script.
    const { api, solve } = fakeApi();
    const second = widget.take();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(page.head.append).toHaveBeenCalledOnce();
    win.turnstile = api;
    page.fire('load');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.render).toHaveBeenCalledOnce();
    solve('token-1');
    expect(await second).toBe('token-1');
  });

  it('a recovering widget removes whichever widget it holds, and stays removed', async () => {
    const { api, solve } = fakeApi();
    const load = vi
      .fn<() => Promise<TurnstileApi | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValue(api);
    const widget = createRecoveringTurnstileWidget({ container, siteKey: 'key', load });
    expect(await widget.take(1000)).toBeUndefined();
    // Rendered again (the second load works), and that widget is the one removed.
    const pending = widget.take(1000);
    await settle();
    solve('token-1');
    expect(await pending).toBe('token-1');
    expect(load).toHaveBeenCalledTimes(2);
    widget.remove();
    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(await widget.take(1000)).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a recovering widget keeps a working widget', async () => {
    const { api, solve } = fakeApi();
    const load = vi.fn(() => Promise.resolve<TurnstileApi | null>(api));
    const widget = createRecoveringTurnstileWidget({ container, siteKey: 'key', load });
    await settle();
    solve('token-1');
    expect(await widget.take(1000)).toBe('token-1');
    solve('token-2');
    expect(await widget.take(1000)).toBe('token-2');
    expect(load).toHaveBeenCalledOnce();
    expect(api.render).toHaveBeenCalledOnce();
  });
});
