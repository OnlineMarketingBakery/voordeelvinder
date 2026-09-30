// Minimal field types for the validators (brief §7.1, §7.5). The flow engine and the flow schema
// align to these; a flow field may carry more properties (label, hint, icon…), which the
// validators ignore.

/** Every field type the engine renders (brief §7.1). */
export const FIELD_TYPES = [
  'single_choice',
  'yes_no',
  'select',
  'text',
  'number',
  'postcode',
  'phone',
  'email',
  'checkbox',
  'day_slot',
  'consent',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** An answer option. `code` is the stable data contract (AGENTS.md rule 4); labels live elsewhere. */
export interface FieldOption {
  readonly code: string;
}

export interface FieldConfig {
  readonly id: string;
  readonly type: FieldType;
  /** Only shown fields are validated at all (brief §7.6); this says whether a shown one may stay empty. */
  readonly required?: boolean;
  /** single_choice, select, yes_no (yes_no defaults to `yes` / `no`). */
  readonly options?: readonly FieldOption[];
  /** number: hard range (inclusive). */
  readonly min?: number;
  readonly max?: number;
  /** number: typical range (inclusive); outside it the value is valid but gets a warning. */
  readonly softMin?: number;
  readonly softMax?: number;
  /** text: maximum length after trimming (default `TEXT_MAX_LENGTH`). */
  readonly maxLength?: number;
  /** phone: also accept Belgian landlines (default false: mobiles only, brief §7.5). */
  readonly allowLandlines?: boolean;
  /** day_slot: allowed codes (default `DAYS` / `SLOTS`). */
  readonly days?: readonly string[];
  readonly slots?: readonly string[];
}

/**
 * The result of validating one field. `value` is the normalised answer (`undefined` for an
 * optional field left empty: the engine omits it). Failures carry an error code, never copy:
 * the Dutch messages live in the flow content.
 */
export type ValidationResult<T = string> =
  | { ok: true; value: T; warning?: string; suggestion?: string }
  | { ok: false; code: string; suggestion?: string };

export type Validator = (value: unknown, field: FieldConfig) => ValidationResult<unknown>;
