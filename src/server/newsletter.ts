// POST /api/newsletter (brief §5, §9.1): the footer sign-up. The lead pipeline minus the rules:
// rate limit → validate (strict) → honeypot → Turnstile → payload → backup → forward to n8n
// (which runs Mailchimp's double opt-in) → `{ ok: true }`. The payload shape is in
// docs/PAYLOAD.md ("Newsletter sign-up"); it is separate from the lead contract.
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { validateEmail } from '../lib/flow/validators/email';
import {
  isTestEnvironment,
  newsletterWebhookUrl,
  turnstileSecret,
  type ServerEnv,
  type SiteEnv,
} from './env';
import { apiError, json, readJsonBody, userAgentOf } from './http';
import type { BackupOptions } from './lead/backup';
import { deliver } from './lead/deliver';
import type { ForwardOptions } from './lead/forward';
import { rateLimited, type ApiRequest } from './lead/handler';
import type { RateLimiter } from './lead/rate-limit';
import { verifyTurnstile, type TurnstileOptions } from './lead/turnstile';
import { consoleLogger, errorSummary, type Logger } from './log';

export const NEWSLETTER_SCHEMA_VERSION = 1;

export type NewsletterPayload = {
  type: 'newsletter';
  schema_version: typeof NEWSLETTER_SCHEMA_VERSION;
  brand: 'voordeelvinder';
  signup_id: string;
  is_test: boolean;
  submitted_at: string;
  email: string;
  consent: { newsletter: true };
  meta: { page: string; user_agent: string; ip: string; site_env: SiteEnv };
};

/** What the footer form posts. Strict: unknown keys are rejected. */
export const newsletterRequest = z.strictObject({
  email: z.string().max(254),
  /** The visitor ticked the newsletter consent. */
  consent: z.literal(true),
  /** Honeypot: hidden from people, so it must stay empty. */
  website: z.string().max(200).default(''),
  turnstile_token: z.string().max(4096).optional(),
  /** The page the form was sent from. */
  page: z.string().startsWith('/').max(300).default('/'),
  /** The visitor arrived with ?test=1 (brief §9.4). */
  test: z.boolean().default(false),
});

export type NewsletterRequest = z.infer<typeof newsletterRequest>;

/** The request, validated, with the e-mail address normalised by the form's own validator. */
export function parseNewsletterRequest(
  body: unknown,
): { ok: true; request: NewsletterRequest } | { ok: false } {
  const parsed = newsletterRequest.safeParse(body);
  if (!parsed.success) return { ok: false };
  const email = validateEmail(parsed.data.email, { id: 'email', type: 'email', required: true });
  if (!email.ok || typeof email.value !== 'string') return { ok: false };
  return { ok: true, request: { ...parsed.data, email: email.value } };
}

export type NewsletterHandlerDeps = {
  env: ServerEnv;
  limiter: RateLimiter;
  log?: Logger;
  fetch?: typeof fetch;
  now?: () => Date;
  newId?: () => string;
  backup?: BackupOptions;
  forward?: Omit<ForwardOptions, 'secret' | 'fetch'>;
  turnstile?: Pick<TurnstileOptions, 'timeoutMs'>;
};

export function createNewsletterHandler(deps: NewsletterHandlerDeps) {
  const { env, limiter, log = consoleLogger, now = () => new Date(), newId = randomUUID } = deps;

  return async function handleNewsletter({
    request,
    clientAddress,
  }: ApiRequest): Promise<Response> {
    try {
      const limited = limiter.hit(clientAddress);
      if (!limited.ok) {
        log('warn', 'newsletter_rate_limited');
        return rateLimited(limited.retryAfterSeconds);
      }
      const read = await readJsonBody(request);
      if (!read.ok) return read.response;
      const parsed = parseNewsletterRequest(read.body);
      if (!parsed.ok) return apiError('invalid_request', 400);
      const signup = parsed.request;
      if (signup.website.trim() !== '') {
        log('warn', 'newsletter_honeypot');
        return json({ ok: true });
      }

      const verdict = await verifyTurnstile(signup.turnstile_token, {
        ...deps.turnstile,
        secret: turnstileSecret(env),
        remoteip: clientAddress,
        url: env.TURNSTILE_VERIFY_URL,
        fetch: deps.fetch,
      });
      if (verdict === 'fail') {
        log('warn', 'newsletter_verification_failed');
        return apiError('verification_failed', 403);
      }
      if (verdict === 'unavailable') log('warn', 'newsletter_verification_unavailable');

      const payload: NewsletterPayload = {
        type: 'newsletter',
        schema_version: NEWSLETTER_SCHEMA_VERSION,
        brand: 'voordeelvinder',
        signup_id: newId(),
        is_test: isTestEnvironment(env.SITE_ENV) || signup.test,
        submitted_at: now().toISOString(),
        email: signup.email,
        consent: { newsletter: true },
        meta: {
          page: signup.page,
          user_agent: userAgentOf(request),
          ip: clientAddress,
          site_env: env.SITE_ENV,
        },
      };
      const delivered = await deliver({
        dir: env.LEAD_BACKUP_DIR,
        id: payload.signup_id,
        kind: 'newsletter',
        payload,
        url: newsletterWebhookUrl(env),
        secret: env.N8N_WEBHOOK_SECRET,
        log,
        backup: deps.backup,
        forward: { ...deps.forward, fetch: deps.fetch },
      });
      log(delivered.saved ? 'info' : 'error', 'newsletter', {
        id: payload.signup_id,
        is_test: payload.is_test,
        backup: delivered.backup,
        forward: delivered.forward,
      });
      if (!delivered.saved) return apiError('unavailable', 503);
      return json({ ok: true });
    } catch (error) {
      log('error', 'newsletter_error', { error: errorSummary(error) });
      return apiError('server_error', 500);
    }
  };
}
