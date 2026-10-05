import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { DEFAULT_CURRENCY, DEFAULT_LOCALE, formatMoney as format } from '@maison/shared';

export { discountPercent } from '@maison/shared';

/**
 * Shop currency and locale, fixed per deployment (prices are stored as cents of this currency).
 * Must match STORE_CURRENCY / STORE_LOCALE on the API.
 */
export const STORE_CURRENCY = process.env.NEXT_PUBLIC_STORE_CURRENCY || DEFAULT_CURRENCY;
export const STORE_LOCALE = process.env.NEXT_PUBLIC_STORE_LOCALE || DEFAULT_LOCALE;

/** Formats integer cents in the store's currency. */
export const formatMoney = (cents: number) => format(cents, STORE_CURRENCY, STORE_LOCALE);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Luxury easing shared by every Motion animation. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}
