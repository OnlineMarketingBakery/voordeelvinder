// Typed access to the server environment (brief §4.3). Framework-free on purpose: the Astro
// server, astro.config.ts and the cron scripts in scripts/ all use it.
import { z } from 'zod';

export const SITE_ENVS = ['local', 'ci', 'staging', 'production'] as const;
export type SiteEnv = (typeof SITE_ENVS)[number];

/** Environments that run on a real server and must be configured completely. */
const DEPLOYED: ReadonlySet<SiteEnv> = new Set(['staging', 'production']);

/**
 * Cloudflare's published Turnstile test secrets (developers.cloudflare.com/turnstile/
 * troubleshooting/testing/): 1x… always passes, 2x… always fails, 3x… reports a spent token.
 * Local, CI and staging verify with the always-passing one while no secret is set; production
 * refuses all three.
 */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
const TURNSTILE_TEST_SECRETS: ReadonlySet<string> = new Set([
  TURNSTILE_TEST_SECRET,
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

/** `NAME=` in a .env file means "not set", not an empty value. */
function optional<T extends z.ZodType>(type: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), type.optional());
}

const schema = z
  .object({
    SITE_ENV: z.enum(SITE_ENVS),
    PUBLIC_SITE_URL: z.url(),
    // Lead backups live outside the web root (brief §9.1).
    LEAD_BACKUP_DIR: z.string().min(1).default('./lead-backups'),
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
    // n8n (brief §4.5, §9.1). Optional on local, CI and staging: without a lead webhook, leads
    // are only backed up. Required on production. A non-production environment never points at
    // the production workflow (AGENTS.md): staging uses a separate test workflow's /webhook/…
    // URL (not n8n's /webhook-test/ editor URL), local and CI a mock.
    N8N_LEAD_WEBHOOK_URL: optional(z.url()),
    // Newsletter sign-ups (brief §5); without it they go to the lead webhook, where the
    // payload's `type: "newsletter"` tells them apart (docs/PAYLOAD.md).
    N8N_NEWSLETTER_WEBHOOK_URL: optional(z.url()),
    // Sent as X-VV-Secret with every forward; required with a webhook on staging/production.
    N8N_WEBHOOK_SECRET: optional(z.string().min(16)),
    // Cloudflare Turnstile. Required on production; elsewhere the always-passing test secret.
    TURNSTILE_SECRET_KEY: optional(z.string().min(1)),
    // Local and CI only: a stand-in for Cloudflare's siteverify (the e2e mock server).
    TURNSTILE_VERIFY_URL: optional(z.url()),
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (!DEPLOYED.has(env.SITE_ENV)) return;
    if (!env.PUBLIC_SITE_URL.startsWith('https://')) {
      issue('PUBLIC_SITE_URL', `must be https on ${env.SITE_ENV}`);
    }
    if (!env.LEAD_BACKUP_DIR.startsWith('/')) {
      issue(
        'LEAD_BACKUP_DIR',
        `must be an absolute path outside the site directory on ${env.SITE_ENV}`,
      );
    }
    if (env.TURNSTILE_VERIFY_URL) {
      issue('TURNSTILE_VERIFY_URL', `is for local and CI only, not ${env.SITE_ENV}`);
    }
    for (const key of ['N8N_LEAD_WEBHOOK_URL', 'N8N_NEWSLETTER_WEBHOOK_URL'] as const) {
      const url = env[key];
      if (url && !url.startsWith('https://')) issue(key, `must be https on ${env.SITE_ENV}`);
    }
    if ((env.N8N_LEAD_WEBHOOK_URL || env.N8N_NEWSLETTER_WEBHOOK_URL) && !env.N8N_WEBHOOK_SECRET) {
      issue('N8N_WEBHOOK_SECRET', `is required with a webhook on ${env.SITE_ENV}`);
    }
    if (env.SITE_ENV !== 'production') return;
    if (!env.N8N_LEAD_WEBHOOK_URL) issue('N8N_LEAD_WEBHOOK_URL', 'is required on production');
    if (!env.TURNSTILE_SECRET_KEY) {
      issue('TURNSTILE_SECRET_KEY', 'is required on production');
    } else if (TURNSTILE_TEST_SECRETS.has(env.TURNSTILE_SECRET_KEY)) {
      issue('TURNSTILE_SECRET_KEY', 'must not be a Cloudflare test key on production');
    }
  });

export type ServerEnv = z.infer<typeof schema>;

type Source = Record<string, string | undefined>;

export function parseServerEnv(source: Source): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid server environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** The validated environment of the running process (cached after the first call). */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/**
 * Every lead is a test lead unless the site runs in production (brief §9.4). Stricter than the
 * brief's "SITE_ENV=staging" on purpose, so local and CI runs can never create a real lead.
 */
export function isTestEnvironment(siteEnv: SiteEnv): boolean {
  return siteEnv !== 'production';
}

/** The Turnstile secret to verify with: the configured one, else the always-passing test one. */
export function turnstileSecret(env: ServerEnv): string {
  return env.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRET;
}

/** Where newsletter sign-ups go: their own webhook, else the lead webhook, else nowhere. */
export function newsletterWebhookUrl(env: ServerEnv): string | undefined {
  return env.N8N_NEWSLETTER_WEBHOOK_URL ?? env.N8N_LEAD_WEBHOOK_URL;
}
