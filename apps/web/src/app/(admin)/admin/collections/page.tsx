'use client';

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminCollectionSchema } from '@maison/shared';
import { ConfirmDialog, ImageField, PageHeader, Pill, SearchInput, TextArea, Thumb, Toggle } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FormError, Input, zodFieldErrors } from '@/components/ui/Field';
import { api, ApiRequestError } from '@/lib/api';
import { useAdminQuery } from '@/lib/admin';
import { toast } from '@/stores/toast';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImage: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}
interface CollectionProduct { id: string; name: string; status: string; image: string | null }
interface ProductOption { id: string; name: string; image: string | null; status: string }

export default function CollectionsPage() {
  const { data, reload } = useAdminQuery<Collection[]>('/admin/collections');
  const [editing, setEditing] = useState<Collection | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);

  return (
    <>
      <PageHeader
        title="Collections"
        description="Curated edits shown on the home page and at /collections."
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-3.5 w-3.5" /> New collection
          </Button>
        }
      />
      {!data ? (
        <div className="skeleton h-80" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id} className="border border-stone-200 bg-paper">
              <button type="button" onClick={() => setEditing(c)} className="block w-full text-left">
                <span className="relative block aspect-[16/9] overflow-hidden bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.heroImage && <img src={c.heroImage.replace(/w=\d+/, 'w=600')} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="flex items-start justify-between gap-3 p-4">
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-xs text-stone-500">{c.productCount} products · /collections/{c.slug}</span>
                  </span>
                  <span className="flex gap-1">
                    {c.isFeatured && <Pill tone="dark">Featured</Pill>}
                    {!c.isActive && <Pill>Hidden</Pill>}
                  </span>
                </span>
              </button>
              <div className="border-t border-stone-200 px-4 py-2 text-right">
                <button type="button" onClick={() => setDeleting(c)} className="text-xs text-stone-500 hover:text-sale">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <CollectionEditor key={editing === 'new' ? 'new' : editing.id} collection={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        body="Products stay in the catalogue; only the collection is removed."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/admin/collections/${deleting.id}`, { method: 'DELETE' });
          toast.show('Collection deleted');
          setDeleting(null);
          await reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function CollectionEditor({ collection, onClose, onSaved }: { collection: Collection | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: collection?.name ?? '',
    slug: collection?.slug ?? '',
    description: collection?.description ?? '',
    heroImage: collection?.heroImage ?? '',
    isFeatured: collection?.isFeatured ?? false,
    isActive: collection?.isActive ?? true,
    sortOrder: String(collection?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [q, setQ] = useState('');
  const { data: options } = useAdminQuery<ProductOption[]>(q ? '/admin/products' : null, { q, limit: 8 });

  useEffect(() => {
    if (!collection) return;
    api<{ products: CollectionProduct[] }>(`/admin/collections/${collection.id}`, { cache: 'no-store' }).then((c) => setProducts(c.products));
  }, [collection]);

  const move = (i: number, d: number) =>
    setProducts((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    const parsed = adminCollectionSchema.safeParse({ ...form, slug: form.slug || undefined, description: form.description || null, heroImage: form.heroImage || null });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setSaving(true);
    setFormError('');
    try {
      const saved = await api<{ id: string }>(collection ? `/admin/collections/${collection.id}` : '/admin/collections', { method: collection ? 'PUT' : 'POST', body: parsed.data });
      await api(`/admin/collections/${saved.id}/products`, { method: 'PUT', body: { productIds: products.map((p) => p.id) } });
      toast.success('Collection saved');
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(Object.keys(err.fieldErrors).length ? '' : err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={collection ? `Edit · ${collection.name}` : 'New collection'}
      className="max-w-xl"
      footer={
        <div className="p-5">
          <Button className="w-full" onClick={save} loading={saving}>
            Save collection
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-6">
        <FormError message={formError} />
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="URL handle" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} optional error={errors.slug} />
        <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={3} />
        <ImageField label="Hero image" value={form.heroImage} onChange={(v) => setForm({ ...form, heroImage: v })} folder="collections" optional error={errors.heroImage} previewClassName="h-28 w-24" hint="Wide or portrait photo, at least 1600 px. Used on the collection page and home page." />
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <label className="flex items-center gap-3">
            <Toggle checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} label="Featured" /> Featured on home page
          </label>
          <label className="flex items-center gap-3">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Visible" /> Visible
          </label>
        </div>

        <div className="border-t border-stone-200 pt-5">
          <p className="mb-3 text-[0.68rem] tracking-[0.14em] uppercase">Products ({products.length})</p>
          <SearchInput value={q} onChange={setQ} placeholder="Search products to add" />
          {q && (
            <ul className="mt-2 max-h-56 divide-y divide-stone-100 overflow-y-auto border border-stone-200">
              {(options ?? []).map((o) => {
                const added = products.some((p) => p.id === o.id);
                return (
                  <li key={o.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Thumb src={o.image} />
                    <span className="flex-1 truncate">{o.name}</span>
                    <Button size="sm" variant="ghost" disabled={added} onClick={() => setProducts((list) => [...list, { id: o.id, name: o.name, image: o.image, status: o.status }])}>
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="mt-4 divide-y divide-stone-100 border border-stone-200">
            {products.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Thumb src={p.image} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.status !== 'ACTIVE' && <Pill>{p.status.toLowerCase()}</Pill>}
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-stone-500 hover:text-ink disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === products.length - 1} className="p-1 text-stone-500 hover:text-ink disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setProducts((list) => list.filter((x) => x.id !== p.id))} className="p-1 text-stone-500 hover:text-sale" aria-label={`Remove ${p.name}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {products.length === 0 && <li className="px-3 py-6 text-center text-xs text-stone-500">No products yet.</li>}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}
