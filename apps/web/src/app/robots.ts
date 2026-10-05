import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, transactional or duplicate-content areas.
        disallow: ['/admin', '/account', '/checkout', '/cart', '/wishlist', '/api/', '/search', '/login', '/register', '/reset-password', '/forgot-password', '/newsletter/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
