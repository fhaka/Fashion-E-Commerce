'use client';

import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, GripVertical, ImagePlus, Link2, Trash2, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { adminProductSchema } from '@maison/shared';
import { toCents, toDollars, useAdminQuery } from '@/lib/admin';
import { api, ApiRequestError } from '@/lib/api';
import { cn, STORE_CURRENCY } from '@/lib/utils';
import { toast } from '@/stores/toast';
import { useSite } from '../layout/SiteProvider';
import { Button } from '../ui/Button';
import { Checkbox, FormError, Input, Select, zodFieldErrors } from '../ui/Field';
import { ConfirmDialog, PageHeader, Panel, Pill, TextArea, Toggle } from './ui';

/* ───────────────────────── Types ───────────────────────── */

interface Size { id: string; label: string; group: string; sortOrder: number }
interface Color { id: string; name: string; hex: string; slug: string }
interface Category { id: string; name: string; parentId: string | null }
interface Collection { id: string; name: string }

interface ImageDraft { key: string; id?: string; url: string; publicId?: string | null; alt: string; colorId: string }
interface VariantDraft {
  key: string;
  id?: string;
  sizeId: string;
  colorId: string;
  sku: string;
  priceOverride: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
  reserved?: number;
  hasOrders?: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  details: string[];
  materials: string | null;
  care: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  gender: 'WOMEN' | 'MEN' | 'UNISEX';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId: string;
  collectionIds: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  salesCount?: number;
  images: { id: string; url: string; publicId: string | null; alt: string | null; colorId: string | null }[];
  variants: {
    id: string;
    sizeId: string;
    colorId: string;
    sku: string;
    priceOverride: number | null;
    isActive: boolean;
    stock: number;
    reserved: number;
    lowStockThreshold: number;
    hasOrders: boolean;
  }[];
}

let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

function fromProduct(p?: AdminProduct) {
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    description: p?.description ?? '',
    details: (p?.details ?? []).join('\n'),
    materials: p?.materials ?? '',
    care: p?.care ?? '',
    basePrice: toDollars(p?.basePrice),
    compareAtPrice: toDollars(p?.compareAtPrice),
    gender: p?.gender ?? 'WOMEN',
    status: p?.status ?? 'DRAFT',
    categoryId: p?.categoryId ?? '',
    collectionIds: p?.collectionIds ?? [],
    isFeatured: p?.isFeatured ?? false,
    isBestSeller: p?.isBestSeller ?? false,
    isNew: p?.isNew ?? true,
    videoUrl: p?.videoUrl ?? '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
  };
}

/* ───────────────────────── Editor ───────────────────────── */

export function ProductEditor({ product }: { product?: AdminProduct }) {
  const { storeName, features } = useSite();
  const router = useRouter();
  const isNew = !product;
  const [form, setForm] = useState(() => fromProduct(product));
  const [images, setImages] = useState<ImageDraft[]>(() =>
    (product?.images ?? []).map((i) => ({ key: nextKey(), id: i.id, url: i.url, publicId: i.publicId, alt: i.alt ?? '', colorId: i.colorId ?? '' })),
  );
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    (product?.variants ?? []).map((v) => ({
      key: nextKey(),
      id: v.id,
      sizeId: v.sizeId,
      colorId: v.colorId,
      sku: v.sku,
      priceOverride: toDollars(v.priceOverride),
      stock: String(v.stock),
      lowStockThreshold: String(v.lowStockThreshold),
      isActive: v.isActive,
      reserved: v.reserved,
      hasOrders: v.hasOrders,
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: sizes } = useAdminQuery<Size[]>('/admin/sizes');
  const { data: colors } = useAdminQuery<Color[]>('/admin/colors');
  const { data: categories } = useAdminQuery<Category[]>('/admin/categories');
  const { data: collections } = useAdminQuery<Collection[]>(features.collections ? '/admin/collections' : null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setFormError('');
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      details: form.details.split('\n').map((d) => d.trim()).filter(Boolean),
      materials: form.materials || null,
      care: form.care || null,
      basePrice: form.basePrice === '' ? NaN : toCents(form.basePrice),
      compareAtPrice: form.compareAtPrice ? toCents(form.compareAtPrice) : null,
      gender: form.gender,
      status: form.status,
      categoryId: form.categoryId,
      collectionIds: form.collectionIds,
      isFeatured: form.isFeatured,
      isBestSeller: form.isBestSeller,
      isNew: form.isNew,
      videoUrl: form.videoUrl || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      images: images.map((i, idx) => ({ id: i.id, url: i.url, publicId: i.publicId ?? null, alt: i.alt || null, colorId: i.colorId || null, sortOrder: idx })),
      variants: variants.map((v) => ({
        id: v.id,
        sizeId: v.sizeId,
        colorId: v.colorId,
        sku: v.sku,
        priceOverride: v.priceOverride ? toCents(v.priceOverride) : null,
        stock: Number(v.stock || 0),
        lowStockThreshold: Number(v.lowStockThreshold || 0),
        isActive: v.isActive,
      })),
    };
    const parsed = adminProductSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = zodFieldErrors(parsed.error.issues);
      setErrors(errs);
      setFormError('Please fix the highlighted fields.');
      return;
    }
    if (parsed.data.status === 'ACTIVE' && (parsed.data.variants.length === 0 || parsed.data.images.length === 0)) {
      setFormError('An active product needs at least one image and one variant. Save as a draft until it is ready.');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await api<AdminProduct>(isNew ? '/admin/products' : `/admin/products/${product!.id}`, { method: isNew ? 'POST' : 'PUT', body: parsed.data });
      toast.success(isNew ? 'Product created' : 'Changes saved');
      if (isNew) router.replace(`/admin/products/${saved.id}`);
      else {
        // Re-sync ids for newly created images/variants.
        setImages(saved.images.map((i) => ({ key: nextKey(), id: i.id, url: i.url, publicId: i.publicId, alt: i.alt ?? '', colorId: i.colorId ?? '' })));
        setVariants(
          saved.variants
            .filter((v) => v.isActive || !v.sku.includes('-RETIRED-'))
            .map((v) => ({ key: nextKey(), id: v.id, sizeId: v.sizeId, colorId: v.colorId, sku: v.sku, priceOverride: toDollars(v.priceOverride), stock: String(v.stock), lowStockThreshold: String(v.lowStockThreshold), isActive: v.isActive, reserved: v.reserved, hasOrders: v.hasOrders })),
        );
        setForm((f) => ({ ...f, slug: saved.slug }));
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(Object.values(err.fieldErrors)[0] ?? err.message);
      } else setFormError('Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await api<{ archived: boolean }>(`/admin/products/${product!.id}`, { method: 'DELETE' });
      toast.show(res.archived ? 'Product archived (it has order history)' : 'Product deleted');
      router.replace('/admin/products');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not delete');
      setDeleting(false);
    }
  };

  const duplicate = async () => {
    try {
      const copy = await api<AdminProduct>(`/admin/products/${product!.id}/duplicate`, { method: 'POST' });
      toast.success('Duplicated as a draft');
      router.push(`/admin/products/${copy.id}`);
    } catch {
      toast.error('Could not duplicate');
    }
  };

  const err = (k: string) => errors[k];

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Products
      </Link>
      <PageHeader
        title={isNew ? 'New product' : form.name || 'Untitled product'}
        description={!isNew && <span className="font-mono text-xs">/{form.slug}</span>}
        actions={
          <>
            {!isNew && product?.status === 'ACTIVE' && (
              <Link href={`/product/${product.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 text-sm text-stone-600 hover:text-ink">
                View in store <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            {!isNew && (
              <Button variant="ghost" size="sm" onClick={duplicate}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
            )}
            <Button size="sm" onClick={save} loading={saving}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </>
        }
      />
      <FormError message={formError} />

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Details">
            <div className="space-y-5">
              <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={err('name')} />
              <TextArea label="Description" value={form.description} onChange={(v) => set('description', v)} rows={5} />
              {err('description') && <p className="-mt-3 text-xs text-sale">{err('description')}</p>}
              <TextArea label="Details (one per line)" value={form.details} onChange={(v) => set('details', v)} rows={4} hint="Shown as a bulleted list on the product page." />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextArea label="Materials" value={form.materials} onChange={(v) => set('materials', v)} rows={3} />
                <TextArea label="Care" value={form.care} onChange={(v) => set('care', v)} rows={3} />
              </div>
            </div>
          </Panel>

          <ImagesPanel images={images} setImages={setImages} colors={colors ?? []} error={err('images')} />

          <VariantsPanel variants={variants} setVariants={setVariants} sizes={sizes ?? []} colors={colors ?? []} productName={form.name} errors={errors} />

          <Panel title="Search engine listing">
            <div className="space-y-5">
              <Input label="SEO title" value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} hint={`${form.seoTitle.length}/70 · leave empty to use the product name`} error={err('seoTitle')} />
              <TextArea label="SEO description" value={form.seoDescription} onChange={(v) => set('seoDescription', v)} rows={3} hint={`${form.seoDescription.length}/170 · leave empty to use the description`} />
              <Input label="URL handle" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} hint="Generated from the name if empty." error={err('slug')} />
              <div className="border border-stone-200 bg-stone-100/50 p-4 text-sm">
                <p className="text-xs text-stone-500">Preview</p>
                <p className="mt-1 text-[#1a0dab]">{(form.seoTitle || form.name || 'Product name') + ' | ' + storeName}</p>
                <p className="text-xs text-[#006621]">maison.com/product/{form.slug || 'product-name'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-stone-600">{form.seoDescription || form.description || 'Product description…'}</p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <Select label="Visibility" value={form.status} onChange={(e) => set('status', e.target.value as typeof form.status)}>
              <option value="DRAFT">Draft — hidden from the store</option>
              <option value="ACTIVE">Active — visible in the store</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </Panel>

          <Panel title="Pricing">
            <div className="space-y-5">
              <Input label={`Price (${STORE_CURRENCY})`} inputMode="decimal" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} error={err('basePrice')} />
              <Input
                label={`Compare-at price (${STORE_CURRENCY})`}
                inputMode="decimal"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                optional
                hint="Set higher than the price to show a sale."
                error={err('compareAtPrice')}
              />
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="space-y-5">
              <Select label="Category" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} error={err('categoryId')}>
                <option value="">Choose a category</option>
                {(categories ?? [])
                  .filter((c) => !c.parentId)
                  .map((root) => (
                    <optgroup key={root.id} label={root.name}>
                      {(categories ?? []).filter((c) => c.parentId === root.id).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </Select>
              <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value as typeof form.gender)}>
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
                <option value="UNISEX">Unisex</option>
              </Select>
              {features.collections && (
              <fieldset>
                <legend className="mb-2 text-[0.68rem] tracking-[0.14em] uppercase">Collections</legend>
                <div className="space-y-2">
                  {(collections ?? []).map((c) => (
                    <Checkbox
                      key={c.id}
                      label={c.name}
                      checked={form.collectionIds.includes(c.id)}
                      onChange={(e) => set('collectionIds', e.target.checked ? [...form.collectionIds, c.id] : form.collectionIds.filter((x) => x !== c.id))}
                    />
                  ))}
                </div>
              </fieldset>
              )}
            </div>
          </Panel>

          <Panel title="Merchandising">
            <ul className="space-y-4 text-sm">
              {(
                [
                  ['isFeatured', 'Featured', 'Homepage spotlight'],
                  ['isBestSeller', 'Best seller', 'Shows a "Best seller" badge'],
                  ['isNew', 'New arrival', 'Appears in New In'],
                ] as const
              ).map(([k, label, hint]) => (
                <li key={k} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block">{label}</span>
                    <span className="text-xs text-stone-500">{hint}</span>
                  </span>
                  <Toggle checked={form[k]} onChange={(v) => set(k, v)} label={label} />
                </li>
              ))}
            </ul>
          </Panel>

          {features.productMedia && (
            <Panel title="Video">
              <Input label="Video URL (MP4)" value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} optional hint="Plays as the last item in the gallery." error={err('videoUrl')} />
            </Panel>
          )}

          {!isNew && (
            <Panel title="Danger zone">
              <p className="mb-4 text-sm text-stone-600">Products with sales history are archived rather than deleted, so past orders and reports stay intact.</p>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete product
              </Button>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        body="If it has been ordered before it will be archived instead. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

/* ───────────────────────── Images ───────────────────────── */

function ImagesPanel({ images, setImages, colors, error }: { images: ImageDraft[]; setImages: React.Dispatch<React.SetStateAction<ImageDraft[]>>; colors: Color[]; error?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [dragKey, setDragKey] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const body = new FormData();
    for (const f of Array.from(files).slice(0, 10)) body.append('files', f);
    setUploading(true);
    try {
      const stored = await api<{ url: string; publicId: string }[]>('/admin/uploads', { method: 'POST', body });
      setImages((list) => [...list, ...stored.map((s) => ({ key: nextKey(), url: s.url, publicId: s.publicId, alt: '', colorId: '' }))]);
      toast.success(`${stored.length} image${stored.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const move = (from: number, to: number) =>
    setImages((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  return (
    <Panel
      title={`Images (${images.length})`}
      actions={
        <span className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} id="image-upload" aria-label="Upload product images" tabIndex={-1} />
          <Button size="sm" variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" /> Upload
          </Button>
        </span>
      }
    >
      {error && <p className="mb-3 text-xs text-sale">{error}</p>}
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center gap-2 border border-dashed border-stone-300 py-12 text-sm text-stone-500 hover:border-ink hover:text-ink"
        >
          <ImagePlus className="h-6 w-6" strokeWidth={1.3} />
          Drop images here or click to upload (JPEG, PNG, WebP, AVIF · max 8 MB)
        </button>
      ) : (
        <ul className="space-y-2">
          {images.map((img, i) => (
            <li
              key={img.key}
              draggable
              onDragStart={() => setDragKey(img.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = images.findIndex((x) => x.key === dragKey);
                if (from >= 0) move(from, i);
                setDragKey(null);
              }}
              className={cn('flex items-center gap-3 border border-stone-200 p-2', dragKey === img.key && 'opacity-50')}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-stone-500" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url.includes('images.unsplash.com') ? img.url.replace(/w=\d+/, 'w=160') : img.url} alt="" className="h-16 w-12 shrink-0 bg-stone-100 object-cover" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_10rem]">
                <input
                  value={img.alt}
                  onChange={(e) => setImages((list) => list.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))}
                  placeholder="Alt text (describe the image)"
                  aria-label="Alt text"
                  className="h-9 w-full border border-stone-300 bg-transparent px-2 text-sm outline-none focus:border-ink"
                />
                <select
                  value={img.colorId}
                  onChange={(e) => setImages((list) => list.map((x) => (x.key === img.key ? { ...x, colorId: e.target.value } : x)))}
                  aria-label="Colour"
                  className="h-9 border border-stone-300 bg-transparent px-2 text-sm outline-none"
                >
                  <option value="">All colours</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {i === 0 && <Pill tone="dark">Main</Pill>}
              <div className="flex shrink-0">
                <button type="button" className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" className="p-1.5 text-stone-500 hover:text-sale" onClick={() => setImages((list) => list.filter((x) => x.key !== img.key))} aria-label="Remove image">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const u = new URL(urlInput);
            if (u.protocol !== 'https:') throw new Error();
            setImages((list) => [...list, { key: nextKey(), url: u.toString(), alt: '', colorId: '' }]);
            setUrlInput('');
          } catch {
            toast.error('Enter a valid https:// image URL');
          }
        }}
      >
        <label className="flex h-9 flex-1 items-center gap-2 border border-stone-300 px-2 text-sm focus-within:border-ink">
          <Link2 className="h-4 w-4 text-stone-500" />
          <span className="sr-only">Image URL</span>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="…or add an image by URL (https://)" className="w-full bg-transparent outline-none" />
        </label>
        <Button type="submit" size="sm" variant="ghost" disabled={!urlInput}>
          Add
        </Button>
      </form>
      <p className="mt-2 text-xs text-stone-500">Drag to reorder — the first image is the main one. Assign images to a colour to give each colour its own gallery.</p>
    </Panel>
  );
}

/* ───────────────────────── Variants ───────────────────────── */

const GROUP_LABEL: Record<string, string> = { APPAREL: 'Clothing (XS–XL)', WAIST: 'Waist (28–36)', SHOE_W: "Women's shoes (EU)", SHOE_M: "Men's shoes (EU)", ONE_SIZE: 'One size' };

function VariantsPanel({
  variants,
  setVariants,
  sizes,
  colors,
  productName,
  errors,
}: {
  variants: VariantDraft[];
  setVariants: React.Dispatch<React.SetStateAction<VariantDraft[]>>;
  sizes: Size[];
  colors: Color[];
  productName: string;
  errors: Record<string, string>;
}) {
  const groups = useMemo(() => [...new Set(sizes.map((s) => s.group))], [sizes]);
  const usedGroup = sizes.find((s) => s.id === variants[0]?.sizeId)?.group;
  const [group, setGroup] = useState<string>('');
  const activeGroup = group || usedGroup || groups[0] || 'APPAREL';
  const groupSizes = sizes.filter((s) => s.group === activeGroup).sort((a, b) => a.sortOrder - b.sortOrder);
  const [pickSizes, setPickSizes] = useState<string[]>([]);
  const [pickColors, setPickColors] = useState<string[]>([]);
  const sizeOf = (id: string) => sizes.find((s) => s.id === id);
  const colorOf = (id: string) => colors.find((c) => c.id === id);

  const code =
    productName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4) || 'NEW';

  const generate = () => {
    const sizesToUse = pickSizes.length ? pickSizes : groupSizes.map((s) => s.id);
    const added: VariantDraft[] = [];
    for (const colorId of pickColors) {
      for (const sizeId of sizesToUse) {
        if (variants.some((v) => v.colorId === colorId && v.sizeId === sizeId)) continue;
        const c = colorOf(colorId)!;
        const s = sizeOf(sizeId)!;
        added.push({
          key: nextKey(),
          sizeId,
          colorId,
          sku: `MS-${code}-${c.slug.slice(0, 3).toUpperCase()}-${s.label.replace(/\s+/g, '').toUpperCase()}`,
          priceOverride: '',
          stock: '0',
          lowStockThreshold: '5',
          isActive: true,
        });
      }
    }
    if (!added.length) toast.show('Those combinations already exist — pick at least one colour.');
    setVariants((v) => [...v, ...added]);
    setPickColors([]);
  };

  const update = (key: string, patch: Partial<VariantDraft>) => setVariants((list) => list.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const sorted = [...variants].sort(
    (a, b) => (colorOf(a.colorId)?.name ?? '').localeCompare(colorOf(b.colorId)?.name ?? '') || (sizeOf(a.sizeId)?.sortOrder ?? 0) - (sizeOf(b.sizeId)?.sortOrder ?? 0),
  );
  const cell = 'h-9 w-full border border-stone-300 bg-transparent px-2 text-sm outline-none focus:border-ink';

  return (
    <Panel title={`Variants (${variants.length}) · ${totalStock} in stock`}>
      {errors.variants && <p className="mb-3 text-xs text-sale">{errors.variants}</p>}

      <div className="mb-6 border border-stone-200 bg-stone-100/50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Wand2 className="h-4 w-4" /> Generate size × colour combinations
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <select value={activeGroup} onChange={(e) => { setGroup(e.target.value); setPickSizes([]); }} className="mb-2 h-9 w-full border border-stone-300 bg-paper px-2 text-sm" aria-label="Size group">
              {groups.map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g] ?? g}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {groupSizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={pickSizes.includes(s.id)}
                  onClick={() => setPickSizes((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                  className={cn('h-8 min-w-9 border px-2 text-xs', pickSizes.includes(s.id) ? 'border-ink bg-ink text-bone' : 'border-stone-300 bg-paper')}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-stone-500">{pickSizes.length ? `${pickSizes.length} selected` : 'None selected = all sizes in the group'}</p>
          </div>
          <div>
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={pickColors.includes(c.id)}
                  onClick={() => setPickColors((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                  className={cn('flex h-8 items-center gap-1.5 border px-2 text-xs', pickColors.includes(c.id) ? 'border-ink bg-ink text-bone' : 'border-stone-300 bg-paper')}
                >
                  <span className="h-3 w-3 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button size="sm" className="mt-4" onClick={generate} disabled={!pickColors.length}>
          Add variants
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">No variants yet. Pick colours above and add the combinations you sell.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[0.65rem] tracking-[0.12em] text-stone-500 uppercase">
                <th className="py-2 pr-2 font-medium">Variant</th>
                <th className="py-2 pr-2 font-medium">SKU</th>
                <th className="w-24 py-2 pr-2 font-medium">Price ({STORE_CURRENCY})</th>
                <th className="w-20 py-2 pr-2 font-medium">Stock</th>
                <th className="w-20 py-2 pr-2 font-medium">Alert at</th>
                <th className="w-16 py-2 pr-2 font-medium">Active</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sorted.map((v) => {
                const c = colorOf(v.colorId);
                return (
                  <tr key={v.key}>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: c?.hex }} />
                        {c?.name} · {sizeOf(v.sizeId)?.label}
                        {!!v.reserved && <Pill tone="warn">{v.reserved} held</Pill>}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <input aria-label="SKU" className={cn(cell, 'font-mono text-xs uppercase')} value={v.sku} onChange={(e) => update(v.key, { sku: e.target.value.toUpperCase() })} />
                    </td>
                    <td className="py-2 pr-2">
                      <input aria-label="Price override" placeholder="Base" inputMode="decimal" className={cell} value={v.priceOverride} onChange={(e) => update(v.key, { priceOverride: e.target.value })} />
                    </td>
                    <td className="py-2 pr-2">
                      <input aria-label="Stock" inputMode="numeric" className={cell} value={v.stock} onChange={(e) => update(v.key, { stock: e.target.value.replace(/\D/g, '') })} />
                    </td>
                    <td className="py-2 pr-2">
                      <input aria-label="Low stock alert" inputMode="numeric" className={cell} value={v.lowStockThreshold} onChange={(e) => update(v.key, { lowStockThreshold: e.target.value.replace(/\D/g, '') })} />
                    </td>
                    <td className="py-2 pr-2">
                      <Toggle checked={v.isActive} onChange={(on) => update(v.key, { isActive: on })} label="Active" />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="p-1 text-stone-500 hover:text-sale"
                        onClick={() => setVariants((list) => list.filter((x) => x.key !== v.key))}
                        aria-label="Remove variant"
                        title={v.hasOrders ? 'Has order history — it will be retired, not deleted' : 'Remove'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
