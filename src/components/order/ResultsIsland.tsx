// Screen 2, the results (Figma 221:5711): the visitor's data, their current contract, a call-back
// card and filters on the left; the savings banner, the chosen filters and the offers (cheapest
// first) on the right. Runs on placeholder data until the tariff API exists (ADR 0013); every
// filter works on that data. "Kies dit contract" remembers the offer and opens the order.
import { useEffect, useMemo, useState } from 'react';

import { dutchDate, euro, euroRound, fill, type OrderCopy } from '../../lib/comparison/copy';
import { formAnswers, readOrder, writeOrder } from '../../lib/comparison/order-state';
import { ORDER_PATHS } from '../../lib/comparison/preview';
import type { Comparison, Offer, PaymentMethod, Tariff } from '../../lib/comparison/types';
import { cx } from '../form/ui';

type Labels = Record<string, Record<string, string>>;

export type ResultsIslandProps = {
  copy: OrderCopy;
  comparison: Comparison;
  /** Option labels of the single-page form by field id (supplier, meter_type…). */
  labels: Labels;
  fox: { src: string; width: number; height: number };
};

type Filters = {
  green: 'yes' | 'no' | null;
  tariff: 'all' | Tariff;
  suppliers: string[];
  payment: PaymentMethod | null;
  discounts: boolean;
};

const START: Filters = {
  green: null,
  tariff: 'all',
  suppliers: [],
  payment: null,
  discounts: true,
};
const SHOWN_SUPPLIERS = 3;

const card = 'rounded-2xl border border-lavender-300 bg-white p-5 shadow-form md:p-6';
const pill =
  'group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-lavender-300 bg-lavender-50 px-3 text-sm text-ink-900 transition-[border-color] duration-(--motion-duration-fast) has-checked:border-purple-600 has-checked:ring-1 has-checked:ring-purple-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-purple-500';
const dot =
  'size-[18px] shrink-0 rounded-full border border-control-border bg-white transition-[border-width,border-color] duration-(--motion-duration-fast) group-has-checked:border-[6px] group-has-checked:border-purple-600';

function Radio({
  name,
  checked,
  label,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={pill}>
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      <span aria-hidden="true" className={dot} />
      {label}
    </label>
  );
}

export default function ResultsIsland({ copy, comparison, labels, fox }: ResultsIslandProps) {
  const c = copy.results;
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [profileOpen, setProfileOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(START);
  const [allSuppliers, setAllSuppliers] = useState(false);
  const [monthly, setMonthly] = useState(false);

  // The form's answers live in this tab's sessionStorage: read after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-time read of browser-only state after hydration
    setAnswers(formAnswers());
  }, []);

  const offers = useMemo(
    () =>
      comparison.offers.filter(
        (offer) =>
          (filters.tariff === 'all' || offer.tariff === filters.tariff) &&
          (filters.green === null ||
            (filters.green === 'yes' ? offer.greenPercent === 100 : offer.greenPercent < 100)) &&
          (filters.suppliers.length === 0 || filters.suppliers.includes(offer.supplier)) &&
          (filters.payment === null || offer.payment.includes(filters.payment)),
      ),
    [comparison.offers, filters],
  );
  const cost = (offer: Offer) =>
    filters.discounts ? offer.yearlyCost : offer.yearlyCost + offer.discountFirstYear;
  const best = comparison.offers[0];
  // The visitor's own supplier when the form named one, else the data's wording.
  const ownSupplier =
    typeof answers.supplier === 'string' && !['other', 'unknown'].includes(answers.supplier)
      ? labels.supplier?.[answers.supplier]
      : undefined;
  const currentName = ownSupplier ?? comparison.current.supplier;
  const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const suppliers = [...new Set(comparison.offers.map((offer) => offer.supplier))];

  const label = (field: string, code: unknown) =>
    typeof code === 'string' ? (labels[field]?.[code] ?? code) : c.profile.unknown;
  const kwh = [answers.electricity_kwh, answers.gas_kwh].filter(Boolean).join(' + ');
  const profileRows: [string, string][] = [
    [
      c.profile.postcode,
      typeof answers.postcode === 'string' ? answers.postcode : c.profile.unknown,
    ],
    [
      c.profile.consumption,
      kwh
        ? `${kwh} ${c.profile.consumptionUnit}`
        : answers.knows_consumption === 'no'
          ? c.profile.estimated
          : c.profile.unknown,
    ],
    [c.profile.meterType, label('meter_type', answers.meter_type)],
    [
      c.profile.solar,
      answers.has_solar === 'yes'
        ? c.profile.yes
        : answers.has_solar === 'no'
          ? c.profile.no
          : c.profile.unknown,
    ],
    [c.profile.supplier, label('supplier', answers.supplier)],
  ];

  const chips: { key: string; name: string; clear: () => void }[] = [];
  if (filters.tariff !== 'all')
    chips.push({
      key: 'tariff',
      name: `${c.filters.tariff}: ${c.filters.tariffOptions[filters.tariff]}`,
      clear: () => setFilters((f) => ({ ...f, tariff: 'all' })),
    });
  if (filters.green)
    chips.push({
      key: 'green',
      name: `${c.filters.green}: ${filters.green === 'yes' ? c.filters.yes : c.filters.no}`,
      clear: () => setFilters((f) => ({ ...f, green: null })),
    });
  for (const supplier of filters.suppliers)
    chips.push({
      key: `s-${supplier}`,
      name: supplier,
      clear: () =>
        setFilters((f) => ({ ...f, suppliers: f.suppliers.filter((s) => s !== supplier) })),
    });
  if (filters.payment)
    chips.push({
      key: 'payment',
      name: c.filters.paymentOptions[filters.payment],
      clear: () => setFilters((f) => ({ ...f, payment: null })),
    });

  const choose = (offer: Offer) => {
    writeOrder({ ...readOrder(), offerId: offer.id });
    window.location.assign(`${ORDER_PATHS.details}?aanbod=${encodeURIComponent(offer.id)}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320fr)_minmax(0,676fr)]">
      <aside className="flex flex-col gap-5">
        <section className={card} aria-labelledby="resultaten-gegevens">
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-controls="resultaten-gegevens-lijst"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 id="resultaten-gegevens" className="text-label text-ink-900">
              {c.profile.title}
            </h2>
            <span
              aria-hidden="true"
              className={cx(
                'text-purple-600 transition-transform duration-(--motion-duration-base)',
                profileOpen ? 'rotate-180' : '',
              )}
            >
              ⌄
            </span>
          </button>
          <div id="resultaten-gegevens-lijst" hidden={!profileOpen} className="mt-3">
            <dl className="divide-y divide-lavender-300 text-sm">
              {profileRows.map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-600">{term}</dt>
                  <dd className="text-right text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
            <a
              href="/vergelijken/energie"
              className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-purple-600 px-5 text-button text-white"
            >
              {c.profile.edit}
            </a>
          </div>
        </section>

        <section className={card} aria-labelledby="resultaten-huidig">
          <h2 id="resultaten-huidig" className="text-label text-ink-900">
            {c.current.title}
          </h2>
          <label className="mt-4 block text-sm text-ink-600" htmlFor="resultaten-leverancier">
            {c.current.supplierLabel}
          </label>
          <select
            id="resultaten-leverancier"
            defaultValue={typeof answers.supplier === 'string' ? answers.supplier : ''}
            key={String(answers.supplier ?? '')}
            className="mt-1.5 h-11 w-full rounded-lg border border-control-border bg-lavender-50 px-3 text-sm text-ink-900"
          >
            {Object.entries(labels.supplier ?? {}).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-sm text-ink-600" htmlFor="resultaten-pakket">
            {c.current.packageLabel}
          </label>
          <select
            id="resultaten-pakket"
            defaultValue=""
            className="mt-1.5 h-11 w-full rounded-lg border border-control-border bg-lavender-50 px-3 text-sm text-ink-placeholder"
          >
            <option value="" disabled>
              {c.current.packagePlaceholder}
            </option>
          </select>
          <button
            type="button"
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-lime-400 px-5 text-button text-ink-900"
          >
            {c.current.button}
          </button>
        </section>

        <section className={cx(card, 'text-center')}>
          <p className="text-title text-purple-700">{c.callback.phone}</p>
          <p className="mt-1 text-sm text-ink-600">{c.callback.hours}</p>
          <p className="mt-4 text-body font-semibold text-ink-900">{c.callback.link}</p>
        </section>

        <section className={card} aria-labelledby="resultaten-filters">
          <h2 id="resultaten-filters" className="text-label text-ink-900">
            {c.filters.title}
          </h2>
          <fieldset className="mt-4">
            <legend className="mb-2 text-label-sm text-ink-900">{c.filters.green}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['yes', 'no'] as const).map((value) => (
                <Radio
                  key={value}
                  name="groen"
                  checked={filters.green === value}
                  label={c.filters[value]}
                  onChange={() => setFilters((f) => ({ ...f, green: value }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-label-sm text-ink-900">{c.filters.tariff}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['all', 'fixed', 'variable', 'dynamic'] as const).map((value) => (
                <Radio
                  key={value}
                  name="tarief"
                  checked={filters.tariff === value}
                  label={c.filters.tariffOptions[value]}
                  onChange={() => setFilters((f) => ({ ...f, tariff: value }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-label-sm text-ink-900">{c.filters.suppliers}</legend>
            <div className="grid gap-1">
              {(allSuppliers ? suppliers : suppliers.slice(0, SHOWN_SUPPLIERS)).map((supplier) => (
                <label
                  key={supplier}
                  className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-ink-900"
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-purple-600"
                    checked={filters.suppliers.includes(supplier)}
                    onChange={(event) =>
                      setFilters((f) => ({
                        ...f,
                        suppliers: event.target.checked
                          ? [...f.suppliers, supplier]
                          : f.suppliers.filter((s) => s !== supplier),
                      }))
                    }
                  />
                  {supplier}
                </label>
              ))}
            </div>
            {suppliers.length > SHOWN_SUPPLIERS && (
              <button
                type="button"
                onClick={() => setAllSuppliers((all) => !all)}
                className="mt-1 text-sm text-purple-700 underline underline-offset-2"
              >
                {allSuppliers ? c.filters.less : c.filters.more}
              </button>
            )}
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-label-sm text-ink-900">{c.filters.payment}</legend>
            <div className="grid gap-2">
              {(['direct_debit', 'transfer'] as const).map((value) => (
                <Radio
                  key={value}
                  name="betaling"
                  checked={filters.payment === value}
                  label={c.filters.paymentOptions[value]}
                  onChange={() => setFilters((f) => ({ ...f, payment: value }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-label-sm text-ink-900">{c.filters.discounts}</legend>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((value) => (
                <Radio
                  key={String(value)}
                  name="kortingen"
                  checked={filters.discounts === value}
                  label={value ? c.filters.yes : c.filters.no}
                  onChange={() => setFilters((f) => ({ ...f, discounts: value }))}
                />
              ))}
            </div>
          </fieldset>
        </section>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        {comparison.placeholder && (
          <p className="rounded-lg border border-purple-500 bg-lavender-100 px-4 py-3 text-sm text-ink-900">
            {copy.preview.notice}
          </p>
        )}
        {best && (
          <section className="relative overflow-hidden rounded-2xl bg-lime-300 p-5 md:p-7">
            <p className="text-sm text-ink-900">{c.hero.eyebrow}</p>
            <p className="mt-1 text-h4 text-ink-900">
              {euroRound(comparison.current.yearlyCost - best.yearlyCost)}{' '}
              <span className="text-title-sm">{c.hero.perYear}</span>
            </p>
            <p className="mt-1 text-sm text-ink-900">
              {fill(c.hero.fromTo, {
                current: capital(currentName),
                currentCost: euro(comparison.current.yearlyCost),
                best: best.supplier,
                bestCost: euro(best.yearlyCost),
              })}
            </p>
            <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink-900">
              {fill(c.hero.less, {
                percent: Math.round(
                  ((comparison.current.yearlyCost - best.yearlyCost) /
                    comparison.current.yearlyCost) *
                    100,
                ),
              })}
            </p>
            <img
              src={fox.src}
              width={fox.width}
              height={fox.height}
              alt=""
              className="pointer-events-none absolute -right-2 bottom-0 hidden h-36 w-auto md:block"
            />
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            {chips.length > 0 && <span>{c.filters.chosen}</span>}
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                aria-label={fill(c.filters.remove, { name: chip.name })}
                className="rounded-full bg-purple-600 px-3 py-1 text-sm text-white"
              >
                {chip.name} ×
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMonthly((on) => !on)}
            className="text-sm text-purple-700 underline underline-offset-2"
          >
            {monthly ? c.yearlyToggle : c.monthlyToggle}
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {fill(c.subtitle, { count: offers.length })}
        </p>
        {offers.length === 0 && (
          <p className={cx(card, 'text-body text-ink-600')}>{c.filters.empty}</p>
        )}
        <ol className="flex flex-col gap-5">
          {offers.map((offer, index) => {
            const yearly = cost(offer);
            const saving = comparison.current.yearlyCost - yearly;
            return (
              <li
                key={offer.id}
                className="rounded-2xl border border-lavender-300 bg-white shadow-form"
              >
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      {index === 0 && offer.id === best?.id && (
                        <span className="mb-3 inline-block rounded-full bg-purple-500 px-3 py-1 text-sm text-white">
                          {c.card.best}
                        </span>
                      )}
                      <p className="text-sm text-ink-600">
                        {fill(c.card.updated, { date: dutchDate(offer.updated) })}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="grid size-12 shrink-0 place-items-center rounded-xs border border-lavender-300 bg-lavender-50 text-title-sm text-purple-600"
                        >
                          {offer.initials}
                        </span>
                        <div>
                          <h3 className="text-title-sm text-ink-900">
                            {offer.supplier} {offer.product}
                          </h3>
                          <p className="text-sm text-ink-600">
                            {'★'.repeat(Math.round(offer.rating))}{' '}
                            {fill(c.card.reviews, { count: offer.reviewCount })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {saving > 0 && (
                        <p className="text-sm text-purple-700">
                          {fill(c.card.comparedTo, {
                            saving: euroRound(saving),
                            current: currentName,
                          })}
                        </p>
                      )}
                      <p className="mt-1 text-h4 text-ink-900">
                        {euroRound(monthly ? yearly / 12 : yearly)}{' '}
                        <span className="text-sm text-ink-600">
                          {monthly ? c.card.perMonth : c.card.perYear}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 border-t border-lavender-300 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-center">
                    <ul className="grid gap-2 text-sm text-ink-900">
                      {offer.discountFirstYear > 0 && (
                        <li>
                          {fill(c.card.discount, { amount: euroRound(offer.discountFirstYear) })}
                        </li>
                      )}
                      <li>
                        <span className="mr-1.5 rounded-full bg-lime-300 px-2 py-0.5 text-sm">
                          {offer.greenPercent}%
                        </span>
                        {c.card.green}
                      </li>
                    </ul>
                    <ul className="grid gap-2 text-sm text-ink-900">
                      <li>{c.card[offer.tariff]}</li>
                      <li>{fill(c.card.duration, { months: offer.durationMonths })}</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => choose(offer)}
                      className="flex min-h-11 items-center justify-center rounded-full bg-lime-400 px-6 text-button text-ink-900 transition-[scale] duration-(--motion-duration-fast) motion-safe:active:scale-[0.98]"
                    >
                      {c.card.cta}
                    </button>
                  </div>
                </div>
                <div className="grid border-t border-lavender-300 md:grid-cols-3">
                  {(
                    [
                      ['details', c.card.detailsBody],
                      ['price', c.card.priceBody],
                      ['rating', c.card.ratingBody],
                    ] as const
                  ).map(([key, body]) => (
                    <details
                      key={key}
                      className="group border-lavender-300 px-5 py-3 md:border-l md:px-7 md:first:border-l-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink-900">
                        {c.card[key]}
                        <span
                          aria-hidden="true"
                          className="transition-transform group-open:rotate-180"
                        >
                          ⌄
                        </span>
                      </summary>
                      <p className="mt-2 text-sm text-ink-600">{body}</p>
                    </details>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
