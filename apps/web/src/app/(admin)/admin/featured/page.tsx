'use client';

import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/admin/ProductTable';
import { PageHeader } from '@/components/admin/ui';

export default function FeaturedPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Featured products"
        description="Featured products appear in the homepage spotlight and are boosted in merchandising. Toggle off to remove a product."
      />
      <ProductTable featuredOnly onOpen={(id) => router.push(`/admin/products/${id}`)} />
    </>
  );
}
