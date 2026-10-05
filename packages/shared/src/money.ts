import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from './constants';

/** Currencies whose minor unit isn't 1/100 (Stripe zero- and three-decimal currencies). */
const NON_CENT_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND',
]);

/**
 * Money is stored as integer cents, so the store currency must use 1/100 minor units:
 * USD, EUR, GBP, CHF, CAD, AUD, SEK, ALL, … are fine; JPY or KWD are not.
 */
export function isSupportedCurrency(code: string) {
  if (!/^[A-Z]{3}$/.test(code) || NON_CENT_CURRENCIES.has(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

/** All monetary values are integer cents. */
export function formatMoney(cents: number, currency: string = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
