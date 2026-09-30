// Error and warning codes the validators return. The flow content maps each code to Dutch copy
// (brief §4.4: no user-facing text in code). Codes are part of the engine's contract: rename
// them only together with the content that maps them.

export const ERROR_CODES = [
  /** A required field is empty (or a required checkbox/consent is unchecked). */
  'required',
  /** The value has the wrong JavaScript type (a programming error, not a visitor error). */
  'invalid_type',
  /** postcode: not 4 digits between 1000 and 9999. */
  'postcode_invalid',
  /** phone: not a Belgian number we can read without changing digits. */
  'phone_invalid',
  /** phone: a valid Belgian landline while only mobiles are allowed. */
  'phone_landline',
  /** email: not a plausible address. */
  'email_invalid',
  /** number: not a number at all ("abc", "3500 kWh"). */
  'number_invalid',
  /** number: a decimal ("3,5", "3.50"). */
  'number_not_integer',
  /** number: below `min`. */
  'number_too_low',
  /** number: above `max`. */
  'number_too_high',
  /** text: longer than `maxLength`. */
  'text_too_long',
  /** text: contains control characters. */
  'text_invalid',
  /** single_choice, select, yes_no: not one of the field's option codes. */
  'option_unknown',
  /** day_slot: the day is missing. */
  'day_required',
  /** day_slot: the slot is missing. */
  'slot_required',
  /** day_slot: the day is not one of the allowed codes. */
  'day_unknown',
  /** day_slot: the slot is not one of the allowed codes. */
  'slot_unknown',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const WARNING_CODES = [
  /** number: valid, but outside `softMin`–`softMax` ("are you sure?"). */
  'outside_typical',
] as const;

export type WarningCode = (typeof WARNING_CODES)[number];
