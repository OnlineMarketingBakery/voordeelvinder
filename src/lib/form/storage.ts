// The form session in sessionStorage (brief §7.6 "Persistence"): a refresh keeps the answers,
// a successful submit clears them. One entry per form page (FormEntry). The record is
// versioned: a record of another STORAGE_VERSION, or of a flow that changed since (another flow
// version or switches: flowFingerprint), is ignored. Nothing here throws: storage can be missing
// or blocked (private mode, some in-app browsers), and the form then simply doesn't persist.
import type { Flow } from '../flow/schema';
import { PRODUCTS, type AnswerValue, type Product } from '../flow/types';
import type { FormEntry, OwnAnswers } from './types';

/** Bump when the record's shape changes; older records are then ignored. */
export const STORAGE_VERSION = 2;
export const STORAGE_PREFIX = 'voordeelvinder:form';

/**
 * What a stored session's answers were given against: the flow's `version` plus the config
 * switches that are on and take options away in this flow (`requires`, e.g. gas), such as
 * "v1+gas". The resolved flow keeps only the options its switches offer, so the switches are
 * read from the options that are left. Turning gas off, or bumping the version, changes it, and
 * a session stored before that is ignored instead of resumed with answers the flow no longer has.
 */
export function flowFingerprint(flow: Flow): string {
  const on = new Set<string>();
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type !== 'single_choice') continue;
      for (const option of field.options) if (option.requires) on.add(option.requires);
    }
  }
  return [`v${flow.version}`, ...[...on].sort()].join('+');
}

/** flowFingerprint of each flow a page runs. */
export function flowFingerprints(
  flows: Partial<Record<Product, Flow>>,
): Partial<Record<Product, string>> {
  return Object.fromEntries(
    Object.entries(flows).map(([product, flow]) => [product, flowFingerprint(flow)]),
  );
}

export type StoredSession = {
  version: typeof STORAGE_VERSION;
  /** The flow the visitor is in (on /vergelijken: the product chosen on step 1). */
  product: Product;
  /** flowFingerprint of the flow when the answers were given. */
  flow: string;
  /** The step the visitor was on. */
  step: string | null;
  answers: OwnAnswers;
  /** Generated once per form session (brief §7.6: a double click never sends twice). */
  leadId: string;
  eventId: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export function storageKey(entry: FormEntry): string {
  return `${STORAGE_PREFIX}:${entry}`;
}

/** sessionStorage when it works, else null (reading the property itself can throw). */
export function sessionStore(): StorageLike | null {
  try {
    const store = globalThis.sessionStorage;
    if (!store) return null;
    const probe = `${STORAGE_PREFIX}:probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

const FIELD_ID = /^[a-z][a-z0-9_]*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAnswerValue(value: unknown): value is AnswerValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([key, part]) => (key === 'day' || key === 'slot') && typeof part === 'string',
  );
}

function isProduct(value: unknown): value is Product {
  return typeof value === 'string' && (PRODUCTS as readonly string[]).includes(value);
}

export function serializeSession(session: StoredSession): string {
  return JSON.stringify(session);
}

/**
 * Reads a stored record, or null when it is missing, unreadable, of another storage version, or
 * for a flow this page doesn't run or that changed since (`fingerprints`: flowFingerprints).
 * Answers with an unexpected key or value are dropped one by one; the rest is kept.
 */
export function parseSession(
  raw: string | null,
  fingerprints: Partial<Record<Product, string>>,
): StoredSession | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== STORAGE_VERSION) return null;
  const { product, flow, step, answers, leadId, eventId } = data;
  if (!isProduct(product) || fingerprints[product] === undefined) return null;
  if (typeof flow !== 'string' || flow !== fingerprints[product]) return null;
  if (typeof leadId !== 'string' || !UUID.test(leadId)) return null;
  if (typeof eventId !== 'string' || !UUID.test(eventId)) return null;
  const own: OwnAnswers = {};
  if (isRecord(answers)) {
    for (const [key, value] of Object.entries(answers)) {
      if (FIELD_ID.test(key) && isAnswerValue(value)) own[key] = value;
    }
  }
  return {
    version: STORAGE_VERSION,
    product,
    flow,
    step: typeof step === 'string' && FIELD_ID.test(step) ? step : null,
    answers: own,
    leadId,
    eventId,
  };
}

export function readSession(
  store: StorageLike | null,
  entry: FormEntry,
  fingerprints: Partial<Record<Product, string>>,
): StoredSession | null {
  if (!store) return null;
  try {
    return parseSession(store.getItem(storageKey(entry)), fingerprints);
  } catch {
    return null;
  }
}

/** Writes the record; false when storage refused it (full, blocked). */
export function writeSession(
  store: StorageLike | null,
  entry: FormEntry,
  session: StoredSession,
): boolean {
  if (!store) return false;
  try {
    store.setItem(storageKey(entry), serializeSession(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(store: StorageLike | null, entry: FormEntry): void {
  try {
    store?.removeItem(storageKey(entry));
  } catch {
    // Nothing to clear.
  }
}

/**
 * Removes the form session of every form page (every `voordeelvinder:form:` key). After a
 * successful submit (brief §7.6 "cleared after a successful submit"): contact details typed on
 * another form page in this tab must not outlive the lead either.
 */
export function clearAllSessions(store: StorageLike | null): void {
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(`${STORAGE_PREFIX}:`)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

/** A random UUID v4: crypto.randomUUID where available (secure contexts), else built by hand. */
export function newId(
  crypto: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto,
): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
