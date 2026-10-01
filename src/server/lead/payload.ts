// The lead payload sent to n8n (brief §9.2, docs/PAYLOAD.md, `schema_version: 1`): the
// server-rebuilt submission (validate.ts) plus what only the server knows: brand, is_test, the
// Dutch labels from its own copy of the flow, the time it received the lead (`submitted_at`),
// and the request's user agent, IP and SITE_ENV.
// The site never qualifies a lead: n8n does (promo / no_promo / pending, ADR 0009). The
// contract with n8n, the lead sheet and Meta: change it only with explicit approval (AGENTS.md).
import {
  answerLabels,
  SCHEMA_VERSION,
  type CallPreference,
  type CookieConsent,
  type Submission,
  type SubmittedValue,
  type Tracking,
} from '../../lib/flow/engine';
import type { Flow, FlowCopy } from '../../lib/flow/schema';
import type { Product } from '../../lib/flow/types';
import { isTestEnvironment, type SiteEnv } from '../env';
import { serverFlowCopy, serverFlows } from './flows';
import { qualify, type Outcome } from './qualify';

export const BRAND = 'voordeelvinder';

/** A user agent longer than this is cut: real ones are far shorter. */
export const MAX_USER_AGENT = 512;

export type LeadPayload = {
  schema_version: typeof SCHEMA_VERSION;
  brand: typeof BRAND;
  lead_id: string;
  event_id: string;
  is_test: boolean;
  submitted_at: string;
  product: Product;
  flow_version: number;
  /** Decided on the site (qualify.ts, ADR 0010); n8n routes on it. */
  outcome: Outcome;
  outcome_reasons: string[];
  answers: Record<string, SubmittedValue>;
  labels: Record<string, string>;
  derived: Record<string, string>;
  contact: Record<string, string>;
  call_preference: CallPreference | null;
  consent: { cookies: CookieConsent } & Record<string, boolean | CookieConsent>;
  tracking: Tracking;
  meta: { page: string; user_agent: string; ip: string; site_env: SiteEnv };
};

export type PayloadMeta = {
  /** When the server received the lead: the payload's `submitted_at` (never the browser's clock). */
  receivedAt: Date;
  /** The visitor's IP as Astro resolved it (clientAddress). */
  ip: string;
  userAgent: string;
  siteEnv: SiteEnv;
  /** The pipeline's test decision; the payload is also a test lead whenever SITE_ENV isn't production or the visitor came with ?test=1. */
  isTest: boolean;
};

/**
 * The Dutch label of every coded answer, in the order of `answers` (§9.2 "so the sheet is
 * readable"): option labels (answerLabels), yes/no fields without their own labels from the
 * form copy (`yesNo`: "Ja"/"Nee"), and implied answers (energy_type) from the option that sets
 * them. Numbers and booleans have no label.
 */
export function payloadLabels(
  flow: Flow,
  answers: Readonly<Record<string, unknown>>,
  yesNo: FlowCopy['yesNo'],
): Record<string, string> {
  const found = answerLabels(flow, answers);
  for (const step of flow.steps) {
    for (const field of step.fields) {
      const value = Object.hasOwn(answers, field.id) ? answers[field.id] : undefined;
      if (field.type === 'yes_no' && (value === 'yes' || value === 'no')) {
        found[field.id] ??= yesNo[value];
      }
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) {
        if (option.product !== undefined && option.product !== flow.product) continue;
        for (const [name, set] of Object.entries(option.sets ?? {})) {
          if (Object.hasOwn(answers, name) && answers[name] === set) found[name] ??= option.label;
        }
      }
    }
  }
  const labels: Record<string, string> = {};
  for (const name of Object.keys(answers)) {
    if (Object.hasOwn(found, name)) labels[name] = found[name]!;
  }
  return labels;
}

/** The consent block in the contract's order: the consent fields, then the cookie state. */
function orderedConsent(consent: Submission['consent']): LeadPayload['consent'] {
  const { cookies, ...fields } = consent;
  return { ...fields, cookies: { analytics: cookies.analytics, marketing: cookies.marketing } };
}

/** The payload for n8n (docs/PAYLOAD.md), from a submission rebuilt by parseLeadRequest. */
export function toPayload(submission: Submission, meta: PayloadMeta): LeadPayload {
  const flow = serverFlows()[submission.product];
  return {
    schema_version: SCHEMA_VERSION,
    brand: BRAND,
    lead_id: submission.lead_id,
    event_id: submission.event_id,
    // Never a real lead by accident (ADR 0004): any of the three makes it a test lead.
    is_test: meta.isTest || isTestEnvironment(meta.siteEnv) || submission.meta.test,
    // The server's clock: a visitor's device clock can be days off (docs/PAYLOAD.md).
    submitted_at: meta.receivedAt.toISOString(),
    product: submission.product,
    flow_version: submission.flow_version,
    ...qualify(submission.product, submission.answers, submission.derived),
    answers: { ...submission.answers },
    labels: payloadLabels(flow, submission.answers, serverFlowCopy().yesNo),
    derived: { ...submission.derived },
    contact: { ...submission.contact },
    call_preference: submission.call_preference && { ...submission.call_preference },
    consent: orderedConsent(submission.consent),
    tracking: { ...submission.tracking },
    meta: {
      page: submission.meta.page,
      user_agent: meta.userAgent.slice(0, MAX_USER_AGENT),
      ip: meta.ip,
      site_env: meta.siteEnv,
    },
  };
}
