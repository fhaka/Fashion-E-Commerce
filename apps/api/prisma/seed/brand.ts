import type { ContentPageSlug, StoreSettingsInput } from '@maison/shared';
import { DEFAULT_PAGES } from '../../src/content/defaults';

/** The "Maison" demo brand. A client's shop starts from src/content/defaults.ts instead. */
export const MAISON_SETTINGS: StoreSettingsInput = {
  storeName: 'Maison',
  legalName: 'Maison Atelier',
  tagline: 'Modern Luxury Clothing',
  description:
    'Maison — considered luxury clothing, cut in our Paris atelier from the finest natural fibres. Outerwear, tailoring, cashmere and leather goods made to be worn for decades.',
  logoUrl: null,
  supportEmail: 'clientservices@maison.example',
  phone: '+33 1 00 00 00 00',
  address: '12 Rue de Turenne\n75004 Paris, France',
  openingHours: 'Monday – Saturday, 9am – 7pm CET',
  socialLinks: { instagram: 'https://instagram.com', pinterest: 'https://pinterest.com', tiktok: 'https://tiktok.com' },
  announcements: ['Complimentary shipping over $250', 'Free 30-day returns', 'Lifetime repairs on outerwear'],
  highlights: ['Complimentary shipping over $250', 'Free 30-day returns', 'Made in Europe', 'Natural fibres only', 'Lifetime repairs on outerwear'],
  storyStats: [
    { value: '2009', label: 'Founded in Paris' },
    { value: '14', label: 'Family-run mills' },
    { value: '100%', label: 'Natural fibres' },
  ],
  shippingStandardPrice: 1200,
  shippingStandardEta: '3–5 business days',
  shippingExpressPrice: 2500,
  shippingExpressEta: '1–2 business days',
  expressEnabled: true,
  freeShippingThreshold: 25000,
  taxRate: 800,
  pricesIncludeTax: false,
  returnDays: 30,
  themeInk: '#0e0e0e',
  themeBone: '#f5f2ed',
  themeAccent: '#b08d57',
};

const img = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const MAISON_PAGES: Record<ContentPageSlug, { title: string; intro: string | null; body: string; imageUrl: string | null }> = {
  ...DEFAULT_PAGES,
  about: {
    title: 'Made slowly, worn for years',
    intro:
      'Maison began in a small Paris atelier with a simple conviction: that the most luxurious thing a garment can be is lasting. We design fewer pieces, make them with more care, and stand behind them for as long as you wear them.',
    imageUrl: img('photo-1787505136296-1e8f0750e5ff'),
    body: `## What we believe

- **Fewer, better pieces** — Two collections a year, never more. Each piece is developed over months of fittings until the proportion is right.
- **Natural fibres only** — Wool, cashmere, silk, linen, cotton and vegetable-tanned leather. Materials that breathe, age well and can be repaired.
- **Made by people we know** — Fourteen family-run mills and workshops in Italy, Scotland, Portugal and France — most of them partners for over a decade.
- **Built to last** — Hand-finished seams, half-canvassed tailoring and Goodyear-welted shoes. Every outerwear piece comes with lifetime repairs.

## From pattern to piece

Every pattern is drafted by hand in our atelier on Rue de Turenne. Prototypes are cut, fitted and re-cut — often a dozen times — before a piece enters production. Our mills weave cloth to our specification, and our workshops finish each garment by hand: buttonholes, seams and edges you will notice every time you wear it.

When something needs care, send it back to us. We repair outerwear for life and offer resoling on all our footwear.`,
  },
  'shipping-returns': {
    ...DEFAULT_PAGES['shipping-returns'],
    intro: 'Complimentary shipping, free {{return_days}}-day returns and lifetime repairs on outerwear.',
    body: `${DEFAULT_PAGES['shipping-returns'].body}

## Repairs & aftercare

All Maison outerwear comes with complimentary lifetime repairs, and our Goodyear-welted footwear can be resoled. [Contact us](/contact) to arrange collection.`,
  },
};
