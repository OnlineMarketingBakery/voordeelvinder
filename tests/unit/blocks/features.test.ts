import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { iconKeys } from '../../../src/lib/asset-keys';
import { featureIcons, featuresBlock } from '../../../src/schemas/blocks/features';
import { page } from '../../../src/schemas/page';

const homeFeatures = home.sections.find((section) => section.type === 'features');
if (!homeFeatures) throw new Error('home.json has no features block');

// The solar card design: a hidden claim card and an intro with a hidden sentence (1.7, 1.8).
const solar = {
  type: 'features',
  title: 'Waarom nu overstappen op zonne-energie?',
  intro: [
    'Energieprijzen blijven stijgen.',
    { text: 'Subsidies zijn beschikbaar.', hidden: true, claim: '1.8' },
  ],
  cardStyle: 'solid',
  items: [
    { icon: 'money', tone: 'purple', title: 'Lagere energierekening', body: 'Tekst.' },
    { icon: 'time', tone: 'lime', title: 'Snel', body: 'Tekst.', hidden: true, claim: '1.7' },
    { icon: 'home', tone: 'purple', title: 'Meerwaarde', body: 'Tekst.' },
  ],
};

const item = { icon: 'money', tone: 'purple', title: 'Titel', body: 'Tekst.' };

describe('features block', () => {
  it('accepts the homepage content, inside the page schema too', () => {
    expect(featuresBlock.safeParse(homeFeatures).success).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('carries the #over-ons nav anchor on the homepage, right after the hero', () => {
    expect(home.sections[1]).toMatchObject({
      type: 'features',
      id: 'over-ons',
      cardStyle: 'translucent',
    });
  });

  it('accepts the product-page shape: solid cards, a hidden claim card, hidden sentences', () => {
    expect(featuresBlock.safeParse(solar).success).toBe(true);
  });

  it('rejects unknown keys on the block and on items', () => {
    expect(featuresBlock.safeParse({ ...homeFeatures, subtitle: 'x' }).success).toBe(false);
    const items = [{ ...item, accent: 'lime' }];
    expect(featuresBlock.safeParse({ ...homeFeatures, items }).success).toBe(false);
  });

  it('rejects bad values', () => {
    const bad = [
      { cardStyle: 'glass' },
      { cardStyle: undefined },
      { title: '' },
      { eyebrow: '' },
      { id: 'Over Ons' },
      { items: [{ ...item, icon: 'rocket' }] },
      { items: [{ ...item, tone: 'lavender' }] },
      { items: [{ ...item, claim: 'one-seven' }] },
      { items: [{ ...item, title: '' }] },
    ];
    for (const change of bad) {
      expect(
        featuresBlock.safeParse({ ...homeFeatures, ...change }).success,
        JSON.stringify(change),
      ).toBe(false);
    }
  });

  it('needs 1 to 4 visible cards; hidden cards do not count', () => {
    const cards = (visible: number, hidden = 0) => [
      ...Array.from({ length: visible }, () => item),
      ...Array.from({ length: hidden }, () => ({ ...item, hidden: true })),
    ];
    expect(featuresBlock.safeParse({ ...homeFeatures, items: cards(1) }).success).toBe(true);
    expect(featuresBlock.safeParse({ ...homeFeatures, items: cards(4, 2) }).success).toBe(true);
    expect(featuresBlock.safeParse({ ...homeFeatures, items: [] }).success).toBe(false);
    expect(featuresBlock.safeParse({ ...homeFeatures, items: cards(0, 1) }).success).toBe(false);
    expect(featuresBlock.safeParse({ ...homeFeatures, items: cards(5) }).success).toBe(false);
  });

  it('only offers icons that exist in src/assets/icons', () => {
    expect(iconKeys).toEqual(expect.arrayContaining([...featureIcons]));
  });
});
