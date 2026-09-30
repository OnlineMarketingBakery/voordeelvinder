/// <reference types="astro/client" />

/** Short git commit hash of the build, injected by astro.config.ts. */
declare const __BUILD_COMMIT__: string;

/** SITE_ENV at build time, injected by astro.config.ts. Prerendered pages depend on it. */
declare const __SITE_ENV__: import('./server/env').SiteEnv;

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key (public, build time); see src/lib/turnstile.ts. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}
