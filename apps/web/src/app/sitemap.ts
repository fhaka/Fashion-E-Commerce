import type { MetadataRoute } from 'next';
import { getCategoryTree, getCollections, getProducts } from '@/lib/catalog';
import { SITE_URL } from '@/lib/utils';

export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/shop?isNew=true', priority: 0.8, changeFrequency: 'daily' },
  { path: '/shop?onSale=true', priority: 0.7, changeFrequency: 'daily' },
  { path: '/collections', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/shipping-returns', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/track-order', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

/** All active products, paging through the API (60 per request). */
async function allProducts() {
  const first = await getProducts({ limit: 60, page: 1, sort: 'newest' }, 3600);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.meta.pages - 1) }, (_, i) => getProducts({ limit: 60, page: i + 2, sort: 'newest' }, 3600)));
  return [first, ...rest].flatMap((r) => r.data);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [categories, collections, products] = await Promise.all([getCategoryTree(), getCollections(), allProducts()]);

  return [
    ...STATIC_PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...categories.flatMap((root) =>
      [root, ...root.children].map((c) => ({
        url: `${SITE_URL}/category/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: c === root ? 0.8 : 0.7,
        ...(c.image ? { images: [c.image] } : {}),
      })),
    ),
    ...collections.map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      ...(c.heroImage ? { images: [c.heroImage] } : {}),
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      ...(p.image ? { images: [p.image.url] } : {}),
    })),
  ];
}
