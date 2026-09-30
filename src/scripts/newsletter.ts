// The footer newsletter form is on every page, so this part stays tiny: it takes over the
// submit and loads the real work (src/scripts/newsletter-form.ts, with the e-mail validator)
// only once the form is near the viewport or gets focus. Without JavaScript the browser's own
// checks apply and the form posts to the endpoint as is.
import { loadFailure } from '../lib/newsletter-loader';
import type { NewsletterForm } from './newsletter-form';

const form = document.querySelector<HTMLFormElement>('form[data-newsletter="on"]');

if (form) {
  // The form shows its own inline messages instead of the browser's bubbles.
  form.noValidate = true;
  const reload = form.querySelector<HTMLElement>('[data-newsletter-reload]');
  reload?.querySelector('button')?.addEventListener('click', () => location.reload());
  let enhanced: Promise<NewsletterForm> | undefined;
  const load = () => {
    enhanced ??= import('./newsletter-form')
      .then(({ enhance }) => {
        // A reload offered after a failed try is moot now: the form reports its own states.
        if (reload) reload.hidden = true;
        return enhance(form);
      })
      .catch((error: unknown) => {
        enhanced = undefined;
        throw error;
      });
    return enhanced;
  };

  form.addEventListener('focusin', () => void load().catch(() => {}), { once: true });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void load()
      .then((controller) => controller.submit())
      .catch(() => {
        // The script didn't load: say why in the live region, with the reload button when only
        // a reload helps (src/lib/newsletter-loader.ts).
        const failure = loadFailure(navigator.onLine);
        const status = form.querySelector<HTMLElement>('[data-newsletter-status]');
        const message = failure === 'offline' ? form.dataset.offline : form.dataset.reload;
        if (status && message) {
          status.dataset.tone = 'error';
          status.textContent = message;
        }
        if (reload) reload.hidden = failure !== 'reload';
      });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void load().catch(() => {});
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(form);
  }
}
