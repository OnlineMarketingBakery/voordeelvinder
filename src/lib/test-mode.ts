// Test mode (brief §9.4, ADR 0004): a visitor who arrives with ?test=1 stays in test mode for the
// session (sessionStorage), sees a small "TESTMODUS" badge on every page, and every lead they
// send has meta.test = true (the server then marks it is_test). ?test=0 ends it. Staging leads
// are test leads anyway (server side); this is for testing on production.
//
// No imports: Base.astro inlines testModeScript in <head>, so the badge shows from the first
// paint on every page, and the form reads the same flag (src/lib/form/submit.ts).

export const TEST_MODE_KEY = 'voordeelvinder:test';
/** Set on <html> while test mode is on; the badge in Base.astro shows only then. */
export const TEST_MODE_ATTRIBUTE = 'data-test-mode';

type Store = Pick<Storage, 'getItem'>;

/** ?test=1 → "on", ?test=0 → "off", anything else leaves the session as it is. */
export function testParam(search: string): 'on' | 'off' | null {
  const value = new URLSearchParams(search).get('test');
  return value === '1' ? 'on' : value === '0' ? 'off' : null;
}

/**
 * Whether this visit is a test: the URL decides when it has ?test=, else the session flag. Without
 * storage (blocked, private mode) only the URL counts.
 */
export function isTestSession(search: string, store: Store | null): boolean {
  const param = testParam(search);
  if (param !== null) return param === 'on';
  try {
    return store?.getItem(TEST_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The inline <head> script (ES5, no dependencies): stores or clears the flag from ?test= and sets
 * TEST_MODE_ATTRIBUTE on <html> while it is on. Without storage the URL alone decides.
 */
export const testModeScript = `(function(){var k=${JSON.stringify(TEST_MODE_KEY)},t=new URLSearchParams(location.search).get("test"),on=t==="1";try{var s=window.sessionStorage;if(t==="1")s.setItem(k,"1");else if(t==="0")s.removeItem(k);else on=s.getItem(k)==="1"}catch(e){}if(on)document.documentElement.setAttribute(${JSON.stringify(TEST_MODE_ATTRIBUTE)},"")})();`;
