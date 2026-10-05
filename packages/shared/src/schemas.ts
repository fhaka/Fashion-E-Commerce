import { z } from 'zod';
import {
  BANNER_PLACEMENTS,
  COUPON_TYPES,
  GENDERS,
  ORDER_STATUSES,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  REVIEW_STATUSES,
  SHIPPING_METHODS,
} from './constants';

/* ---------------------------------- helpers --------------------------------- */

const trimmed = (min = 1, max = 255) =>
  z
    .string({ required_error: 'This field is required' })
    .trim()
    .min(min, min <= 1 ? 'This field is required' : `Please enter at least ${min} characters`)
    .max(max, `Please use ${max} characters or fewer`);
const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Please use ${max} characters or fewer`)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number');
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
export const cuidSchema = z.string().min(1).max(64);
export const centsSchema = z.coerce.number().int().min(0).max(100_000_000);

/* ----------------------------------- auth ----------------------------------- */

export const registerSchema = z.object({
  firstName: trimmed(1, 60),
  lastName: trimmed(1, 60),
  email: emailSchema,
  password: passwordSchema,
  newsletter: z.boolean().optional().default(false),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: trimmed(1, 60),
  lastName: trimmed(1, 60),
  phone: optionalText(30),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

/* --------------------------------- addresses -------------------------------- */

export const addressSchema = z.object({
  label: optionalText(40),
  fullName: trimmed(2, 120),
  line1: trimmed(3, 200),
  line2: optionalText(200),
  city: trimmed(2, 100),
  state: optionalText(100),
  postalCode: trimmed(2, 20),
  country: z.string({ required_error: 'Choose a country' }).trim().length(2, 'Use a 2-letter country code').toUpperCase(),
  phone: optionalText(30),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

/* ---------------------------------- catalog --------------------------------- */

const csvOrArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (!v) return [] as string[];
    const arr = Array.isArray(v) ? v : v.split(',');
    return arr.map((s) => s.trim()).filter(Boolean);
  });

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  collection: z.string().trim().max(100).optional(),
  gender: z.enum(GENDERS).optional(),
  size: csvOrArray,
  color: csvOrArray,
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  onSale: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  featured: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  bestSeller: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  isNew: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  sort: z.enum(PRODUCT_SORTS).optional().default('newest'),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(60).optional().default(24),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

/* ---------------------------------- reviews --------------------------------- */

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: trimmed(2, 120),
  body: trimmed(10, 2000),
  fit: z.enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE']).optional().nullable(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewQuerySchema = z.object({
  sort: z.enum(['newest', 'highest', 'lowest']).optional().default('newest'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const batchProductsSchema = z.object({
  ids: z.array(cuidSchema).min(1).max(24),
});

export const searchSuggestSchema = z.object({
  q: z.string().trim().min(1).max(100),
});

/* -------------------------------- newsletter -------------------------------- */

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().trim().max(40).optional(),
});

export const unsubscribeSchema = z.object({
  email: emailSchema,
  token: z.string().min(16).max(128),
});

export const contactSchema = z.object({
  name: trimmed(2, 120),
  email: emailSchema,
  subject: optionalText(160),
  message: trimmed(10, 4000),
});

/* ------------------------------------ cart ---------------------------------- */

export const addCartItemSchema = z.object({
  variantId: cuidSchema,
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});
export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});

/* --------------------------------- checkout --------------------------------- */

export const checkoutItemSchema = z.object({
  variantId: cuidSchema,
  quantity: z.coerce.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  shippingAddress: addressSchema.omit({ isDefault: true, label: true }),
  billingSameAsShipping: z.boolean().optional().default(true),
  billingAddress: addressSchema.omit({ isDefault: true, label: true }).optional(),
  shippingMethod: z.enum(Object.keys(SHIPPING_METHODS) as [keyof typeof SHIPPING_METHODS]),
  couponCode: z.string().trim().toUpperCase().max(40).optional().nullable(),
  /** When provided, checkout these items ("Buy now") instead of the cart. */
  items: z.array(checkoutItemSchema).min(1).max(50).optional(),
  saveAddress: z.boolean().optional().default(false),
  notes: optionalText(500),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const quoteSchema = z.object({
  shippingMethod: z
    .enum(Object.keys(SHIPPING_METHODS) as [keyof typeof SHIPPING_METHODS])
    .optional()
    .default('standard'),
  couponCode: z.string().trim().toUpperCase().max(40).optional().nullable(),
  items: z.array(checkoutItemSchema).min(1).max(50).optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().max(40),
  email: emailSchema,
});

/* ----------------------------------- admin ---------------------------------- */

export const adminVariantSchema = z.object({
  id: cuidSchema.optional(),
  sizeId: cuidSchema,
  colorId: cuidSchema,
  sku: trimmed(2, 64).toUpperCase(),
  priceOverride: centsSchema.optional().nullable(),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
  isActive: z.boolean().default(true),
});

export const adminProductImageSchema = z.object({
  id: cuidSchema.optional(),
  url: z.string().url().max(1000),
  publicId: z.string().max(255).optional().nullable(),
  alt: optionalText(255),
  colorId: cuidSchema.optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const adminProductSchema = z.object({
  name: trimmed(2, 160),
  slug: slugSchema.optional(),
  description: trimmed(10, 5000),
  details: z.array(trimmed(1, 200)).max(20).default([]),
  materials: optionalText(1000),
  care: optionalText(1000),
  basePrice: centsSchema,
  compareAtPrice: centsSchema.optional().nullable(),
  gender: z.enum(GENDERS),
  status: z.enum(PRODUCT_STATUSES).default('DRAFT'),
  categoryId: cuidSchema,
  collectionIds: z.array(cuidSchema).default([]),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNew: z.boolean().default(false),
  videoUrl: z.string().url().max(1000).optional().nullable().or(z.literal('').transform(() => null)),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  images: z.array(adminProductImageSchema).max(30).default([]),
  variants: z.array(adminVariantSchema).max(200).default([]),
});
export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const adminCategorySchema = z.object({
  name: trimmed(2, 80),
  slug: slugSchema.optional(),
  description: optionalText(1000),
  image: z.string().url().max(1000).optional().nullable(),
  parentId: cuidSchema.optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminCollectionSchema = z.object({
  name: trimmed(2, 80),
  slug: slugSchema.optional(),
  description: optionalText(2000),
  heroImage: z.string().url().max(1000).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const adminSizeSchema = z.object({
  label: trimmed(1, 20),
  group: z.string().trim().max(30).default('APPAREL'),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const adminColorSchema = z.object({
  name: trimmed(1, 40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1A1A1A'),
});

export const adminCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, numbers, - or _'),
  description: optionalText(255),
  type: z.enum(COUPON_TYPES),
  value: z.coerce.number().int().min(0).max(100_000_000),
  minSubtotal: centsSchema.optional().nullable(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  perUserLimit: z.coerce.number().int().min(1).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const adminBannerSchema = z.object({
  title: trimmed(1, 120),
  subtitle: optionalText(300),
  eyebrow: optionalText(60),
  ctaLabel: optionalText(40),
  ctaHref: optionalText(300),
  image: z.string().url().max(1000),
  mobileImage: z.string().url().max(1000).optional().nullable(),
  placement: z.enum(BANNER_PLACEMENTS),
  theme: z.enum(['DARK', 'LIGHT']).default('DARK'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const adminOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
  trackingNumber: optionalText(100),
  carrier: optionalText(60),
});

export const adminInventorySchema = z.object({
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  delta: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).optional(),
  note: optionalText(255),
});

export const adminReviewStatusSchema = z.object({ status: z.enum(REVIEW_STATUSES) });
