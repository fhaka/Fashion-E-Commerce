import { requireFeature } from '@/lib/site';

/** This admin screen exists only when the store plan includes "reviews". */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireFeature('reviews');
  return children;
}
