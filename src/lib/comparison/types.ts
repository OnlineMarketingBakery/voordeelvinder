// The comparison's data contract (Figma 221:5711 results, 241:7189–250:12053 ordering). Today
// it is filled with placeholders (placeholder.ts); the tariff API will fill the same shapes
// later (ADR 0013), so the screens don't change when the data does.
export type Tariff = 'fixed' | 'variable' | 'dynamic';
export type PaymentMethod = 'direct_debit' | 'transfer';

export type Offer = {
  id: string;
  supplier: string;
  /** Short text on the logo tile until real logos exist. */
  initials: string;
  product: string;
  tariff: Tariff;
  /** 0–100. */
  greenPercent: number;
  durationMonths: number;
  /** Euro per year, the first year's cost including discounts. */
  yearlyCost: number;
  /** Euro per month. */
  monthlyAdvance: number;
  /** Euro off in the first year, 0 for none. */
  discountFirstYear: number;
  payment: readonly PaymentMethod[];
  rating: number;
  reviewCount: number;
  /** ISO date the tariff was last updated. */
  updated: string;
};

export type Comparison = {
  /** True while the data is invented: the screens show the preview notice. */
  placeholder: boolean;
  current: { supplier: string; yearlyCost: number };
  /** Cheapest first. */
  offers: readonly Offer[];
};
