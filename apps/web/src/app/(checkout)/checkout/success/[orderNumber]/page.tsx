import { Suspense } from 'react';
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container-site py-24"><div className="skeleton mx-auto h-64 max-w-3xl" /></div>}>
      <OrderConfirmation />
    </Suspense>
  );
}
