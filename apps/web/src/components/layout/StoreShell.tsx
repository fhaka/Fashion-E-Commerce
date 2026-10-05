import type { ReactNode } from 'react';
import { getCategoryTree, getCollections } from '@/lib/catalog';
import { Footer } from './Footer';
import { Header } from './Header';
import { Main } from './Main';

/** Full storefront chrome: header with mega menu, page content and footer. */
export async function StoreShell({ children }: { children: ReactNode }) {
  const [categories, collections] = await Promise.all([getCategoryTree(), getCollections()]);
  return (
    <>
      <Header categories={categories} collections={collections} />
      <Main>{children}</Main>
      <Footer categories={categories} />
    </>
  );
}
