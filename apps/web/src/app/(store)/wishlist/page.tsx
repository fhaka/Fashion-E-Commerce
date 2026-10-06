import type { Metadata } from 'next';
import { WishlistView } from '@/components/product/WishlistView';
import { requireFeature } from '@/lib/site';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: false } };

export default async function WishlistPage() {
  await requireFeature('wishlist');
  return <WishlistView />;
}
