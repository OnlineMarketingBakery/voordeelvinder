import { describe, expect, it } from 'vitest';

import { jsonLd, organization, pageTitle, website } from '../../src/lib/seo/structured-data';

const url = new URL('https://voordeelvinder.be/');

describe('structured data', () => {
  it('describes the organisation and the website', () => {
    expect(
      organization({ name: 'VoordeelVinder', url, logo: new URL('/icon-512.png', url) }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'VoordeelVinder',
      url: 'https://voordeelvinder.be/',
      logo: 'https://voordeelvinder.be/icon-512.png',
    });
    expect(website({ name: 'VoordeelVinder', url, inLanguage: 'nl-BE' })).toMatchObject({
      '@type': 'WebSite',
      inLanguage: 'nl-BE',
    });
  });

  it('serialises JSON-LD without letting content close the script tag', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });

  it('builds page titles from the template', () => {
    const template = '{title} | VoordeelVinder';
    expect(pageTitle('Zonnepanelen', 'VoordeelVinder', template)).toBe(
      'Zonnepanelen | VoordeelVinder',
    );
    expect(pageTitle('VoordeelVinder', 'VoordeelVinder', template)).toBe('VoordeelVinder');
  });
});
