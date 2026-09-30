// Tracking values (click ids, UTM parameters, GA ids, landing page, referrer): whatever the
// browser picked up from the URL, cookies and document.referrer, so visitor-controlled. They
// go into the lead sheet, so they are cleaned before they reach the payload: at most
// TRACKING_MAX_LENGTH characters, a narrow character set without quotes, parentheses, angle
// brackets, backslashes or control characters (a spreadsheet formula needs quotes or
// parentheses to call a function), and never a leading `=` or `@`. A value that doesn't fit is
// dropped (`""`) rather than refused: attribution data must never cost a lead. n8n still has
// to write every string field RAW (docs/PAYLOAD.md, "Untrusted fields").

/** The longest tracking value kept (longer ones are cut): click ids and UTMs are far shorter. */
export const TRACKING_MAX_LENGTH = 512;

// Letters, marks, digits and dashes in any script, the space, and the characters URLs use.
const TRACKING_VALUE = /^[\p{L}\p{M}\p{N}\p{Pd} ._~:/?#[\]@!$&'*+,;=%|]*$/u;
const FORMULA_START = /^[=@]/;

/** The value as it may go into the payload: trimmed and cut to length, or "" when unsafe. */
export function cleanTrackingValue(value: string): string {
  const text = [...value.trim()].slice(0, TRACKING_MAX_LENGTH).join('').trim();
  if (FORMULA_START.test(text) || !TRACKING_VALUE.test(text)) return '';
  return text;
}
