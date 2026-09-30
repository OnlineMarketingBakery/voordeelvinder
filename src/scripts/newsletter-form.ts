// The footer newsletter form, enhanced (brief §5, §9.1). Loaded by src/scripts/newsletter.ts
// only once the form is near the viewport or gets focus. Validates the address with the form's
// own validator, loads Turnstile when the e-mail field gets focus, posts JSON to
// /api/newsletter and reports every state in the form's live region. The copy comes from
// site.json (the form's data-copy). Never logs an address (brief §13).
import { liveText } from '../lib/form/messages';
import {
  checkEmail,
  describedBy,
  errorField,
  NEWSLETTER_ENDPOINT,
  newsletterBody,
  sendSignup,
  suggestionText,
  type NewsletterCopy,
  type NewsletterError,
} from '../lib/newsletter';
import { createTurnstileWidget, type TurnstileWidget } from '../lib/turnstile';

/** The first token can take a while (the script loads on focus); then it is quick. */
const TOKEN_WAIT_MS = 15_000;

export type NewsletterForm = { submit(): Promise<void> };

function part<T extends Element>(form: ParentNode, selector: string): T {
  const element = form.querySelector<T>(selector);
  if (!element) throw new Error(`newsletter form: ${selector} is missing`);
  return element;
}

/** sessionStorage, for the test-mode flag; null where it is blocked (reading it can throw). */
function sessionFlags(): Pick<Storage, 'getItem'> | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function enhance(form: HTMLFormElement): NewsletterForm {
  const copy = JSON.parse(form.dataset.copy ?? '{}') as NewsletterCopy;
  const email = part<HTMLInputElement>(form, 'input[name="email"]');
  const consent = part<HTMLInputElement>(form, 'input[name="consent"]');
  const honeypot = part<HTMLInputElement>(form, 'input[name="website"]');
  const button = part<HTMLButtonElement>(form, 'button[type="submit"]');
  const status = part<HTMLElement>(form, '[data-newsletter-status]');
  const suggestionBox = part<HTMLElement>(form, '[data-newsletter-suggestion]');
  const suggestionButton = part<HTMLButtonElement>(suggestionBox, 'button');
  const announcer = part<HTMLElement>(form, '[data-newsletter-announce]');
  const turnstileBox = part<HTMLElement>(form, '[data-newsletter-turnstile]');
  let widget: TurnstileWidget | undefined;
  /** Loads Turnstile and renders its widget, once; again after the script failed to load. */
  function turnstile(): TurnstileWidget {
    if (widget?.broken) {
      widget.remove();
      widget = undefined;
    }
    widget ??= createTurnstileWidget({
      container: turnstileBox,
      siteKey: form.dataset.sitekey ?? '',
      action: 'newsletter',
      size: 'flexible',
    });
    return widget;
  }

  let sending = false;
  let invalid: HTMLInputElement | undefined;
  let suggested: string | undefined;

  function say(text: string, tone: 'info' | 'success' | 'error') {
    status.dataset.tone = tone;
    status.textContent = liveText(status.textContent ?? '', text);
  }

  function clearStatus() {
    status.textContent = '';
    delete status.dataset.tone;
  }

  /** aria-invalid and aria-describedby of both fields, from `invalid` and `suggested`. */
  function describe() {
    for (const input of [email, consent]) {
      if (input === invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      const ids = describedBy({
        error: input === invalid ? status.id : undefined,
        suggestion: input === email && suggested ? suggestionBox.id : undefined,
      });
      if (ids) input.setAttribute('aria-describedby', ids);
      else input.removeAttribute('aria-describedby');
    }
  }

  function markInvalid(field: HTMLInputElement | undefined) {
    invalid = field;
    describe();
  }

  function showError(error: NewsletterError, { focus = false } = {}) {
    const which = errorField(error);
    const field = which === 'email' ? email : which === 'consent' ? consent : undefined;
    markInvalid(field);
    say(copy.errors[error], 'error');
    if (focus) field?.focus();
  }

  function showSuggestion(suggestion: string | undefined) {
    suggested = suggestion;
    suggestionBox.hidden = suggestion === undefined;
    suggestionButton.textContent = suggestion ? suggestionText(copy, suggestion) : '';
    if (!suggestion) announcer.textContent = '';
    describe();
  }

  /** Clears an error about `field` once the visitor changes it. */
  function clearErrorOf(field: HTMLInputElement) {
    if (invalid !== field) return;
    markInvalid(undefined);
    clearStatus();
  }

  function lock(locked: boolean) {
    sending = locked;
    // aria-disabled, not disabled: the button keeps focus while the request runs.
    if (locked) {
      button.setAttribute('aria-disabled', 'true');
      form.setAttribute('aria-busy', 'true');
    } else {
      button.removeAttribute('aria-disabled');
      form.removeAttribute('aria-busy');
    }
  }

  email.addEventListener('focus', () => void turnstile(), { once: true });
  if (document.activeElement === email) turnstile();

  email.addEventListener('input', () => {
    clearErrorOf(email);
    showSuggestion(undefined);
  });
  // Validate on blur once something is typed (brief §7.5); "required" waits for the submit.
  function checkTyped() {
    if (sending || email.value.trim() === '') return;
    const check = checkEmail(email.value);
    showSuggestion(check.suggestion);
    if (!check.ok) showError(check.error);
    // Focus has moved on, so the field's description isn't read: announce the suggestion.
    if (check.suggestion) {
      announcer.textContent = liveText(
        announcer.textContent ?? '',
        suggestionText(copy, check.suggestion),
      );
    }
  }
  email.addEventListener('blur', checkTyped);
  // Typed and left before this script arrived (it loads on the first focus): check it now.
  if (document.activeElement !== email) checkTyped();
  consent.addEventListener('change', () => clearErrorOf(consent));
  suggestionButton.addEventListener('click', () => {
    if (!suggested) return;
    email.value = suggested;
    showSuggestion(undefined);
    clearErrorOf(email);
    email.focus();
  });

  async function submit() {
    if (sending) return;
    const check = checkEmail(email.value);
    showSuggestion(check.suggestion);
    if (!check.ok) {
      showError(check.error, { focus: true });
      return;
    }
    if (!consent.checked) {
      showError('consent_required', { focus: true });
      return;
    }

    markInvalid(undefined);
    lock(true);
    say(copy.messages.sending, 'info');
    // A fresh token per request: take() hands each one out once.
    const token = await turnstile().take(TOKEN_WAIT_MS);
    // A request without an answer gives up after SIGNUP_TIMEOUT_MS ('network'), so the button
    // unlocks.
    const outcome: 'success' | NewsletterError = token
      ? await sendSignup(
          newsletterBody({
            email: check.email,
            website: honeypot.value,
            token,
            pathname: location.pathname,
            search: location.search,
            store: sessionFlags(),
          }),
          { endpoint: form.getAttribute('action') ?? NEWSLETTER_ENDPOINT },
        )
      : 'verification_failed';
    lock(false);

    if (outcome === 'success') {
      form.reset();
      showSuggestion(undefined);
      say(copy.messages.success, 'success');
    } else {
      // The typed address stays, so a retry is one click.
      showError(outcome);
    }
  }

  return { submit };
}
