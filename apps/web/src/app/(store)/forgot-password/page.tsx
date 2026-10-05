import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Account help" title="Forgotten password" intro="Enter your email and we will send you a link to choose a new password.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
