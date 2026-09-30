// The form's motion language (docs/MOTION.md): the step change's slide and stagger, the copy of
// the outgoing step, the steps bar (geometry, drag, buttons), the selection pops, the messages,
// the mascot and the CSS spring token. The browser behaviour is in
// tests/e2e/form-experience.spec.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FormIsland from '../../src/components/form/FormIsland';
import { ProgressCard, type ProgressCardProps } from '../../src/components/form/ProgressCard';
import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowCopyFile, flowFile, sharedStepsFile } from '../../src/lib/flow/schema';
import {
  DRAG_THRESHOLD_PX,
  dragIntent,
  dragTarget,
  isGhostAttribute,
  ITEM_SLIDE_PX,
  itemEnterFrames,
  labelShift,
  MASCOT_MS,
  mascotHopFrames,
  mascotNodFrames,
  messageVariants,
  POP_SCALE,
  popVariants,
  segmentAt,
  segmentCentre,
  segmentState,
  springEasing,
  STAGGER_MAX,
  STAGGER_MS,
  staggerDelay,
  TRAVEL,
} from '../../src/lib/form/motion';
import { distance, duration, spring } from '../../src/lib/motion';

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');

describe('step change: the new step and its items', () => {
  it('staggers the items by at most 40 ms each, capped', () => {
    expect(STAGGER_MS).toBeLessThanOrEqual(40);
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(STAGGER_MS);
    expect(staggerDelay(STAGGER_MAX)).toBe(STAGGER_MAX * STAGGER_MS);
    expect(staggerDelay(STAGGER_MAX + 5)).toBe(STAGGER_MAX * STAGGER_MS);
    expect(staggerDelay(-1)).toBe(0);
    // The last item is in by the time the step itself has settled.
    expect(staggerDelay(99) + duration.base).toBeLessThanOrEqual(springEasing(spring).duration);
  });

  it('lets each item trail the step from the side it comes from, and fade in', () => {
    expect(ITEM_SLIDE_PX).toBe(distance[1]);
    expect(itemEnterFrames(TRAVEL.forward)).toEqual([
      { opacity: 0, transform: `translateX(${distance[1]}px)` },
      { opacity: 1, transform: 'none' },
    ]);
    expect(itemEnterFrames(TRAVEL.back)[0]).toEqual({
      opacity: 0,
      transform: `translateX(${-distance[1]}px)`,
    });
  });
});

describe('the copy of the outgoing step', () => {
  it('drops every id, name, label link, ARIA attribute, role, tab stop, link and data hook', () => {
    for (const name of [
      'id',
      'name',
      'for',
      'form',
      'href',
      'role',
      'tabindex',
      'autocomplete',
      'aria-labelledby',
      'aria-describedby',
      'aria-invalid',
      'aria-live',
      'data-field',
      'data-stagger',
      'ID',
    ]) {
      expect(isGhostAttribute(name), name).toBe(true);
    }
  });

  it('keeps what it looks like: classes, styles, values, checked states, images', () => {
    for (const name of ['class', 'style', 'type', 'value', 'checked', 'src', 'd', 'viewBox']) {
      expect(isGhostAttribute(name), name).toBe(false);
    }
  });
});

describe('the steps bar', () => {
  it('fills the steps behind the visitor, half fills the current one', () => {
    expect([0, 1, 2, 3].map((index) => segmentState(index, 2))).toEqual([
      'done',
      'done',
      'current',
      'todo',
    ]);
  });

  it('puts the pill on the centre of a segment: a percentage of the track plus gaps', () => {
    // One segment: the middle.
    expect(segmentCentre(0, 1)).toEqual({ percent: 50, gaps: 0 });
    // Four segments on a 400 px track with 6 px gaps: segments of 95.5 px.
    const width = 400;
    const gap = 6;
    const segment = (width - 3 * gap) / 4;
    for (let index = 0; index < 4; index += 1) {
      const { percent, gaps } = segmentCentre(index, 4);
      const expected = index * (segment + gap) + segment / 2;
      expect((percent / 100) * width + gaps * gap).toBeCloseTo(expected, 3);
    }
  });

  it('finds the segment under the pointer, clamped to the track', () => {
    // 400 px, 4 segments, 6 px gaps: 0–95.5, 101.5–197, 203–298.5, 304.5–400.
    expect(segmentAt(10, 400, 4, 6)).toBe(0);
    expect(segmentAt(97, 400, 4, 6)).toBe(0);
    expect(segmentAt(99, 400, 4, 6)).toBe(1);
    expect(segmentAt(250, 400, 4, 6)).toBe(2);
    expect(segmentAt(399, 400, 4, 6)).toBe(3);
    expect(segmentAt(-50, 400, 4, 6)).toBe(0);
    expect(segmentAt(900, 400, 4, 6)).toBe(3);
    expect(segmentAt(10, 0, 4, 6)).toBe(0);
  });

  it('keeps the label over the track: shifted by its place on the bar', () => {
    expect(labelShift(0, 5)).toBe(0);
    expect(labelShift(2, 5)).toBe(50);
    expect(labelShift(4, 5)).toBe(100);
    expect(labelShift(9, 5)).toBe(100);
    expect(labelShift(0, 1)).toBe(50);
  });

  it('turns a press into a drag only after a sideways move; up or down scrolls', () => {
    expect(DRAG_THRESHOLD_PX).toBe(distance[1]);
    expect(dragIntent(3, 2)).toBe('wait');
    expect(dragIntent(-12, 3)).toBe('drag');
    expect(dragIntent(12, 3)).toBe('drag');
    expect(dragIntent(2, 14)).toBe('scroll');
    expect(dragIntent(-5, -9)).toBe('scroll');
  });

  it('drags back only', () => {
    expect(dragTarget(1, 3)).toBe(1);
    expect(dragTarget(3, 3)).toBe(3);
    expect(dragTarget(7, 3)).toBe(3);
    expect(dragTarget(-2, 3)).toBe(0);
  });

  const path = [
    { id: 'product', title: 'Wat wil je vergelijken?' },
    { id: 'postcode', title: 'Wat is je postcode?' },
    { id: 'supplier', title: 'Wie is je huidige energieleverancier?' },
  ];
  const props: ProgressCardProps = {
    template: 'Stap {step} van {total}',
    steps: path,
    current: 'supplier',
    step: 3,
    total: 10,
    onJump: () => {},
    jumpLabel: ({ title, index }) => `Ga terug naar stap ${index + 1}: ${title}`,
  };
  const render = (overrides: Partial<ProgressCardProps> = {}) =>
    renderToStaticMarkup(createElement(ProgressCard, { ...props, ...overrides }));

  it('makes a button of every finished step, named by jumpLabel; the rest are no buttons', () => {
    const html = render();
    const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(buttons).toEqual([
      'Ga terug naar stap 1: Wat wil je vergelijken?',
      'Ga terug naar stap 2: Wat is je postcode?',
    ]);
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/type="button"/g)).toHaveLength(2);
    // No step title is shown until the visitor points at or drags to a step.
    expect(html).not.toContain('>Wat is je postcode?<');
    expect(render({ current: 'product', step: 1, steps: path.slice(0, 1) })).not.toContain(
      '<button',
    );
  });

  it('keeps "Stap X van Y" as text, and the pill decorative with the step number', () => {
    const html = render();
    expect(html.replace(/<[^>]+>/g, '')).toContain('Stap 3 van 10');
    expect(html).toMatch(
      /<div aria-hidden="true"[^>]*style="translate:calc\(25% \+ var\(--gap\) \* -0\.25\) 0"><div data-steps-pill=""[^>]*><span>3<\/span>/,
    );
    // touch-action pan-y: dragging the pill never blocks scrolling the page.
    expect(html).toMatch(/data-steps-bar=""[^>]*touch-pan-y/);
  });

  it('glows on the last step only', () => {
    expect(render()).toMatch(/shadow-glow-lime[^"]*opacity-0/);
    expect(render({ step: 10, total: 10 })).toMatch(/shadow-glow-lime[^"]*opacity-100/);
  });
});

describe('picks, messages and the mascot', () => {
  it('pops a picked icon tile or checkbox once, and never with reduced motion', () => {
    expect(popVariants(false).on.scale).toEqual([1, POP_SCALE, 1]);
    expect(popVariants(true).on).toEqual({ scale: 1, transition: { duration: 0 } });
    expect(popVariants(false).off.scale).toBe(1);
  });

  it('drops a message in by half of distance[1] and fades it in; reduced: the fade only', () => {
    expect(messageVariants(false).hidden).toEqual({ opacity: 0, y: -distance[1] / 2 });
    expect(messageVariants(false).shown.transition).toMatchObject({ y: spring });
    expect(messageVariants(true).hidden).toEqual({ opacity: 0 });
    expect(messageVariants(true).shown.transition).toEqual({
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1],
    });
  });

  it('moves the mascot within 400 ms, by percentages of the image', () => {
    expect(MASCOT_MS).toBeLessThanOrEqual(400);
    for (const frames of [mascotHopFrames(), mascotNodFrames()]) {
      expect(frames[0]).toMatchObject({ transform: expect.stringMatching(/\(0(deg)?\)/) });
      expect(frames.at(-1)).toMatchObject({ transform: frames[0]!.transform });
    }
    const hop = mascotHopFrames().map((frame) => String(frame.transform));
    expect(hop.some((transform) => /translateY\(-\d+%\)/.test(transform))).toBe(true);
    expect(hop.join(' ')).not.toMatch(/px/);
  });
});

describe('the CSS side of the motion system', () => {
  it('has the spring token as a CSS linear() easing, the same curve as for Motion', () => {
    const value = /--ease-spring:\s*([^;]+);/.exec(css)?.[1]?.replace(/\s+/g, '');
    const { duration: settle, easing } = springEasing(spring);
    expect(value).toBe(easing.replace(/\s+/g, ''));
    expect(css).toContain(`--motion-duration-spring: ${settle}ms;`);
    // Browsers without linear() run it as the ease-out token.
    expect(css).toMatch(
      /@supports not \(transition-timing-function: linear\(0, 1\)\)\s*\{\s*:root\s*\{\s*--ease-spring: var\(--ease-out\);/,
    );
  });

  it('switches every loop and sweep off with reduced motion', () => {
    const start = css.indexOf('@utility sweep');
    const sweep = css.slice(start, css.indexOf('\n}\n', start));
    expect(sweep).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*transition: none;/);
    // The ambient light, the ping and the label only run under motion-safe (the components).
    for (const name of ['form-ambient', 'form-ping', 'form-label-in']) {
      expect(css).toContain(`@keyframes ${name}`);
    }
  });
});

describe('server render of the whole island', () => {
  const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON from the content files
  const read = (name: string): any => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));
  const shared = sharedStepsFile.parse(read('_shared.json'));
  const flows = { energie: resolveFlow(flowFile.parse(read('energie.json')), shared) };
  const { panel, pages: _pages, ...copy } = flowCopyFile.parse(read('_copy.json'));
  const image = { src: '/fox.webp', width: 941, height: 842, sizes: '80px', sources: [] };
  const html = renderToStaticMarkup(
    createElement(FormIsland, {
      entry: 'vergelijken',
      flows,
      product: 'energie',
      preselected: false,
      preselect: {},
      copy,
      icons: {},
      panels: { energie: { title: panel.energie.title, body: panel.energie.body, image } },
      flag: { src: '/be.png', width: 96, height: 66 },
      backHref: '/',
    }),
  );

  it('has an empty, inert layer for the outgoing step, outside the <form>', () => {
    expect(html).toMatch(
      /<\/form><div aria-hidden="true" inert="" class="pointer-events-none absolute inset-0"><\/div><\/section>/,
    );
  });

  it('marks the title and each answer card as stagger items', () => {
    expect(html).toMatch(/<h2 id="formulier-stap-titel" tabindex="-1" data-stagger=""/);
    expect(html.match(/<label data-stagger=""/g)).toHaveLength(5);
  });

  it('has the steps bar copy with {step} and {title} (PROPOSED)', () => {
    expect(copy.progressJump).toBe('Ga terug naar stap {step}: {title}');
    const broken = read('_copy.json');
    broken.progressJump = 'Ga terug';
    expect(flowCopyFile.safeParse(broken).success).toBe(false);
  });
});
