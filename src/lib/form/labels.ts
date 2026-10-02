// Labels, icons and DOM ids of the form's fields (docs/FLOWS.md steps 5–7). Pure, so the island
// and the tests share them.
import type { Field, Step } from '../flow/schema';
import type { FormCopy, FormFlows } from './types';

/** Icon keys (src/assets/icons) of the yes/no cards (Figma 90:9463 check, 90:9468 cross). */
export const YES_NO_ICONS = { yes: 'check-circle', no: 'x-circle' } as const;

export type ChoiceOption = {
  code: string;
  label: string;
  icon?: string | undefined;
  /** yes_no cards: the icon colour of the Ja or Nee card. */
  tone?: 'yes' | 'no' | undefined;
};

/** The cards of a single_choice or yes_no field. yes_no uses copy.yesNo unless it has `labels`. */
export function choiceOptions(field: Field, copy: Pick<FormCopy, 'yesNo'>): ChoiceOption[] {
  if (field.type === 'single_choice') {
    return field.options.map(({ code, label, icon }) => ({ code, label, icon }));
  }
  if (field.type === 'yes_no') {
    const labels = field.labels ?? copy.yesNo;
    return (['yes', 'no'] as const).map((code) => ({
      code,
      label: labels[code],
      icon: YES_NO_ICONS[code],
      tone: code,
    }));
  }
  return [];
}

/**
 * A field's question. A field without `label` is named by the step title (only a step's first
 * field omits it), so its control is labelled by the step heading.
 */
export function fieldLabel(step: Step, field: Field): { text: string; byTitle: boolean } {
  return field.label === undefined
    ? { text: step.title, byTitle: true }
    : { text: field.label, byTitle: false };
}

export type Segment = { text: string; href?: string | undefined };

/**
 * A consent label split into text and links: the first occurrence of each link's `text`
 * becomes a link to its `href` (overlapping links: the earlier one wins).
 */
export function consentSegments(
  label: string,
  links: readonly { text: string; href: string }[] = [],
): Segment[] {
  const found = links
    .map((link) => ({ ...link, at: label.indexOf(link.text) }))
    .filter((link) => link.at !== -1)
    .sort((a, b) => a.at - b.at);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const link of found) {
    if (link.at < cursor) continue;
    if (link.at > cursor) segments.push({ text: label.slice(cursor, link.at) });
    segments.push({ text: link.text, href: link.href });
    cursor = link.at + link.text.length;
  }
  if (cursor < label.length) segments.push({ text: label.slice(cursor) });
  return segments;
}

/** Icons of the form's own controls: button chevrons, the select chevron (rotated). */
export const UI_ICONS = {
  back: 'chevron-left',
  next: 'chevron-right',
  info: 'info-circle',
} as const;

/** Every icon key the island can show for these flows: option, yes/no and control icons. */
export function formIconKeys(flows: FormFlows): string[] {
  const keys = new Set<string>([...Object.values(YES_NO_ICONS), ...Object.values(UI_ICONS)]);
  for (const flow of Object.values(flows)) {
    for (const step of flow?.steps ?? []) {
      for (const field of step.fields) {
        if (field.type !== 'single_choice') continue;
        for (const option of field.options) if (option.icon) keys.add(option.icon);
      }
    }
  }
  return [...keys].sort();
}

/** Short inputs share a row from md (the contact step's 2×2 grid, Figma 91:10958). */
export function fieldSpan(field: Field): 'half' | 'full' {
  return field.type === 'text' || field.type === 'phone' || field.type === 'email'
    ? 'half'
    : 'full';
}

/** DOM ids: the field's control (or group), its hint and its error message. */
export const domId = {
  field: (id: string) => `veld-${id}`,
  option: (id: string, code: string) => `veld-${id}-${code}`,
  hint: (id: string) => `veld-${id}-hint`,
  error: (id: string) => `veld-${id}-fout`,
  warning: (id: string) => `veld-${id}-let-op`,
  label: (id: string) => `veld-${id}-label`,
};
