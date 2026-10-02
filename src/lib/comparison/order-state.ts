// What the visitor fills in while ordering, kept in sessionStorage (this tab only) between the
// order pages. Nothing is sent anywhere yet (ADR 0013): the order hand-off comes with the API.
export type OrderDetails = {
  salutation?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  buildingType?: string;
  postcode?: string;
  street?: string;
  number?: string;
  box?: string;
  vacancy?: boolean;
  situation?: string;
  billingDiffers?: boolean;
  paymentMethod?: string;
  iban?: string;
  terms?: boolean;
};

export type OrderConnection = {
  knowsEan?: string;
  ean?: string;
  meterNumber?: string;
  digitalMeter?: string;
  electricCar?: string;
  currentSupplier?: string;
  otherStart?: boolean;
  startDate?: string;
  knowsGasEan?: string;
  gasEan?: string;
  gasMeterNumber?: string;
  currentGasSupplier?: string;
};

export type OrderState = {
  offerId?: string;
  details: OrderDetails;
  connection: OrderConnection;
  reference?: string;
};

export const ORDER_KEY = 'voordeelvinder:order';
/** The single-page form's session (FormPageIsland): the order starts from its answers. */
export const FORM_KEY = 'voordeelvinder:form:energie_vergelijker';
/** The form's answers after a sent lead, for the results (staging only). */
export const COMPARISON_ANSWERS_KEY = 'voordeelvinder:comparison:answers';

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

export function store(): Store {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readOrder(from: Store = store()): OrderState {
  try {
    const parsed = JSON.parse(from?.getItem(ORDER_KEY) ?? 'null') as Partial<OrderState> | null;
    return { details: {}, connection: {}, ...(parsed ?? {}) };
  } catch {
    return { details: {}, connection: {} };
  }
}

export function writeOrder(state: OrderState, to: Store = store()): void {
  try {
    to?.setItem(ORDER_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the pages still work, without remembering.
  }
}

/** The single-page form's answers, if this tab filled it in (codes, as the form stores them). */
export function formAnswers(from: Store = store()): Record<string, unknown> {
  try {
    const sent = JSON.parse(from?.getItem(COMPARISON_ANSWERS_KEY) ?? 'null') as Record<
      string,
      unknown
    > | null;
    if (sent) return sent;
    const parsed = JSON.parse(from?.getItem(FORM_KEY) ?? 'null') as {
      answers?: Record<string, unknown>;
    } | null;
    return parsed?.answers ?? {};
  } catch {
    return {};
  }
}

/** "VV-" and six digits: a placeholder order reference until the order API gives one. */
export function placeholderReference(random: () => number = Math.random): string {
  return `VV-${String(Math.floor(random() * 900000) + 100000)}`;
}

/** BE + 14 digits with the mod-97 check (spaces allowed). */
export function isBelgianIban(value: string): boolean {
  const iban = value.replace(/\s+/g, '').toUpperCase();
  if (!/^BE\d{14}$/.test(iban)) return false;
  const digits = (iban.slice(4) + '1114' + iban.slice(2, 4))
    .split('')
    .reduce((rest, digit) => (rest * 10 + Number(digit)) % 97, 0);
  return digits === 1;
}

/** 18 digits starting with 54 (spaces allowed). */
export function isEan(value: string): boolean {
  return /^54\d{16}$/.test(value.replace(/\s+/g, ''));
}

/** dd/mm/jjjj, a real date in the past. */
export function isBirthDate(value: string, today = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const [, d, m, y] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d &&
    date < today &&
    y > 1900
  );
}
