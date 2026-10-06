import { requireFeature } from '@/lib/site';

/** This admin screen exists only when the store plan includes "collections". */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireFeature('collections');
  return children;
}
