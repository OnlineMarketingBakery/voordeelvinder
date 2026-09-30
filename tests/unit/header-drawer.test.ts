// The mobile menu drawer's markup (src/components/site/Header.astro): a dialog named by its
// eyebrow, the button that opens it, copy from site.json, numbers and decor hidden from screen
// readers, the lazy fox, and every text on the panel AA. Its behaviour in the browser (focus,
// Escape, the scroll lock, motion) is in tests/e2e/site-chrome.spec.ts.
import { readFileSync } from 'node:fs';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';

import site from '../../src/content/site.json' with { type: 'json' };
import { contrastRatio, parseColor } from '../../src/lib/design/contrast';
import { tokenValue } from '../../src/lib/design/tokens';

// The content layer isn't available in Vitest: site.json as the entry, and the blog posts that
// decide whether "Blogs" shows (none, unless a test adds one).
const content = vi.hoisted(() => ({ posts: [] as unknown[] }));
vi.mock('astro:content', async () => {
  const { default: data } = await import('../../src/content/site.json');
  return {
    getEntry: async () => ({ id: 'site', collection: 'site', data }),
    getCollection: async () => content.posts,
  };
});

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const headerComponent = '../../src/components/site/Header.astro';
const { default: Header } = (await import(/* @vite-ignore */ headerComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const source = readFileSync(
  new URL('../../src/components/site/Header.astro', import.meta.url),
  'utf8',
);
const color = (name: string) => tokenValue(css, `--color-${name}`);

const render = async (props: Record<string, unknown> = {}, path = '/') => {
  const container = await AstroContainer.create();
  return container.renderToString(Header, {
    props,
    request: new Request(new URL(path, 'http://localhost')),
  });
};

/** The element that starts at `start`, up to its matching end tag. */
function elementAt(html: string, start: number): string {
  const tag = /^<([a-z][a-z0-9-]*)/i.exec(html.slice(start))?.[1];
  if (!tag) throw new Error(`no element at ${start}`);
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    if (match[1]) depth -= 1;
    else if (!match[2]) depth += 1;
    if (depth === 0) return html.slice(start, match.index + match[0].length);
  }
  throw new Error(`<${tag}> at ${start} is not closed`);
}

const drawerOf = (html: string) => elementAt(html, html.indexOf('<dialog'));
const hiddenElements = (html: string) =>
  [...html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*\saria-hidden="true"[^>]*>/gi)].map((match) =>
    elementAt(html, match.index),
  );
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);
const visibleNav = site.header.nav.filter((link) => !('requires' in link));

describe('header: the mobile menu drawer', () => {
  it('has a button that opens a dialog, hidden until the script runs', async () => {
    const html = await render();
    const button = /<button\b[^>]*data-menu-button[^>]*>/.exec(html)?.[0] ?? '';
    expect(button).toContain('aria-haspopup="dialog"');
    expect(button).toContain('aria-controls="mobile-menu"');
    expect(button).toContain('aria-expanded="false"');
    expect(button).toMatch(/\shidden[\s>]/);
    expect(elementAt(html, html.indexOf(button))).toContain(site.header.menuLabel);
  });

  it('is one dialog, named by its eyebrow', async () => {
    const html = await render();
    expect(html.match(/<dialog\b/g)).toHaveLength(1);
    const dialog = /<dialog\b[^>]*>/.exec(html)?.[0] ?? '';
    expect(dialog).toContain('id="mobile-menu"');
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(dialog)?.[1];
    expect(labelledBy).toBeTruthy();
    const eyebrow = new RegExp(`<p\\b[^>]*id="${labelledBy}"[^>]*>\\s*([^<]*?)\\s*</p>`).exec(html);
    expect(eyebrow?.[1]).toBe(site.header.menuLabel);
  });

  it('names the close button from site.json', async () => {
    const drawer = drawerOf(await render());
    const start = drawer.search(/<button\b[^>]*data-menu-close/);
    expect(start).toBeGreaterThan(-1);
    const button = elementAt(drawer, start);
    expect(button).toMatch(new RegExp(`class="sr-only"[^>]*>\\s*${site.header.closeLabel}\\s*<`));
    // Its X is drawn, not text.
    expect(button.replace(/<[^>]+>/g, '').trim()).toBe(site.header.closeLabel);
  });

  it('lists every visible link in its own navigation, in order, then the CTA', async () => {
    const drawer = drawerOf(await render());
    const start = drawer.indexOf(`<nav aria-label="${site.header.navLabel}"`);
    expect(start).toBeGreaterThan(-1);
    const nav = elementAt(drawer, start);
    expect(hrefs(nav)).toEqual(visibleNav.map((link) => link.href));
    // A link's text is its label only: the number and the arrow are not read out.
    for (const link of visibleNav) {
      const start = nav.search(new RegExp(`<a\\b[^>]*\\shref="${link.href}"`));
      const readable = elementAt(nav, start)
        .replace(/<([a-z]+)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      expect(readable).toBe(link.label);
    }
    expect(hrefs(drawer).at(-1)).toBe(site.header.cta.href);
    expect(drawer).toContain(site.header.cta.label);
  });

  it('keeps a campaign’s own form link on the drawer’s CTA', async () => {
    const drawer = drawerOf(await render({ ctaHref: '/vergelijken/zonnepanelen' }));
    expect(hrefs(drawer).at(-1)).toBe('/vergelijken/zonnepanelen');
  });

  it('numbers the links with CSS counters: no digits in the markup', async () => {
    const drawer = drawerOf(await render());
    const numbers = [...drawer.matchAll(/<span\b[^>]*class="[^"]*\bmenu-index\b[^"]*"[^>]*>/g)];
    expect(numbers).toHaveLength(visibleNav.length);
    for (const match of numbers) {
      const element = elementAt(drawer, match.index);
      expect(element).toContain('aria-hidden="true"');
      expect(element.replace(/<[^>]+>/g, '')).toBe('');
    }
    expect(source).toContain('content: counter(menu-row, decimal-leading-zero)');
  });

  it('hides nothing focusable from screen readers', async () => {
    const hidden = hiddenElements(await render());
    expect(hidden.length).toBeGreaterThan(0);
    for (const element of hidden) {
      expect(element).not.toMatch(/<(a|button|input|select|textarea)\b|\stabindex=/);
    }
  });

  it('shows the waving fox as decoration, fetched only once the drawer shows', async () => {
    const drawer = drawerOf(await render());
    const img = /<img\b[^>]*fox-waving[^>]*>/.exec(drawer)?.[0] ?? '';
    // Astro writes an empty alt as a bare `alt`.
    expect(img).toMatch(/\salt(="")?[\s>]/);
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('decoding="async"');
    const decor = hiddenElements(drawer).find((element) => element.includes('fox-waving'));
    expect(decor).toBeDefined();
  });

  it('marks the current section in the drawer too (Blogs on a post)', async () => {
    content.posts = [
      {
        id: 'eerste',
        collection: 'blog',
        data: {
          title: 'Eerste',
          excerpt: 'Een bericht.',
          date: new Date('2026-09-29'),
          featured: false,
          draft: false,
          placeholder: false,
        },
      },
    ];
    try {
      const drawer = drawerOf(await render({}, '/blog/eerste/'));
      const blogs = site.header.nav.find((link) => link.requires === 'blogPosts');
      expect(blogs).toBeDefined();
      expect(hrefs(drawer)).toContain(blogs!.href);
      expect(drawer).toMatch(new RegExp(`href="${blogs!.href}"[^>]*aria-current="true"`));
    } finally {
      content.posts = [];
    }
  });

  it('keeps every text on the panel AA, also on its brightest light', () => {
    const alpha = Number(
      /radial-gradient\([^;]*?rgb\(255 255 255 \/ ([\d.]+)\)/.exec(source)?.[1] ?? NaN,
    );
    expect(alpha).toBeGreaterThan(0);
    const [r, g, b] = parseColor(color('purple-600'));
    const lit = `rgb(${[r, g, b].map((c) => Math.round(c + (255 - c) * alpha)).join(' ')})`;
    // White: the eyebrow (small text), the labels, the close button's X.
    expect(contrastRatio(color('white'), color('purple-600'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color('white'), lit)).toBeGreaterThanOrEqual(4.5);
    // Lime: the current page's label, title-lg (24px, large text): 3:1.
    expect(tokenValue(css, '--text-title-lg')).toBe('1.5rem');
    expect(contrastRatio(color('lime-300'), color('purple-600'))).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(color('lime-300'), lit)).toBeGreaterThanOrEqual(3);
  });
});
