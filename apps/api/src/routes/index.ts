import { Router } from 'express';
import { contactSchema, newsletterSchema, trackOrderSchema, unsubscribeSchema } from '@maison/shared';
import * as account from '../controllers/account.controller';
import * as site from '../controllers/settings.controller';
import { prisma } from '../db/prisma';
import { requireFeature } from '../middleware/plan';
import { formLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { accountRouter, wishlistRouter } from './account.routes';
import { adminRouter } from './admin';
import { authRouter } from './auth.routes';
import { cartRouter } from './cart.routes';
import { catalogRouter } from './catalog.routes';
import { checkoutRouter, webhookRouter } from './checkout.routes';

export const apiRouter = Router();

apiRouter.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', database: 'ok' } });
});

/** Public storefront configuration and editable content pages. */
apiRouter.get('/site', site.site);
apiRouter.get('/pages/:slug', site.page);

apiRouter.use('/auth', authRouter);
apiRouter.use('/', catalogRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/account', accountRouter);
apiRouter.use('/checkout', checkoutRouter);
apiRouter.use('/webhooks', webhookRouter);
apiRouter.use('/admin', adminRouter);

apiRouter.get('/orders/track', requireFeature('orderTracking'), formLimiter, validate({ query: trackOrderSchema }), account.trackOrder);
apiRouter.post('/newsletter/subscribe', requireFeature('newsletter'), formLimiter, validate({ body: newsletterSchema }), account.subscribe);
apiRouter.post('/newsletter/unsubscribe', validate({ body: unsubscribeSchema }), account.unsubscribe);
apiRouter.post('/contact', formLimiter, validate({ body: contactSchema }), account.contact);
