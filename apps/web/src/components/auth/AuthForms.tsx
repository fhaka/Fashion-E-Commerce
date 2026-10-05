'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@maison/shared';
import { api, ApiRequestError } from '@/lib/api';
import { safeNext } from '@/lib/safeRedirect';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { Button, ButtonLink } from '../ui/Button';
import { Checkbox, FormError, Input, zodFieldErrors } from '../ui/Field';
import { useSite } from '../layout/SiteProvider';

function useRedirectIfSignedIn() {
  const { status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (status === 'authenticated') router.replace(safeNext(params.get('next')));
  }, [status, router, params]);
}

function handleError(err: unknown, setErrors: (e: Record<string, string>) => void, setForm: (m: string) => void) {
  if (err instanceof ApiRequestError) {
    setErrors(err.fieldErrors);
    setForm(Object.keys(err.fieldErrors).length ? '' : err.message);
  } else setForm('Something went wrong. Please try again.');
}

/* ───────────────────────── Sign in ───────────────────────── */

export function LoginForm() {
  useRedirectIfSignedIn();
  const { storeName } = useSite();
  const login = useAuth((s) => s.login);
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setErrors({});
    setFormError('');
    setLoading(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      toast.success(`Welcome back, ${user.firstName}`);
      router.replace(safeNext(params.get('next'), user.role === 'ADMIN' ? '/admin' : '/account'));
    } catch (err) {
      handleError(err, setErrors, setFormError);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Input label="Email" type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={errors.email} required />
      <Input label="Password" type="password" autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} error={errors.password} required />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-stone-600 underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Sign in
      </Button>
      <div className="border-t border-stone-200 pt-8 text-center">
        <p className="text-sm text-stone-600">New to {storeName}?</p>
        <ButtonLink href={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} variant="outline" className="mt-4 w-full">
          Create an account
        </ButtonLink>
      </div>
    </form>
  );
}

/* ───────────────────────── Register ───────────────────────── */

export function RegisterForm() {
  useRedirectIfSignedIn();
  const { storeName } = useSite();
  const register = useAuth((s) => s.register);
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', password: '', newsletter: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [k]: k === 'newsletter' ? e.target.checked : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setErrors({});
    setFormError('');
    setLoading(true);
    try {
      const user = await register(parsed.data);
      toast.success(`Welcome to ${storeName}, ${user.firstName}`);
      router.replace(safeNext(params.get('next')));
    } catch (err) {
      handleError(err, setErrors, setFormError);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="First name" autoComplete="given-name" value={values.firstName} onChange={set('firstName')} error={errors.firstName} required />
        <Input label="Last name" autoComplete="family-name" value={values.lastName} onChange={set('lastName')} error={errors.lastName} required />
      </div>
      <Input label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} required />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
        required
      />
      <Checkbox label="Send me early access to new collections and private sales (10% off your first order)." checked={values.newsletter} onChange={set('newsletter')} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Create account
      </Button>
      <p className="text-center text-xs text-stone-500">
        By creating an account you agree to our <Link href="/terms" className="underline">terms</Link> and{' '}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
      <p className="border-t border-stone-200 pt-6 text-center text-sm text-stone-600">
        Already have an account?{' '}
        <Link href={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* ───────────────────────── Forgot password ───────────────────────── */

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <div className="space-y-6">
        <p className="text-stone-600">
          If an account exists for <strong className="font-medium text-ink">{email}</strong>, a link to reset your password is on its way. It expires in one hour.
        </p>
        <p className="bg-bone px-4 py-3 text-xs text-stone-600">
          Demo mode: emails are printed to the API server log instead of being sent.
        </p>
        <ButtonLink href="/login" variant="outline" className="w-full">
          Back to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = forgotPasswordSchema.safeParse({ email });
        if (!parsed.success) return setError(parsed.error.issues[0].message);
        setLoading(true);
        try {
          await api('/auth/forgot-password', { method: 'POST', body: parsed.data, auth: false });
          setSent(true);
        } catch (err) {
          setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
        } finally {
          setLoading(false);
        }
      }}
    >
      <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-stone-600 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

/* ───────────────────────── Reset password ───────────────────────── */

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-6">
        <FormError message="This reset link is incomplete. Please request a new one." />
        <ButtonLink href="/forgot-password" className="w-full">
          Request a new link
        </ButtonLink>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) return setErrors({ confirm: 'Passwords do not match' });
        const parsed = resetPasswordSchema.safeParse({ token, password });
        if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
        setErrors({});
        setLoading(true);
        try {
          await api('/auth/reset-password', { method: 'POST', body: parsed.data, auth: false });
          toast.success('Password updated — please sign in');
          router.replace('/login');
        } catch (err) {
          handleError(err, setErrors, setFormError);
          setLoading(false);
        }
      }}
    >
      <FormError message={formError} />
      <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters, including a letter and a number." />
      <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
