import { Router } from 'express';
import { batchProductsSchema, productQuerySchema, reviewQuerySchema, reviewSchema, searchSuggestSchema } from '@maison/shared';
import * as c from '../controllers/catalog.controller';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/plan';
import { formLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

export const catalogRouter = Router();

catalogRouter.get('/products', validate({ query: productQuerySchema }), c.listProducts);
catalogRouter.post('/products/batch', validate({ body: batchProductsSchema }), c.productsBatch);
catalogRouter.get('/products/:slug', c.getProduct);
catalogRouter.get('/products/:slug/related', requireFeature('recommendations'), c.relatedProducts);
catalogRouter.get('/products/:slug/reviews', requireFeature('reviews'), validate({ query: reviewQuerySchema }), c.listReviews);
catalogRouter.get('/products/:slug/reviews/eligibility', requireFeature('reviews'), authenticate, c.reviewEligibility);
catalogRouter.post('/products/:slug/reviews', requireFeature('reviews'), authenticate, formLimiter, validate({ body: reviewSchema }), c.createReview);

catalogRouter.get('/categories', c.listCategories);
catalogRouter.get('/categories/:slug', c.getCategory);
catalogRouter.get('/collections', requireFeature('collections'), c.listCollections);
catalogRouter.get('/collections/:slug', requireFeature('collections'), c.getCollection);
catalogRouter.get('/sizes', c.listSizes);
catalogRouter.get('/colors', c.listColors);
catalogRouter.get('/banners', c.listBanners);
catalogRouter.get('/search/suggest', requireFeature('searchSuggestions'), validate({ query: searchSuggestSchema }), c.searchSuggest);
