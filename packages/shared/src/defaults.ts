import type { StoreSettingsInput } from './schemas';

/**
 * Starting content for a brand-new shop (no demo seed). Everything here is edited by the
 * client in Admin → Settings and Admin → Pages. The demo seed overrides it with the Maison brand.
 */
export const DEFAULT_SETTINGS: StoreSettingsInput = {
  storeName: 'My Store',
  legalName: null,
  tagline: 'Online store',
  description: 'Discover our latest collection, with secure checkout and fast delivery.',
  logoUrl: null,
  supportEmail: 'hello@example.com',
  phone: null,
  address: null,
  openingHours: null,
  socialLinks: {},
  announcements: ['Free standard shipping on qualifying orders'],
  highlights: ['Secure checkout', 'Free returns', 'Fast delivery'],
  storyStats: [],
  shippingStandardPrice: 800,
  shippingStandardEta: '3–5 business days',
  shippingExpressPrice: 2000,
  shippingExpressEta: '1–2 business days',
  expressEnabled: true,
  freeShippingThreshold: 10000,
  taxRate: 0,
  pricesIncludeTax: false,
  returnDays: 30,
  themeInk: '#0e0e0e',
  themeBone: '#f5f2ed',
  themeAccent: '#b08d57',
};

