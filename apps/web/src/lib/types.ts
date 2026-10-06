/** Response shapes returned by the Maison API (mirrors apps/api/src/services/serializers.ts). */

import type { FeatureFlags, Plan } from '@maison/shared';

export interface ImageRef {
  url: string;
  alt: string;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  gender: 'WOMEN' | 'MEN' | 'UNISEX';
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  ratingAvg: number;
  ratingCount: number;
  category: { name: string; slug: string };
  image: ImageRef | null;
  hoverImage: ImageRef | null;
  colors: { name: string; hex: string; slug: string; image: string | null; inStock: boolean }[];
  sizes: { label: string; inStock: boolean }[];
  inStock: boolean;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  colorId: string;
  sizeId: string;
  price: number;
  available: number;
  lowStock: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  details: string[];
  materials: string | null;
  care: string | null;
  price: number;
  compareAtPrice: number | null;
  gender: string;
  isNew: boolean;
  isBestSeller: boolean;
  videoUrl: string | null;
  seoTitle: string;
  seoDescription: string;
  ratingAvg: number;
  ratingCount: number;
  category: { name: string; slug: string };
  breadcrumbs: { name: string; href: string }[];
  collections: { name: string; slug: string }[];
  images: { id: string; url: string; alt: string; colorId: string | null }[];
  colors: { id: string; name: string; hex: string; slug: string }[];
  sizes: { id: string; label: string }[];
  variants: ProductVariant[];
  inStock: boolean;
  reviewSummary: {
    average: number;
    count: number;
    distribution: { rating: number; count: number }[];
    fit: Partial<Record<'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE', number>>;
  };
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  children: CategoryNode[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImage: string | null;
  isFeatured: boolean;
  productCount?: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: string;
  mobileImage: string | null;
  placement: 'HERO' | 'PROMO' | 'EDITORIAL' | 'STORY';
  theme: 'DARK' | 'LIGHT';
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface ProductFacets {
  sizes: { label: string; group: string; count: number }[];
  colors: { name: string; hex: string; slug: string; count: number }[];
  price: { min: number; max: number };
  genders: { value: string; count: number }[];
}

export interface CartItem {
  id: string;
  quantity: number;
  variantId: string;
  sku: string;
  size: string;
  color: { name: string; hex: string };
  product: { id: string; name: string; slug: string; image: string | null };
  unitPrice: number;
  compareAtPrice: number | null;
  lineTotal: number;
  available: number;
  maxQuantity: number;
  issue: 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | null;
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hasIssues: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
  previewImages: { url: string | null; alt: string }[];
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  /** Tax was already included in the prices (shown, not added). */
  taxIncluded: boolean;
  total: number;
  couponCode: string | null;
  shippingMethod: string;
  shippingAddress: Partial<Omit<Address, 'id' | 'isDefault' | 'label'>>;
  billingAddress: Partial<Omit<Address, 'id' | 'isDefault' | 'label'>> | null;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: {
    id: string;
    productName: string;
    productSlug: string | null;
    variantLabel: string;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  timeline: { status: OrderStatus; note: string | null; at: string }[];
  payment: { provider: string; status: string } | null;
}

export interface SearchSuggestions {
  products: ProductCard[];
  categories: { name: string; slug: string }[];
  collections: { name: string; slug: string }[];
}

export interface DemoInfo {
  resetHourUtc: number;
  nextResetAt: string;
  roles: ('customer' | 'admin')[];
}

export interface ShippingOption {
  id: 'standard' | 'express';
  label: string;
  eta: string;
  price: number;
  /** Free at or above this subtotal (cents); null = never free. */
  freeOver: number | null;
}

/** Store settings (Admin → Settings) as published to the storefront. */
export interface SiteSettings {
  storeName: string;
  legalName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  supportEmail: string;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  socialLinks: Partial<Record<'instagram' | 'facebook' | 'pinterest' | 'tiktok' | 'x' | 'youtube', string | null>>;
  announcements: string[];
  highlights: string[];
  storyStats: { value: string; label: string }[];
  shippingStandardPrice: number;
  shippingStandardEta: string;
  shippingExpressPrice: number;
  shippingExpressEta: string;
  expressEnabled: boolean;
  freeShippingThreshold: number | null;
  /** Basis points (800 = 8%). */
  taxRate: number;
  pricesIncludeTax: boolean;
  returnDays: number;
  themeInk: string;
  themeBone: string;
  themeAccent: string;
  theme: { ink: string; bone: string; accent: string; accentDark: string };
  currency: string;
  locale: string;
  reservationMinutes: number;
  shippingMethods: ShippingOption[];
  /** Client package and the features it includes (see docs/PLANS.md). */
  plan: Plan;
  features: FeatureFlags;
}

/** Public storefront configuration from `GET /site`. */
export interface SiteConfig {
  demo: DemoInfo | null;
  settings: SiteSettings;
}

export interface ContentPage {
  slug: 'about' | 'shipping-returns' | 'privacy' | 'terms';
  title: string;
  intro: string | null;
  body: string;
  imageUrl: string | null;
  updatedAt: string;
}
