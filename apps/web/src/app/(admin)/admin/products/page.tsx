'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/admin/ProductTable';
import { PageHeader } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/Button';

export default function ProductsPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Products"
        description="Create, edit and publish products, variants and images."
        actions={
          <ButtonLink href="/admin/products/new" size="sm">
            <Plus className="h-3.5 w-3.5" /> New product
          </ButtonLink>
        }
      />
      <ProductTable onOpen={(id) => router.push(`/admin/products/${id}`)} />
    </>
  );
}
