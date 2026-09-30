// Call moment (brief §7.5): a day and a time slot, two linked single-choice groups. The value is
// `{ day, slot }` (payload `call_preference`, brief §9.2). When the field is required, both
// are; an optional field may be left empty, but never half filled.
import { empty, fail, isEmpty, ok } from './shared';
import type { FieldConfig, ValidationResult } from './types';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** Hourly slots 09–16. Keep 13-14 (brief §7.5). */
export const SLOTS = ['09-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16'] as const;

export interface DaySlot {
  day: string;
  slot: string;
}

export function validateDaySlot(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (value === undefined || value === null) return empty(field);
  if (typeof value !== 'object' || Array.isArray(value)) return fail('invalid_type');
  const { day, slot } = value as Record<string, unknown>;
  if (isEmpty(day) && isEmpty(slot)) return empty(field);
  if (isEmpty(day)) return fail('day_required');
  if (isEmpty(slot)) return fail('slot_required');
  const days: readonly string[] = field.days ?? DAYS;
  const slots: readonly string[] = field.slots ?? SLOTS;
  if (typeof day !== 'string' || !days.includes(day)) return fail('day_unknown');
  if (typeof slot !== 'string' || !slots.includes(slot)) return fail('slot_unknown');
  return ok<DaySlot>({ day, slot });
}
