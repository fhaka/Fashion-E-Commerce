'use client';

import { useState } from 'react';
import { changePasswordSchema, updateProfileSchema } from '@maison/shared';
import { Button } from '@/components/ui/Button';
import { FormError, Input, zodFieldErrors } from '@/components/ui/Field';
import { api, ApiRequestError } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' });
  const [pErrors, setPErrors] = useState<Record<string, string>>({});
  const [pSaving, setPSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwFormError, setPwFormError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = updateProfileSchema.safeParse(profile);
    if (!parsed.success) return setPErrors(zodFieldErrors(parsed.error.issues));
    setPErrors({});
    setPSaving(true);
    try {
      setUser(await api<User>('/account/profile', { method: 'PATCH', body: parsed.data }));
      toast.success('Profile updated');
    } catch (err) {
      if (err instanceof ApiRequestError) setPErrors(err.fieldErrors);
    } finally {
      setPSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setPwErrors({ confirm: 'Passwords do not match' });
    const parsed = changePasswordSchema.safeParse(pw);
    if (!parsed.success) return setPwErrors(zodFieldErrors(parsed.error.issues));
    setPwErrors({});
    setPwFormError('');
    setPwSaving(true);
    try {
      const res = await api<{ message: string }>('/auth/change-password', { method: 'POST', body: parsed.data });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success(res.message);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setPwErrors(err.fieldErrors);
        setPwFormError(Object.keys(err.fieldErrors).length ? '' : err.message);
      }
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-16">
      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="mb-6 font-display text-3xl font-light">
          Personal details
        </h2>
        <form onSubmit={saveProfile} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="First name" autoComplete="given-name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} error={pErrors.firstName} />
            <Input label="Last name" autoComplete="family-name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} error={pErrors.lastName} />
          </div>
          <Input label="Email" value={user?.email ?? ''} disabled hint="Contact client services to change your email address." />
          <Input label="Phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} error={pErrors.phone} optional />
          <Button type="submit" loading={pSaving}>
            Save changes
          </Button>
        </form>
      </section>

      <section aria-labelledby="password-heading" className="border-t border-stone-200 pt-12">
        <h2 id="password-heading" className="mb-2 font-display text-3xl font-light">
          Password
        </h2>
        <p className="mb-6 text-sm text-stone-500">Changing your password signs you out on all other devices.</p>
        <form onSubmit={changePassword} noValidate className="space-y-5">
          <FormError message={pwFormError} />
          <Input label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErrors.currentPassword} />
          <Input label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErrors.newPassword} hint="At least 8 characters, including a letter and a number." />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
          <Button type="submit" variant="outline" loading={pwSaving}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
