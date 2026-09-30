// "Opnieuw beginnen" (Tanjil's form feedback 2026-09-30): the round button beside "Terug" empties
// the form at once, without asking first, and offers "Ongedaan maken" for UNDO_MS. The reset
// goes back to the entry's first step as a fresh visit would see it: the URL preselect
// (?energie=, /vergelijken/<product>) stays, the answers and the stored session go, and the lead
// gets new ids (a new lead). An undo puts back exactly what the reset took: step, answers, flow
// and ids (the session is stored again from them). Pure, so the island and the tests share it.
import type { AnswerValue, Answers } from '../flow/types';
import { restoreStart, type FormStart, type RestoreInput } from './initial';

/** How long "Ongedaan maken" stays (paused while the pointer or focus is on it). */
export const UNDO_MS = 8000;

/** The lead's ids, made once per form session (docs/FLOWS.md "Lead ids"). */
export type FormIds = { leadId: string; eventId: string };

/** What a reset takes away and an undo puts back. */
export type FormSnapshot = FormStart & { ids: FormIds };

/**
 * Where a reset goes: the entry's first step with only the URL preselect, the state a first
 * visit of this URL restores to (restoreStart without a stored session, the same as the server
 * render). The session flags come out the same, so they never change during a visit.
 */
export function freshStart(input: Omit<RestoreInput, 'stored'>): FormStart {
  return restoreStart({ ...input, stored: null });
}

/** No answer: nothing, only spaces, an unticked box, or a call moment without day and slot. */
function blank(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === false) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return !value.day && !value.slot;
  return false;
}

/**
 * Whether there is anything to reset (the button shows only then): the visitor is past the first
 * step, or gave an answer of their own there (the URL's preselected answers don't count).
 */
export function canReset(fresh: FormStart, current: { step: string; answers: Answers }): boolean {
  if (current.step !== fresh.step) return true;
  return Object.entries(current.answers).some(
    ([key, value]) => value !== fresh.answers[key] && !blank(value),
  );
}
