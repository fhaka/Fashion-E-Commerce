import { Router } from 'express';
import { addCartItemSchema, updateCartItemSchema } from '@maison/shared';
import * as c from '../controllers/cart.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

/** Works for guests (cookie session) and signed-in users. */
export const cartRouter = Router();

cartRouter.get('/', optionalAuth, c.getCart);
cartRouter.post('/items', optionalAuth, validate({ body: addCartItemSchema }), c.addItem);
cartRouter.patch('/items/:id', optionalAuth, validate({ body: updateCartItemSchema }), c.updateItem);
cartRouter.delete('/items/:id', optionalAuth, c.removeItem);
cartRouter.delete('/', optionalAuth, c.clear);
cartRouter.post('/merge', authenticate, c.merge);
