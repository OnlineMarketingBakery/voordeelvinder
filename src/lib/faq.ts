// FAQ helpers: only answered questions reach the page and the FAQPage JSON-LD (CONTENT-TODO 2.1).
import type { Section } from '../schemas/page';

export interface FaqItem {
  question: string;
  answer: string | null;
  open?: boolean | undefined;
}

export type AnsweredFaqItem = FaqItem & { answer: string };

export function answeredItems<T extends FaqItem>(items: T[]): Array<T & { answer: string }> {
  return items.filter((item): item is T & { answer: string } => item.answer !== null);
}

/** The questions a page shows: answered items of its visible FAQ blocks, in page order. */
export function visibleFaqItems(sections: Section[]): AnsweredFaqItem[] {
  return sections.flatMap((section) =>
    section.type === 'faq' && !section.hidden ? answeredItems(section.items) : [],
  );
}
