import type { Request, Response } from 'express';
import { BANNER_PLACEMENTS, type BannerPlacement } from '@maison/shared';
import * as catalog from '../services/catalog.service';
import * as reviews from '../services/review.service';
import { ApiError } from '../utils/ApiError';

/** Public catalog data is safe to cache briefly at the edge / in the browser. */
const cache = (res: Response, seconds = 60) =>
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);

export async function listProducts(req: Request, res: Response) {
  cache(res, 30);
  res.json(await catalog.listProducts(req.valid.query));
}

export async function getProduct(req: Request, res: Response) {
  cache(res, 30);
  res.json({ data: await catalog.getProductBySlug(req.params.slug as string) });
}

export async function relatedProducts(req: Request, res: Response) {
  cache(res, 300);
  res.json({ data: await catalog.getRelatedProducts(req.params.slug as string) });
}

export async function productsBatch(req: Request, res: Response) {
  res.json({ data: await catalog.getProductsByIds(req.valid.body.ids) });
}

export async function listCategories(_req: Request, res: Response) {
  cache(res, 300);
  res.json({ data: await catalog.getCategoryTree() });
}

export async function getCategory(req: Request, res: Response) {
  cache(res, 300);
  res.json({ data: await catalog.getCategory(req.params.slug as string) });
}

export async function listCollections(_req: Request, res: Response) {
  cache(res, 300);
  res.json({ data: await catalog.listCollections() });
}

export async function getCollection(req: Request, res: Response) {
  cache(res, 300);
  res.json({ data: await catalog.getCollection(req.params.slug as string) });
}

export async function listSizes(_req: Request, res: Response) {
  cache(res, 3600);
  res.json({ data: await catalog.listSizes() });
}

export async function listColors(_req: Request, res: Response) {
  cache(res, 3600);
  res.json({ data: await catalog.listColors() });
}

export async function listBanners(req: Request, res: Response) {
  const placement = req.query.placement as string | undefined;
  if (placement && !BANNER_PLACEMENTS.includes(placement as BannerPlacement)) {
    throw ApiError.validation({ fields: { placement: `Must be one of ${BANNER_PLACEMENTS.join(', ')}` } });
  }
  cache(res, 120);
  res.json({ data: await catalog.listBanners(placement as BannerPlacement | undefined) });
}

export async function searchSuggest(req: Request, res: Response) {
  cache(res, 60);
  res.json({ data: await catalog.searchSuggest(req.valid.query.q) });
}

export async function listReviews(req: Request, res: Response) {
  res.json(await reviews.listReviews(req.params.slug as string, req.valid.query));
}

export async function createReview(req: Request, res: Response) {
  const result = await reviews.createReview(req.user!.id, req.params.slug as string, req.valid.body);
  res.status(201).json({ data: { ...result, message: 'Thank you! Your review will appear once it has been approved.' } });
}

export async function reviewEligibility(req: Request, res: Response) {
  res.json({ data: await reviews.canReview(req.user!.id, req.params.slug as string) });
}
