'use client';

import { Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { adminCategorySchema } from '@maison/shared';
import { ConfirmDialog, PageHeader, Pill, TextArea, Thumb, Toggle } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Select, zodFieldErrors } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, ApiRequestError } from '@/lib/api';
import { useAdminQuery } from '@/lib/admin';
import { toast } from '@/stores/toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  childCount: number;
}
type Draft = { id?: string; name: string; slug: string; description: string; image: string; parentId: string; sortOrder: string; isActive: boolean };

export default function CategoriesPage() {
  const { data, reload } = useAdminQuery<Category[]>('/admin/categories');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const roots = (data ?? []).filter((c) => !c.parentId);
  const childrenOf = (id: string) => (data ?? []).filter((c) => c.parentId === id);

  const open = (c?: Category, parentId = '') => {
    setErrors({});
    setFormError('');
    setDraft(
      c
        ? { id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', image: c.image ?? '', parentId: c.parentId ?? '', sortOrder: String(c.sortOrder), isActive: c.isActive }
        : { name: '', slug: '', description: '', image: '', parentId, sortOrder: '0', isActive: true },
    );
  };

  const save = async () => {
    if (!draft) return;
    const parsed = adminCategorySchema.safeParse({
      name: draft.name,
      slug: draft.slug || undefined,
      description: draft.description || null,
      image: draft.image || null,
      parentId: draft.parentId || null,
      sortOrder: draft.sortOrder,
      isActive: draft.isActive,
    });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setSaving(true);
    try {
      await api(draft.id ? `/admin/categories/${draft.id}` : '/admin/categories', { method: draft.id ? 'PUT' : 'POST', body: parsed.data });
      toast.success(draft.id ? 'Category updated' : 'Category created');
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

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/admin/categories/${deleting.id}`, { method: 'DELETE' });
      toast.show('Category deleted');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not delete');
    } finally {
      setDeleting(null);
    }
  };

  const Row = ({ c, depth }: { c: Category; depth: number }) => (
    <li className="flex items-center gap-3 border-b border-stone-200 bg-paper px-4 py-3 text-sm" style={{ paddingLeft: `${1 + depth * 2.5}rem` }}>
      <Thumb src={c.image} alt={c.name} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{c.name}</p>
        <p className="text-xs text-stone-500">
          /category/{c.slug} · {c.productCount} products{c.childCount ? ` · ${c.childCount} subcategories` : ''}
        </p>
      </div>
      {!c.isActive && <Pill>Hidden</Pill>}
      {depth === 0 && (
        <Button size="sm" variant="ghost" onClick={() => open(undefined, c.id)}>
          <Plus className="h-3.5 w-3.5" /> Sub
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => open(c)}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} disabled={c.productCount > 0 || c.childCount > 0} title={c.productCount || c.childCount ? 'Move its products and subcategories first' : undefined}>
        Delete
      </Button>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="The navigation tree used by the mega menu, filters and breadcrumbs."
        actions={
          <Button size="sm" onClick={() => open()}>
            <Plus className="h-3.5 w-3.5" /> New category
          </Button>
        }
      />
      {!data ? (
        <div className="skeleton h-96" />
      ) : (
        <ul className="border-x border-t border-stone-200">
          {roots.map((r) => (
            <Fragment key={r.id}>
              <Row c={r} depth={0} />
              {childrenOf(r.id).map((c) => (
                <Row key={c.id} c={c} depth={1} />
              ))}
            </Fragment>
          ))}
        </ul>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit category' : 'New category'}>
        {draft && (
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2 className="font-display text-3xl font-light">{draft.id ? 'Edit category' : 'New category'}</h2>
            <FormError message={formError} />
            <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <Input label="URL handle" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} optional hint="Generated from the name if empty." error={errors.slug} />
            <Select label="Parent" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} error={errors.parentId}>
              <option value="">None (top level)</option>
              {roots.filter((r) => r.id !== draft.id).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <TextArea label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} rows={3} />
            <Input label="Image URL" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} optional error={errors.image} />
            <div className="flex items-end gap-6">
              <Input label="Sort order" inputMode="numeric" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/\D/g, '') })} className="w-32" />
              <label className="flex h-12 items-center gap-3 text-sm">
                <Toggle checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="Visible" /> Visible in store
              </label>
            </div>
            <Button type="submit" loading={saving}>
              Save category
            </Button>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} title={`Delete “${deleting?.name}”?`} body="This cannot be undone." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDeleting(null)} />
    </>
  );
}
