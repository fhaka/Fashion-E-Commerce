import { Suspense } from 'react';
import { CheckoutView } from '@/components/checkout/CheckoutView';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container-site grid gap-12 py-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="skeleton h-40" />
            <div className="skeleton h-72" />
          </div>
          <div className="skeleton h-96 lg:col-span-5" />
        </div>
      }
    >
      <CheckoutView />
    </Suspense>
  );
}
