// The form island (brief §7.6): a state machine over the flow engine (src/lib/flow/engine.ts).
// The engine decides which step and fields show, validates and builds the submission; this
// component renders it and handles focus, scrolling, persistence and navigation.
//
// Rendered on the server with the page's first step (client:load, brief §6.1), so there is
// something to see and to morph into before hydration; the URL preselect (?energie=) is already
// applied there. Right after mounting it restores the stored session once
// (src/lib/form/initial.ts). Until then the form is inert: "Volgende" is disabled, and Form.astro
// cancels any native submit, so nothing typed before hydration ends up in the URL.
//
// Motion (brief §6.1, docs/MOTION.md; src/components/form/motion.tsx): the engine moves at once
// and the animation is only visual. Focus, scrolling and the aria-live announcement never wait
// for it. Auto-advance (a tap on a single-question choice step) is `settings.autoAdvance` in
// _copy.json. The form card is named `form-card` for the page transitions from a product card
// and into the thank-you card.
//
// Submit (brief §9.1, docs/FLOWS.md): "Verstuur" posts the lead to /api/lead (sendLead) with the
// honeypot and a Turnstile token (the widget and its script exist on the last step only). On OK
// the form leaves the "lead is safe" flag for the thank-you page and goes there; on a failure the
// button unlocks, the answers stay, and a message from _copy.json `submitErrors` shows above the
// buttons and is announced.
import { prefetch } from 'astro:prefetch';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type SubmitEvent,
} from 'react';

import {
  buildSubmission,
  getStep,
  nextStep,
  previousStep,
  progress,
  validateStep,
  visibleFields,
  type ErrorCode,
  type StepValidation,
  type Submission,
  type WarningCode,
} from '../../lib/flow/engine';
import type { Field } from '../../lib/flow/schema';
import type { AnswerValue, Answers, DaySlotAnswer, Product } from '../../lib/flow/types';
import { engineDerived, flowAfter, storableAnswers, withAnswer } from '../../lib/form/answers';
import {
  firstInvalidStep,
  restoreStart,
  serverStart,
  type FormStart,
} from '../../lib/form/initial';
import { choiceOptions, domId, UI_ICONS } from '../../lib/form/labels';
import { LEAD_SAFE_KEY, serializeLeadSafe } from '../../lib/form/lead-safe';
import { errorMessage, liveText, progressLabel, warningMessage } from '../../lib/form/messages';
import {
  AUTO_ADVANCE_DELAY_MS,
  pickVia,
  shouldAutoAdvance,
  TRAVEL,
  withinAutoAdvanceGuard,
  type PointerPick,
  type Travel,
} from '../../lib/form/motion';
import {
  clearAllSessions,
  flowFingerprint,
  flowFingerprints,
  newId,
  readSession,
  sessionStore,
  STORAGE_VERSION,
  writeSession,
} from '../../lib/form/storage';
import {
  firstStepBack,
  isRepeatSubmit,
  sendLead,
  submissionContext,
  MORPH_MARKER,
  thanksPath,
  type SendFailure,
} from '../../lib/form/submit';
import type {
  FormCopy,
  FormEntry,
  FormFlows,
  FormPanel as FormPanelData,
} from '../../lib/form/types';
import { FormPanel } from './FormPanel';
import { FadeInText, FormMotion, StepStage } from './motion';
import { ProgressCard } from './ProgressCard';
import { StepView } from './StepView';
import { FormButton } from './ui';
import { useTurnstile } from './useTurnstile';

export type FormIslandProps = {
  entry: FormEntry;
  /** Resolved flows (resolveFlow at build time): one on /vergelijken/<product>, all on /vergelijken. */
  flows: FormFlows;
  /** The page's product; on /vergelijken the energy flow, whose step 1 can switch flows. */
  product: Product;
  preselected: boolean;
  /** The URL's preselected answers (urlPreselects of ?energie=), worked out on the server. */
  preselect: Answers;
  copy: FormCopy;
  /** Icon key → URL (resolved in Form.astro). */
  icons: Record<string, string>;
  panels: Partial<Record<Product, FormPanelData>>;
  flag: { src: string; width: number; height: number };
  /** Where "Terug" on the first step goes: the product page (preselected) or the home page. */
  backHref: string;
  /** The Turnstile site key (turnstileSiteKey in Form.astro); without one, no widget. */
  turnstileSiteKey?: string | null;
};

type Ids = { leadId: string; eventId: string };

type State = FormStart & {
  errors: Record<string, ErrorCode>;
  warnings: Record<string, WarningCode>;
  suggestions: Record<string, string>;
  /** The aria-live announcement of the last step change or failed validation. */
  announcement: string;
  /** How the current step was reached: it slides in from that side (none after a restore). */
  travel: Travel;
  /** The last "Volgende" that found errors: those fields shake once (brief §6.1). */
  shake: { pulse: number; fields: string[] };
  ids: Ids | null;
  restored: boolean;
  submitting: boolean;
  /** Why the last "Verstuur" couldn't send the lead; cleared by an answer or a step change. */
  sendError: SendFailure | null;
};

/** A scheduled auto-advance: the step it was scheduled on and the picked field. */
type AutoAdvance = { stepId: string; fieldId: string };

type PendingFocus = { kind: 'step' } | { kind: 'error'; field: Field; code: ErrorCode } | null;

const INPUT_TYPES: ReadonlySet<Field['type']> = new Set([
  'text',
  'number',
  'postcode',
  'phone',
  'email',
]);

function flowOf(flows: FormFlows, product: Product) {
  const flow = flows[product];
  if (!flow) throw new Error(`no flow for "${product}"`);
  return flow;
}

/** The control to focus for a field's error (brief §7.6: focus the first error). */
function focusTarget(field: Field, answers: Answers, code: ErrorCode, copy: FormCopy) {
  if (field.type === 'single_choice' || field.type === 'yes_no') {
    const codes = choiceOptions(field, copy).map((option) => option.code);
    const value = answers[field.id];
    const code0 = typeof value === 'string' && codes.includes(value) ? value : codes[0];
    return code0 === undefined ? null : document.getElementById(domId.option(field.id, code0));
  }
  if (field.type === 'day_slot') {
    const answer = (answers[field.id] ?? {}) as DaySlotAnswer;
    const slot = code === 'slot_required' || code === 'slot_unknown';
    const options = slot ? field.slots : field.days;
    const chosen = slot ? answer.slot : answer.day;
    const pick = options.find((option) => option.code === chosen) ?? options[0];
    return pick ? document.getElementById(domId.option(field.id, pick.code)) : null;
  }
  return document.getElementById(domId.field(field.id));
}

function clearTimer(timer: RefObject<number | undefined>) {
  if (timer.current === undefined) return;
  window.clearTimeout(timer.current);
  timer.current = undefined;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function FormIsland({
  entry,
  flows,
  product: pageProduct,
  preselected,
  preselect,
  copy,
  icons,
  panels,
  flag,
  backHref,
  turnstileSiteKey = null,
}: FormIslandProps) {
  const [state, setState] = useState<State>(() => ({
    ...serverStart(flows, pageProduct, preselected, preselect),
    errors: {},
    warnings: {},
    suggestions: {},
    announcement: '',
    travel: TRAVEL.none,
    shake: { pulse: 0, fields: [] },
    ids: null,
    restored: false,
    submitting: false,
    sendError: null,
  }));
  const topRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<PendingFocus>(null);
  const submitting = useRef(false);
  const submitted = useRef(false);
  /**
   * When the form last moved forward ("Volgende" or an auto-advance; event.timeStamp or
   * performance.now(), the same clock), until the next answer or "Terug": the double-click guard.
   */
  const advancedAt = useRef<number | null>(null);
  /**
   * When an auto-advance last moved the form forward (performance.now()), until "Terug". Unlike
   * advancedAt an answer doesn't clear it: the second half of a double click picks a card on
   * the new step, and that pick must not schedule another auto-advance.
   */
  const autoAdvancedAt = useRef<number | null>(null);
  const lastPointer = useRef<PointerPick | null>(null);
  const autoTimer = useRef<number | undefined>(undefined);
  /** The latest "Volgende" handler, for the auto-advance timer (set after every render). */
  const advance = useRef<((now: number, auto?: AutoAdvance) => void) | null>(null);

  const flow = flowOf(flows, state.product);
  const derived = engineDerived(state.flags, state.answers);
  const step = getStep(flow, state.step);
  const fields = visibleFields(flow, state.step, state.answers, derived);
  const { step: stepNumber, total } = progress(flow, state.step, state.answers, derived);
  const isLast = nextStep(flow, state.step, state.answers, derived) === null;
  const panel = panels[state.product] ?? panels[pageProduct];
  // The last step is the contact step in every flow: the honeypot and Turnstile live there.
  const { container: turnstileBox, token: turnstileToken } = useTurnstile(
    isLast && state.restored,
    turnstileSiteKey,
  );

  // Restore once after mounting: storage only exists in the browser, and reading it during the
  // first render would not match the server-rendered HTML.
  useEffect(() => {
    const stored = readSession(sessionStore(), entry, flowFingerprints(flows));
    const start = restoreStart({ flows, product: pageProduct, preselected, preselect, stored });
    const ids = stored
      ? { leadId: stored.leadId, eventId: stored.eventId }
      : { leadId: newId(), eventId: newId() };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-time sync with browser-only state (URL, sessionStorage) after hydration
    setState((current) => ({ ...current, ...start, ids, restored: true, travel: TRAVEL.none }));
  }, [flows, entry, pageProduct, preselected, preselect]);

  // Persist after every change (brief §7.6): only the visitor's own answers, abandoned
  // branches cleared first.
  useEffect(() => {
    if (!state.restored || !state.ids || submitted.current) return;
    const active = flowOf(flows, state.product);
    writeSession(sessionStore(), entry, {
      version: STORAGE_VERSION,
      product: state.product,
      flow: flowFingerprint(active),
      step: state.step,
      answers: storableAnswers(active, state.answers, engineDerived(state.flags, state.answers)),
      leadId: state.ids.leadId,
      eventId: state.ids.eventId,
    });
  }, [
    flows,
    entry,
    state.restored,
    state.ids,
    state.product,
    state.step,
    state.answers,
    state.flags,
  ]);

  // Back from the thank-you page (bfcache): start clean, the session was cleared on submit.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted && submitted.current) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // The thank-you page is fetched ahead as soon as the last step shows (brief §6.1), so the
  // submit lands on a page that is already there.
  useEffect(() => {
    if (isLast) prefetch(thanksPath(state.product));
  }, [isLast, state.product]);

  // A pending auto-advance belongs to its step: any step change (or unmounting) cancels it.
  useEffect(() => () => clearTimer(autoTimer), [state.step]);

  // Focus and scroll after the render that showed the new step or the errors. Never waits for
  // an animation (brief §6.1).
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (pending.kind === 'step') {
      headingRef.current?.focus({ preventScroll: true });
      // Scroll to the top of the form when it is under the sticky header or above the screen.
      const top = topRef.current;
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (top && top.getBoundingClientRect().top < header) {
        top.scrollIntoView({ behavior, block: 'start' });
      }
      return;
    }
    const target = focusTarget(pending.field, state.answers, pending.code, copy);
    const box = document.getElementById(`${domId.field(pending.field.id)}-vak`) ?? target;
    target?.focus({ preventScroll: true });
    box?.scrollIntoView({ behavior, block: 'center' });
  });

  const cancelAutoAdvance = () => clearTimer(autoTimer);

  const goTo = (stepId: string, answers: Answers, travel: Travel) => {
    cancelAutoAdvance();
    const nextDerived = engineDerived(state.flags, answers);
    const title = getStep(flow, stepId).title;
    const label = progressLabel(copy, progress(flow, stepId, answers, nextDerived));
    pendingFocus.current = { kind: 'step' };
    setState((current) => ({
      ...current,
      answers,
      step: stepId,
      errors: {},
      warnings: {},
      suggestions: {},
      announcement: `${title}. ${label}`,
      travel,
      shake: { pulse: current.shake.pulse, fields: [] },
      sendError: null,
    }));
  };

  /**
   * Shows a step with the errors of its validation, focuses and announces the first one, and
   * shakes the fields with an error once (brief §6.1). Focus and the announcement never wait
   * for the shake.
   */
  const showErrors = (stepId: string, answers: Answers, result: StepValidation) => {
    const shown = visibleFields(flow, stepId, answers, engineDerived(state.flags, answers));
    const flagged = shown.filter((field) => result.errors[field.id] !== undefined);
    const first = flagged[0];
    const code = first ? result.errors[first.id] : undefined;
    if (first && code) pendingFocus.current = { kind: 'error', field: first, code };
    // Focus alone doesn't make every screen reader read the error: announce it as well.
    const text = first && code ? errorMessage(copy, first, code) : undefined;
    setState((current) => ({
      ...current,
      step: stepId,
      answers,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      announcement: text ? liveText(current.announcement, text) : current.announcement,
      // Back to an earlier step (a submission that no longer builds): it slides in from the left.
      travel: stepId === current.step ? current.travel : TRAVEL.back,
      shake: { pulse: current.shake.pulse + 1, fields: flagged.map((field) => field.id) },
    }));
  };

  const onChange = (field: Field, value: AnswerValue | undefined) => {
    advancedAt.current = null;
    setState((current) => {
      const answers = withAnswer(current.answers, field.id, value);
      const { [field.id]: _error, ...errors } = current.errors;
      const { [field.id]: _suggestion, ...suggestions } = current.suggestions;
      const { [field.id]: _warning, ...warnings } = current.warnings;
      // A card of another product on step 1 continues in that product's flow (docs/FLOWS.md).
      const product = flowAfter(flows, current.product, current.flags.preselected, field, value);
      // A new flow is a new lead: a duplicated tab (sessionStorage is copied) that switches
      // product then no longer shares lead_id and event_id with the original (docs/FLOWS.md).
      const ids = product === current.product ? current.ids : { leadId: newId(), eventId: newId() };
      return { ...current, answers, product, ids, errors, suggestions, warnings, sendError: null };
    });
  };

  // Text-like fields validate on blur once something is typed (brief §7.5); "required" waits
  // for "Volgende".
  const onBlur = (field: Field) => {
    if (!INPUT_TYPES.has(field.type)) return;
    const value = state.answers[field.id];
    if (value === undefined || (typeof value === 'string' && value.trim() === '')) return;
    const result = validateStep(flow, state.step, state.answers, derived);
    setState((current) => {
      const errors = { ...current.errors };
      const warnings = { ...current.warnings };
      const suggestions = { ...current.suggestions };
      const error = result.errors[field.id];
      const warning = result.warnings[field.id];
      const suggestion = result.suggestions[field.id];
      if (error) errors[field.id] = error;
      else delete errors[field.id];
      if (warning) warnings[field.id] = warning;
      else delete warnings[field.id];
      if (suggestion) suggestions[field.id] = suggestion;
      else delete suggestions[field.id];
      return { ...current, errors, warnings, suggestions };
    });
  };

  const onApplySuggestion = (field: Field, value: string) => {
    onChange(field, value);
    document.getElementById(domId.field(field.id))?.focus();
  };

  const unlock = () => {
    submitting.current = false;
    setState((current) => ({ ...current, submitting: false }));
  };

  const submit = async () => {
    if (submitting.current) return;
    cancelAutoAdvance();
    submitting.current = true;
    setState((current) => ({ ...current, submitting: true, sendError: null }));
    const ids = state.ids ?? { leadId: newId(), eventId: newId() };
    let submission: Submission;
    try {
      submission = buildSubmission(
        flow,
        state.answers,
        submissionContext({
          leadId: ids.leadId,
          eventId: ids.eventId,
          derived,
          page: window.location.pathname,
          search: window.location.search,
          store: sessionStore(),
          now: new Date(),
        }),
      );
    } catch {
      // An answer on the path no longer validates (a restored session): show that step and its
      // errors. Logged without the (personal) answers.
      console.error('form: the submission could not be built');
      unlock();
      const invalid = firstInvalidStep(flow, state.answers, derived);
      if (invalid !== null) {
        showErrors(invalid, state.answers, validateStep(flow, invalid, state.answers, derived));
      }
      return;
    }
    const result = await sendLead(submission, {
      turnstileToken,
      honeypot: honeypotRef.current?.value ?? '',
    });
    if (!result.ok) {
      // The answers stay; the message shows above the buttons and is announced. Only the kind
      // is logged, never the submission.
      console.error(`form: the lead could not be sent (${result.kind})`);
      const text = copy.submitErrors[result.kind];
      submitting.current = false;
      setState((current) => ({
        ...current,
        submitting: false,
        sendError: result.kind,
        announcement: liveText(current.announcement, text),
      }));
      return;
    }
    submitted.current = true;
    // Every form page's session, not only this one: no contact details outlive the lead.
    const store = sessionStore();
    clearAllSessions(store);
    try {
      // The thank-you page celebrates (and, Phase 6, fires generate_lead) only with this flag
      // for its product (brief §9.1 step 9, §10; src/scripts/celebrate.ts).
      store?.setItem(
        LEAD_SAFE_KEY,
        serializeLeadSafe({ event_id: submission.event_id, product: submission.product }),
      );
      store?.setItem(MORPH_MARKER, 'form-card');
    } catch {
      // No storage: the thank-you page shows without the cheer and falls back to the referrer.
    }
    window.location.assign(result.redirect);
  };

  /**
   * "Volgende": validate the step, then show the errors or go on (or submit on the last step).
   * The auto-advance timer calls it too, and then first checks that its step is still shown
   * and still qualifies (a pick can reveal a second question).
   */
  const onNext = (now: number, auto?: AutoAdvance) => {
    if (submitting.current) return;
    // Inert until the stored session is restored ("Volgende" is disabled until then).
    if (!state.restored) return;
    // The second half of a double click or tap lands on the new step: ignore it. This covers
    // auto-advance too: an auto-advance and a "Volgende" never both move on.
    if (isRepeatSubmit(advancedAt.current, now)) return;
    if (auto) {
      const qualifies = shouldAutoAdvance({
        enabled: copy.settings.autoAdvance,
        via: 'pointer',
        fieldId: auto.fieldId,
        fields,
        isLast,
        busy: submitting.current,
      });
      if (auto.stepId !== state.step || !qualifies) return;
    }
    cancelAutoAdvance();
    const result = validateStep(flow, state.step, state.answers, derived);
    if (!result.valid) {
      showErrors(state.step, state.answers, result);
      return;
    }
    const next = nextStep(flow, state.step, state.answers, derived);
    if (next === null) {
      void submit();
      return;
    }
    advancedAt.current = now;
    // The double-tap guard covers only the step an auto-advance shows; any other move resets it.
    autoAdvancedAt.current = auto ? now : null;
    goTo(next, state.answers, TRAVEL.forward);
  };

  // The timer runs the handler of the render after the pick, which has the new answer.
  useLayoutEffect(() => {
    advance.current = onNext;
  });

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNext(event.timeStamp);
  };

  // Auto-advance (brief §6.1): only after a pointer tap or click on a card, never on keyboard
  // input. "Volgende" stays visible and works as before.
  const onPointerPick = (field: Field, code: string) => {
    lastPointer.current = { fieldId: field.id, code, at: performance.now() };
  };

  const onPick = (field: Field, code: string) => {
    const now = performance.now();
    const via = pickVia(lastPointer.current, field.id, code, now);
    lastPointer.current = null;
    cancelAutoAdvance();
    // Not before the stored session is restored: the form is inert until then.
    if (!state.restored) return;
    // The second half of a double click or tap on the step an auto-advance just showed: the
    // card is picked (onChange stores the answer, visibly), but the form doesn't move on again.
    if (withinAutoAdvanceGuard(autoAdvancedAt.current, now)) return;
    const auto = shouldAutoAdvance({
      enabled: copy.settings.autoAdvance,
      via,
      fieldId: field.id,
      fields,
      isLast,
      busy: submitting.current,
    });
    if (!auto) return;
    const stepId = state.step;
    autoTimer.current = window.setTimeout(() => {
      autoTimer.current = undefined;
      advance.current?.(performance.now(), { stepId, fieldId: field.id });
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const onBack = () => {
    if (submitting.current) return;
    advancedAt.current = null;
    autoAdvancedAt.current = null;
    cancelAutoAdvance();
    const previous = previousStep(flow, state.step, state.answers, derived);
    if (previous !== null) {
      goTo(previous, state.answers, TRAVEL.back);
      return;
    }
    const target = firstStepBack({
      preselected: state.flags.preselected,
      productPage: backHref,
      fallback: backHref,
      referrer: document.referrer,
      origin: window.location.origin,
      historyLength: window.history.length,
    });
    if (target.kind === 'history') window.history.back();
    else window.location.assign(target.href);
  };

  const message = (field: Field, code: ErrorCode | undefined) =>
    code === undefined ? undefined : errorMessage(copy, field, code);
  const errors = Object.fromEntries(
    fields.flatMap((field) => {
      const text = message(field, state.errors[field.id]);
      return text === undefined ? [] : [[field.id, text]];
    }),
  );
  const warnings = Object.fromEntries(
    fields.flatMap((field) => {
      const code = state.warnings[field.id];
      const text = code === undefined ? undefined : warningMessage(copy, field, code);
      return text === undefined ? [] : [[field.id, text]];
    }),
  );

  return (
    <FormMotion>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,372fr)_minmax(0,767fr)] lg:gap-6">
        {panel && <FormPanel panel={panel} />}
        <div ref={topRef} className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <ProgressCard template={copy.progress} step={stepNumber} total={total} />
          {/* The one element named form-card on this page: a product card's CTA morphs into it
            and it morphs into the thank-you card (src/scripts/morph.ts, docs/MOTION.md). */}
          <section
            data-morph="form-card"
            aria-labelledby="formulier-stap-titel"
            className="flex flex-1 flex-col rounded-2xl border border-lavender-300 bg-white px-5 pt-6 pb-6 shadow-form [view-transition-name:form-card] md:px-12 md:pt-12 md:pb-[50px]"
          >
            <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col">
              {/* Keyed by the step id only: a product card on step 1 switches the flow but
                  stays on the same step, so its radios (and their focus) are kept. */}
              <StepStage stepKey={state.step} travel={state.travel}>
                <StepView
                  step={step}
                  fields={fields}
                  answers={state.answers}
                  errors={errors}
                  warnings={warnings}
                  suggestions={state.suggestions}
                  onChange={onChange}
                  onBlur={onBlur}
                  onApplySuggestion={onApplySuggestion}
                  icons={icons}
                  flag={flag}
                  copy={copy}
                  headingRef={headingRef}
                  shake={state.shake}
                  onPointerPick={onPointerPick}
                  onPick={onPick}
                />
              </StepStage>
              {isLast && (
                // The honeypot (brief §9.1 step 3): hidden from people, screen readers and the
                // tab order; bots that fill every field fill it. Not a flow field: never stored.
                <div aria-hidden="true" className="sr-only">
                  <input
                    ref={honeypotRef}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                  />
                </div>
              )}
              <div className="mt-auto pt-8">
                {isLast && (
                  // Turnstile renders here (useTurnstile); visible only when Cloudflare asks the
                  // visitor to click. React renders nothing inside it.
                  <div ref={turnstileBox} className="flex justify-center empty:hidden" />
                )}
                {state.sendError && (
                  <div className="mb-6">
                    <FadeInText id="formulier-verzendfout" className="text-body text-danger">
                      {copy.submitErrors[state.sendError]}
                    </FadeInText>
                    {state.sendError === 'invalid' && (
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-2 text-body font-semibold text-ink-900 underline underline-offset-4"
                      >
                        {copy.submitErrors.reload}
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-lavender-400 pt-6 md:flex md:justify-between md:pt-[52px]">
                  <FormButton
                    type="button"
                    variant="secondary"
                    icon={icons[UI_ICONS.back]}
                    iconPosition="start"
                    onClick={onBack}
                  >
                    {copy.buttons.back}
                  </FormButton>
                  <FormButton
                    type="submit"
                    variant="primary"
                    icon={icons[UI_ICONS.next]}
                    iconPosition="end"
                    busy={state.submitting}
                    disabled={!state.restored}
                  >
                    {isLast ? copy.buttons.submit : copy.buttons.next}
                  </FormButton>
                </div>
              </div>
            </form>
          </section>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {state.announcement}
          </p>
        </div>
      </div>
    </FormMotion>
  );
}
