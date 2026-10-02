// The single-page energy form (Figma 193:2095, /vergelijken/energie): every section of the
// energie_vergelijker flow on one page, A to E, each a card. The same engine as the step-by-step
// form decides which sections and fields show, validates and builds the submission, and the
// same field components render them (FormLayoutContext "page": compact radio rows, smaller
// labels). Conditional fields open and close with the step form's reveal motion, and a field
// with an error shakes once (docs/MOTION.md).
//
// "Vergelijken" validates every shown section. With errors it focuses and announces the first
// one (in page order) and shakes the fields that have one. Otherwise it sends the lead exactly as
// the step form does (sendLead: honeypot and Turnstile token) and goes to the thank-you page.
// Turnstile loads once the contact section comes into view. Answers persist in sessionStorage
// under their own key and are cleared after a successful submit.
import { prefetch } from 'astro:prefetch';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from 'react';

import {
  buildSubmission,
  isStepShown,
  validateStep,
  visibleFields,
  withCheckboxDefaults,
  type ErrorCode,
  type Submission,
  type WarningCode,
} from '../../lib/flow/engine';
import type { Field, Flow, Step } from '../../lib/flow/schema';
import type { AnswerValue, Answers } from '../../lib/flow/types';
import { engineDerived, storableAnswers, withAnswer } from '../../lib/form/answers';
import { domId, fieldSpan, UI_ICONS } from '../../lib/form/labels';
import { LEAD_SAFE_KEY, serializeLeadSafe } from '../../lib/form/lead-safe';
import { errorMessage, liveText, warningMessage } from '../../lib/form/messages';
import {
  clearAllSessions,
  flowFingerprint,
  newId,
  readSession,
  sessionStore,
  STORAGE_VERSION,
  writeSession,
} from '../../lib/form/storage';
import {
  honeypotFilled,
  MORPH_MARKER,
  sendLead,
  submissionContext,
  thanksPath,
  type SendFailure,
} from '../../lib/form/submit';
import { COMPARISON_ANSWERS_KEY } from '../../lib/comparison/order-state';
import type { FormCopy, FormFlags } from '../../lib/form/types';
import { CheckField } from './fields/CheckField';
import { ChoiceField } from './fields/ChoiceField';
import { DaySlotField } from './fields/DaySlotField';
import { InputField } from './fields/InputField';
import { SelectField } from './fields/SelectField';
import type { FieldProps } from './fields/shared';
import { FormLayoutContext } from './layout';
import { FadeInText, FieldCell, FieldList, FormMotion } from './motion';
import { cx, FormButton, MaskIcon } from './ui';
import { useTurnstile } from './useTurnstile';

export type FormPageIslandProps = {
  /** The resolved energie_vergelijker flow. */
  flow: Flow;
  /** The URL's preselected answers (?energie=both → energy_type), worked out on the server. */
  preselect: Answers;
  copy: FormCopy;
  icons: Record<string, string>;
  flag: { src: string; width: number; height: number };
  turnstileSiteKey?: string | null;
  /**
   * Where to go after a sent lead instead of the thank-you page: the results screen on staging
   * (ADR 0013), null elsewhere.
   */
  afterLead?: string | null;
};

/** The sessionStorage entry (voordeelvinder:form:energie_vergelijker). */
const ENTRY = 'energie_vergelijker';
/** The server walks every flow as preselected (validate.ts SERVER_FLAGS); so does this form. */
const FLAGS: FormFlags = { preselected: true, energy_preselected: true };
const INPUT_TYPES: ReadonlySet<Field['type']> = new Set([
  'text',
  'number',
  'postcode',
  'phone',
  'email',
]);
const LETTERS = 'ABCDEFGHIJ';

type Messages = {
  errors: Record<string, ErrorCode>;
  warnings: Record<string, WarningCode>;
  suggestions: Record<string, string>;
};

const NO_MESSAGES: Messages = { errors: {}, warnings: {}, suggestions: {} };

/** A checkbox-style yes/no (display: "checkbox"). */
function isCheckbox(field: Field): boolean {
  return field.type === 'yes_no' && field.display === 'checkbox';
}

/** What a section shows, in order: single fields, inline checkbox rows and tinted panels. */
type Item =
  | { kind: 'field'; field: Field }
  | { kind: 'row'; key: string; label: string; fields: Field[] }
  | { kind: 'panel'; key: string; tone: 'lavender' | 'grey'; note?: string; items: Item[] };

function rows(fields: Field[]): Item[] {
  const items: Item[] = [];
  for (const field of fields) {
    const last = items.at(-1);
    if (isCheckbox(field) && field.rowLabel) {
      items.push({ kind: 'row', key: `rij-${field.id}`, label: field.rowLabel, fields: [field] });
    } else if (isCheckbox(field) && last?.kind === 'row' && !field.rowLabel) {
      last.fields.push(field);
    } else {
      items.push({ kind: 'field', field });
    }
  }
  return items;
}

function layout(step: Step, fields: Field[]): Item[] {
  const items: Item[] = [];
  let run: { panel: string | undefined; fields: Field[] } | null = null;
  const flush = () => {
    if (!run) return;
    const panel = run.panel ? step.panels?.find((entry) => entry.id === run!.panel) : undefined;
    if (panel) {
      items.push({
        kind: 'panel',
        key: `paneel-${panel.id}`,
        tone: panel.tone,
        note: panel.note,
        items: rows(run.fields),
      });
    } else {
      items.push(...rows(run.fields));
    }
    run = null;
  };
  for (const field of fields) {
    if (!run || run.panel !== field.panel) {
      flush();
      run = { panel: field.panel, fields: [] };
    }
    run.fields.push(field);
  }
  flush();
  return items;
}

/** Half width from md: the contact grid's inputs and the panels' numbers (kW, injection). */
function half(field: Field): boolean {
  return fieldSpan(field) === 'half' || field.type === 'number';
}

export default function FormPageIsland({
  flow,
  preselect,
  copy,
  icons,
  flag,
  turnstileSiteKey = null,
  afterLead = null,
}: FormPageIslandProps) {
  const [answers, setAnswers] = useState<Answers>(() => ({ ...preselect }));
  const [messages, setMessages] = useState<Messages>(NO_MESSAGES);
  const [ids, setIds] = useState<{ leadId: string; eventId: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<SendFailure | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [shake, setShake] = useState<{ pulse: number; fields: string[] }>({
    pulse: 0,
    fields: [],
  });
  const [contactSeen, setContactSeen] = useState(false);
  const [shakesPlayed] = useState(() => new Map<string, number>());
  const busy = useRef(false);
  const submitted = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const pendingFocus = useRef<Field | null>(null);

  const filled = useMemo(() => withCheckboxDefaults(flow, answers), [flow, answers]);
  const derived = engineDerived(FLAGS, filled);
  const sections = flow.steps.filter((step) => isStepShown(flow, step.id, filled, derived));
  const { token: turnstileToken, container: turnstileBox } = useTurnstile(
    restored && contactSeen,
    turnstileSiteKey,
  );

  // Restore once after mounting (sessionStorage exists only in the browser).
  useEffect(() => {
    const stored = readSession(sessionStore(), ENTRY, { energie: flowFingerprint(flow) });
    /* eslint-disable react-hooks/set-state-in-effect -- a one-time sync with browser-only state after hydration */
    if (stored) setAnswers({ ...preselect, ...stored.answers });
    setIds(
      stored
        ? { leadId: stored.leadId, eventId: stored.eventId }
        : { leadId: newId(), eventId: newId() },
    );
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [flow, preselect]);

  // Persist after every change: only the visitor's own answers, abandoned branches cleared.
  useEffect(() => {
    if (!restored || !ids || submitted.current) return;
    writeSession(sessionStore(), ENTRY, {
      version: STORAGE_VERSION,
      product: 'energie',
      flow: flowFingerprint(flow),
      step: null,
      answers: storableAnswers(flow, answers, engineDerived(FLAGS, answers)),
      leadId: ids.leadId,
      eventId: ids.eventId,
    });
  }, [flow, restored, ids, answers]);

  // Turnstile and the thank-you page's prefetch start once the contact section is in view.
  useEffect(() => {
    const target = contactRef.current;
    if (!target || contactSeen) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setContactSeen(true);
        prefetch(thanksPath('energie'));
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [contactSeen, sections.length]);

  // Back from the thank-you page (bfcache): start clean, the session was cleared on submit.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted && submitted.current) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Focus and bring into view the first error after the render that showed it.
  useEffect(() => {
    const field = pendingFocus.current;
    if (!field) return;
    pendingFocus.current = null;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const box = document.getElementById(`${domId.field(field.id)}-vak`);
    const target =
      document.getElementById(domId.field(field.id))?.querySelector<HTMLElement>('input') ??
      document.getElementById(domId.field(field.id));
    target?.focus({ preventScroll: true });
    box?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });

  const onChange = (field: Field, value: AnswerValue | undefined) => {
    if (busy.current) return;
    setAnswers((current) => withAnswer(current, field.id, value));
    setMessages((current) => {
      const { [field.id]: _e, ...errors } = current.errors;
      const { [field.id]: _w, ...warnings } = current.warnings;
      const { [field.id]: _s, ...suggestions } = current.suggestions;
      return { errors, warnings, suggestions };
    });
    setSendError(null);
  };

  // Text-like fields validate on blur once something is typed; "required" waits for the button.
  const onBlur = (field: Field, step: Step) => {
    if (!INPUT_TYPES.has(field.type)) return;
    const value = filled[field.id];
    if (value === undefined || (typeof value === 'string' && value.trim() === '')) return;
    const result = validateStep(flow, step.id, filled, derived);
    setMessages((current) => {
      const next: Messages = {
        errors: { ...current.errors },
        warnings: { ...current.warnings },
        suggestions: { ...current.suggestions },
      };
      for (const [key, map] of [
        ['errors', result.errors],
        ['warnings', result.warnings],
        ['suggestions', result.suggestions],
      ] as const) {
        const own = next[key] as Record<string, string>;
        const found = (map as Record<string, string>)[field.id];
        if (found) own[field.id] = found;
        else delete own[field.id];
      }
      return next;
    });
  };

  const submit = async () => {
    const all: Messages = { errors: {}, warnings: {}, suggestions: {} };
    const shown: Field[] = [];
    for (const step of sections) {
      const result = validateStep(flow, step.id, filled, derived);
      Object.assign(all.errors, result.errors);
      Object.assign(all.warnings, result.warnings);
      Object.assign(all.suggestions, result.suggestions);
      shown.push(...visibleFields(flow, step.id, filled, derived));
    }
    const flagged = shown.filter((field) => all.errors[field.id] !== undefined);
    if (flagged.length > 0) {
      const first = flagged[0]!;
      pendingFocus.current = first;
      setMessages(all);
      setShake((current) => ({ pulse: current.pulse + 1, fields: flagged.map((f) => f.id) }));
      setAnnouncement((current) =>
        liveText(current, errorMessage(copy, first, all.errors[first.id]!)),
      );
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setSendError(null);
    const leadIds = ids ?? { leadId: newId(), eventId: newId() };
    let submission: Submission;
    try {
      submission = buildSubmission(
        flow,
        filled,
        submissionContext({
          leadId: leadIds.leadId,
          eventId: leadIds.eventId,
          derived,
          page: window.location.pathname,
          search: window.location.search,
          store: sessionStore(),
          now: new Date(),
        }),
      );
    } catch {
      console.error('form: the submission could not be built');
      busy.current = false;
      setSubmitting(false);
      return;
    }
    const honeypot = honeypotRef.current?.value ?? '';
    const result = await sendLead(submission, { turnstileToken, honeypot });
    if (!result.ok) {
      console.error(`form: the lead could not be sent (${result.kind})`);
      busy.current = false;
      setSubmitting(false);
      setSendError(result.kind);
      setAnnouncement((current) => liveText(current, copy.submitErrors[result.kind]));
      return;
    }
    submitted.current = true;
    const store = sessionStore();
    clearAllSessions(store);
    try {
      if (!honeypotFilled(honeypot)) {
        store?.setItem(
          LEAD_SAFE_KEY,
          serializeLeadSafe({ event_id: submission.event_id, product: submission.product }),
        );
      }
      store?.setItem(MORPH_MARKER, 'form-card');
      // Staging goes on to the results (ADR 0013), which start from these answers: kept for
      // this tab only, like the form session the submit just cleared.
      if (afterLead) store?.setItem(COMPARISON_ANSWERS_KEY, JSON.stringify(filled));
    } catch {
      // No storage: the thank-you page shows without the cheer.
    }
    window.location.assign(afterLead ?? result.redirect);
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || !restored) return;
    void submit();
  };

  const text = (map: Record<string, string>, field: Field, kind: 'error' | 'warning') => {
    const code = map[field.id];
    if (!code) return undefined;
    return kind === 'error'
      ? errorMessage(copy, field, code as ErrorCode)
      : warningMessage(copy, field, code as WarningCode);
  };

  const renderField = (field: Field, step: Step) => {
    const common: Omit<FieldProps, 'field'> = {
      step,
      titleId: `${domId.field(step.id)}-titel`,
      value: filled[field.id],
      error: text(messages.errors, field, 'error'),
      warning: text(messages.warnings, field, 'warning'),
      onChange: (value) => onChange(field, value),
      onBlur: () => onBlur(field, step),
      icons,
      copy,
    };
    if (isCheckbox(field) && field.type === 'yes_no')
      return <CheckField field={field} {...common} />;
    switch (field.type) {
      case 'single_choice':
      case 'yes_no':
        return <ChoiceField field={field} {...common} />;
      case 'select':
        return <SelectField field={field} {...common} />;
      case 'checkbox':
      case 'consent':
        return <CheckField field={field} {...common} />;
      case 'day_slot':
        return <DaySlotField field={field} {...common} />;
      default:
        return (
          <InputField
            field={field}
            {...common}
            suggestion={messages.suggestions[field.id]}
            onApplySuggestion={(value) => {
              onChange(field, value);
              document.getElementById(domId.field(field.id))?.focus();
            }}
            flag={flag}
            readOnly={submitting}
          />
        );
    }
  };

  const cell = (field: Field, step: Step, className: string) => (
    <FieldCell
      key={field.id}
      fieldId={field.id}
      id={`${domId.field(field.id)}-vak`}
      reveal={field.visibleIf !== undefined}
      shake={shake.fields.includes(field.id) ? shake.pulse : 0}
      shakesPlayed={shakesPlayed}
      className={cx('min-w-0', className)}
    >
      {renderField(field, step)}
    </FieldCell>
  );

  const renderItem = (item: Item, step: Step): ReactNode => {
    if (item.kind === 'field') {
      return cell(item.field, step, half(item.field) ? 'md:col-span-1' : 'md:col-span-2');
    }
    if (item.kind === 'row') {
      return (
        <FieldCell
          key={item.key}
          fieldId={item.key}
          id={item.key}
          reveal={item.fields.some((field) => field.visibleIf !== undefined)}
          shake={0}
          shakesPlayed={shakesPlayed}
          className="min-w-0 md:col-span-2"
        >
          <p className="mb-1 text-label-sm text-ink-900">{item.label}</p>
          <div className="flex flex-wrap gap-x-6">
            {item.fields.map((field) => (
              <Fragment key={field.id}>{renderField(field, step)}</Fragment>
            ))}
          </div>
        </FieldCell>
      );
    }
    return (
      <FieldCell
        key={item.key}
        fieldId={item.key}
        id={item.key}
        reveal
        shake={0}
        shakesPlayed={shakesPlayed}
        className="min-w-0 md:col-span-2"
      >
        <div
          className={cx(
            'rounded-xl border border-lavender-300 p-4 md:p-5',
            item.tone === 'lavender' ? 'bg-lavender-100' : 'bg-lavender-50',
          )}
        >
          <FieldList className="-mb-6 grid md:grid-cols-2 md:gap-x-5">
            {item.items.map((inner) => renderItem(inner, step))}
          </FieldList>
          {item.note && (
            <p className="mt-6 flex items-start gap-3 rounded-lg bg-purple-600 px-4 py-3 text-sm text-white">
              <MaskIcon src={icons[UI_ICONS.info]} className="mt-0.5 size-5 shrink-0" />
              <span>{item.note}</span>
            </p>
          )}
        </div>
      </FieldCell>
    );
  };

  return (
    <FormMotion>
      <FormLayoutContext.Provider value="page">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
          {sections.map((step, index) => {
            const titleId = `${domId.field(step.id)}-titel`;
            const fields = visibleFields(flow, step.id, filled, derived);
            const isContact = step.id === 'contact';
            return (
              <section
                key={step.id}
                ref={isContact ? contactRef : undefined}
                aria-labelledby={titleId}
                className="rounded-2xl border border-lavender-300 bg-white px-5 py-6 shadow-form md:px-8 md:py-8"
              >
                <h2 id={titleId} className="flex items-center gap-3 text-title-sm text-ink-900">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-600 text-sm font-semibold text-white"
                  >
                    {LETTERS[index]}
                  </span>
                  {step.title}
                </h2>
                {step.subtitle && <p className="mt-2 text-body text-ink-600">{step.subtitle}</p>}
                <FieldList className="mt-6 -mb-6 grid md:grid-cols-2 md:gap-x-5">
                  {layout(step, fields).map((item) => renderItem(item, step))}
                </FieldList>
                {isContact && (
                  // The honeypot (brief §9.1 step 3): hidden from people, screen readers and
                  // the tab order. Not a flow field: never stored.
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
              </section>
            );
          })}
          <div ref={turnstileBox} className="flex justify-center empty:hidden" />
          {sendError && (
            <div>
              <FadeInText id="formulier-verzendfout" className="text-body text-danger">
                {copy.submitErrors[sendError]}
              </FadeInText>
              {sendError === 'invalid' && (
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
          <div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-ink-600">{copy.singlePage.requiredNote}</p>
            <FormButton
              type="submit"
              variant="primary"
              icon={icons[UI_ICONS.next]}
              iconPosition="end"
              busy={submitting}
              disabled={!restored}
            >
              {copy.singlePage.submit}
            </FormButton>
          </div>
        </form>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </FormLayoutContext.Provider>
    </FormMotion>
  );
}
