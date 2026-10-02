// Screen 6, the order's thank-you page (Figma 254:14001): the reference chip, the title, a line
// with the visitor's name and the supplier, "Wat er daarna gebeurt" and two buttons; beside it
// "Waarom VoordeelVinder". The name and reference come from this tab's order (placeholders until
// the order API, ADR 0013); without an order the line falls back to the generic parts.
import { useEffect, useState } from 'react';

import { fill, type OrderCopy } from '../../lib/comparison/copy';
import { readOrder, type OrderState } from '../../lib/comparison/order-state';
import type { Comparison } from '../../lib/comparison/types';
import { OrderSummary } from './OrderIsland';

export default function ThanksIsland({
  copy,
  comparison,
  contactEmail,
}: {
  copy: OrderCopy;
  comparison: Comparison;
  /** site.json contact.email.value: the "Contact" button's address. */
  contactEmail: string;
}) {
  const t = copy.order.thanks;
  const [order, setOrder] = useState<OrderState | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-time read of browser-only state after hydration
    setOrder(readOrder());
  }, []);
  const offer = comparison.offers.find((candidate) => candidate.id === order?.offerId);
  const name = [order?.details.firstName, order?.details.lastName].filter(Boolean).join(' ');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,676fr)_minmax(0,320fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-2xl bg-purple-600 p-6 text-white surface-dark md:p-10">
          {order?.reference && (
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-ink-900">
              ✓ {fill(t.badge, { reference: order.reference })}
            </p>
          )}
          <h1 className="mt-4 text-h3 md:text-h2">{t.title}</h1>
          <p className="mt-4 text-body-lg text-on-purple-muted">
            {fill(t.body, { name: name || '', supplier: offer?.supplier ?? '' })
              .replace(' ,', ',')
              .replace('bij  is', 'is')}
          </p>
        </section>
        <section className="rounded-2xl border border-lavender-300 bg-white p-6 shadow-form md:p-8">
          <h2 className="text-title text-ink-900">{t.nextTitle}</h2>
          <ol className="mt-5 grid gap-4">
            {t.next.map((item, index) => (
              <li key={item} className="flex items-start gap-4 text-body text-ink-900">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-600 text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <span className="pt-1.5">{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-lavender-300 pt-6">
            <button
              type="button"
              className="flex min-h-11 items-center rounded-full bg-purple-600 px-6 text-button text-white"
            >
              {t.mail}
            </button>
            <a
              href={`mailto:${contactEmail}`}
              className="flex min-h-11 items-center rounded-full border border-purple-600 px-6 text-button text-ink-900"
            >
              {t.contact}
            </a>
          </div>
        </section>
      </div>
      <OrderSummary copy={copy} offer={undefined} />
    </div>
  );
}
