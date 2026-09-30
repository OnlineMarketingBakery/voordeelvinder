// Email (brief §7.5): trim and lowercase, a practical format check (not the full RFC 5322
// grammar), and a typo suggestion for common mail domains. No MX lookup.
//
// Accepted: ASCII local part of letters, digits and !#$%&'*+/=?^_`{|}~.- (no leading, trailing
// or double dot, at most 64 characters); a domain of at least two labels (letters, digits,
// hyphens; at most 63 characters; no label starts or ends with a hyphen) ending in a letters-only TLD of 2+
// characters; at most 254 characters overall. Quoted local parts, IP-literal domains and
// non-ASCII addresses are rejected: they are rare here and many downstream tools choke on them.
//
// Suggestions ("did you mean …?") never change the value: the visitor decides.
import { empty, fail, isEmpty } from './shared';
import type { FieldConfig, ValidationResult } from './types';

/** Domains we suggest, most common first (a tie in distance goes to the earlier one). */
export const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'telenet.be',
  'hotmail.be',
  'outlook.be',
  'skynet.be',
  'live.be',
  'icloud.com',
  'yahoo.com',
  'proximus.be',
  'live.com',
  'msn.com',
  'scarlet.be',
  'pandora.be',
  'me.com',
] as const;

/** Real domains one typo away from a common one; never "corrected". */
const REAL_LOOKALIKES = new Set([
  'mail.com',
  'email.com',
  'ymail.com',
  'gmx.com',
  'mac.com',
  'hotmail.de',
  'outlook.de',
  'live.de',
]);
/** Their names ("mail", "email"…), which the single-domain provider rule leaves alone too. */
const REAL_LOOKALIKE_NAMES = new Set([...REAL_LOOKALIKES].map((domain) => domain.split('.')[0]));

/**
 * Providers that exist under one domain only, so a different TLD is a typo: "gmail.be" (Gmail
 * has no .be) → gmail.com. Hotmail, Outlook, Live and Yahoo are not here: they have many real
 * country domains (hotmail.fr, outlook.nl…).
 */
const SINGLE_DOMAIN_PROVIDERS: Readonly<Record<string, string>> = {
  gmail: 'gmail.com',
  icloud: 'icloud.com',
  telenet: 'telenet.be',
  skynet: 'skynet.be',
  proximus: 'proximus.be',
  scarlet: 'scarlet.be',
  pandora: 'pandora.be',
};

const LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^[a-z]{2,}$/;

/** Optimal string alignment distance: edits, where swapping two neighbours counts as one. */
export function editDistance(a: string, b: string): number {
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    const row: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        row.push(j);
        continue;
      }
      const prev = rows[i - 1]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2]![j - 2]! + 1);
      }
      row.push(best);
    }
    rows.push(row);
  }
  return rows[a.length]![b.length]!;
}

function isValidDomain(domain: string): boolean {
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((l) => LABEL.test(l)) && TLD.test(labels.at(-1)!);
}

/** A corrected domain for a likely typo, or `undefined`. */
export function suggestDomain(domain: string): string | undefined {
  if ((COMMON_DOMAINS as readonly string[]).includes(domain) || REAL_LOOKALIKES.has(domain)) {
    return undefined;
  }
  // One edit away from a common domain: gmial.com, hotmial.com, outlok.com, yaho.com, telnet.be.
  const close = COMMON_DOMAINS.find((known) => editDistance(domain, known) === 1);
  if (close) return close;
  // A single-domain provider (within one edit) under another TLD, or none: gmail.be, gmial.be,
  // skynet.com, "gmail" without a TLD.
  const dot = domain.lastIndexOf('.');
  const name = dot === -1 ? domain : domain.slice(0, dot);
  if (REAL_LOOKALIKE_NAMES.has(name)) return undefined;
  const provider = Object.keys(SINGLE_DOMAIN_PROVIDERS).find((p) => editDistance(name, p) <= 1);
  return provider ? SINGLE_DOMAIN_PROVIDERS[provider] : undefined;
}

function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return at > 0 && local.length <= 64 && LOCAL.test(local) && isValidDomain(domain);
}

/** The normalised address: trimmed and lowercased. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(value: unknown, field: FieldConfig): ValidationResult<unknown> {
  if (isEmpty(value)) return empty(field);
  if (typeof value !== 'string') return fail('invalid_type');
  const email = normaliseEmail(value);
  const at = email.lastIndexOf('@');
  const typed = email.slice(at + 1);
  // A comma for a dot ("gmail,com") is the most common invalid typo; suggest the dot.
  const domain = typed.replaceAll(',', '.');
  const corrected =
    at > 0 ? (suggestDomain(domain) ?? (domain === typed ? undefined : domain)) : undefined;
  const suggestion = corrected ? `${email.slice(0, at)}@${corrected}` : undefined;

  if (!isValidEmail(email)) {
    return suggestion && isValidEmail(suggestion)
      ? { ok: false, code: 'email_invalid', suggestion }
      : fail('email_invalid');
  }
  return suggestion ? { ok: true, value: email, suggestion } : { ok: true, value: email };
}
