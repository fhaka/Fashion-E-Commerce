import 'server-only';
import { cache } from 'react';
import { api, apiFetch } from './api';
import type { Banner, CategoryNode, Collection, Paginated, ProductCard, ProductDetail, ProductFacets } from './types';

/** Server-side catalog fetchers. Cached in the Next.js data cache and revalidated periodically. */

export const getCategoryTree = cache(() => api<CategoryNode[]>('/categories', { revalidate: 300, tags: ['categories'] }));

export const getCollections = cache(() => api<Collection[]>('/collections', { revalidate: 300, tags: ['collections'] }));

export const getBanners = cache((placement: Banner['placement']) =>
  api<Banner[]>('/banners', { query: { placement }, revalidate: 120, tags: ['banners'] }),
);

export function getProducts(query: Record<string, string | number | boolean | string[] | undefined>, revalidate = 60) {
  return apiFetch<Paginated<ProductCard> & { meta: { facets: ProductFacets } }>('/products', { query, revalidate, tags: ['products'] });
}

export const getProduct = cache((slug: string) => api<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ['products', `product:${slug}`] }));
