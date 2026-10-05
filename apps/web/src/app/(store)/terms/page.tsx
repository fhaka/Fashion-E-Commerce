import { PolicyPage, policyMetadata } from '@/components/content/PolicyPage';

export const generateMetadata = () => policyMetadata('terms', (name) => `The terms that apply when you shop with ${name}.`);

export default function TermsPage() {
  return <PolicyPage slug="terms" eyebrow="Legal" showUpdated />;
}
