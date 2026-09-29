/// <reference types="astro/client" />

/** Short git commit hash of the build, injected by astro.config.ts. */
declare const __BUILD_COMMIT__: string;

/** SITE_ENV at build time, injected by astro.config.ts. Prerendered pages depend on it. */
declare const __SITE_ENV__: import('./server/env').SiteEnv;
