import { Router } from 'express';
import { addressSchema, paginationSchema, updateProfileSchema } from '@maison/shared';
import * as c from '../controllers/account.controller';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/plan';
import { validate } from '../middleware/validate';

export const accountRouter = Router();
accountRouter.use(authenticate);

accountRouter.get('/profile', c.getProfile);
accountRouter.patch('/profile', validate({ body: updateProfileSchema }), c.updateProfile);

accountRouter.get('/addresses', c.listAddresses);
accountRouter.post('/addresses', validate({ body: addressSchema }), c.createAddress);
accountRouter.put('/addresses/:id', validate({ body: addressSchema }), c.updateAddress);
accountRouter.delete('/addresses/:id', c.deleteAddress);

accountRouter.get('/orders', validate({ query: paginationSchema }), c.listOrders);
accountRouter.get('/orders/:orderNumber', c.getOrder);

export const wishlistRouter = Router();
wishlistRouter.use(requireFeature('wishlist'), authenticate);
wishlistRouter.get('/', c.getWishlist);
wishlistRouter.get('/ids', c.getWishlistIds);
wishlistRouter.post('/:productId', c.addToWishlist);
wishlistRouter.delete('/:productId', c.removeFromWishlist);
