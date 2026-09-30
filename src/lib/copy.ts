// Helpers for `copy` fields (see src/schemas/primitives.ts).
export type Sentence = string | { text: string; hidden: boolean; claim?: string | undefined };
export type Copy = string | Sentence[];

/** The visible text: hidden sentences are dropped, the rest joined with a space. */
export function visibleCopy(copy: Copy): string {
  if (typeof copy === 'string') return copy;
  return copy
    .filter((s) => typeof s === 'string' || !s.hidden)
    .map((s) => (typeof s === 'string' ? s : s.text))
    .join(' ');
}
