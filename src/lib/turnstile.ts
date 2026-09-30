// Cloudflare Turnstile on the client (brief §9.1 step 4, §11), shared by the form's contact step
// (src/components/form/useTurnstile.ts) and the footer newsletter (src/scripts/newsletter-form.ts):
// which site key a build uses, the one script URL, a loader that fetches Cloudflare's script on
// demand (never with the page) and an explicitly rendered widget that hands out fresh tokens
// (the form's renders again after the script failed: createRecoveringTurnstileWidget).
// The server verifies them (src/server/lead/turnstile.ts). No secrets here (src/server/env.ts).
//
// Nothing in the browser part throws: when the script can't load, take() answers undefined and
// the caller decides (the form sends without a token, the newsletter shows an error).

/**
 * Cloudflare's published test site keys (developers.cloudflare.com/turnstile/troubleshooting/
 * testing/). 1x…AA always passes; it pairs with the always-passing test secret the server uses
 * while TURNSTILE_SECRET_KEY is not set.
 */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_TEST_SITE_KEYS: readonly string[] = [
  TURNSTILE_TEST_SITE_KEY,
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
];

/** A Cloudflare test site key (the documented ones and any others of their shape). */
export function isTurnstileTestSiteKey(key: string): boolean {
  return /^[123]x0{20}[A-Z]{2}$/.test(key.trim());
}

/**
 * The site key for this build: PUBLIC_TURNSTILE_SITE_KEY, else (never on production) the
 * always-passing test key. Throws on production without a real key, so such a build fails even
 * if src/server/env.ts was bypassed.
 */
export function turnstileSiteKey(configured: string | undefined, siteEnv: string): string {
  const key = configured?.trim();
  if (siteEnv === 'production' && (!key || isTurnstileTestSiteKey(key))) {
    throw new Error('Turnstile needs a real PUBLIC_TURNSTILE_SITE_KEY on production');
  }
  return key || TURNSTILE_TEST_SITE_KEY;
}

/** Explicit rendering: the widget renders only where and when the page asks. */
export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** How long take() waits for a token by default once the widget had one (the challenge only). */
export const TOKEN_WAIT_MS = 5_000;
/** How long the script may take to load before callers stop waiting for it. */
export const SCRIPT_TIMEOUT_MS = 10_000;
/**
 * How long take() waits by default for a widget's first token: the script's budget plus the
 * challenge (after a quick autofill or on a slow network, the first send comes before either).
 */
export const FIRST_TOKEN_WAIT_MS = SCRIPT_TIMEOUT_MS + TOKEN_WAIT_MS;

/** The part of window.turnstile the site uses. */
export type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string | null | undefined;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | undefined;

/**
 * Loads the Turnstile script once per page and resolves with window.turnstile, or null when it
 * fails or this call waited `timeoutMs` for it (blocked by an extension, offline, a CSP). A
 * script still loading by then is not given up: a later call waits for that same script again
 * (Turnstile warns when api.js loads twice), and once it is there window.turnstile serves every
 * call. After a failed load, the next call tries again.
 */
export function loadTurnstile(
  doc: Document = document,
  timeoutMs = SCRIPT_TIMEOUT_MS,
): Promise<TurnstileApi | null> {
  const win = doc.defaultView;
  if (win?.turnstile) return Promise.resolve(win.turnstile);
  loading ??= new Promise<TurnstileApi | null>((resolve) => {
    const script = doc.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => resolve(win?.turnstile ?? null));
    script.addEventListener('error', () => {
      // A later call may try again (the network may be back).
      loading = undefined;
      script.remove();
      resolve(null);
    });
    doc.head.append(script);
  });
  const pending = loading;
  // Each call waits for the script at most `timeoutMs`, counted from that call.
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const done = (api: TurnstileApi | null) => {
      clearTimeout(timer);
      resolve(api);
    };
    void pending.then(done, () => done(null));
  });
}

/** For tests: forget the loaded script. */
export function resetTurnstileLoader(): void {
  loading = undefined;
}

export type TurnstileWidget = {
  /**
   * The current token, waiting up to `waitMs` for one; undefined when there is none by then or
   * the widget is unusable. The wait is FIRST_TOKEN_WAIT_MS by default until the widget's first
   * token (the script may still be loading), TOKEN_WAIT_MS after. A token is good for one server
   * check, so taking it resets the widget: the next take (a retry, another send) gets a new one.
   */
  take(waitMs?: number): Promise<string | undefined>;
  /** True once the script failed to load or the widget could not render. */
  readonly broken: boolean;
  /** Removes the widget. */
  remove(): void;
};

export type TurnstileWidgetOptions = {
  container: HTMLElement;
  siteKey: string;
  /** Shown in Cloudflare's analytics (`lead`, `newsletter`). */
  action?: string;
  size?: 'normal' | 'flexible' | 'compact';
  api?: Promise<TurnstileApi | null>;
};

/** Renders a widget into `container` (explicitly, invisible unless Cloudflare needs a click). */
export function createTurnstileWidget({
  container,
  siteKey,
  action,
  size,
  api = loadTurnstile(),
}: TurnstileWidgetOptions): TurnstileWidget {
  let token: string | undefined;
  let widgetId: string | undefined;
  let turnstile: TurnstileApi | null = null;
  // Until the script has loaded (or failed), take() waits for it too.
  let settled = false;
  let removed = false;
  // Until the first token, take() waits longer by default: the script may still be loading.
  let hadToken = false;
  const waiters = new Set<(value: string | undefined) => void>();

  const flush = (value: string | undefined) => {
    for (const waiter of waiters) waiter(value);
    waiters.clear();
  };
  const unusable = () => settled && (turnstile === null || widgetId === undefined);

  void api.then((loaded) => {
    settled = true;
    if (removed || !loaded) {
      flush(undefined);
      return;
    }
    turnstile = loaded;
    try {
      widgetId =
        loaded.render(container, {
          sitekey: siteKey,
          ...(action ? { action } : {}),
          ...(size ? { size } : {}),
          language: 'nl',
          // Visible only when Cloudflare needs the visitor to click (managed mode).
          appearance: 'interaction-only',
          // The caller sends the token itself; no hidden input in the form.
          'response-field': false,
          callback: (value: string) => {
            token = value;
            hadToken = true;
            flush(value);
          },
          // Turnstile refreshes an expired token by itself ('refresh-expired': auto).
          'expired-callback': () => {
            token = undefined;
          },
          'timeout-callback': () => {
            token = undefined;
            if (widgetId !== undefined) loaded.reset(widgetId);
          },
          // Handled: Turnstile retries by itself; take() stops waiting after its timeout.
          'error-callback': () => {
            token = undefined;
            return true;
          },
        }) ?? undefined;
    } catch {
      widgetId = undefined;
    }
    if (widgetId === undefined) flush(undefined);
  });

  return {
    async take(waitMs = hadToken ? TOKEN_WAIT_MS : FIRST_TOKEN_WAIT_MS) {
      if (removed || unusable()) return undefined;
      const value =
        token ??
        (await new Promise<string | undefined>((resolve) => {
          const timer = setTimeout(() => {
            waiters.delete(done);
            resolve(undefined);
          }, waitMs);
          const done = (result: string | undefined) => {
            clearTimeout(timer);
            resolve(result);
          };
          waiters.add(done);
        }));
      if (value !== undefined) {
        token = undefined;
        try {
          if (turnstile && widgetId !== undefined) turnstile.reset(widgetId);
        } catch {
          // The next take waits for a token that may not come, then answers undefined.
        }
      }
      return value;
    },
    get broken() {
      return unusable();
    },
    remove() {
      removed = true;
      flush(undefined);
      try {
        if (turnstile && widgetId !== undefined) turnstile.remove(widgetId);
      } catch {
        // Already gone.
      }
      widgetId = undefined;
    },
  };
}

/**
 * A widget that renders again once it broke (the script failed to load or took too long, or
 * render failed): the next take() removes it and renders a new one into the same container,
 * with a new loadTurnstile(), so a visitor whose network is back gets a token without a reload.
 * remove() removes whichever widget is current. The form's contact step uses it
 * (src/components/form/useTurnstile.ts).
 */
export function createRecoveringTurnstileWidget({
  load = () => loadTurnstile(),
  ...options
}: Omit<TurnstileWidgetOptions, 'api'> & {
  /** The script loader, called for every widget it renders (tests pass their own). */
  load?: () => Promise<TurnstileApi | null>;
}): TurnstileWidget {
  const render = () => createTurnstileWidget({ ...options, api: load() });
  let current = render();
  let removed = false;
  return {
    async take(waitMs) {
      if (removed) return undefined;
      if (current.broken) {
        current.remove();
        current = render();
      }
      return current.take(waitMs);
    },
    get broken() {
      return current.broken;
    },
    remove() {
      removed = true;
      current.remove();
    },
  };
}
