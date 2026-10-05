import { PolicyPage, policyMetadata } from '@/components/content/PolicyPage';

export const generateMetadata = () => policyMetadata('privacy', (name) => `How ${name} collects, uses and protects your personal information.`);

export default function PrivacyPage() {
  return <PolicyPage slug="privacy" eyebrow="Legal" showUpdated />;
}
