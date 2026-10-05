import { PRODUCT_SORTS, type ProductSort } from '@maison/shared';

/** Filters as they appear in the URL (prices in whole dollars for readability). */
export interface ListingState {
  q?: string;
  category?: string;
  collection?: string;
  gender?: 'WOMEN' | 'MEN' | 'UNISEX';
  size: string[];
  color: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  bestSeller: boolean;
  sort: ProductSort;
}

export type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(',') : []).map((s) => s.trim()).filter(Boolean).slice(0, 20);
const flag = (v: string | string[] | undefined) => ['true', '1'].includes(one(v) ?? '');
const dollars = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
};

export const SORT_LABELS: Record<ProductSort, string> = {
  newest: 'Newest',
  bestselling: 'Best selling',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
};

export function parseListing(sp: SearchParams, fixed: Partial<ListingState> = {}): ListingState {
  const sort = one(sp.sort) as ProductSort | undefined;
  const gender = one(sp.gender)?.toUpperCase();
  return {
    q: one(sp.q)?.slice(0, 100),
    category: one(sp.category),
    collection: one(sp.collection),
    gender: gender === 'WOMEN' || gender === 'MEN' || gender === 'UNISEX' ? gender : undefined,
    size: list(sp.size),
    color: list(sp.color),
    minPrice: dollars(sp.minPrice),
    maxPrice: dollars(sp.maxPrice),
    inStock: flag(sp.inStock),
    onSale: flag(sp.onSale),
    isNew: flag(sp.isNew),
    bestSeller: flag(sp.bestSeller),
    sort: sort && (PRODUCT_SORTS as readonly string[]).includes(sort) ? sort : 'newest',
    ...fixed,
  };
}

/** Converts URL state into the API's query (prices in cents). */
export function toApiQuery(s: ListingState, page = 1, limit = 24) {
  return {
    q: s.q,
    category: s.category,
    collection: s.collection,
    gender: s.gender,
    size: s.size,
    color: s.color,
    minPrice: s.minPrice !== undefined ? s.minPrice * 100 : undefined,
    maxPrice: s.maxPrice !== undefined ? s.maxPrice * 100 : undefined,
    inStock: s.inStock || undefined,
    onSale: s.onSale || undefined,
    isNew: s.isNew || undefined,
    bestSeller: s.bestSeller || undefined,
    sort: s.sort,
    page,
    limit,
  };
}

/** Serialises state back to a URL, omitting defaults and any filters fixed by the page itself. */
export function toSearchString(s: ListingState, fixedKeys: (keyof ListingState)[] = []): string {
  const p = new URLSearchParams();
  const skip = new Set(fixedKeys);
  const set = (k: keyof ListingState, v: string | undefined) => !skip.has(k) && v && p.set(k, v);
  set('q', s.q);
  set('category', s.category);
  set('collection', s.collection);
  set('gender', s.gender);
  set('size', s.size.join(','));
  set('color', s.color.join(','));
  set('minPrice', s.minPrice?.toString());
  set('maxPrice', s.maxPrice?.toString());
  if (s.inStock) set('inStock', 'true');
  if (s.onSale) set('onSale', 'true');
  if (s.isNew) set('isNew', 'true');
  if (s.bestSeller) set('bestSeller', 'true');
  if (s.sort !== 'newest') set('sort', s.sort);
  const str = p.toString();
  return str ? `?${str}` : '';
}

export function activeFilterCount(s: ListingState, fixedKeys: (keyof ListingState)[] = []) {
  const skip = new Set(fixedKeys);
  let n = 0;
  if (s.category && !skip.has('category')) n++;
  if (s.collection && !skip.has('collection')) n++;
  if (s.gender && !skip.has('gender')) n++;
  n += s.size.length + s.color.length;
  if (s.minPrice !== undefined || s.maxPrice !== undefined) n++;
  if (s.inStock) n++;
  if (s.onSale && !skip.has('onSale')) n++;
  if (s.isNew && !skip.has('isNew')) n++;
  if (s.bestSeller && !skip.has('bestSeller')) n++;
  return n;
}
