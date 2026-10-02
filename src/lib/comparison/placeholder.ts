// Placeholder comparison data for the results and ordering screens until the tariff API exists
// (ADR 0013). Never real suppliers or prices: "Leverancier A…E" with round example amounts, and
// `placeholder: true`, which makes every screen show the preview notice. These pages are off in
// production (orderPreview).
import type { Comparison, Offer } from './types';

const offer = (
  id: string,
  letter: string,
  product: string,
  fields: Partial<Offer> & Pick<Offer, 'tariff' | 'yearlyCost'>,
): Offer => ({
  id,
  supplier: `Leverancier ${letter}`,
  initials: letter,
  product,
  greenPercent: 100,
  durationMonths: 12,
  monthlyAdvance: Math.round((fields.yearlyCost / 12) * 100) / 100,
  discountFirstYear: 0,
  payment: ['direct_debit', 'transfer'],
  rating: 4,
  reviewCount: 0,
  updated: '2026-10-01',
  ...fields,
});

export function placeholderComparison(): Comparison {
  return {
    placeholder: true,
    current: { supplier: 'je huidige leverancier', yearlyCost: 1300 },
    offers: [
      offer('a-vast-1', 'A', 'Vast 1 jaar', {
        tariff: 'fixed',
        yearlyCost: 1000,
        discountFirstYear: 75,
      }),
      offer('b-vast-1', 'B', 'Vast 1 jaar', { tariff: 'fixed', yearlyCost: 1050 }),
      offer('c-variabel', 'C', 'Variabel', {
        tariff: 'variable',
        yearlyCost: 1100,
        greenPercent: 50,
      }),
      offer('d-dynamisch', 'D', 'Dynamisch', {
        tariff: 'dynamic',
        yearlyCost: 1150,
        durationMonths: 1,
        payment: ['direct_debit'],
      }),
      offer('e-vast-3', 'E', 'Vast 3 jaar', {
        tariff: 'fixed',
        yearlyCost: 1200,
        durationMonths: 36,
      }),
    ],
  };
}
