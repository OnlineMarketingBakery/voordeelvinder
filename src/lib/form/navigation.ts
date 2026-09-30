// Moving through the form (brief §6.1, §7.6; Tanjil's form feedback 2026-09-30): what a pick on
// an answer card leads to (auto-advance, docs/MOTION.md; the next open question of the step) and
// which steps the progress bar may jump back to. Pure, so the island and the tests share them.
import { nextStep, validateStep, visibleFields } from '../flow/engine';
import type { Field, Flow } from '../flow/schema';
import type { Answers, Derived } from '../flow/types';

export type PickOutcome = {
  /** The step's visible fields with the pick stored (a pick can reveal or hide a question). */
  fields: Field[];
  /** The step validates with the pick stored: every visible question is answered. */
  complete: boolean;
  /** The step is the last one ("Verstuur"). */
  isLast: boolean;
  /**
   * The step's first question after the picked one (then from the top) that still needs an
   * answer: the one to bring into view on a phone. Null when none does.
   */
  nextOpen: string | null;
};

/**
 * The step `stepId` as it is once the pick is stored: `answers` and `derived` already hold it,
 * and `flow` is the flow the visitor is in after it (a product card on step 1 can switch it).
 * The pick is what the visitor sees at once, so the island decides from this, not from the
 * render before it.
 */
export function pickOutcome(
  flow: Flow,
  stepId: string,
  answers: Answers,
  derived: Derived,
  pickedId: string,
): PickOutcome {
  const fields = visibleFields(flow, stepId, answers, derived);
  const { valid, errors } = validateStep(flow, stepId, answers, derived);
  return {
    fields,
    complete: valid,
    isLast: nextStep(flow, stepId, answers, derived) === null,
    nextOpen: nextOpenField(fields, errors, pickedId),
  };
}

/**
 * The first field after `pickedId` in the step's order, wrapping around to the top, that has an
 * error (validateStep): a required question without an answer, or an answer that doesn't
 * validate. Optional fields left empty pass, so they are never "open".
 */
export function nextOpenField(
  fields: readonly { id: string }[],
  errors: Readonly<Record<string, unknown>>,
  pickedId: string,
): string | null {
  const at = fields.findIndex((field) => field.id === pickedId);
  const order = at === -1 ? fields : [...fields.slice(at + 1), ...fields.slice(0, at)];
  return order.find((field) => errors[field.id] !== undefined)?.id ?? null;
}

/**
 * Whether the progress bar may jump from `current` to `target`: only back, to a step before the
 * current one on the visitor's path (pathSoFar). Answered steps after it (the visitor went back)
 * and steps off the path are never jump targets: "Volgende" validates on the way forward.
 */
export function canJumpBack(path: readonly string[], current: string, target: string): boolean {
  const from = path.indexOf(current);
  const to = path.indexOf(target);
  return to >= 0 && from > to;
}
