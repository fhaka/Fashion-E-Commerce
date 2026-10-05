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

export const SHIPPING_METHODS = {
  standard: { label: 'Standard', description: '3–5 business days', price: 1200 },
  express: { label: 'Express', description: '1–2 business days', price: 2500 },
} as const;
export type ShippingMethod = keyof typeof SHIPPING_METHODS;

/** Orders at or above this subtotal (cents) ship free with the standard method. */
export const FREE_SHIPPING_THRESHOLD = 25000;
/** Flat demo tax rate applied to (subtotal - discount). Replace with a tax provider in production. */
export const TAX_RATE = 0.08;

export const CURRENCY = 'USD';
