// Typed access to the server environment (brief §4.3). Framework-free on purpose: the Astro
// server, astro.config.ts and the cron scripts in scripts/ all use it.
import { z } from 'zod';

export const SITE_ENVS = ['local', 'ci', 'staging', 'production'] as const;
export type SiteEnv = (typeof SITE_ENVS)[number];

/** Environments that run on a real server and must be configured completely. */
const DEPLOYED: ReadonlySet<SiteEnv> = new Set(['staging', 'production']);

const schema = z
  .object({
    SITE_ENV: z.enum(SITE_ENVS),
    PUBLIC_SITE_URL: z.url(),
    // Lead backups live outside the web root (brief §9.1).
    LEAD_BACKUP_DIR: z.string().min(1).default('./lead-backups'),
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
    // Phase 5: required on staging/production once the lead endpoint exists.
    N8N_LEAD_WEBHOOK_URL: z.url().optional(),
    N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (!DEPLOYED.has(env.SITE_ENV)) return;
    if (!env.PUBLIC_SITE_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_SITE_URL'],
        message: `must be https on ${env.SITE_ENV}`,
      });
    }
    if (!env.LEAD_BACKUP_DIR.startsWith('/')) {
      ctx.addIssue({
        code: 'custom',
        path: ['LEAD_BACKUP_DIR'],
        message: `must be an absolute path outside the site directory on ${env.SITE_ENV}`,
      });
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
