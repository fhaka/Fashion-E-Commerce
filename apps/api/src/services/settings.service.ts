import type { ContentPage, Prisma, StoreSettings } from '@prisma/client';
import { CONTENT_PAGES, themeColors, type ContentPageInput, type ContentPageSlug, type ShippingMethod, type StoreSettingsInput } from '@maison/shared';
import { env } from '../config/env';
import { DEFAULT_PAGES, DEFAULT_SETTINGS } from '../content/defaults';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { revalidateStorefront } from '../utils/revalidate';

/**
 * Store settings (Admin → Settings) and content pages (Admin → Pages).
 * Settings are read on every quote and checkout, so they're cached in memory briefly;
 * saving through the admin clears the cache immediately.
 */

const CACHE_MS = 30_000;
let cached: { value: StoreSettings; at: number } | null = null;

export async function getSettings(): Promise<StoreSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const value =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    // First run without the demo seed: start from neutral defaults.
    (await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...toData(DEFAULT_SETTINGS) }, update: {} }));
  cached = { value, at: Date.now() };
  return value;
}

export function clearSettingsCache() {
  cached = null;
}

function toData(input: StoreSettingsInput) {
  return { ...input, socialLinks: input.socialLinks as Prisma.InputJsonValue, storyStats: input.storyStats as Prisma.InputJsonValue };
}

export async function updateSettings(input: StoreSettingsInput) {
  const value = await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...toData(input) }, update: toData(input) });
  cached = { value, at: Date.now() };
  revalidateStorefront(['site']);
  return serializeSettings(value);
}

export function serializeSettings(s: StoreSettings) {
  const { id: _id, ...rest } = s;
  return { ...rest, socialLinks: (s.socialLinks ?? {}) as Record<string, string | null>, storyStats: (s.storyStats ?? []) as { value: string; label: string }[] };
}

/** Everything the storefront needs: branding, contact, shipping rules, theme and locale. */
export async function publicSiteSettings() {
  const s = await getSettings();
  return {
    ...serializeSettings(s),
    legalName: s.legalName || s.storeName,
    theme: themeColors(s),
    currency: env.STORE_CURRENCY,
    locale: env.STORE_LOCALE,
    reservationMinutes: env.ORDER_RESERVATION_MINUTES,
    shippingMethods: shippingOptions(s),
  };
}

/* ───────────────────────── Shipping & tax rules ───────────────────────── */

export function shippingOptions(s: StoreSettings) {
  return [
    { id: 'standard' as ShippingMethod, label: 'Standard', eta: s.shippingStandardEta, price: s.shippingStandardPrice, freeOver: s.freeShippingThreshold },
    ...(s.expressEnabled ? [{ id: 'express' as ShippingMethod, label: 'Express', eta: s.shippingExpressEta, price: s.shippingExpressPrice, freeOver: null }] : []),
  ];
}

export function assertShippingMethodAvailable(s: StoreSettings, method: ShippingMethod) {
  if (method === 'express' && !s.expressEnabled) {
    throw ApiError.validation({ fields: { shippingMethod: 'Express delivery is not available' } }, 'Express delivery is not available');
  }
}

/* ───────────────────────── Content pages ───────────────────────── */

export function isContentPage(slug: string): slug is ContentPageSlug {
  return (CONTENT_PAGES as readonly string[]).includes(slug);
}

export async function getPage(slug: ContentPageSlug): Promise<ContentPage> {
  const page = await prisma.contentPage.findUnique({ where: { slug } });
  if (page) return page;
  // Pages start from the templates until the client edits them.
  return prisma.contentPage.upsert({ where: { slug }, create: { slug, ...DEFAULT_PAGES[slug] }, update: {} });
}

export async function listPages() {
  return Promise.all(CONTENT_PAGES.map((slug) => getPage(slug)));
}

export async function updatePage(slug: ContentPageSlug, input: ContentPageInput) {
  const page = await prisma.contentPage.upsert({ where: { slug }, create: { slug, ...input }, update: input });
  revalidateStorefront(['site']);
  return page;
}

/** Restores a page to its template (Admin → Pages → Reset to template). */
export async function resetPage(slug: ContentPageSlug) {
  return updatePage(slug, DEFAULT_PAGES[slug]);
}
