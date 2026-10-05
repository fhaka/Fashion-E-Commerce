import { PolicyPage, policyMetadata } from '@/components/content/PolicyPage';

export const generateMetadata = () => policyMetadata('shipping-returns', (name) => `Delivery options, costs and returns at ${name}.`);

export default function ShippingReturnsPage() {
  return <PolicyPage slug="shipping-returns" eyebrow="Customer care" />;
}
