import { requireFeature } from '@/lib/site';

/** This admin screen exists only when the store plan includes "coupons". */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireFeature('coupons');
  return children;
}
