import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false, follow: true } };

export default function RegisterPage() {
  return (
    <AuthShell eyebrow="Join us" title="Create an account" intro="Faster checkout, order tracking and early access to new collections.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
