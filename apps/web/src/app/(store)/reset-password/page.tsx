import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell eyebrow="Account help" title="Choose a new password">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
