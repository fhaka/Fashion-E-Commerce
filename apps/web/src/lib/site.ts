import 'server-only';
import { cache } from 'react';
import { DEFAULT_LOCALE, DEFAULT_SETTINGS, themeColors } from '@maison/shared';
import { api } from './api';
import { STORE_CURRENCY } from './utils';
import type { ContentPage, SiteConfig, SiteSettings } from './types';

/** Used only if the API is unreachable, so a page never fails because of settings. */
const FALLBACK_SETTINGS: SiteSettings = {
  ...DEFAULT_SETTINGS,
  legalName: DEFAULT_SETTINGS.storeName,
  logoUrl: null,
  phone: null,
  address: null,
  openingHours: null,
  socialLinks: {},
  theme: themeColors(DEFAULT_SETTINGS),
  currency: STORE_CURRENCY,
  locale: DEFAULT_LOCALE,
  reservationMinutes: 30,
  shippingMethods: [],
};

let warned = false;

/** Store settings, branding and demo info. Refreshed instantly when the admin saves settings. */
export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    const config = await api<SiteConfig>('/site', { revalidate: 300, tags: ['site'] });
    // A response cached by an older version (before store settings existed): fetch it fresh.
    if (config.settings) {
      if (config.settings.currency !== STORE_CURRENCY && !warned) {
        warned = true;
        console.warn(`[store] Currency mismatch: API uses ${config.settings.currency}, web uses ${STORE_CURRENCY}. Set NEXT_PUBLIC_STORE_CURRENCY to match STORE_CURRENCY.`);
      }
      return config;
    }
    return await api<SiteConfig>('/site', { cache: 'no-store' });
  } catch {
    return { demo: null, settings: FALLBACK_SETTINGS };
  }
});

export const getSiteSettings = async () => (await getSiteConfig()).settings;

/** An editable content page (About, Shipping & returns, Privacy, Terms). */
export const getContentPage = cache((slug: ContentPage['slug']) => api<ContentPage>(`/pages/${slug}`, { revalidate: 300, tags: ['site'] }));
