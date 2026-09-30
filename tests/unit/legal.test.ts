import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import { legalPlaceholderProblems, missingLegalPages, tocItems } from '../../src/lib/legal';
import { legalCopy, legalFrontmatter } from '../../src/schemas/legal';

const dir = new URL('../../src/content/legal/', import.meta.url);
const files = readdirSync(dir).filter((file) => file.endsWith('.md'));
const pages = files.map((file) => {
  const source = readFileSync(new URL(file, dir), 'utf8');
  const [, head = '', body = ''] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  return { id: file.replace(/\.md$/, ''), head, body };
});

describe('legal pages', () => {
  it('exist for exactly the footer links', () => {
    const hrefs = site.footer.legal.items.map((item) => item.href).sort();
    expect(pages.map((page) => `/${page.id}`).sort()).toEqual(hrefs);
    expect(
      missingLegalPages(
        hrefs,
        pages.map((p) => ({ ...p, data: { placeholder: true } })),
      ),
    ).toEqual([]);
    expect(missingLegalPages(['/disclaimer'], [])).toEqual(['/disclaimer']);
  });

  it('are neutral placeholders until the lawyer’s text arrives (CONTENT-TODO 3.1, 3.2)', () => {
    for (const page of pages) {
      expect(page.head, page.id).toMatch(/^placeholder: true$/m);
      // No legal statements: no headings, one short paragraph.
      expect(page.body.trim(), page.id).toBe('Deze tekst volgt binnenkort.');
    }
  });

  it('report placeholders, so a production build fails on them', () => {
    expect(
      legalPlaceholderProblems([{ id: 'privacybeleid', data: { placeholder: true } }]),
    ).toEqual(['legal/privacybeleid.md is placeholder text']);
    expect(
      legalPlaceholderProblems([{ id: 'privacybeleid', data: { placeholder: false } }]),
    ).toEqual([]);
  });
});

describe('legal frontmatter', () => {
  const valid = { title: 'Privacybeleid', seo: { description: 'Hoe we met je gegevens omgaan.' } };

  it('is a placeholder unless it says otherwise', () => {
    expect(legalFrontmatter.parse(valid).placeholder).toBe(true);
    expect(legalFrontmatter.parse({ ...valid, placeholder: false }).placeholder).toBe(false);
    expect(legalFrontmatter.parse({ ...valid, lastUpdated: '2026-09-30' }).lastUpdated).toEqual(
      new Date('2026-09-30'),
    );
  });

  it('rejects unknown keys and a missing description', () => {
    expect(legalFrontmatter.safeParse({ ...valid, draft: true }).success).toBe(false);
    expect(legalFrontmatter.safeParse({ ...valid, seo: {} }).success).toBe(false);
    expect(legalFrontmatter.safeParse({ seo: valid.seo }).success).toBe(false);
  });

  it('has its interface copy in site.json', () => {
    const copy = legalCopy.parse(site.legal);
    expect(copy.tocLabel).toBe('Inhoudsopgave');
    expect(legalCopy.safeParse({ ...site.legal, lastUpdated: 'Bijgewerkt' }).success).toBe(false);
  });
});

describe('table of contents', () => {
  it('lists the ## headings in order', () => {
    const headings = [
      { depth: 2, slug: 'wie-zijn-wij', text: 'Wie zijn wij' },
      { depth: 3, slug: 'onze-dienst-omvat', text: 'Onze dienst omvat:' },
      { depth: 2, slug: 'toepasselijk-recht', text: 'Toepasselijk recht' },
    ];
    expect(tocItems(headings)).toEqual([
      { id: 'wie-zijn-wij', text: 'Wie zijn wij' },
      { id: 'toepasselijk-recht', text: 'Toepasselijk recht' },
    ]);
  });
});
