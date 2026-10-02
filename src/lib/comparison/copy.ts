// The results and ordering screens' copy (src/content/order/nl.json). Checked when the module
// loads, so a build with an empty text or a missing key fails (AGENTS.md rule 5): every leaf is
// a non-empty string (or a number / boolean), and `{token}` placeholders are filled by `fill`.
import copyJson from '../../content/order/nl.json' with { type: 'json' };

export type OrderCopy = typeof copyJson;

function check(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (value.trim() === '') throw new Error(`src/content/order/nl.json: ${path} is empty`);
    return;
  }
  if (Array.isArray(value)) value.forEach((item, i) => check(item, `${path}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) check(item, path ? `${path}.${key}` : key);
  }
}

check(copyJson, '');

export const orderCopy: OrderCopy = copyJson;

/** "{count} producten" → "5 producten". */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const EURO = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' });
const EURO_ROUND = new Intl.NumberFormat('nl-BE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const euro = (amount: number) => EURO.format(amount);
export const euroRound = (amount: number) => EURO_ROUND.format(amount);

export function dutchDate(iso: string): string {
  return new Intl.DateTimeFormat('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}
