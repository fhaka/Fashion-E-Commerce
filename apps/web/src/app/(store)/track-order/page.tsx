import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrackOrder } from '@/components/order/TrackOrder';
import { PageIntro } from '@/components/ui/PageIntro';
import { requireFeature } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Follow your order from dispatch to your door.',
  alternates: { canonical: '/track-order' },
};

export default async function TrackOrderPage() {
  await requireFeature('orderTracking');
  return (
    <>
      <PageIntro eyebrow="Client services" title="Track your order" description="Enter your order number and the email you used at checkout." breadcrumbs={[{ name: 'Track order' }]} />
      <div className="container-site pb-(--spacing-section)">
        <Suspense>
          <TrackOrder />
        </Suspense>
      </div>
    </>
  );
}
