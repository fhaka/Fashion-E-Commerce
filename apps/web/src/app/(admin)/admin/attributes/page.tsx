'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError } from '@/lib/api';
import { useAdminQuery } from '@/lib/admin';
import { toast } from '@/stores/toast';

interface Size { id: string; label: string; group: string; sortOrder: number; variantCount: number }
interface Color { id: string; name: string; hex: string; slug: string; variantCount: number }

const GROUPS = ['APPAREL', 'WAIST', 'SHOE_W', 'SHOE_M', 'ONE_SIZE'];
const GROUP_LABEL: Record<string, string> = { APPAREL: 'Clothing', WAIST: 'Waist', SHOE_W: "Women's shoes", SHOE_M: "Men's shoes", ONE_SIZE: 'One size' };

function errorText(err: unknown) {
  return err instanceof ApiRequestError ? Object.values(err.fieldErrors)[0] ?? err.message : 'Something went wrong';
}

export default function AttributesPage() {
  const sizes = useAdminQuery<Size[]>('/admin/sizes');
  const colors = useAdminQuery<Color[]>('/admin/colors');
  const [size, setSize] = useState({ label: '', group: 'APPAREL', sortOrder: '' });
  const [color, setColor] = useState({ name: '', hex: '#000000' });

  const addSize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/admin/sizes', { method: 'POST', body: { ...size, sortOrder: Number(size.sortOrder || 0) } });
      setSize({ ...size, label: '', sortOrder: '' });
      await sizes.reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };
  const addColor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/admin/colors', { method: 'POST', body: color });
      setColor({ name: '', hex: '#000000' });
      await colors.reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };
  const remove = async (path: string, reload: () => Promise<void>) => {
    try {
      await api(path, { method: 'DELETE' });
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const input = 'h-10 border border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-ink';
  return (
    <>
      <PageHeader title="Sizes & colours" description="Options available when building product variants. Values in use by products cannot be deleted." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Sizes">
          <form onSubmit={addSize} className="mb-5 flex flex-wrap gap-2">
            <input className={`${input} w-24`} placeholder="Label" aria-label="Size label" value={size.label} onChange={(e) => setSize({ ...size, label: e.target.value })} required />
            <select className={input} aria-label="Size group" value={size.group} onChange={(e) => setSize({ ...size, group: e.target.value })}>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g]}
                </option>
              ))}
            </select>
            <input className={`${input} w-20`} placeholder="Order" aria-label="Sort order" inputMode="numeric" value={size.sortOrder} onChange={(e) => setSize({ ...size, sortOrder: e.target.value.replace(/\D/g, '') })} />
            <Button type="submit" size="sm" className="h-10">
              Add
            </Button>
          </form>
          {GROUPS.map((g) => {
            const list = (sizes.data ?? []).filter((s) => s.group === g);
            if (!list.length) return null;
            return (
              <div key={g} className="mb-4">
                <p className="mb-2 text-xs text-stone-500">{GROUP_LABEL[g]}</p>
                <ul className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 border border-stone-200 py-1 pr-1 pl-3 text-sm">
                      {s.label}
                      <span className="text-xs text-stone-400">{s.variantCount}</span>
                      <button type="button" disabled={s.variantCount > 0} onClick={() => remove(`/admin/sizes/${s.id}`, sizes.reload)} className="p-1 text-stone-400 hover:text-sale disabled:opacity-30" aria-label={`Delete size ${s.label}`} title={s.variantCount ? 'In use' : 'Delete'}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Panel>

        <Panel title="Colours">
          <form onSubmit={addColor} className="mb-5 flex flex-wrap gap-2">
            <input className={`${input} flex-1`} placeholder="Name" aria-label="Colour name" value={color.name} onChange={(e) => setColor({ ...color, name: e.target.value })} required />
            <input type="color" className="h-10 w-12 cursor-pointer border border-stone-300 bg-transparent p-1" aria-label="Colour swatch" value={color.hex} onChange={(e) => setColor({ ...color, hex: e.target.value })} />
            <Button type="submit" size="sm" className="h-10">
              Add
            </Button>
          </form>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(colors.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 border border-stone-200 px-3 py-2 text-sm">
                <span className="h-5 w-5 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: c.hex }} />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs text-stone-400">{c.hex}</span>
                <span className="text-xs text-stone-400">{c.variantCount}</span>
                <button type="button" disabled={c.variantCount > 0} onClick={() => remove(`/admin/colors/${c.id}`, colors.reload)} className="p-1 text-stone-400 hover:text-sale disabled:opacity-30" aria-label={`Delete colour ${c.name}`} title={c.variantCount ? 'In use' : 'Delete'}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
