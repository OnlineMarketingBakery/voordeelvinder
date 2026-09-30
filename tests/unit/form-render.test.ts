// The form island's server render (brief §6.1: the first step is rendered on the server) and
// every step of every real flow rendered through StepView: each field type renders, with real
// inputs, labels and the ARIA links of brief §7.6. The browser behaviour is in
// tests/e2e/form.spec.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FormIsland, { type FormIslandProps } from '../../src/components/form/FormIsland';
import { StepView } from '../../src/components/form/StepView';
import { visibleFields } from '../../src/lib/flow/engine';
import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowCopyFile, flowFile, sharedStepsFile, type Flow } from '../../src/lib/flow/schema';
import type { Answers, Product } from '../../src/lib/flow/types';
import { formIconKeys } from '../../src/lib/form/labels';
import type { FormPanel } from '../../src/lib/form/types';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON from the content files */

const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const read = (name: string): any => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));
const shared = sharedStepsFile.parse(read('_shared.json'));
const real = (name: Product): Flow => resolveFlow(flowFile.parse(read(`${name}.json`)), shared);
const flows = {
  energie: real('energie'),
  zonnepanelen: real('zonnepanelen'),
  thuisbatterij: real('thuisbatterij'),
};
const { panel, pages: _pages, ...copy } = flowCopyFile.parse(read('_copy.json'));
const icons = Object.fromEntries(formIconKeys(flows).map((key) => [key, `/_astro/${key}.svg`]));
const image = { src: '/fox.webp', width: 941, height: 842, sizes: '80px', sources: [] };
const panels = Object.fromEntries(
  (Object.keys(flows) as Product[]).map((key): [Product, FormPanel] => [
    key,
    { title: panel[key].title, body: panel[key].body, image },
  ]),
);

function island(overrides: Partial<FormIslandProps>): string {
  const props: FormIslandProps = {
    entry: 'vergelijken',
    flows,
    product: 'energie',
    preselected: false,
    copy,
    icons,
    panels,
    flag: { src: '/be.png', width: 96, height: 66 },
    backHref: '/',
    ...overrides,
  };
  return renderToStaticMarkup(createElement(FormIsland, props));
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('form island: server render', () => {
  it('/vergelijken renders step 1 with the product cards as radios', () => {
    const html = island({});
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(text(html)).toContain(panel.energie.title);
    expect(text(html)).toContain('Stap 1 van 10');
    expect(html).toContain('<h2 id="formulier-stap-titel" tabindex="-1"');
    expect(html.match(/type="radio"/g)).toHaveLength(5);
    expect(html).toContain(
      'role="radiogroup" id="veld-product_choice" aria-labelledby="formulier-stap-titel"',
    );
    expect(html).toContain('aria-required="true"');
    expect(html).toMatch(/<form novalidate=""/i);
    expect(text(html)).toContain(`${copy.buttons.back} ${copy.buttons.next}`);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-morph="form-card"');
    // The icons are masks of the resolved files, never Figma URLs.
    expect(html).toContain('mask-image:url(&quot;/_astro/renewable-energy.svg&quot;)');
  });

  it('/vergelijken/energie renders the energy-only step', () => {
    const html = island({ entry: 'energie', flows: { energie: flows.energie }, preselected: true });
    expect(text(html)).toContain('Wat wil je vergelijken?');
    expect(text(html)).toContain('Stap 1 van 10');
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(text(html)).not.toContain('Zonnepanelen');
  });

  it('/vergelijken/zonnepanelen starts at the postcode, with its own panel', () => {
    const html = island({
      entry: 'zonnepanelen',
      flows: { zonnepanelen: flows.zonnepanelen },
      product: 'zonnepanelen',
      preselected: true,
      backHref: '/zonnepanelen',
    });
    expect(text(html)).toContain('Wat is je postcode?');
    expect(text(html)).toContain(panel.zonnepanelen.title);
    expect(html).toContain('aria-labelledby="formulier-stap-titel"');
    expect(html).toMatch(/inputmode="numeric"/i);
  });
});

const sample: Answers = {
  product_choice: 'both',
  energy_type: 'both',
  is_business: true,
  knows_consumption: 'yes',
  has_solar: 'yes',
};

describe('form island: every step of every flow renders', () => {
  for (const [product, flow] of Object.entries(flows)) {
    for (const step of flow.steps) {
      it(`${product}: ${step.id}`, () => {
        const fields = visibleFields(flow, step.id, sample, { preselected: false });
        const errors = Object.fromEntries(fields.map((field) => [field.id, 'Fout.']));
        const html = renderToStaticMarkup(
          createElement(StepView, {
            step,
            fields: fields.length > 0 ? fields : step.fields,
            answers: sample,
            errors,
            warnings: {},
            suggestions: { email: 'jan@gmail.com' },
            onChange: () => {},
            onBlur: () => {},
            onApplySuggestion: () => {},
            icons,
            flag: { src: '/be.png', width: 96, height: 66 },
            copy,
            headingRef: null,
          }),
        );
        expect(html).toContain(`>${step.title}</h2>`);
        for (const field of fields) {
          // Every error is linked to its control or group.
          expect(html).toContain(`id="veld-${field.id}-fout"`);
          expect(html).toMatch(new RegExp(`aria-describedby="[^"]*veld-${field.id}-fout`));
          switch (field.type) {
            case 'single_choice':
            case 'yes_no':
            case 'day_slot':
              expect(html).toContain('role="radiogroup"');
              expect(html).toContain('type="radio"');
              break;
            case 'select':
              expect(html).toContain(`<select id="veld-${field.id}"`);
              break;
            case 'checkbox':
            case 'consent':
              expect(html).toContain(`type="checkbox" id="veld-${field.id}"`);
              break;
            default:
              expect(html).toMatch(new RegExp(`<input id="veld-${field.id}"`));
          }
          if (field.type === 'phone') expect(text(html)).toContain(copy.phonePrefix);
          if (field.type === 'email') expect(text(html)).toContain('Bedoel je jan@gmail.com?');
          if (field.type === 'consent') {
            expect(html).toContain('href="/algemene-voorwaarden"');
            expect(html).toContain('href="/privacybeleid"');
          }
          if (field.type === 'number') expect(text(html)).toContain(field.unit);
        }
      });
    }
  }
});
