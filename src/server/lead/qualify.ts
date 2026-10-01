// Lead qualification (brief §8, ADR 0010): the site decides each lead's outcome, n8n routes on
// it. Energy: `no_promo` when any rule in src/server/rules/energie.json holds (each one adds its
// code to the reasons), `promo` otherwise. Solar panels and home battery have no rules yet:
// always `pending`. Every lead is still sent to n8n; nothing is filtered here.
import { z } from 'astro/zod';

import { evaluate, truthy, type Rule } from '../../lib/flow/logic';
import type { Product } from '../../lib/flow/types';
import energie from '../rules/energie.json' with { type: 'json' };

export const OUTCOMES = ['promo', 'no_promo', 'pending'] as const;
export type Outcome = (typeof OUTCOMES)[number];

const rulesFile = z.object({
  reasons: z
    .array(
      z.strictObject({
        code: z.string().regex(/^[a-z][a-z0-9_]*$/, 'snake_case reason code'),
        when: z.custom<Rule>((value) => value !== undefined),
      }),
    )
    .min(1),
});

/** The rules per product; a product without rules is always `pending`. */
const RULES: Partial<Record<Product, z.infer<typeof rulesFile>>> = {
  energie: rulesFile.parse(energie),
};

export type Qualification = { outcome: Outcome; outcome_reasons: string[] };

/** The outcome of a lead from its answers (codes) and derived values (postcode region). */
export function qualify(
  product: Product,
  answers: Record<string, unknown>,
  derived: Record<string, unknown>,
): Qualification {
  const rules = RULES[product];
  if (!rules) return { outcome: 'pending', outcome_reasons: [] };
  const data = { answers, derived };
  const reasons = rules.reasons
    .filter((rule) => truthy(evaluate(rule.when, data)))
    .map((rule) => rule.code);
  return { outcome: reasons.length > 0 ? 'no_promo' : 'promo', outcome_reasons: reasons };
}
