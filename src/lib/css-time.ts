// A CSS <time> value in milliseconds, for scripts that read a motion token at runtime
// (getComputedStyle(root).getPropertyValue('--motion-duration-slow')). The build minifies the
// tokens, so 400ms arrives as ".4s": both units count. Used by the header's drawer script only;
// keep it out of the form island, or it becomes a shared chunk and that script a request.

export function cssTimeMs(value: string, fallback: number): number {
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)$/i.exec(value.trim());
  if (!match?.[1] || !match[2]) return fallback;
  const amount = Number(match[1]);
  return match[2].toLowerCase() === 's' ? amount * 1000 : amount;
}
