'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { adminBannerSchema } from '@maison/shared';
import { ConfirmDialog, PageHeader, Pill, Tabs, TextArea, Toggle } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Select, zodFieldErrors } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, ApiRequestError } from '@/lib/api';
import { formatDate, useAdminQuery } from '@/lib/admin';
import type { Banner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toast';

type AdminBanner = Banner & { sortOrder: number; isActive: boolean; startsAt: string | null; endsAt: string | null };
type Placement = Banner['placement'];

const PLACEMENTS: { value: Placement; label: string; hint: string }[] = [
  { value: 'HERO', label: 'Hero slides', hint: 'Full-screen slideshow at the top of the home page.' },
  { value: 'PROMO', label: 'Campaign', hint: 'The full-width parallax campaign banner (first active one is shown).' },
  { value: 'EDITORIAL', label: 'Lookbook', hint: 'Editorial images in the home page lookbook grid.' },
  { value: 'STORY', label: 'Brand story', hint: 'The dark "Our atelier" section (first active one is shown).' },
];

const blank = (placement: Placement) => ({ title: '', subtitle: '', eyebrow: '', ctaLabel: '', ctaHref: '', image: '', mobileImage: '', placement, theme: 'DARK' as 'DARK' | 'LIGHT', isActive: true, startsAt: '', endsAt: '' });

export default function BannersPage() {
  const [placement, setPlacement] = useState<Placement>('HERO');
  const { data, reload, setData } = useAdminQuery<AdminBanner[]>('/admin/banners', { placement });
  const [draft, setDraft] = useState<(ReturnType<typeof blank> & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  const reorder = async (from: number, to: number) => {
    if (!data || to < 0 || to >= data.length) return;
    const next = [...data];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setData(next);
    await api('/admin/banners/reorder', { method: 'PUT', body: { ids: next.map((b) => b.id) } }).catch(() => toast.error('Could not reorder'));
  };

  const open = (b?: AdminBanner) => {
    setErrors({});
    setFormError('');
    setDraft(
      b
        ? {
            id: b.id,
            title: b.title,
            subtitle: b.subtitle ?? '',
            eyebrow: b.eyebrow ?? '',
            ctaLabel: b.ctaLabel ?? '',
            ctaHref: b.ctaHref ?? '',
            image: b.image,
            mobileImage: b.mobileImage ?? '',
            placement: b.placement,
            theme: b.theme,
            isActive: b.isActive,
            startsAt: b.startsAt?.slice(0, 10) ?? '',
            endsAt: b.endsAt?.slice(0, 10) ?? '',
          }
        : blank(placement),
    );
  };

  const save = async () => {
    if (!draft) return;
    const parsed = adminBannerSchema.safeParse({
      ...draft,
      subtitle: draft.subtitle || null,
      eyebrow: draft.eyebrow || null,
      ctaLabel: draft.ctaLabel || null,
      ctaHref: draft.ctaHref || null,
      mobileImage: draft.mobileImage || null,
      startsAt: draft.startsAt ? new Date(`${draft.startsAt}T00:00:00`).toISOString() : null,
      endsAt: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`).toISOString() : null,
      sortOrder: draft.id ? data?.find((b) => b.id === draft.id)?.sortOrder ?? 0 : data?.length ?? 0,
    });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setSaving(true);
    try {
      await api(draft.id ? `/admin/banners/${draft.id}` : '/admin/banners', { method: draft.id ? 'PUT' : 'POST', body: parsed.data });
      toast.success('Banner saved — the home page refreshes within two minutes');
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

  const now = Date.now();
  const live = (b: AdminBanner) => b.isActive && (!b.startsAt || new Date(b.startsAt).getTime() <= now) && (!b.endsAt || new Date(b.endsAt).getTime() >= now);

  return (
    <>
      <PageHeader
        title="Homepage banners"
        description={PLACEMENTS.find((p) => p.value === placement)?.hint}
        actions={
          <Button size="sm" onClick={() => open()}>
            <Plus className="h-3.5 w-3.5" /> New banner
          </Button>
        }
      />
      <Tabs value={placement} onChange={setPlacement} tabs={PLACEMENTS.map((p) => ({ value: p.value, label: p.label }))} />
      {!data ? (
        <div className="skeleton h-72" />
      ) : data.length === 0 ? (
        <p className="border border-dashed border-stone-300 py-16 text-center text-sm text-stone-500">No banners here yet.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((b, i) => (
            <li key={b.id} className={cn('flex items-stretch gap-4 border border-stone-200 bg-paper', !live(b) && 'opacity-60')}>
              <button type="button" onClick={() => open(b)} className="relative w-48 shrink-0 overflow-hidden bg-stone-100 sm:w-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image.replace(/w=\d+/, 'w=500')} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </button>
              <button type="button" onClick={() => open(b)} className="min-w-0 flex-1 py-4 text-left">
                {b.eyebrow && <p className="text-[0.65rem] tracking-[0.16em] text-stone-500 uppercase">{b.eyebrow}</p>}
                <p className="font-display text-2xl">{b.title}</p>
                {b.subtitle && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{b.subtitle}</p>}
                <p className="mt-2 flex flex-wrap gap-2">
                  {live(b) ? <Pill tone="good">Live</Pill> : <Pill>{b.isActive ? 'Scheduled / ended' : 'Off'}</Pill>}
                  {b.ctaHref && <Pill>{b.ctaLabel} → {b.ctaHref}</Pill>}
                  {(b.startsAt || b.endsAt) && <Pill tone="warn">{`${b.startsAt ? formatDate(b.startsAt) : '…'} – ${b.endsAt ? formatDate(b.endsAt) : '…'}`}</Pill>}
                </p>
              </button>
              <div className="flex flex-col justify-center gap-1 pr-3">
                <button type="button" onClick={() => reorder(i, i - 1)} disabled={i === 0} className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => reorder(i, i + 1)} disabled={i === data.length - 1} className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit banner' : 'New banner'} className="max-w-3xl">
        {draft && (
          <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <h2 className="font-display text-3xl font-light">{draft.id ? 'Edit banner' : 'New banner'}</h2>
            <FormError message={formError} />
            {draft.image && (
              <div className="relative aspect-[21/9] overflow-hidden bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.image.replace(/w=\d+/, 'w=1200')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                <div className={cn('absolute inset-0 flex flex-col justify-end p-6', draft.theme === 'LIGHT' ? 'text-ink' : 'text-bone')}>
                  {draft.eyebrow && <p className="text-[0.6rem] tracking-[0.18em] uppercase">{draft.eyebrow}</p>}
                  <p className="font-display text-3xl">{draft.title || 'Title'}</p>
                </div>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Eyebrow" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} optional />
              <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} error={errors.title} />
            </div>
            <TextArea label="Subtitle" value={draft.subtitle} onChange={(v) => setDraft({ ...draft, subtitle: v })} rows={2} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Image URL (desktop)" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} error={errors.image} />
              <Input label="Image URL (mobile)" value={draft.mobileImage} onChange={(e) => setDraft({ ...draft, mobileImage: e.target.value })} optional error={errors.mobileImage} />
              <Input label="Button label" value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} optional />
              <Input label="Button link" value={draft.ctaHref} onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })} optional placeholder="/collections/…" />
              <Select label="Text colour" value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value as 'DARK' | 'LIGHT' })}>
                <option value="DARK">Light text on dark image</option>
                <option value="LIGHT">Dark text on light image</option>
              </Select>
              <Select label="Placement" value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as Placement })}>
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Input label="Show from" type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} optional />
              <Input label="Show until" type="date" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} optional />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="Active" /> Active
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                Save banner
              </Button>
              {draft.id && (
                <Button type="button" variant="ghost" onClick={() => { setDeleting(data?.find((b) => b.id === draft.id) ?? null); setDraft(null); }}>
                  Delete
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this banner?"
        body="It will disappear from the home page."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/admin/banners/${deleting.id}`, { method: 'DELETE' });
          toast.show('Banner deleted');
          setDeleting(null);
          await reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
