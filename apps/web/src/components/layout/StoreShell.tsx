import type { ReactNode } from 'react';
import { getCategoryTree, getCollections } from '@/lib/catalog';
import { getSiteSettings } from '@/lib/site';
import { Footer } from './Footer';
import { Header } from './Header';
import { Main } from './Main';

/** Full storefront chrome: header with mega menu, page content and footer. */
export async function StoreShell({ children }: { children: ReactNode }) {
  const [categories, collections, settings] = await Promise.all([getCategoryTree(), getCollections(), getSiteSettings()]);
  return (
    <>
      <Header categories={categories} collections={collections} />
      <Main>{children}</Main>
      <Footer categories={categories} settings={settings} />
    </>
  );
}
