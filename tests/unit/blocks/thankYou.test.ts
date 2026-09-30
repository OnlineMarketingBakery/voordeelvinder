import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';

import thanksPage from '../../../src/content/pages/bedankt.json' with { type: 'json' };
import site from '../../../src/content/site.json' with { type: 'json' };
import { visibleCopy } from '../../../src/lib/copy';
import { thankYouBlock } from '../../../src/schemas/blocks/thankYou';
import { page } from '../../../src/schemas/page';

// Loaded through a variable: tsc has no types for .astro modules, while astro check does.
const thankYouComponent = '../../../src/components/sections/ThankYou.astro';
const { default: ThankYou } = (await import(/* @vite-ignore */ thankYouComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

const arrivalComponent = '../../../src/components/sections/parts/FormArrival.astro';
const { default: FormArrival } = (await import(/* @vite-ignore */ arrivalComponent)) as {
  default: Parameters<AstroContainer['renderToString']>[0];
};

const block = thanksPage.sections[0]!;
const parse = (value: unknown) => thankYouBlock.safeParse(value).success;
const render = async (props: Record<string, unknown> = {}) => {
  const container = await AstroContainer.create();
  return container.renderToString(ThankYou, {
    props: { ...thankYouBlock.parse(block), id: 'thankYou-1', ...props },
  });
};

describe('thankYou block', () => {
  it('accepts the thank-you content, also as a whole page', () => {
    expect(parse(block)).toBe(true);
    expect(page.safeParse(thanksPage).success).toBe(true);
  });

  it('is noindex, with a title the site template completes', () => {
    const data = page.parse(thanksPage);
    expect(data.seo.noindex).toBe(true);
    expect(data.seo.title).not.toContain(site.name);
  });

  it('keeps the designed copy, informal and with the claim tagged (CONTENT-TODO 1.12)', () => {
    const data = thankYouBlock.parse(block);
    expect(data.title).toBe('Bedankt! We gaan voor je aan de slag.');
    // Built as designed (row 1.12's default); hiding the sentence is a JSON-only change.
    expect(visibleCopy(data.body)).toBe(
      'We hebben je gegevens goed ontvangen. We vergelijken de mogelijkheden en nemen zo snel mogelijk contact met je op.',
    );
    expect(data.body).toContainEqual(expect.objectContaining({ claim: '1.12', hidden: false }));
    expect(data.cta).toEqual({ label: 'Terug naar de startpagina', href: '/' });
    expect(JSON.stringify(thanksPage)).not.toMatch(/\b(u|uw)\b/i);
  });

  it('rejects unknown keys, missing copy and unknown images', () => {
    expect(parse({ ...block, subtitle: 'x' })).toBe(false);
    expect(parse({ ...block, title: '' })).toBe(false);
    expect(parse({ ...block, image: { src: 'mascot/nope', alt: '' } })).toBe(false);
  });

  it('holds the h1: it opens the page, and can not be hidden', () => {
    const data = page.parse(thanksPage);
    expect(page.safeParse({ ...data, sections: [{ ...block, hidden: true }] }).success).toBe(false);
    expect(page.safeParse({ ...data, sections: [block, block] }).success).toBe(false);
  });

  it('renders one h1 that labels the section, the text and the button home', async () => {
    const html = await render();
    expect(html).toMatch(/<section id="thankYou-1" aria-labelledby="thankYou-1-title"/);
    expect(html.match(/<h[1-6][ >]/g)).toEqual(['<h1 ']);
    expect(html).toContain(block.title);
    expect(html).toContain('We hebben je gegevens goed ontvangen.');
    expect(html).toMatch(/<a href="\/"[^>]*>\s*(<svg[\s\S]*?<\/svg>\s*)?Terug naar de startpagina/);
  });

  it('leaves a hidden claim out', async () => {
    const body = [
      'We hebben je gegevens goed ontvangen.',
      { text: 'We vergelijken de mogelijkheden.', hidden: true, claim: '1.12' },
    ];
    const html = await render({ body });
    expect(html).toContain('We hebben je gegevens goed ontvangen.');
    expect(html).not.toContain('We vergelijken');
  });

  it('marks the card and the badge for the form morph, and the badge for the celebration', async () => {
    const html = await render();
    expect(html.match(/data-morph="form-card"/g)).toHaveLength(1);
    expect(html.match(/data-morph="form-mascot"/g)).toHaveLength(1);
    expect(html).toMatch(/data-morph="form-mascot"[^>]*data-celebration/);
    // Nothing is named in the markup: the <head> script names the card only when the visit
    // comes from a form page (below), so leaving never morphs it back into a form card.
    expect(html).not.toContain('[view-transition-name:form-card]');
    // The arrival check runs in <head> (parts/FormArrival.astro), not after the card.
    expect(html).not.toContain('voordeelvinder:morph');
  });

  describe('names the card form-card only on arrival from a form page', () => {
    type Listener = (event: { viewTransition?: { finished: Promise<void> } }) => void;

    /** Runs the <head> arrival script against a stub page, as if the visit came from `from`. */
    async function arrive(from: {
      activation?: string | null;
      referrer?: string;
      marker?: string;
    }) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(FormArrival);
      const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
      if (!script) throw new Error('no inline script in FormArrival');
      const classes = new Set<string>();
      const listeners: Record<string, Listener[]> = {};
      const origin = 'https://voordeelvinder.test';
      const stored = new Map<string, string>(
        from.marker === undefined ? [] : [['voordeelvinder:morph', from.marker]],
      );
      const window = {
        location: { origin },
        document: {
          referrer: from.referrer ?? '',
          documentElement: {
            classList: {
              add: (name: string) => classes.add(name),
              remove: (name: string) => classes.delete(name),
            },
          },
        },
        sessionStorage: {
          getItem: (key: string) => stored.get(key) ?? null,
          removeItem: (key: string) => stored.delete(key),
        },
        navigation:
          from.activation === undefined
            ? undefined
            : { activation: { from: from.activation === null ? null : { url: from.activation } } },
        addEventListener: (type: string, listener: Listener) => {
          (listeners[type] ??= []).push(listener);
        },
      };
      new Function('window', script)(window);
      // global.css names the card while <html> has `from-form`.
      const name = () => (classes.has('from-form') ? 'form-card' : 'none');
      const fire = (type: string, event: Parameters<Listener>[0] = {}) =>
        (listeners[type] ?? []).forEach((listener) => listener(event));
      return { name, fire, origin, stored };
    }

    it('from /vergelijken/<product> or /vergelijken, until the page is shown', async () => {
      for (const path of ['/vergelijken/energie', '/vergelijken', '/vergelijken/']) {
        const page = await arrive({ activation: `https://voordeelvinder.test${path}?x=1` });
        expect(page.name(), path).toBe('form-card');
        let finish = () => {};
        const finished = new Promise<void>((resolve) => (finish = resolve));
        page.fire('pagereveal', { viewTransition: { finished } });
        expect(page.name()).toBe('form-card');
        finish();
        await finished;
        await Promise.resolve();
        expect(page.name()).toBe('none');
      }
    });

    it('cleared when leaving, also when the reveal was missed', async () => {
      const page = await arrive({ activation: 'https://voordeelvinder.test/vergelijken/energie' });
      page.fire('pageswap');
      expect(page.name()).toBe('none');
    });

    it('cleared at once when the page is shown without a transition', async () => {
      const page = await arrive({ activation: 'https://voordeelvinder.test/vergelijken' });
      page.fire('pagereveal');
      expect(page.name()).toBe('none');
    });

    it("uses the form's one-time marker when the browser gives no source, and removes it", async () => {
      const page = await arrive({ marker: 'form-card' });
      expect(page.name()).toBe('form-card');
      expect(page.stored.has('voordeelvinder:morph')).toBe(false);
      expect((await arrive({ marker: 'something-else' })).name()).toBe('none');
    });

    it('falls back to the referrer without the Navigation API', async () => {
      const page = await arrive({
        referrer: 'https://voordeelvinder.test/vergelijken/zonnepanelen',
      });
      expect(page.name()).toBe('form-card');
    });

    it('never for a direct visit, another page or another site', async () => {
      for (const from of [
        { activation: null },
        {},
        { activation: 'https://voordeelvinder.test/' },
        { activation: 'https://voordeelvinder.test/bedankt/energie' },
        { activation: 'https://voordeelvinder.test/vergelijken/energie/extra' },
        { activation: 'https://example.com/vergelijken/energie' },
        { referrer: 'not a url' },
      ]) {
        const page = await arrive(from);
        expect(page.name(), JSON.stringify(from)).toBe('none');
      }
    });
  });

  it('draws the decorative fox twice (circle and head), from one srcset', async () => {
    const html = await render();
    const imgs = html.match(/<img [^>]*>/g) ?? [];
    expect(imgs).toHaveLength(2);
    for (const img of imgs) expect(img).toMatch(/\balt(="")?[\s>]/);
    const srcsets = html.match(/<source [^>]*srcset="([^"]+)"/g) ?? [];
    expect(srcsets.length).toBeGreaterThan(0);
    expect(new Set(srcsets).size).toBe(srcsets.length / 2);
    expect(html).toContain('clip-path:ellipse(');
    expect(html).toContain('clip-path:inset(');
  });

  it('leaves no copy placeholder unfilled', async () => {
    const html = await render();
    expect(html).not.toMatch(/\{[a-z_]+\}/);
  });

  describe('the celebration script (src/scripts/celebrate.ts)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it('never reads the stored form session and writes nothing personal', async () => {
      const reads: string[] = [];
      const storage = {
        length: 0,
        getItem: (key: string) => (reads.push(key), null),
        key: (index: number) => (reads.push(`#${index}`), null),
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      };
      vi.stubGlobal('sessionStorage', storage);
      vi.stubGlobal('localStorage', storage);
      const writes: [string, string][] = [];
      const badge = { setAttribute: (name: string, value: string) => writes.push([name, value]) };
      vi.stubGlobal('document', { querySelectorAll: () => [badge] });
      vi.resetModules();
      await import('../../../src/scripts/celebrate');
      // Phase 4 reads nothing; Phase 5 may read the lead-safe flag, never a form session.
      expect(reads.filter((key) => !key.startsWith('voordeelvinder:lead-safe'))).toEqual([]);
      // It only switches the celebration on.
      expect(writes).toEqual([['data-celebrate', '']]);
    });
  });
});
