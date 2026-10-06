import express, { Router } from 'express';
import { z } from 'zod';
import { checkoutSchema, emailSchema, quoteSchema } from '@maison/shared';
import * as c from '../controllers/checkout.controller';
import { optionalAuth } from '../middleware/auth';
import { requireFeature } from '../middleware/plan';
import { checkoutLimiter, couponLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

export const checkoutRouter = Router();

checkoutRouter.get('/config', c.config);
checkoutRouter.post('/quote', optionalAuth, validate({ body: quoteSchema.extend({ email: emailSchema.optional() }) }), c.quote);
checkoutRouter.post(
  '/coupon/validate',
  requireFeature('coupons'),
  optionalAuth,
  couponLimiter,
  validate({ body: z.object({ code: z.string().trim().min(1).max(40), subtotal: z.coerce.number().int().min(0), email: emailSchema.optional() }) }),
  c.validateCouponCode,
);
checkoutRouter.post('/', optionalAuth, checkoutLimiter, validate({ body: checkoutSchema }), c.placeOrder);
checkoutRouter.post(
  '/:orderNumber/confirm-mock',
  validate({ body: z.object({ clientSecret: z.string().min(10).max(200), outcome: z.enum(['success', 'decline']).default('success') }) }),
  c.confirmMock,
);
checkoutRouter.post('/:orderNumber/abandon', validate({ body: z.object({ clientSecret: z.string().min(10).max(200) }) }), c.abandon);
checkoutRouter.get('/:orderNumber/confirmation', optionalAuth, c.confirmation);

export const webhookRouter = Router();
webhookRouter.post('/stripe', express.raw({ type: 'application/json', limit: '1mb' }), c.stripeWebhook);
