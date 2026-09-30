import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import site from '../../../src/content/site.json' with { type: 'json' };
import { iconKeys, imageKeys } from '../../../src/lib/asset-keys';
import { answeredItems, visibleFaqItems } from '../../../src/lib/faq';
import { faqPage } from '../../../src/lib/seo/structured-data';
import { faqBlock } from '../../../src/schemas/blocks/faq';
import { page, section, type Section } from '../../../src/schemas/page';

// The component reads site.json through getSite(); the content layer isn't available in Vitest.
vi.mock('astro:content', async () => {
  const { default: data } = await import('../../../src/content/site.json');
  return { getEntry: async () => ({ id: 'site', collection: 'site', data }) };
});

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const faqComponent = '../../../src/components/sections/Faq.astro';
const { default: Faq } = (await import(/* @vite-ignore */ faqComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

type FaqBlock = Extract<Section, { type: 'faq' }>;

// The JSON import types every block as one loose union; read it with its schema type.
const homeFaq = home.sections.find((s) => s.type === 'faq') as unknown as FaqBlock | undefined;
if (!homeFaq) throw new Error('home.json has no faq block');

// The product-page variant (zonnepanelen, Figma 69:947): white, no overlap.
const productFaq = {
  type: 'faq',
  id: 'veelgestelde-vragen',
  tone: 'white',
  eyebrow: 'Veelgestelde vragen',
  title: 'Veelgestelde vraag',
  items: [
    { question: 'Eerste vraag?', answer: null },
    { question: 'Tweede vraag?', answer: 'Het antwoord.' },
  ],
};

const answered = homeFaq.items.find((item) => item.answer !== null)!;
const unanswered = homeFaq.items.find((item) => item.answer === null)!;
const parse = (value: unknown) => faqBlock.safeParse(value).success;

describe('faq block', () => {
  it('accepts the homepage content, also through the section union and the page', () => {
    expect(parse(homeFaq)).toBe(true);
    expect(section.safeParse(homeFaq).success).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('has the designed homepage FAQ: lavender, behind the band, 5 questions, 1 answered', () => {
    const data = faqBlock.parse(homeFaq);
    expect(data).toMatchObject({
      id: 'veelgestelde-vragen',
      tone: 'lavender',
      extendsBehindPrevious: true,
      title: 'Veelgestelde vraag',
    });
    expect(data.items).toHaveLength(5);
    expect(answeredItems(data.items)).toEqual([{ ...answered, open: true }]);
  });

  it('carries the #veelgestelde-vragen anchor that the header and footer link to', () => {
    const hrefs = [...site.header.nav, ...site.footer.links.items].map((l) => l.href);
    expect(hrefs).toContain('/#veelgestelde-vragen');
    expect(home.sections.filter((s) => s.id === 'veelgestelde-vragen')).toHaveLength(1);
  });

  it('accepts the product-page variant and an optional contact override', () => {
    expect(parse(productFaq)).toBe(true);
    expect(parse({ ...productFaq, id: undefined, eyebrow: undefined })).toBe(true);
    expect(parse({ ...productFaq, contact: { title: 'Nog een vraag?' } })).toBe(true);
    expect(parse({ ...productFaq, contact: {} })).toBe(true);
  });

  it('rejects unknown keys on the block, its items and the contact override', () => {
    expect(parse({ ...homeFaq, subtitle: 'x' })).toBe(false);
    expect(parse({ ...homeFaq, questions: homeFaq.items })).toBe(false);
    expect(parse({ ...productFaq, items: [{ ...answered, heading: true }] })).toBe(false);
    expect(parse({ ...productFaq, contact: { image: 'mascot/fox-laptop' } })).toBe(false);
  });

  it('rejects bad values', () => {
    expect(parse({ ...homeFaq, tone: 'purple' })).toBe(false);
    expect(parse({ ...homeFaq, id: 'Veelgestelde vragen' })).toBe(false);
    expect(parse({ ...homeFaq, title: '' })).toBe(false);
    expect(parse({ ...homeFaq, items: [] })).toBe(false);
    expect(parse({ ...homeFaq, items: [{ ...answered, answer: '' }] })).toBe(false);
    expect(parse({ ...homeFaq, items: [{ question: 'Vraag?' }] })).toBe(false);
    expect(parse({ ...homeFaq, contact: { cta: '' } })).toBe(false);
  });

  it('needs an answered question unless the block is hidden', () => {
    expect(parse({ ...homeFaq, items: [unanswered] })).toBe(false);
    expect(parse({ ...homeFaq, items: [unanswered], hidden: true })).toBe(true);
  });

  it('only opens answered questions', () => {
    expect(parse({ ...homeFaq, items: [answered, { ...unanswered, open: true }] })).toBe(false);
  });

  it('rejects duplicate questions', () => {
    const copy = { ...unanswered, question: ` ${answered.question.toUpperCase()}` };
    expect(parse({ ...homeFaq, items: [answered, copy] })).toBe(false);
  });

  it('only lets the lavender FAQ extend behind the previous block', () => {
    expect(parse({ ...productFaq, extendsBehindPrevious: true })).toBe(false);
    expect(parse({ ...homeFaq, extendsBehindPrevious: false })).toBe(true);
  });

  it('only uses icons and images that exist in src/assets', () => {
    expect(iconKeys).toContain('plus');
    expect(imageKeys).toContain('mascot/fox-laptop');
  });
});

describe('FAQPage structured data', () => {
  it('lists the answered questions of visible FAQ blocks only', () => {
    const sections = page.parse(home).sections;
    expect(visibleFaqItems(sections)).toEqual([{ ...answered, open: true }]);
    const hidden = sections.map((s) => (s.type === 'faq' ? { ...s, hidden: true } : s));
    expect(visibleFaqItems(hidden)).toEqual([]);
  });

  it('builds a FAQPage from question and answer pairs', () => {
    expect(faqPage([{ question: 'Vraag?', answer: 'Antwoord.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Vraag?',
          acceptedAnswer: { '@type': 'Answer', text: 'Antwoord.' },
        },
      ],
    });
    expect(faqPage([])).toBeUndefined();
  });
});

describe('Faq component', () => {
  const render = async (value: unknown) => {
    const container = await AstroContainer.create();
    return container.renderToString(Faq, { props: faqBlock.parse(value) });
  };
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  it('renders a labelled section with the anchor, the pill and the h2', async () => {
    const html = await render(homeFaq);
    expect(html).toMatch(
      /<section id="veelgestelde-vragen" aria-labelledby="veelgestelde-vragen-title"/,
    );
    expect(html).toMatch(/<h2 id="veelgestelde-vragen-title"[^>]*>Veelgestelde vraag<\/h2>/);
    expect(html).toContain('Veelgestelde vragen');
  });

  it('shows only the answered question, as an open native disclosure', async () => {
    const html = await render(homeFaq);
    expect(count(html, /<details /g)).toBe(1);
    expect(count(html, /<summary /g)).toBe(1);
    expect(html).toMatch(/<details [^>]*\sopen[\s>=]/);
    expect(html).toContain(answered.question);
    expect(html).toContain(answered.answer!);
    expect(html).toContain(site.faq.answerLabel);
    for (const item of homeFaq.items.filter((i) => i.answer === null)) {
      expect(html).not.toContain(item.question);
    }
    expect(html).toMatch(/<ul role="list"[^>]*data-reveal-stagger/);
    // Questions are not headings: the only headings are the h2 and the contact card h3.
    expect(count(html, /<h[1-6] /g)).toBe(2);
  });

  it('renders closed items without the open attribute', async () => {
    const html = await render(productFaq);
    expect(count(html, /<details /g)).toBe(1);
    expect(html).not.toMatch(/<details [^>]*\sopen[\s>=]/);
  });

  it('shows the contact card: h3, mailto button with a hidden hint, decorative lazy fox', async () => {
    const html = await render(homeFaq);
    expect(html).toMatch(/<h3 [^>]*>Heb je nog een vraag\?<\/h3>/);
    expect(site.faq.contact.title).toBe('Heb je nog een vraag?');
    expect(html).toContain(site.faq.contact.body);
    expect(html).toContain(`href="mailto:${site.contact.email.value}"`);
    expect(html).toMatch(
      new RegExp(
        `${site.faq.contact.cta}<span class="sr-only"[^>]*> \\(opent je e-mailprogramma\\)`,
      ),
    );
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toMatch(/<img [^>]*\balt(="")?[ >]/);
    expect(html).toMatch(/<img [^>]*loading="lazy"/);
  });

  it('takes contact card fields from the block over site.json', async () => {
    const html = await render({ ...productFaq, contact: { title: 'Nog iets?' } });
    expect(html).toMatch(/<h3 [^>]*>Nog iets\?<\/h3>/);
    expect(html).toContain(site.faq.contact.body);
  });

  it('pulls the home panel up behind the previous block; the white variant has no panel', async () => {
    const home = await render(homeFaq);
    expect(home).toMatch(/<section [^>]*class="[^"]*\bfaq-behind\b/);
    expect(home).toMatch(/-mt-\(--faq-overlap\)/);
    expect(home).toContain('from-lavender-100/40');
    const product = await render(productFaq);
    expect(product).not.toContain('faq-behind');
    expect(product).not.toContain('from-lavender-100/40');
    expect(product).toContain('bg-lavender-50');
  });
});
