// Runtime types shared by the flow engine, the form island (later PR) and the lead endpoint
// (Phase 5). Plain TypeScript, no dependencies: the island bundles the engine.

/** The products a flow can be for (brief §3). The flow's `product` is the payload's. */
export const PRODUCTS = ['energie', 'zonnepanelen', 'thuisbatterij'] as const;
export type Product = (typeof PRODUCTS)[number];

/** A `day_slot` answer: a day code and a slot code (brief §7.5). */
export type DaySlotAnswer = { day?: string; slot?: string };

/**
 * One answer. Choice fields hold an option code (never a label), yes/no "yes" | "no",
 * checkboxes and consents a boolean, numbers a number (or the raw input such as "3.500":
 * conditions and the submission read it parsed), `day_slot` an object.
 */
export type AnswerValue = string | number | boolean | DaySlotAnswer;

/** Answers by field id, plus answers implied by a chosen option's `sets` (e.g. energy_type). */
export type Answers = Readonly<Record<string, AnswerValue | undefined>>;

/**
 * Values worked out rather than asked (brief §7.1): conditions read them as `derived.<key>`.
 * `preselected` is true when the product came from the URL (/vergelijken/<product>, a landing
 * variant), so the shared product step is skipped (brief §7.6); missing means false. The engine
 * treats a missing postcode, region or province as still to come only while the postcode
 * question can still be answered.
 */
export const DERIVED_KEYS = ['postcode', 'region', 'province', 'preselected'] as const;
export type DerivedKey = (typeof DERIVED_KEYS)[number];

/** The values of `derived.region` (brief §7.5, §8); validate:flows checks literals against them. */
export const REGIONS = ['flanders', 'wallonia', 'brussels'] as const;

export type Derived = Readonly<{
  postcode?: string;
  /** One of REGIONS. */
  region?: string;
  /** A slug such as "oost-vlaanderen". */
  province?: string;
  preselected?: boolean;
}>;
