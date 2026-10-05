import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/AuthForms';
import { DemoSignIn } from '@/components/demo/Demo';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" intro="Access your orders, saved addresses and wishlist.">
      <DemoSignIn />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
