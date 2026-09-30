import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import thuisbatterij from '../../src/content/pages/thuisbatterij.json' with { type: 'json' };
import zonnepanelen from '../../src/content/pages/zonnepanelen.json' with { type: 'json' };
import site from '../../src/content/site.json' with { type: 'json' };
import type { Section } from '../../src/schemas/page';

// The JSON imports type every block as one loose union; read them with their schema type.
const PAGES = [
  { path: '/zonnepanelen', content: zonnepanelen },
  { path: '/thuisbatterij', content: thuisbatterij },
].map(({ path, content }) => {
  const sections = content.sections as unknown as Section[];
  const hero = sections.find((s) => s.type === 'hero') as Extract<Section, { type: 'hero' }>;
  return { path, seo: content.seo, sections, hero };
});

for (const { path, seo, sections, hero } of PAGES) {
  // "\n" in the title is a line break on screen and a space in the accessible text.
  const heroTitle = hero.title.replaceAll('\n', ' ');

  test.describe(path, () => {
    test('renders one h1 with the hero title, the page title and the CTA to its form', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(path);

      await expect(page).toHaveTitle(site.seo.titleTemplate.replace('{title}', seo.title));
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        seo.description,
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heroTitle);
      const section = page.getByRole('region', { name: heroTitle });
      const cta = section.getByRole('link', { name: hero.cta.label });
      await expect(cta).toHaveAttribute('href', hero.cta.href);
      await expect(cta).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('shows one h2 per visible section, in order', async ({ page }) => {
      await page.goto(path);
      const expected = sections
        .filter((s) => s.type !== 'hero' && !s.hidden && 'title' in s)
        .map((s) => (s as { title: string }).title);
      await expect(page.locator('main h2')).toHaveText(expected);
    });

    test('has the in-page anchors for "Hoe het werkt" and the FAQ', async ({ page }) => {
      await page.goto(path);
      for (const id of ['hoe-het-werkt', 'veelgestelde-vragen']) {
        await expect(page.locator(`main [id="${id}"]`), `#${id}`).toHaveCount(1);
      }
    });

    test('publishes FAQPage structured data for exactly the questions it shows', async ({
      page,
    }) => {
      await page.goto(path);
      const blocks = (
        await page.locator('script[type="application/ld+json"]').allTextContents()
      ).map(
        (text) =>
          JSON.parse(text) as {
            '@type': string;
            mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }>;
          },
      );
      expect(blocks.map((block) => block['@type'])).toEqual(['FAQPage']);

      const faq = sections.find((s) => s.type === 'faq') as Extract<Section, { type: 'faq' }>;
      const answered = faq.items.filter((item) => item.answer !== null);
      const shown = await page.locator('#veelgestelde-vragen summary').allTextContents();
      expect(shown.map((text) => text.trim())).toEqual(answered.map((item) => item.question));
      expect(blocks[0]!.mainEntity!.map((question) => question.name)).toEqual(
        answered.map((item) => item.question),
      );
      expect(blocks[0]!.mainEntity!.map((question) => question.acceptedAnswer.text)).toEqual(
        answered.map((item) => item.answer),
      );
    });

    test('ends with the CTA band over the top of the footer', async ({ page, isMobile }) => {
      test.skip(isMobile, 'the designed overlap is measured at desktop width');
      await page.goto(path);
      const { overlap, onTop } = await page.evaluate(() => {
        const band = document.querySelector('main > section:last-of-type .cta-band')!;
        const footer = document.querySelector('footer')!;
        band.scrollIntoView({ block: 'center' });
        const bandBox = band.getBoundingClientRect();
        const footerBox = footer.getBoundingClientRect();
        // Inside the overlap, 40 px below the footer's top edge (the rings ignore the pointer).
        const hit = document.elementFromPoint(bandBox.x + bandBox.width / 2, footerBox.y + 40);
        return {
          overlap: Math.round(bandBox.bottom - footerBox.top),
          onTop: Boolean(hit?.closest('.cta-band')),
        };
      });
      // Figma 81:3582 / 81:3830: the band reaches 81 px into the footer, painted above it.
      expect(overlap).toBe(81);
      expect(onTop).toBe(true);
    });

    test('has no horizontal scroll at 390 px', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    test('has no serious accessibility violations', async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  });
}
