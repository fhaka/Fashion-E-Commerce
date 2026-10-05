export const ROLES = ['CUSTOMER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const GENDERS = ['WOMEN', 'MEN', 'UNISEX'] as const;
export type Gender = (typeof GENDERS)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COUPON_TYPES = ['PERCENT', 'FIXED', 'FREE_SHIPPING'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const BANNER_PLACEMENTS = ['HERO', 'PROMO', 'EDITORIAL', 'STORY'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'bestselling', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Shipping methods. Prices, delivery times and the free-shipping threshold live in store settings. */
export const SHIPPING_METHODS = {
  standard: { label: 'Standard' },
  express: { label: 'Express' },
} as const;
export type ShippingMethod = keyof typeof SHIPPING_METHODS;

/** Fallback currency; each deployment sets its own (STORE_CURRENCY / NEXT_PUBLIC_STORE_CURRENCY). */
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';

export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'pinterest', 'tiktok', 'x', 'youtube'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** Editable content pages (Admin → Pages). */
export const CONTENT_PAGES = ['about', 'shipping-returns', 'privacy', 'terms'] as const;
export type ContentPageSlug = (typeof CONTENT_PAGES)[number];
