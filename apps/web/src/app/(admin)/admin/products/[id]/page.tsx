'use client';

import { useParams } from 'next/navigation';
import { ProductEditor, type AdminProduct } from '@/components/admin/ProductEditor';
import { useAdminQuery } from '@/lib/admin';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useAdminQuery<AdminProduct>(`/admin/products/${id}`);
  if (error) return <p className="text-sale">{error}</p>;
  if (!data) return <div className="skeleton h-[70vh]" />;
  // Keyed by id so navigating to a duplicate re-initialises the form.
  return <ProductEditor key={data.id} product={data} />;
}
