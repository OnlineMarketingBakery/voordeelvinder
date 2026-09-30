import type { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import home from '../../../src/content/pages/home.json' with { type: 'json' };
import { comparisonTableBlock } from '../../../src/schemas/blocks/comparisonTable';
import { page, section } from '../../../src/schemas/page';

const found = home.sections.find((s) => s.type === 'comparisonTable');
if (!found) throw new Error('home.json has no comparisonTable block');
const block = found as unknown as z.input<typeof comparisonTableBlock>;

const parse = (value: unknown) => comparisonTableBlock.safeParse(value);
const row = { label: 'Nieuwe rij', others: 'Nee', us: 'Ja' };

describe('comparisonTable block', () => {
  it('accepts the homepage content, also through the section union and the page', () => {
    expect(parse(block).success).toBe(true);
    expect(section.safeParse(block).success).toBe(true);
    expect(page.safeParse(home).success).toBe(true);
  });

  it('has the designed homepage table: six rows on the clouds background', () => {
    const data = comparisonTableBlock.parse(block);
    expect(data.rows).toHaveLength(6);
    expect(data.background).toBe('clouds');
    expect(data.columns).toEqual({
      feature: 'Kenmerk',
      others: 'Andere vergelijkers',
      us: 'VoordeelVinder',
    });
  });

  it('defaults the background to clouds', () => {
    const { background: _background, ...rest } = block;
    const data = comparisonTableBlock.parse(rest);
    expect(data.background).toBe('clouds');
    expect(comparisonTableBlock.parse({ ...block, background: 'none' }).background).toBe('none');
  });

  it('accepts an optional anchor id, hidden flag and intro with hidden claim sentences', () => {
    const intro = [
      'Er zijn veel vergelijkingssites.',
      { text: 'Dat doen wij niet.', hidden: true, claim: '1.3' },
    ];
    expect(parse({ ...block, id: 'vergelijking', hidden: true, intro }).success).toBe(true);
    const { intro: _intro, ...withoutIntro } = block;
    expect(parse(withoutIntro).success).toBe(true);
  });

  it('rejects unknown keys at every level', () => {
    expect(parse({ ...block, subtitle: 'x' }).success).toBe(false);
    expect(parse({ ...block, columns: { ...block.columns, extra: 'x' } }).success).toBe(false);
    expect(parse({ ...block, rows: [{ ...row, note: 'x' }] }).success).toBe(false);
  });

  it('rejects missing or bad values', () => {
    const { caption: _caption, ...withoutCaption } = block;
    expect(parse(withoutCaption).success).toBe(false);
    const { eyebrow: _eyebrow, ...withoutEyebrow } = block;
    expect(parse(withoutEyebrow).success).toBe(false);
    expect(parse({ ...block, eyebrow: { label: block.eyebrow } }).success).toBe(false);
    expect(parse({ ...block, title: '' }).success).toBe(false);
    expect(parse({ ...block, background: 'stars' }).success).toBe(false);
    expect(parse({ ...block, id: 'Vergelijking Tabel' }).success).toBe(false);
    expect(parse({ ...block, rows: [{ ...row, us: '' }] }).success).toBe(false);
    const { us: _us, ...rowWithoutUs } = row;
    expect(parse({ ...block, rows: [rowWithoutUs] }).success).toBe(false);
  });

  it('needs 1 to 8 rows', () => {
    expect(parse({ ...block, rows: [] }).success).toBe(false);
    expect(parse({ ...block, rows: [row] }).success).toBe(true);
    const eight = Array.from({ length: 8 }, (_, i) => ({ ...row, label: `Rij ${i + 1}` }));
    expect(parse({ ...block, rows: eight }).success).toBe(true);
    expect(parse({ ...block, rows: [...eight, { ...row, label: 'Rij 9' }] }).success).toBe(false);
  });

  it('rejects a row label that appears twice (case and spacing ignored)', () => {
    const result = parse({
      ...block,
      rows: [row, { ...row, label: ' nieuwe RIJ ', others: 'Vaak' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['rows', 1, 'label']);
  });
});
