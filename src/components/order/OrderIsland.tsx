// Screens 3–5, ordering (Figma 241:7189 your details, 249:10051 connection, 250:12053 check and
// confirm): a progress bar over three steps, the step's form cards on the left, the chosen
// contract and "Waarom VoordeelVinder" on the right. Prefilled from the single-page form's
// answers in this tab; every step validates before it moves on. Nothing is sent: "Bevestig je
// bestelling" only makes a placeholder reference and opens the thank-you page, until the order
// API exists (ADR 0013).
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { euro, fill, type OrderCopy } from '../../lib/comparison/copy';
import {
  formAnswers,
  isBelgianIban,
  isBirthDate,
  isEan,
  placeholderReference,
  readOrder,
  writeOrder,
  type OrderConnection,
  type OrderDetails,
  type OrderState,
} from '../../lib/comparison/order-state';
import { ORDER_PATHS, resultsPath } from '../../lib/comparison/preview';
import type { Comparison, Offer } from '../../lib/comparison/types';
import { validateField } from '../../lib/flow/validators';
import { cx, MaskIcon } from '../form/ui';

export type OrderStep = 'details' | 'connection' | 'review';

export type OrderIslandProps = {
  step: OrderStep;
  copy: OrderCopy;
  comparison: Comparison;
  /** Option labels of the single-page form by field id (supplier, meter_type…). */
  labels: Record<string, Record<string, string>>;
  icons: Record<string, string>;
};

const card = 'rounded-2xl border border-lavender-300 bg-white p-5 shadow-form md:p-8';
const input =
  'h-12 w-full min-w-0 rounded-lg border bg-lavender-50 px-4 text-body text-ink-900 placeholder:text-ink-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500';
const choice =
  'group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-lavender-300 bg-lavender-50 px-3 text-sm text-ink-900 has-checked:border-purple-600 has-checked:ring-1 has-checked:ring-purple-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-purple-500';
const dot =
  'size-[18px] shrink-0 rounded-full border border-control-border bg-white transition-[border-width] duration-(--motion-duration-fast) group-has-checked:border-[6px] group-has-checked:border-purple-600';

type Errors = Record<string, string>;

/** The first day of the month after next: a common supplier start date (placeholder rule). */
function proposedStart(today = new Date()): string {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 1));
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

const HOME_TO_BUILDING: Record<string, string> = {
  detached: 'detached',
  semi_detached: 'semi_detached',
  terraced: 'terraced',
  apartment: 'apartment',
};

function Field({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className="mb-2 block text-label-sm text-ink-900">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-sm text-ink-600">{hint}</p>}
      {error && (
        <p id={`${id}-fout`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Choices({
  name,
  legend,
  required,
  options,
  value,
  onChange,
  error,
  columns = 'md:grid-cols-2',
  icons,
}: {
  name: string;
  legend: string;
  required?: boolean;
  options: [string, string][];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string | undefined;
  columns?: string;
  icons?: Record<string, string>;
}) {
  return (
    <fieldset
      id={`bestel-${name}`}
      tabIndex={-1}
      aria-describedby={error ? `bestel-${name}-fout` : undefined}
    >
      <legend className="mb-2 text-label-sm text-ink-900">
        {legend}
        {required && <span aria-hidden="true"> *</span>}
      </legend>
      <div className={cx('grid gap-2.5', columns)}>
        {options.map(([code, text]) => (
          <label
            key={code}
            className={cx(choice, icons && 'min-h-[90px] flex-col justify-center text-center')}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={value === code}
              onChange={() => onChange(code)}
            />
            {icons ? (
              <MaskIcon src={icons[code]} className="h-8 w-12 text-purple-600" />
            ) : (
              <span aria-hidden="true" className={dot} />
            )}
            <span>{text}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`bestel-${name}-fout`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
  error,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | undefined;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-sm text-ink-900"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-purple-600"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={error ? `${id}-fout` : undefined}
        />
        {label}
      </label>
      {error && (
        <p id={`${id}-fout`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={card} aria-labelledby={`bestel-sectie-${number}`}>
      <h2
        id={`bestel-sectie-${number}`}
        className="flex items-center gap-3 text-title-sm text-ink-900"
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-600 text-sm font-semibold text-white"
        >
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function OrderSummary({ copy, offer }: { copy: OrderCopy; offer: Offer | undefined }) {
  const s = copy.order.summary;
  const w = copy.order.why;
  return (
    <aside className="flex flex-col gap-5">
      {offer && (
        <section className="rounded-2xl border border-lavender-300 bg-white p-5 shadow-form">
          <p className="flex items-center gap-3 text-label-sm text-ink-900">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xs border border-lavender-300 bg-lavender-50 text-purple-600"
            >
              {offer.initials}
            </span>
            {offer.supplier} {offer.product}
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">{s.firstYear}</dt>
              <dd className="font-semibold text-ink-900">{euro(offer.yearlyCost)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">{s.monthly}</dt>
              <dd className="font-semibold text-ink-900">{euro(offer.monthlyAdvance)}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-lime-300 px-3 py-2 text-sm text-ink-900">{s.saving}</p>
          <p className="mt-3 text-sm text-ink-600">{s.anytime}</p>
        </section>
      )}
      <section className="rounded-2xl border border-lavender-300 bg-white p-5 shadow-form">
        <h2 className="text-label text-ink-900">{w.title}</h2>
        <ul className="mt-3 grid gap-2.5 text-sm text-ink-900">
          {w.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="text-xs mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime-400"
              >
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-lavender-300 pt-3 text-sm text-ink-600">
          {w.rating}
          <span className="text-ink-900">★★★★★ {w.ratingValue}</span>
        </p>
      </section>
    </aside>
  );
}

export default function OrderIsland({ step, copy, comparison, labels, icons }: OrderIslandProps) {
  const o = copy.order;
  const [state, setState] = useState<OrderState>({ details: {}, connection: {} });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [ready, setReady] = useState(false);
  const focusFirst = useRef(false);

  // Restore the order and prefill from the form after hydration (browser-only storage).
  useEffect(() => {
    const form = formAnswers();
    const stored = readOrder();
    const offerId = new URLSearchParams(window.location.search).get('aanbod') ?? stored.offerId;
    const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
    const details: OrderDetails = {
      firstName: str(form.first_name),
      lastName: str(form.last_name),
      email: str(form.email),
      phone: str(form.phone),
      postcode: str(form.postcode),
      buildingType: HOME_TO_BUILDING[str(form.home_type) ?? ''],
      paymentMethod: 'direct_debit',
      ...stored.details,
    };
    const connection: OrderConnection = {
      digitalMeter: str(form.digital_meter),
      electricCar: str(form.electric_car),
      currentSupplier: str(form.supplier),
      currentGasSupplier: str(form.supplier),
      ...stored.connection,
    };
    /* eslint-disable react-hooks/set-state-in-effect -- a one-time sync with browser-only state after hydration */
    setAnswers(form);
    setState({ ...stored, offerId: offerId ?? undefined, details, connection });
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (ready) writeOrder(state);
  }, [ready, state]);

  useEffect(() => {
    if (!focusFirst.current) return;
    focusFirst.current = false;
    const first = document.querySelector<HTMLElement>('[id$="-fout"]');
    const target = first?.id ? document.getElementById(first.id.replace(/-fout$/, '')) : null;
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  const offer =
    comparison.offers.find((candidate) => candidate.id === state.offerId) ?? comparison.offers[0];
  const d = state.details;
  const c = state.connection;
  const hasGas = answers.energy_type !== 'electricity';
  const setD = (patch: Partial<OrderDetails>) =>
    setState((s) => ({ ...s, details: { ...s.details, ...patch } }));
  const setC = (patch: Partial<OrderConnection>) =>
    setState((s) => ({ ...s, connection: { ...s.connection, ...patch } }));
  const supplierOptions = Object.entries(labels.supplier ?? {});

  const validate = (): Errors => {
    const found: Errors = {};
    const need = (key: string, value: unknown) => {
      if (value === undefined || value === '' || value === false) found[key] = o.required;
    };
    if (step === 'details') {
      need('bestel-salutation', d.salutation);
      need('bestel-voornaam', d.firstName?.trim());
      need('bestel-achternaam', d.lastName?.trim());
      if (!d.birthDate) need('bestel-geboortedatum', d.birthDate);
      else if (!isBirthDate(d.birthDate)) found['bestel-geboortedatum'] = o.invalid.date;
      if (!validateField(d.email, { id: 'email', type: 'email', required: true }).ok)
        found['bestel-email'] = d.email ? o.invalid.email : o.required;
      if (!validateField(d.phone, { id: 'phone', type: 'phone', required: true }).ok)
        found['bestel-telefoon'] = d.phone ? o.invalid.phone : o.required;
      need('bestel-building', d.buildingType);
      if (!validateField(d.postcode, { id: 'postcode', type: 'postcode', required: true }).ok)
        found['bestel-postcode'] = d.postcode ? o.invalid.postcode : o.required;
      need('bestel-straat', d.street?.trim());
      need('bestel-nummer', d.number?.trim());
      need('bestel-situation', d.situation);
      need('bestel-payment', d.paymentMethod);
      if (d.paymentMethod === 'direct_debit') {
        if (!d.iban) need('bestel-iban', d.iban);
        else if (!isBelgianIban(d.iban)) found['bestel-iban'] = o.invalid.iban;
      }
      need('bestel-voorwaarden', d.terms);
    }
    if (step === 'connection') {
      need('bestel-knowsEan', c.knowsEan);
      if (c.knowsEan === 'yes') {
        if (!c.ean) need('bestel-ean', c.ean);
        else if (!isEan(c.ean)) found['bestel-ean'] = o.invalid.ean;
      }
      need('bestel-leverancier', c.currentSupplier);
      if (c.otherStart) {
        if (!c.startDate) need('bestel-startdatum', c.startDate);
        else if (!isBirthDate(c.startDate, new Date(8640000000000000)))
          found['bestel-startdatum'] = o.invalid.date;
      }
      if (hasGas) {
        need('bestel-knowsGasEan', c.knowsGasEan);
        if (c.knowsGasEan === 'yes') {
          if (!c.gasEan) need('bestel-gasean', c.gasEan);
          else if (!isEan(c.gasEan)) found['bestel-gasean'] = o.invalid.ean;
        }
      }
    }
    return found;
  };

  const next = () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirst.current = true;
      return;
    }
    if (step === 'details') window.location.assign(ORDER_PATHS.connection);
    else if (step === 'connection') window.location.assign(ORDER_PATHS.review);
    else {
      writeOrder({ ...state, reference: placeholderReference() });
      window.location.assign(ORDER_PATHS.thanks);
    }
  };

  const back =
    step === 'details'
      ? resultsPath(comparison.product)
      : step === 'connection'
        ? ORDER_PATHS.details
        : ORDER_PATHS.connection;
  const labelsFor =
    step === 'details' ? o.details : step === 'connection' ? o.connection : o.review;
  const yesNo: [string, string][] = [
    ['yes', o.connection.yes],
    ['no', o.connection.no],
  ];
  const text = (
    key: string,
    label: string,
    value: string | undefined,
    set: (value: string) => void,
    extra: {
      required?: boolean;
      placeholder?: string;
      hint?: string;
      className?: string;
      inputMode?: 'numeric' | 'email' | 'tel' | 'text';
      autoComplete?: string;
    } = {},
  ) => (
    <Field
      id={key}
      label={label}
      required={extra.required}
      error={errors[key]}
      hint={extra.hint}
      className={extra.className}
    >
      <input
        id={key}
        className={cx(input, errors[key] ? 'border-danger' : 'border-control-border')}
        value={value ?? ''}
        placeholder={extra.placeholder}
        inputMode={extra.inputMode}
        autoComplete={extra.autoComplete}
        aria-invalid={errors[key] ? 'true' : undefined}
        aria-describedby={errors[key] ? `${key}-fout` : undefined}
        onChange={(event) => set(event.target.value)}
      />
    </Field>
  );

  const dd = o.details;
  const cc = o.connection;
  const rv = o.review;
  const opt = (map: Record<string, string>) => Object.entries(map) as [string, string][];
  const supplierName = (code: string | undefined) =>
    code ? (labels.supplier?.[code] ?? code) : '–';

  const reviewRow = (label: string, value: string | undefined) => (
    <div
      key={label}
      className="flex justify-between gap-4 border-b border-lavender-300 py-2.5 text-sm last:border-b-0"
    >
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right text-ink-900">{value && value !== '' ? value : '–'}</dd>
    </div>
  );
  const reviewCard = (title: string, edit: string, rows: ReactNode) => (
    <section className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-sm text-ink-900">{title}</h2>
        <a href={edit} className="text-sm text-purple-700 underline underline-offset-2">
          {rv.edit}
        </a>
      </div>
      <dl className="mt-4">{rows}</dl>
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,676fr)_minmax(0,320fr)]">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          next();
        }}
        className="flex min-w-0 flex-col gap-5"
      >
        {comparison.placeholder && (
          <p className="rounded-lg border border-purple-500 bg-lavender-100 px-4 py-3 text-sm text-ink-900">
            {copy.preview.notice}
          </p>
        )}
        {step === 'details' && (
          <>
            <Section number={1} title={dd.personal}>
              <div className="md:col-span-2">
                <Choices
                  name="salutation"
                  legend={dd.salutation}
                  required
                  columns="grid-cols-2 md:grid-cols-4"
                  options={opt(dd.salutationOptions)}
                  value={d.salutation}
                  onChange={(value) => setD({ salutation: value })}
                  error={errors['bestel-salutation']}
                />
              </div>
              {text('bestel-voornaam', dd.firstName, d.firstName, (v) => setD({ firstName: v }), {
                required: true,
                autoComplete: 'given-name',
              })}
              {text('bestel-achternaam', dd.lastName, d.lastName, (v) => setD({ lastName: v }), {
                required: true,
                autoComplete: 'family-name',
              })}
              {text(
                'bestel-geboortedatum',
                dd.birthDate,
                d.birthDate,
                (v) => setD({ birthDate: v }),
                {
                  required: true,
                  placeholder: dd.birthDatePlaceholder,
                  inputMode: 'numeric',
                  autoComplete: 'bday',
                },
              )}
              {text('bestel-email', dd.email, d.email, (v) => setD({ email: v }), {
                required: true,
                inputMode: 'email',
                autoComplete: 'email',
              })}
              {text('bestel-telefoon', dd.phone, d.phone, (v) => setD({ phone: v }), {
                required: true,
                inputMode: 'tel',
                autoComplete: 'tel',
                placeholder: '478 12 34 56',
              })}
            </Section>
            <Section number={2} title={dd.address}>
              <div className="md:col-span-2">
                <Choices
                  name="building"
                  legend={dd.buildingType}
                  required
                  columns="grid-cols-2 md:grid-cols-4"
                  options={opt(dd.buildingOptions)}
                  icons={{
                    detached: icons['house-detached'] ?? '',
                    terraced: icons['house-terraced'] ?? '',
                    semi_detached: icons['house-semi-detached'] ?? '',
                    apartment: icons['house-apartment'] ?? '',
                  }}
                  value={d.buildingType}
                  onChange={(value) => setD({ buildingType: value })}
                  error={errors['bestel-building']}
                />
              </div>
              {text('bestel-postcode', dd.postcode, d.postcode, (v) => setD({ postcode: v }), {
                required: true,
                inputMode: 'numeric',
                autoComplete: 'postal-code',
              })}
              <div className="hidden md:block" />
              {text('bestel-straat', dd.street, d.street, (v) => setD({ street: v }), {
                required: true,
                autoComplete: 'address-line1',
              })}
              <div className="grid grid-cols-2 gap-5">
                {text('bestel-nummer', dd.number, d.number, (v) => setD({ number: v }), {
                  required: true,
                })}
                {text('bestel-bus', dd.box, d.box, (v) => setD({ box: v }))}
              </div>
              <div className="md:col-span-2">
                <Check
                  id="bestel-leegstand"
                  label={dd.vacancy}
                  checked={d.vacancy === true}
                  onChange={(v) => setD({ vacancy: v })}
                />
              </div>
              <div className="md:col-span-2">
                <Choices
                  name="situation"
                  legend={dd.situation}
                  required
                  columns="grid-cols-1"
                  options={opt(dd.situationOptions)}
                  value={d.situation}
                  onChange={(value) => setD({ situation: value })}
                  error={errors['bestel-situation']}
                />
                <p className="mt-3 rounded-lg bg-lime-300 px-4 py-3 text-sm text-ink-900">
                  {dd.situationTip}
                </p>
              </div>
            </Section>
            <Section number={3} title={dd.payment}>
              <div className="md:col-span-2">
                <Check
                  id="bestel-facturatie"
                  label={dd.billingDiffers}
                  checked={d.billingDiffers === true}
                  onChange={(v) => setD({ billingDiffers: v })}
                />
              </div>
              <div className="md:col-span-2">
                <Choices
                  name="payment"
                  legend={dd.paymentMethod}
                  required
                  options={opt(dd.paymentOptions)}
                  value={d.paymentMethod}
                  onChange={(value) => setD({ paymentMethod: value })}
                  error={errors['bestel-payment']}
                />
              </div>
              {d.paymentMethod === 'direct_debit' &&
                text('bestel-iban', dd.iban, d.iban, (v) => setD({ iban: v }), {
                  required: true,
                  placeholder: dd.ibanPlaceholder,
                  className: 'md:col-span-2',
                })}
              <p className="rounded-lg bg-lavender-100 px-4 py-3 text-sm text-ink-900 md:col-span-2">
                {dd.paymentNote}
              </p>
            </Section>
            <Section number={4} title={dd.terms}>
              <div className="md:col-span-2">
                <Check
                  id="bestel-voorwaarden"
                  label={fill(dd.termsLabel, { supplier: offer?.supplier ?? '' })}
                  checked={d.terms === true}
                  onChange={(v) => setD({ terms: v })}
                  error={errors['bestel-voorwaarden']}
                />
              </div>
            </Section>
          </>
        )}

        {step === 'connection' && (
          <>
            <Section number={1} title={cc.electricity}>
              <div className="md:col-span-2">
                <Choices
                  name="knowsEan"
                  legend={cc.knowsEan}
                  required
                  columns="grid-cols-2 md:grid-cols-4"
                  options={yesNo}
                  value={c.knowsEan}
                  onChange={(v) => setC({ knowsEan: v })}
                  error={errors['bestel-knowsEan']}
                />
              </div>
              {c.knowsEan === 'yes' && (
                <>
                  {text('bestel-ean', cc.ean, c.ean, (v) => setC({ ean: v }), {
                    required: true,
                    placeholder: cc.eanPlaceholder,
                    hint: cc.eanHint,
                    inputMode: 'numeric',
                  })}
                  {text('bestel-meternummer', cc.meterNumber, c.meterNumber, (v) =>
                    setC({ meterNumber: v }),
                  )}
                </>
              )}
              <div className="md:col-span-2">
                <Choices
                  name="digitalMeter"
                  legend={cc.digitalMeter}
                  columns="grid-cols-2 md:grid-cols-4"
                  options={yesNo}
                  value={c.digitalMeter}
                  onChange={(v) => setC({ digitalMeter: v })}
                />
              </div>
              <div className="flex items-end justify-between gap-3 rounded-lg bg-lavender-50 px-4 py-3 text-sm md:col-span-2">
                <span>
                  <span className="block text-label-sm text-ink-900">{cc.meterType}</span>
                  <span className="text-ink-600">
                    {typeof answers.meter_type === 'string'
                      ? (labels.meter_type?.[answers.meter_type] ?? answers.meter_type)
                      : '–'}
                  </span>
                </span>
                <a
                  href="/vergelijken/energie"
                  className="text-purple-700 underline underline-offset-2"
                >
                  {cc.adjust}
                </a>
              </div>
              <div className="md:col-span-2">
                <Choices
                  name="electricCar"
                  legend={cc.electricCar}
                  columns="grid-cols-2 md:grid-cols-4"
                  options={yesNo}
                  value={c.electricCar}
                  onChange={(v) => setC({ electricCar: v })}
                />
              </div>
              <Field
                id="bestel-leverancier"
                label={cc.currentSupplier}
                required
                error={errors['bestel-leverancier']}
                className="md:col-span-2"
              >
                <select
                  id="bestel-leverancier"
                  className={cx(
                    input,
                    errors['bestel-leverancier'] ? 'border-danger' : 'border-control-border',
                  )}
                  value={c.currentSupplier ?? ''}
                  onChange={(event) => setC({ currentSupplier: event.target.value })}
                >
                  <option value="" disabled>
                    –
                  </option>
                  {supplierOptions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <p className="text-label-sm text-ink-900">{cc.startDate}</p>
                <p className="mt-2 rounded-lg bg-lime-300 px-4 py-3 text-sm text-ink-900">
                  {fill(cc.proposedStart, { date: proposedStart() })}
                </p>
                <Check
                  id="bestel-andere-start"
                  label={cc.otherDate}
                  checked={c.otherStart === true}
                  onChange={(v) => setC({ otherStart: v })}
                />
              </div>
              {c.otherStart &&
                text(
                  'bestel-startdatum',
                  cc.startDate,
                  c.startDate,
                  (v) => setC({ startDate: v }),
                  {
                    required: true,
                    placeholder: o.details.birthDatePlaceholder,
                    inputMode: 'numeric',
                  },
                )}
            </Section>
            {hasGas && (
              <Section number={2} title={cc.gas}>
                <div className="md:col-span-2">
                  <Choices
                    name="knowsGasEan"
                    legend={cc.knowsGasEan}
                    required
                    columns="grid-cols-2 md:grid-cols-4"
                    options={yesNo}
                    value={c.knowsGasEan}
                    onChange={(v) => setC({ knowsGasEan: v })}
                    error={errors['bestel-knowsGasEan']}
                  />
                </div>
                {c.knowsGasEan === 'yes' && (
                  <>
                    {text('bestel-gasean', cc.ean, c.gasEan, (v) => setC({ gasEan: v }), {
                      required: true,
                      placeholder: cc.eanPlaceholder,
                      hint: cc.eanHint,
                      inputMode: 'numeric',
                    })}
                    {text('bestel-gasmeternummer', cc.meterNumber, c.gasMeterNumber, (v) =>
                      setC({ gasMeterNumber: v }),
                    )}
                  </>
                )}
                <Field
                  id="bestel-gasleverancier"
                  label={cc.currentGasSupplier}
                  className="md:col-span-2"
                >
                  <select
                    id="bestel-gasleverancier"
                    className={cx(input, 'border-control-border')}
                    value={c.currentGasSupplier ?? ''}
                    onChange={(event) => setC({ currentGasSupplier: event.target.value })}
                  >
                    <option value="" disabled>
                      –
                    </option>
                    {supplierOptions.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="rounded-lg bg-lavender-100 px-4 py-3 text-sm text-ink-900 md:col-span-2">
                  {cc.gasSameDate}
                </p>
              </Section>
            )}
          </>
        )}

        {step === 'review' && (
          <>
            {reviewCard(
              rv.personal,
              ORDER_PATHS.details,
              <>
                {reviewRow(
                  rv.labels.name,
                  [
                    d.salutation ? dd.salutationOptions[d.salutation as 'mr' | 'ms'] : '',
                    d.firstName,
                    d.lastName,
                  ]
                    .filter(Boolean)
                    .join(' '),
                )}
                {reviewRow(rv.labels.birthDate, d.birthDate)}
                {reviewRow(rv.labels.phone, d.phone)}
                {reviewRow(rv.labels.email, d.email)}
                {reviewRow(
                  rv.labels.buildingType,
                  d.buildingType
                    ? dd.buildingOptions[d.buildingType as keyof typeof dd.buildingOptions]
                    : undefined,
                )}
                {reviewRow(
                  rv.labels.address,
                  [[d.street, d.number].filter(Boolean).join(' '), d.box, d.postcode]
                    .filter(Boolean)
                    .join(', '),
                )}
                {reviewRow(rv.labels.vacancy, d.vacancy ? cc.yes : cc.no)}
                {reviewRow(
                  rv.labels.situation,
                  d.situation
                    ? dd.situationOptions[d.situation as keyof typeof dd.situationOptions]
                    : undefined,
                )}
                {reviewRow(
                  rv.labels.payment,
                  d.paymentMethod
                    ? dd.paymentOptions[d.paymentMethod as keyof typeof dd.paymentOptions] +
                        (d.paymentMethod === 'direct_debit' && d.iban ? ` (${d.iban})` : '')
                    : undefined,
                )}
              </>,
            )}
            {reviewCard(
              rv.electricity,
              ORDER_PATHS.connection,
              <>
                {reviewRow(
                  rv.labels.meterType,
                  typeof answers.meter_type === 'string'
                    ? labels.meter_type?.[answers.meter_type]
                    : undefined,
                )}
                {reviewRow(
                  rv.labels.digitalMeter,
                  c.digitalMeter === 'yes' ? cc.yes : c.digitalMeter === 'no' ? cc.no : undefined,
                )}
                {reviewRow(
                  rv.labels.electricCar,
                  c.electricCar === 'yes' ? cc.yes : c.electricCar === 'no' ? cc.no : undefined,
                )}
                {reviewRow(rv.labels.ean, c.ean)}
                {reviewRow(rv.labels.meterNumber, c.meterNumber)}
                {reviewRow(rv.labels.currentSupplier, supplierName(c.currentSupplier))}
                {reviewRow(rv.labels.startDate, c.otherStart ? c.startDate : proposedStart())}
              </>,
            )}
            {hasGas &&
              reviewCard(
                rv.gas,
                ORDER_PATHS.connection,
                <>
                  {reviewRow(rv.labels.ean, c.gasEan)}
                  {reviewRow(rv.labels.meterNumber, c.gasMeterNumber)}
                  {reviewRow(rv.labels.currentSupplier, supplierName(c.currentGasSupplier))}
                  {reviewRow(rv.labels.startDate, c.otherStart ? c.startDate : proposedStart())}
                </>,
              )}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
          <a
            href={back}
            className="flex min-h-11 items-center justify-center rounded-full border border-purple-600 bg-white px-6 text-button text-ink-900"
          >
            {labelsFor.back}
          </a>
          <button
            type="submit"
            disabled={!ready}
            className="flex min-h-11 items-center justify-center rounded-full bg-lime-400 px-8 text-button text-ink-900 transition-[scale] duration-(--motion-duration-fast) disabled:opacity-60 motion-safe:active:scale-[0.98]"
          >
            {labelsFor.next}
          </button>
        </div>
      </form>
      <OrderSummary copy={copy} offer={offer} />
    </div>
  );
}
