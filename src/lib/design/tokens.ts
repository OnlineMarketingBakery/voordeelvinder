// Reads design tokens from the `@theme` block of src/styles/global.css, so the styleguide and
// the contrast tests always use the real values.

export interface Token {
  /** Full custom property name, e.g. `--color-purple-600`. */
  name: string;
  value: string;
  /** The trailing comment, if any. */
  note: string;
}

const DECLARATION = /^\s*(--[a-z0-9-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/i;

/** Tokens whose name starts with `prefix` (e.g. `--color-`), skipping `initial` resets. */
export function readTokens(css: string, prefix: string): Token[] {
  return css
    .split('\n')
    .map((line) => DECLARATION.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(([, name = '', value = '', note = '']) => ({ name, value: value.trim(), note }))
    .filter((token) => token.name.startsWith(prefix) && token.value !== 'initial');
}

/** The value of one token; throws if it doesn't exist. */
export function tokenValue(css: string, name: string): string {
  const token = readTokens(css, name).find((t) => t.name === name);
  if (!token) throw new Error(`Unknown token ${name}`);
  return token.value;
}
