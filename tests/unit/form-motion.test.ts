// The form motion's pure parts (brief §6.1, docs/MOTION.md): direction of travel, the
// auto-advance guard, the reduced-motion variants, progress and the product card morph. The
// island's server render is checked for motion that would move at hydration. The browser
// behaviour is in tests/e2e/form-motion.spec.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FormIsland from '../../src/components/form/FormIsland';
import { FormButton } from '../../src/components/form/ui';
import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowCopyFile, flowFile, sharedStepsFile } from '../../src/lib/flow/schema';
import {
  AUTO_ADVANCE_DELAY_MS,
  AUTO_ADVANCE_GUARD_MS,
  animateHeight,
  checkVariants,
  indicatorVariants,
  INSTANT,
  isNewShake,
  pickVia,
  POINTER_PICK_WINDOW_MS,
  progressParts,
  revealVariants,
  SHAKE_PX,
  shakeKeyframes,
  shouldAutoAdvance,
  springEasing,
  pushDistance,
  STEP_SLIDE_PX,
  stepEnterFrames,
  stepExitFrames,
  travelBetween,
  TRAVEL,
  withinAutoAdvanceGuard,
  type AutoAdvanceInput,
} from '../../src/lib/form/motion';
import { FORM_CARD_MORPH, morphDestination, samePage } from '../../src/lib/morph';
import { distance, spring } from '../../src/lib/motion';

describe('direction of travel', () => {
  it('is the sign of the move on the path', () => {
    expect(travelBetween(2, 3)).toBe(TRAVEL.forward);
    expect(travelBetween(3, 2)).toBe(TRAVEL.back);
    expect(travelBetween(4, 4)).toBe(TRAVEL.none);
  });

  it('slides forward steps in from the right and "Terug" from the left, the old one out', () => {
    expect(STEP_SLIDE_PX).toBe(distance[3] * 2);
    expect(stepEnterFrames(TRAVEL.forward, false)).toEqual([
      { transform: `translateX(${STEP_SLIDE_PX}px)` },
      { transform: 'none' },
    ]);
    expect(stepEnterFrames(TRAVEL.back, false)?.[0]).toEqual({
      transform: `translateX(${-STEP_SLIDE_PX}px)`,
    });
    // A restore after hydration doesn't move.
    expect(stepEnterFrames(TRAVEL.none, false)).toBeNull();
    // The outgoing step leaves the other way, from where it is on screen.
    expect(stepExitFrames(TRAVEL.forward)).toEqual([
      { transform: 'none' },
      { transform: `translateX(${-STEP_SLIDE_PX}px)` },
    ]);
    expect(stepExitFrames(TRAVEL.back, 'matrix(1, 0, 0, 1, 12, 0)')).toEqual([
      { transform: 'matrix(1, 0, 0, 1, 12, 0)' },
      { transform: `translateX(${STEP_SLIDE_PX}px)` },
    ]);
  });

  it('pushes the steps across the whole form card, so they never overlap', () => {
    expect(pushDistance(612.4)).toBe(612);
    // Not measured (no card): the short slide.
    expect(pushDistance(undefined)).toBe(STEP_SLIDE_PX);
    expect(pushDistance(0)).toBe(STEP_SLIDE_PX);
    expect(stepEnterFrames(TRAVEL.forward, false, 358)).toEqual([
      { transform: 'translateX(358px)' },
      { transform: 'none' },
    ]);
    expect(stepExitFrames(TRAVEL.forward, 'none', 358)).toEqual([
      { transform: 'none' },
      { transform: 'translateX(-358px)' },
    ]);
    expect(stepExitFrames(TRAVEL.back, 'none', 358)[1]).toEqual({ transform: 'translateX(358px)' });
    expect(stepEnterFrames(TRAVEL.back, true, 358)).toBeNull();
  });

  it('runs the card height on the token spring as a linear() easing', () => {
    const { duration, easing } = springEasing(spring);
    expect(duration).toBeGreaterThan(400);
    expect(duration).toBeLessThan(520);
    const points = easing
      .replace(/^linear\(|\)$/g, '')
      .split(', ')
      .map(Number);
    expect(points[0]).toBe(0);
    expect(points.at(-1)).toBe(1);
    // Damping 32 overshoots a little (about 1.5 %), then settles.
    expect(Math.max(...points)).toBeGreaterThan(1);
    expect(Math.max(...points)).toBeLessThan(1.03);
    // Most of the way there by 250 ms.
    expect(points[Math.round((250 / duration) * 24)]).toBeGreaterThan(0.98);
    // An overdamped spring never overshoots.
    const soft = springEasing({ stiffness: 100, damping: 40 });
    expect(
      Math.max(
        ...soft.easing
          .replace(/^linear\(|\)$/g, '')
          .split(', ')
          .map(Number),
      ),
    ).toBe(1);
  });

  it('animates the card height only when the visitor moved and it changes', () => {
    const move = { reduced: false, travel: TRAVEL.forward, from: 300, to: 420 };
    expect(animateHeight(move)).toBe(true);
    expect(animateHeight({ ...move, travel: TRAVEL.back })).toBe(true);
    expect(animateHeight({ ...move, travel: TRAVEL.none })).toBe(false);
    expect(animateHeight({ ...move, reduced: true })).toBe(false);
    expect(animateHeight({ ...move, from: null })).toBe(false);
    expect(animateHeight({ ...move, to: 300.5 })).toBe(false);
  });
});

describe('auto-advance guard', () => {
  const choice = { id: 'meter_type', type: 'single_choice' as const };
  const base: AutoAdvanceInput = {
    enabled: true,
    via: 'pointer',
    fieldId: 'meter_type',
    fields: [choice],
    complete: true,
    wasComplete: false,
    isLast: false,
    busy: false,
  };

  it('moves on after about 300 ms', () => {
    expect(AUTO_ADVANCE_DELAY_MS).toBe(300);
  });

  it('advances a single-question choice step after a pointer pick', () => {
    expect(shouldAutoAdvance(base)).toBe(true);
    expect(
      shouldAutoAdvance({
        ...base,
        fieldId: 'knows_consumption',
        fields: [{ id: 'knows_consumption', type: 'yes_no' }],
      }),
    ).toBe(true);
  });

  it('never on keyboard input, when switched off, on the last step or while sending', () => {
    expect(shouldAutoAdvance({ ...base, via: 'keyboard' })).toBe(false);
    expect(shouldAutoAdvance({ ...base, enabled: false })).toBe(false);
    expect(shouldAutoAdvance({ ...base, isLast: true })).toBe(false);
    expect(shouldAutoAdvance({ ...base, busy: true })).toBe(false);
  });

  it('advances a step of several choice questions once all are answered', () => {
    const twoQuestions = [
      { id: 'digital_meter', type: 'yes_no' as const },
      { id: 'has_solar', type: 'yes_no' as const },
    ];
    const both = { ...base, fieldId: 'has_solar', fields: twoQuestions };
    expect(shouldAutoAdvance(both)).toBe(true);
    // The first answer of the two leaves the step open: no move yet.
    expect(shouldAutoAdvance({ ...both, fieldId: 'digital_meter', complete: false })).toBe(false);
    // Answered in the other order: the first question's tap completes the step.
    expect(shouldAutoAdvance({ ...both, fieldId: 'digital_meter' })).toBe(true);
    // Back on the complete step: changing the first answer waits (the second may change too),
    // changing the last one moves on, and so does a single question.
    expect(shouldAutoAdvance({ ...both, fieldId: 'digital_meter', wasComplete: true })).toBe(false);
    expect(shouldAutoAdvance({ ...both, wasComplete: true })).toBe(true);
    expect(shouldAutoAdvance({ ...base, wasComplete: true })).toBe(true);
    // A single choice and a yes/no together (the tariff step) count the same.
    expect(
      shouldAutoAdvance({
        ...base,
        fieldId: 'budget_meter',
        fields: [
          { id: 'social_tariff', type: 'yes_no' },
          { id: 'budget_meter', type: 'single_choice' },
        ],
      }),
    ).toBe(true);
  });

  it('waits for "Volgende" on steps with any other field type, or an incomplete step', () => {
    expect(
      shouldAutoAdvance({
        ...base,
        fieldId: 'supplier',
        fields: [{ id: 'supplier', type: 'select' }],
      }),
    ).toBe(false);
    // The business bands next to the postcode and its checkbox: typing fields keep "Volgende".
    expect(
      shouldAutoAdvance({
        ...base,
        fieldId: 'business_electricity_band',
        fields: [
          { id: 'postcode', type: 'postcode' },
          { id: 'is_business', type: 'checkbox' },
          { id: 'business_electricity_band', type: 'single_choice' },
        ],
      }),
    ).toBe(false);
    expect(shouldAutoAdvance({ ...base, complete: false })).toBe(false);
    expect(shouldAutoAdvance({ ...base, fieldId: 'other' })).toBe(false);
    expect(shouldAutoAdvance({ ...base, fields: [] })).toBe(false);
  });

  it('tells a tap on the same card from the keyboard', () => {
    const tap = { fieldId: 'meter_type', code: 'dual', at: 1000 };
    expect(pickVia(tap, 'meter_type', 'dual', 1100)).toBe('pointer');
    expect(pickVia(tap, 'meter_type', 'dual', 1000 + POINTER_PICK_WINDOW_MS)).toBe('pointer');
    // Arrow keys after a tap pick another card: keyboard.
    expect(pickVia(tap, 'meter_type', 'single', 1100)).toBe('keyboard');
    expect(pickVia(tap, 'other_field', 'dual', 1100)).toBe('keyboard');
    expect(pickVia(tap, 'meter_type', 'dual', 1001 + POINTER_PICK_WINDOW_MS)).toBe('keyboard');
    expect(pickVia(tap, 'meter_type', 'dual', 900)).toBe('keyboard');
    expect(pickVia(null, 'meter_type', 'dual', 1100)).toBe('keyboard');
  });

  it("doesn't advance again on the second half of a double click after an auto-advance", () => {
    // The step changes 300 ms after the tap; a double click's second half (up to 500 ms after
    // the first) lands on the new step's cards.
    expect(AUTO_ADVANCE_GUARD_MS).toBeGreaterThanOrEqual(500 - AUTO_ADVANCE_DELAY_MS);
    const advancedAt = 5000;
    expect(withinAutoAdvanceGuard(advancedAt, advancedAt + 30)).toBe(true);
    expect(withinAutoAdvanceGuard(advancedAt, advancedAt)).toBe(true);
    expect(withinAutoAdvanceGuard(advancedAt, advancedAt + AUTO_ADVANCE_GUARD_MS - 1)).toBe(true);
    // A deliberate tap once the new step has been on screen for a moment advances again.
    expect(withinAutoAdvanceGuard(advancedAt, advancedAt + AUTO_ADVANCE_GUARD_MS)).toBe(false);
    // No auto-advance yet (or "Terug" since), or a clock that went backwards: no guard.
    expect(withinAutoAdvanceGuard(null, advancedAt)).toBe(false);
    expect(withinAutoAdvanceGuard(advancedAt, advancedAt - 1)).toBe(false);
  });
});

describe('reduced motion keeps only short fades', () => {
  it('fades the step in without a slide', () => {
    // StepStage fades the new step in at `fast` and makes no copy of the old one to slide out.
    for (const travel of [TRAVEL.forward, TRAVEL.back, TRAVEL.none]) {
      expect(stepEnterFrames(travel, true)).toBeNull();
    }
  });

  it('changes answer cards instantly, without the spring or the drawing check mark', () => {
    expect(indicatorVariants(true).on).toEqual({ scale: 1, transition: INSTANT });
    expect(indicatorVariants(false).on).toEqual({ scale: [0.8, 1], transition: spring });
    expect(checkVariants(true).on.transition).toBe(INSTANT);
    expect(checkVariants(false).on.transition).not.toBe(INSTANT);
  });

  it('reveals questions instantly', () => {
    expect(revealVariants(true).open.transition).toBe(INSTANT);
    expect(revealVariants(false).open.transition).toMatchObject({ height: spring });
    expect(revealVariants(false).open.transitionEnd).toEqual({ overflow: 'visible' });
    expect(revealVariants(false).collapsed.overflow).toBe('clip');
  });

  it('never shakes', () => {
    expect(shakeKeyframes(true)).toBeNull();
  });

  it('shakes about 6 px otherwise, ending where it started', () => {
    expect(SHAKE_PX).toBe(6);
    const frames = shakeKeyframes(false)!;
    expect(frames[0]).toBe('translateX(0px)');
    expect(frames.at(-1)).toBe('translateX(0px)');
    expect(frames).toContain('translateX(-6px)');
    expect(frames).toContain('translateX(6px)');
  });

  it('shakes a field once per "Volgende", also when it collapses and comes back', () => {
    // No error from a "Volgende" yet: nothing to play.
    expect(isNewShake(0, undefined)).toBe(false);
    // A new pulse plays, on first mount too (a "Volgende" that went back to an earlier step).
    expect(isNewShake(1, undefined)).toBe(true);
    expect(isNewShake(2, 1)).toBe(true);
    // A field revealed again mounts with the pulse it already played: no second shake.
    expect(isNewShake(2, 2)).toBe(false);
  });
});

describe('progress', () => {
  it('splits "Stap {step} van {total}" so the numbers can roll', () => {
    expect(progressParts('Stap {step} van {total}')).toEqual([
      { text: 'Stap ' },
      { value: 'step' },
      { text: ' van ' },
      { value: 'total' },
    ]);
    expect(progressParts('{step}/{total}')).toEqual([
      { value: 'step' },
      { text: '/' },
      { value: 'total' },
    ]);
  });
});

describe('product card → form card morph', () => {
  const click = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };
  const link = (href: string, target = '', download = false) => ({
    href,
    target,
    hasAttribute: (name: string) => name === 'download' && download,
  });
  const origin = 'https://voordeelvinder.be';

  it('names the card only for a plain click to a form page of this site', () => {
    expect(FORM_CARD_MORPH).toBe('form-card');
    expect(
      morphDestination(click, link(`${origin}/vergelijken/zonnepanelen`), origin)?.pathname,
    ).toBe('/vergelijken/zonnepanelen');
    expect(
      morphDestination(click, link(`${origin}/vergelijken/thuisbatterij?utm_source=meta`), origin),
    ).not.toBeNull();
  });

  it('ignores new tabs, modifier keys, downloads and other pages', () => {
    const to = `${origin}/vergelijken/zonnepanelen`;
    expect(morphDestination({ ...click, metaKey: true }, link(to), origin)).toBeNull();
    expect(morphDestination({ ...click, ctrlKey: true }, link(to), origin)).toBeNull();
    expect(morphDestination({ ...click, button: 1 }, link(to), origin)).toBeNull();
    expect(morphDestination({ ...click, defaultPrevented: true }, link(to), origin)).toBeNull();
    expect(morphDestination(click, link(to, '_blank'), origin)).toBeNull();
    expect(morphDestination(click, link(to, '', true), origin)).toBeNull();
    expect(morphDestination(click, link(`${origin}/vergelijken`), origin)).toBeNull();
    expect(morphDestination(click, link(`${origin}/zonnepanelen`), origin)).toBeNull();
    expect(morphDestination(click, link('https://example.com/vergelijken/x'), origin)).toBeNull();
  });

  it('matches the navigation by page, whatever the query', () => {
    expect(
      samePage(
        `${origin}/vergelijken/zonnepanelen?utm_source=x`,
        `${origin}/vergelijken/zonnepanelen`,
      ),
    ).toBe(true);
    expect(
      samePage(`${origin}/vergelijken/zonnepanelen/`, `${origin}/vergelijken/zonnepanelen`),
    ).toBe(true);
    expect(samePage(`${origin}/vergelijken/energie`, `${origin}/vergelijken/zonnepanelen`)).toBe(
      false,
    );
    expect(samePage('not a url', `${origin}/`)).toBe(false);
  });
});

describe('server render: nothing moves at hydration', () => {
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

  it('renders the steps bar pill at its place and the first step fully visible', () => {
    // Step 1 of 10: the pill rides on the centre of the first segment.
    expect(html).toContain('style="translate:calc(5.5556% + var(--gap) * -0.4444) 0"');
    // The step is rendered in its final state: no opacity 0, no offset.
    expect(html).not.toMatch(/<(div|h2|label|span)[^>]*style="[^"]*(opacity:0|translateX)/);
  });

  it('names the form card for the page transition, once', () => {
    expect(html.match(/\[view-transition-name:form-card\]/g)).toHaveLength(1);
  });

  it('turns auto-advance on in the copy file (Tanjil approves on staging)', () => {
    expect(copy.settings.autoAdvance).toBe(true);
    const broken = read('_copy.json');
    delete broken.settings;
    expect(flowCopyFile.safeParse(broken).success).toBe(false);
  });

  it('shows a spinner in the submit button at once while sending', () => {
    const busy = renderToStaticMarkup(
      createElement(FormButton, {
        type: 'submit',
        variant: 'primary',
        icon: '/next.svg',
        iconPosition: 'end',
        busy: true,
        children: 'Verstuur',
      }),
    );
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('motion-safe:animate-spin');
    expect(busy).not.toContain('/next.svg');
  });
});
