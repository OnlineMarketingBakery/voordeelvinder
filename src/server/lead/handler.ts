// POST /api/lead (brief §9.1), in this order: rate limit → parse and validate (the server
// rebuilds the submission from the answers with its own flows) → honeypot → Turnstile →
// payload → backup → forward → respond. Every valid lead goes to n8n: the site never
// qualifies it (n8n does, ADR 0009). src/pages/api/lead.ts wires in the real
// dependencies; tests pass their own.
//
// Responses: `{ ok: true, redirect: "/bedankt/<product>" }`, also when n8n is down (the backup
// holds the lead) and for a filled honeypot (pretend success, store nothing). Errors are
// `{ ok: false, error: <code> }` (src/server/http.ts) and never reveal why in more detail.
// Logs carry the lead_id and delivery status only (brief §13), never personal data.
import type { Flow } from '../../lib/flow/schema';
import type { Product } from '../../lib/flow/types';
import { thanksPath } from '../../lib/form/submit';
import { isTestEnvironment, turnstileSecret, type ServerEnv } from '../env';
import { apiError, json, readJsonBody, userAgentOf } from '../http';
import { consoleLogger, errorSummary, type Logger } from '../log';
import type { BackupOptions } from './backup';
import { deliver } from './deliver';
import type { ForwardOptions } from './forward';
import { toPayload as buildPayload } from './payload';
import type { RateLimiter } from './rate-limit';
import { verifyTurnstile, type TurnstileOptions } from './turnstile';
import { parseLeadRequest } from './validate';

export type LeadHandlerDeps = {
  env: ServerEnv;
  flows: () => Promise<Record<Product, Flow>>;
  limiter: RateLimiter;
  log?: Logger;
  fetch?: typeof fetch;
  parse?: typeof parseLeadRequest;
  toPayload?: typeof buildPayload;
  backup?: BackupOptions;
  forward?: Omit<ForwardOptions, 'secret' | 'fetch'>;
  turnstile?: Pick<TurnstileOptions, 'timeoutMs'>;
};

export type ApiRequest = { request: Request; clientAddress: string };

export function rateLimited(retryAfterSeconds: number): Response {
  return apiError('rate_limited', 429, { 'retry-after': String(retryAfterSeconds) });
}

export function createLeadHandler(deps: LeadHandlerDeps) {
  const {
    env,
    limiter,
    log = consoleLogger,
    parse = parseLeadRequest,
    toPayload = buildPayload,
  } = deps;

  return async function handleLead({ request, clientAddress }: ApiRequest): Promise<Response> {
    try {
      const limited = limiter.hit(clientAddress);
      if (!limited.ok) {
        log('warn', 'lead_rate_limited');
        return rateLimited(limited.retryAfterSeconds);
      }

      const read = await readJsonBody(request);
      if (!read.ok) return read.response;

      const parsed = parse(read.body, await deps.flows());
      if (!parsed.ok) {
        log('warn', 'lead_invalid', { issues: parsed.issues.length });
        return apiError('invalid_request', 400);
      }
      const { submission } = parsed;
      const success = json({ ok: true, redirect: thanksPath(submission.product) });
      if (parsed.honeypot) {
        log('warn', 'lead_honeypot');
        return success;
      }

      const verdict = await verifyTurnstile(parsed.turnstileToken, {
        ...deps.turnstile,
        secret: turnstileSecret(env),
        remoteip: clientAddress,
        url: env.TURNSTILE_VERIFY_URL,
        fetch: deps.fetch,
      });
      if (verdict === 'fail') {
        log('warn', 'lead_verification_failed', { lead_id: submission.lead_id });
        return apiError('verification_failed', 403);
      }
      if (verdict === 'unavailable') {
        log('warn', 'lead_verification_unavailable', { lead_id: submission.lead_id });
      }

      const payload = toPayload(submission, {
        ip: clientAddress,
        userAgent: userAgentOf(request),
        siteEnv: env.SITE_ENV,
        isTest: isTestEnvironment(env.SITE_ENV) || submission.meta.test === true,
      });

      const delivered = await deliver({
        dir: env.LEAD_BACKUP_DIR,
        id: submission.lead_id,
        kind: 'lead',
        payload,
        url: env.N8N_LEAD_WEBHOOK_URL,
        secret: env.N8N_WEBHOOK_SECRET,
        log,
        backup: deps.backup,
        forward: { ...deps.forward, fetch: deps.fetch },
      });
      log(delivered.saved ? 'info' : 'error', 'lead', {
        lead_id: submission.lead_id,
        product: submission.product,
        is_test: payload.is_test,
        backup: delivered.backup,
        forward: delivered.forward,
      });
      // Neither in the backup nor at n8n: the visitor must try again (same lead_id).
      if (!delivered.saved) return apiError('unavailable', 503);
      return success;
    } catch (error) {
      log('error', 'lead_error', { error: errorSummary(error) });
      return apiError('server_error', 500);
    }
  };
}
