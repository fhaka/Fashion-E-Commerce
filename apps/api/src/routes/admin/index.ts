import { Router } from 'express';
import { z } from 'zod';
import {
  adminBannerSchema,
  adminCategorySchema,
  adminCollectionSchema,
  adminColorSchema,
  adminCouponSchema,
  adminInventorySchema,
  adminOrderStatusSchema,
  adminProductSchema,
  adminReviewStatusSchema,
  adminSizeSchema,
  BANNER_PLACEMENTS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  REVIEW_STATUSES,
  paginationSchema,
} from '@maison/shared';
import * as c from '../../controllers/admin.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { uploadLimiter } from '../../middleware/rateLimit';
import { imageUpload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);
// Admin responses are user-specific and must never be cached.
adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const bool = z.enum(['true', 'false']).optional().transform((v) => v === 'true');
const q = z.string().trim().max(100).optional();
const DAY = 86_400_000;

/* Dashboard & reports */
adminRouter.get('/stats/overview', validate({ query: z.object({ range: z.coerce.number().int().refine((n) => [7, 30, 90, 365].includes(n), 'Use 7, 30, 90 or 365').default(30) }) }), c.overview);
adminRouter.get(
  '/reports/sales',
  validate({
    query: z
      .object({
        from: z.coerce.date().default(() => new Date(Date.now() - 30 * DAY)),
        to: z.coerce.date().default(() => new Date()),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
        format: z.enum(['json', 'csv']).default('json'),
      })
      .refine((v) => v.to > v.from, { message: '"to" must be after "from"', path: ['to'] })
      .refine((v) => v.to.getTime() - v.from.getTime() <= 3 * 366 * DAY, { message: 'Range is limited to 3 years', path: ['from'] }),
  }),
  c.salesReport,
);

/* Products */
adminRouter.get(
  '/products',
  validate({
    query: paginationSchema.extend({
      q,
      status: z.enum(PRODUCT_STATUSES).optional(),
      categoryId: z.string().max(64).optional(),
      featured: bool,
      lowStock: bool,
      sort: z.enum(['newest', 'name', 'price', 'sales']).default('newest'),
    }),
  }),
  c.listProducts,
);
adminRouter.post('/products', validate({ body: adminProductSchema }), c.createProduct);
adminRouter.patch(
  '/products/bulk',
  validate({
    body: z
      .object({
        ids: z.array(z.string().max(64)).min(1).max(200),
        status: z.enum(PRODUCT_STATUSES).optional(),
        isFeatured: z.boolean().optional(),
        isBestSeller: z.boolean().optional(),
        isNew: z.boolean().optional(),
      })
      .refine((v) => Object.keys(v).length > 1, 'Nothing to update'),
  }),
  c.bulkProducts,
);
adminRouter.get('/products/:id', c.getProduct);
adminRouter.put('/products/:id', validate({ body: adminProductSchema }), c.updateProduct);
adminRouter.delete('/products/:id', c.deleteProduct);
adminRouter.post('/products/:id/duplicate', c.duplicateProduct);

/* Uploads */
adminRouter.post('/uploads', uploadLimiter, imageUpload.array('files', 10), c.upload);
adminRouter.delete('/uploads', validate({ body: z.object({ publicId: z.string().min(1).max(300) }) }), c.deleteUpload);

/* Inventory */
adminRouter.get('/inventory', validate({ query: paginationSchema.extend({ q, filter: z.enum(['all', 'low', 'out']).default('all') }) }), c.listInventory);
adminRouter.get('/inventory/low-stock', c.lowStock);
adminRouter.patch('/inventory/:variantId', validate({ body: adminInventorySchema }), c.adjustInventory);
adminRouter.get('/inventory/:variantId/movements', validate({ query: paginationSchema }), c.inventoryMovements);

/* Categories, collections, sizes, colours */
adminRouter.get('/categories', c.listCategories);
adminRouter.post('/categories', validate({ body: adminCategorySchema }), c.createCategory);
adminRouter.put('/categories/:id', validate({ body: adminCategorySchema }), c.updateCategory);
adminRouter.delete('/categories/:id', c.deleteCategory);

adminRouter.get('/collections', c.listCollections);
adminRouter.get('/collections/:id', c.getCollection);
adminRouter.post('/collections', validate({ body: adminCollectionSchema }), c.createCollection);
adminRouter.put('/collections/:id', validate({ body: adminCollectionSchema }), c.updateCollection);
adminRouter.put('/collections/:id/products', validate({ body: z.object({ productIds: z.array(z.string().max(64)).max(500) }) }), c.setCollectionProducts);
adminRouter.delete('/collections/:id', c.deleteCollection);

adminRouter.get('/sizes', c.listSizes);
adminRouter.post('/sizes', validate({ body: adminSizeSchema }), c.createSize);
adminRouter.put('/sizes/:id', validate({ body: adminSizeSchema }), c.updateSize);
adminRouter.delete('/sizes/:id', c.deleteSize);
adminRouter.get('/colors', c.listColors);
adminRouter.post('/colors', validate({ body: adminColorSchema }), c.createColor);
adminRouter.put('/colors/:id', validate({ body: adminColorSchema }), c.updateColor);
adminRouter.delete('/colors/:id', c.deleteColor);

/* Coupons */
adminRouter.get('/coupons', c.listCoupons);
adminRouter.post('/coupons', validate({ body: adminCouponSchema }), c.createCoupon);
adminRouter.put('/coupons/:id', validate({ body: adminCouponSchema }), c.updateCoupon);
adminRouter.delete('/coupons/:id', c.deleteCoupon);

/* Banners */
adminRouter.get('/banners', validate({ query: z.object({ placement: z.enum(BANNER_PLACEMENTS).optional() }) }), c.listBanners);
adminRouter.post('/banners', validate({ body: adminBannerSchema }), c.createBanner);
adminRouter.put('/banners/reorder', validate({ body: z.object({ ids: z.array(z.string().max(64)).min(1).max(100) }) }), c.reorderBanners);
adminRouter.put('/banners/:id', validate({ body: adminBannerSchema }), c.updateBanner);
adminRouter.delete('/banners/:id', c.deleteBanner);

/* Orders */
adminRouter.get(
  '/orders',
  validate({ query: paginationSchema.extend({ q, status: z.enum(ORDER_STATUSES).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }) }),
  c.listOrders,
);
adminRouter.get('/orders/:id', c.getOrder);
adminRouter.patch('/orders/:id/status', validate({ body: adminOrderStatusSchema.extend({ restock: z.boolean().optional() }) }), c.updateOrderStatus);
adminRouter.patch(
  '/orders/:id',
  validate({ body: z.object({ trackingNumber: z.string().trim().max(100).nullable().optional(), carrier: z.string().trim().max(60).nullable().optional(), note: z.string().trim().max(500).optional() }) }),
  c.updateOrderMeta,
);
adminRouter.post('/orders/:id/refund', validate({ body: z.object({ restock: z.boolean().default(false), note: z.string().trim().max(500).optional() }) }), c.refundOrder);

/* Customers */
adminRouter.get('/customers', validate({ query: paginationSchema.extend({ q, role: z.enum(['CUSTOMER', 'ADMIN']).optional() }) }), c.listCustomers);
adminRouter.get('/customers/:id', c.getCustomer);
adminRouter.patch(
  '/customers/:id',
  validate({ body: z.object({ isActive: z.boolean().optional(), role: z.enum(['CUSTOMER', 'ADMIN']).optional() }).refine((v) => Object.keys(v).length > 0, 'Nothing to update') }),
  c.updateCustomer,
);

/* Reviews */
adminRouter.get(
  '/reviews',
  validate({ query: paginationSchema.extend({ q, status: z.enum(REVIEW_STATUSES).optional(), rating: z.coerce.number().int().min(1).max(5).optional() }) }),
  c.listReviews,
);
adminRouter.patch('/reviews/:id', validate({ body: adminReviewStatusSchema }), c.setReviewStatus);
adminRouter.delete('/reviews/:id', c.deleteReview);

/* Newsletter & messages */
adminRouter.get(
  '/newsletter',
  validate({ query: paginationSchema.extend({ q, status: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED']).optional(), format: z.enum(['json', 'csv']).default('json') }) }),
  c.listSubscribers,
);
adminRouter.get('/messages', validate({ query: paginationSchema }), c.listMessages);
adminRouter.patch('/messages/:id', validate({ body: z.object({ isRead: z.boolean() }) }), c.markMessage);
