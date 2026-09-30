import { describe, expect, it } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import { isLinkVisible, placeholderProblems, type Site, withYear } from '../../src/lib/site';

const data = site as unknown as Site;

describe('site helpers', () => {
  it('hides links whose content does not exist yet', () => {
    const blog = data.header.nav.find((link) => link.requires === 'blogPosts');
    expect(blog).toBeDefined();
    expect(isLinkVisible(blog!, { blogPosts: false })).toBe(false);
    expect(isLinkVisible(blog!, { blogPosts: true })).toBe(true);
    expect(isLinkVisible(data.header.nav[0]!, { blogPosts: false })).toBe(true);
  });

  it('reports the placeholder contact details (they must not reach production)', () => {
    expect(placeholderProblems(data)).toEqual([
      'contact.email is a placeholder',
      'contact.phone is a placeholder',
    ]);
    const real = {
      ...data,
      contact: {
        email: { value: 'info@voordeelvinder.be', todo: false },
        phone: { display: '09 300 12 34', e164: '+3293001234', todo: false },
      },
    };
    expect(placeholderProblems(real)).toEqual([]);
  });

  it('fills in the copyright year', () => {
    expect(withYear('© {year} VoordeelVinder.be', 2027)).toBe('© 2027 VoordeelVinder.be');
  });

  it('uses "je", never "u", in site-wide copy', () => {
    const copy = JSON.stringify(data);
    expect(copy).not.toMatch(/\b(uw|u)\b/i);
  });
});
