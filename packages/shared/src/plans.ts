/**
 * Client packages. One codebase; the deployment's PLAN setting turns features on or off in
 * the API (enforced), the storefront and the admin. Each plan includes everything below it.
 * Keep docs/PLANS.md in sync with this file.
 */
export const PLANS = ['basic', 'advanced', 'premium'] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_NAMES: Record<Plan, string> = { basic: 'Basic', advanced: 'Advanced', premium: 'Premium' };

/** Every gated feature, the cheapest plan that includes it, and how it is described to clients. */
export const FEATURES = {
  /* Basic — on top of the core shop, checkout, accounts, admin, settings and pages */
  coupons: { plan: 'basic', label: 'Discount codes' },

  /* Advanced */
  wishlist: { plan: 'advanced', label: 'Wishlist' },
  reviews: { plan: 'advanced', label: 'Reviews and ratings with moderation' },
  newsletter: { plan: 'advanced', label: 'Newsletter signup and subscriber export' },
  advancedFilters: { plan: 'advanced', label: 'Colour, availability, sale and new-in filters' },
  searchSuggestions: { plan: 'advanced', label: 'Instant search suggestions' },
  recommendations: { plan: 'advanced', label: 'Related and recently viewed products' },
  megaMenu: { plan: 'advanced', label: 'Mega menu' },
  collections: { plan: 'advanced', label: 'Collections' },
  orderTracking: { plan: 'advanced', label: 'Guest order tracking' },
  refunds: { plan: 'advanced', label: 'Refunds and cancellations with restocking' },
  shippingEmails: { plan: 'advanced', label: 'Shipping and delivery emails' },
  analytics: { plan: 'advanced', label: 'Revenue charts, top products and low-stock alerts' },

  /* Premium */
  motion: { plan: 'premium', label: 'Motion design (animated headlines, reveals, parallax)' },
  editorialHome: { plan: 'premium', label: 'Editorial home: campaign, featured product, brand story, lookbook' },
  productMedia: { plan: 'premium', label: 'Image zoom, full-screen lightbox and product video' },
  sizeGuide: { plan: 'premium', label: 'Size guide' },
  reports: { plan: 'premium', label: 'Sales reports with CSV export' },
  inventoryHistory: { plan: 'premium', label: 'Inventory audit trail' },
  structuredData: { plan: 'premium', label: 'Rich search results (structured data)' },
} as const satisfies Record<string, { plan: Plan; label: string }>;

export type Feature = keyof typeof FEATURES;
export type FeatureFlags = Record<Feature, boolean>;

const rank = (plan: Plan) => PLANS.indexOf(plan);

export function isPlan(value: string): value is Plan {
  return (PLANS as readonly string[]).includes(value);
}

export function planIncludes(plan: Plan, feature: Feature) {
  return rank(plan) >= rank(FEATURES[feature].plan);
}

export function featureFlags(plan: Plan): FeatureFlags {
  return Object.fromEntries((Object.keys(FEATURES) as Feature[]).map((f) => [f, planIncludes(plan, f)])) as FeatureFlags;
}

/** Home-page banner placements: the hero is in every plan, the editorial sections are Premium. */
export function bannerPlacementAllowed(plan: Plan, placement: string) {
  return placement === 'HERO' || planIncludes(plan, 'editorialHome');
}
