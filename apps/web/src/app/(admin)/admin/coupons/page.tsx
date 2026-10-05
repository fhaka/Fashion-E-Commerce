'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { adminCouponSchema } from '@maison/shared';
import { ConfirmDialog, DataTable, PageHeader, Pill, Toggle, type Column } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Select, zodFieldErrors } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, ApiRequestError } from '@/lib/api';
import { formatDate, toCents, toDollars, useAdminQuery } from '@/lib/admin';
import { formatMoney, STORE_CURRENCY } from '@/lib/utils';
import { toast } from '@/stores/toast';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  state: 'active' | 'expired' | 'scheduled' | 'exhausted' | 'inactive';
}
const STATE_TONE = { active: 'good', scheduled: 'warn', expired: 'neutral', exhausted: 'neutral', inactive: 'neutral' } as const;

const describe = (c: Pick<Coupon, 'type' | 'value'>) => (c.type === 'PERCENT' ? `${c.value}% off` : c.type === 'FIXED' ? `${formatMoney(c.value)} off` : 'Free shipping');
const toInputDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function CouponsPage() {
  const { data, reload, setData } = useAdminQuery<Coupon[]>('/admin/coupons');
  const [draft, setDraft] = useState<null | { id?: string; code: string; description: string; type: Coupon['type']; value: string; minSubtotal: string; maxUses: string; perUserLimit: string; startsAt: string; endsAt: string; isActive: boolean }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const open = (c?: Coupon) => {
    setErrors({});
    setFormError('');
    setDraft(
      c
        ? {
            id: c.id,
            code: c.code,
            description: c.description ?? '',
            type: c.type,
            value: c.type === 'FIXED' ? toDollars(c.value) : String(c.value),
            minSubtotal: toDollars(c.minSubtotal),
            maxUses: c.maxUses ? String(c.maxUses) : '',
            perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '',
            startsAt: toInputDate(c.startsAt),
            endsAt: toInputDate(c.endsAt),
            isActive: c.isActive,
          }
        : { code: '', description: '', type: 'PERCENT', value: '10', minSubtotal: '', maxUses: '', perUserLimit: '', startsAt: '', endsAt: '', isActive: true },
    );
  };

  const save = async () => {
    if (!draft) return;
    const parsed = adminCouponSchema.safeParse({
      code: draft.code,
      description: draft.description || null,
      type: draft.type,
      value: draft.type === 'FIXED' ? toCents(draft.value || 0) : draft.type === 'PERCENT' ? Number(draft.value || 0) : 0,
      minSubtotal: draft.minSubtotal ? toCents(draft.minSubtotal) : null,
      maxUses: draft.maxUses ? Number(draft.maxUses) : null,
      perUserLimit: draft.perUserLimit ? Number(draft.perUserLimit) : null,
      startsAt: draft.startsAt ? new Date(`${draft.startsAt}T00:00:00`).toISOString() : null,
      endsAt: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`).toISOString() : null,
      isActive: draft.isActive,
    });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setSaving(true);
    try {
      await api(draft.id ? `/admin/coupons/${draft.id}` : '/admin/coupons', { method: draft.id ? 'PUT' : 'POST', body: parsed.data });
      toast.success(draft.id ? 'Coupon updated' : 'Coupon created');
      setDraft(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(Object.keys(err.fieldErrors).length ? '' : err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon, isActive: boolean) => {
    setData((rows) => rows?.map((r) => (r.id === c.id ? { ...r, isActive } : r)) ?? rows);
    await api(`/admin/coupons/${c.id}`, {
      method: 'PUT',
      body: { code: c.code, description: c.description, type: c.type, value: c.value, minSubtotal: c.minSubtotal, maxUses: c.maxUses, perUserLimit: c.perUserLimit, startsAt: c.startsAt, endsAt: c.endsAt, isActive },
    }).catch(() => toast.error('Could not update'));
    await reload();
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => (
        <span>
          <span className="block font-mono font-medium">{c.code}</span>
          {c.description && <span className="text-xs text-stone-500">{c.description}</span>}
        </span>
      ),
    },
    { key: 'discount', header: 'Discount', cell: (c) => describe(c) },
    { key: 'conditions', header: 'Conditions', cell: (c) => <span className="text-xs text-stone-600">{[c.minSubtotal && `Min ${formatMoney(c.minSubtotal)}`, c.perUserLimit && `${c.perUserLimit}× per customer`].filter(Boolean).join(' · ') || '—'}</span> },
    { key: 'usage', header: 'Used', align: 'right', cell: (c) => `${c.usedCount}${c.maxUses ? ` / ${c.maxUses}` : ''}` },
    { key: 'dates', header: 'Valid', cell: (c) => <span className="text-xs text-stone-600">{c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt) : '…'} – ${c.endsAt ? formatDate(c.endsAt) : '…'}` : 'Always'}</span> },
    { key: 'state', header: 'Status', cell: (c) => <Pill tone={STATE_TONE[c.state]}>{c.state}</Pill> },
    { key: 'active', header: 'On', cell: (c) => <Toggle checked={c.isActive} onChange={(v) => toggleActive(c, v)} label={`Enable ${c.code}`} /> },
  ];

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers enter at checkout."
        actions={
          <Button size="sm" onClick={() => open()}>
            <Plus className="h-3.5 w-3.5" /> New coupon
          </Button>
        }
      />
      <DataTable columns={columns} rows={data} rowKey={(c) => c.id} onRowClick={open} empty="No coupons yet." />

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit coupon' : 'New coupon'}>
        {draft && (
          <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <h2 className="font-display text-3xl font-light">{draft.id ? `Edit ${draft.code}` : 'New coupon'}</h2>
            <FormError message={formError} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} error={errors.code} hint="Letters, numbers, - and _" />
              <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Coupon['type'] })}>
                <option value="PERCENT">Percentage off</option>
                <option value="FIXED">Fixed amount off</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </Select>
              {draft.type !== 'FREE_SHIPPING' && (
                <Input label={draft.type === 'PERCENT' ? 'Percent (%)' : `Amount (${STORE_CURRENCY})`} inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} error={errors.value} />
              )}
              <Input label={`Minimum order (${STORE_CURRENCY})`} inputMode="decimal" value={draft.minSubtotal} onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value })} optional error={errors.minSubtotal} />
              <Input label="Total uses" inputMode="numeric" value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value.replace(/\D/g, '') })} optional hint="Empty = unlimited" />
              <Input label="Uses per customer" inputMode="numeric" value={draft.perUserLimit} onChange={(e) => setDraft({ ...draft, perUserLimit: e.target.value.replace(/\D/g, '') })} optional />
              <Input label="Starts" type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} optional />
              <Input label="Ends" type="date" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} optional error={errors.endsAt} />
            </div>
            <Input label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} optional hint="Shown to the customer when the code is applied." />
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="Active" /> Active
            </label>
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                Save coupon
              </Button>
              {draft.id && (
                <Button type="button" variant="ghost" onClick={() => { setDeleting(data?.find((c) => c.id === draft.id) ?? null); setDraft(null); }}>
                  Delete
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.code}?`}
        body={deleting?.usedCount ? 'This code has been used, so it will be deactivated instead of deleted to keep order history intact.' : 'This cannot be undone.'}
        confirmLabel={deleting?.usedCount ? 'Deactivate' : 'Delete'}
        danger
        onConfirm={async () => {
          if (!deleting) return;
          const res = await api<{ deactivated: boolean }>(`/admin/coupons/${deleting.id}`, { method: 'DELETE' });
          toast.show(res.deactivated ? 'Coupon deactivated' : 'Coupon deleted');
          setDeleting(null);
          await reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
