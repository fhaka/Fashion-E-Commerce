'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addressSchema } from '@maison/shared';
import { AddressFields, EMPTY_ADDRESS, type AddressValues } from '@/components/account/AddressFields';
import { AddressBlock } from '@/components/order/OrderParts';
import { Button } from '@/components/ui/Button';
import { Checkbox, FormError, zodFieldErrors } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, ApiRequestError } from '@/lib/api';
import type { Address } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { toast } from '@/stores/toast';

const toValues = (a: Address): AddressValues => ({
  label: a.label ?? '',
  fullName: a.fullName,
  line1: a.line1,
  line2: a.line2 ?? '',
  city: a.city,
  state: a.state ?? '',
  postalCode: a.postalCode,
  country: a.country,
  phone: a.phone ?? '',
  isDefault: a.isDefault,
});

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; values: AddressValues } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = () => api<Address[]>('/account/addresses', { cache: 'no-store' }).then(setAddresses);
  useEffect(() => {
    void load();
  }, []);

  const open = (a?: Address) => {
    setErrors({});
    setFormError('');
    setEditing(a ? { id: a.id, values: toValues(a) } : { values: { ...EMPTY_ADDRESS, label: '', isDefault: !addresses?.length } });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const parsed = addressSchema.safeParse(editing.values);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setSaving(true);
    try {
      await api(editing.id ? `/account/addresses/${editing.id}` : '/account/addresses', { method: editing.id ? 'PUT' : 'POST', body: parsed.data });
      await load();
      setEditing(null);
      toast.success(editing.id ? 'Address updated' : 'Address saved');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(Object.keys(err.fieldErrors).length ? '' : err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await api(`/account/addresses/${id}`, { method: 'DELETE' });
      await load();
      toast.show('Address removed');
    } finally {
      setRemoving(null);
    }
  };

  const makeDefault = async (a: Address) => {
    await api(`/account/addresses/${a.id}`, { method: 'PUT', body: { ...toValues(a), isDefault: true } });
    await load();
  };

  return (
    <section aria-labelledby="addresses-heading">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="addresses-heading" className="font-display text-3xl font-light">
          Addresses
        </h2>
        <Button variant="outline" size="sm" onClick={() => open()} disabled={(addresses?.length ?? 0) >= 10}>
          <Plus className="h-3.5 w-3.5" /> Add address
        </Button>
      </div>

      {!addresses ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-44" />
          <div className="skeleton h-44" />
        </div>
      ) : addresses.length === 0 ? (
        <p className="border-y border-stone-200 py-12 text-center text-stone-500">No saved addresses yet. Add one for faster checkout.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {addresses.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col border border-stone-200 p-6"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[0.7rem] tracking-[0.16em] uppercase">{a.label || 'Address'}</p>
                  {a.isDefault && <span className="bg-ink px-2 py-0.5 text-[0.6rem] tracking-[0.14em] text-bone uppercase">Default</span>}
                </div>
                <AddressBlock address={a} />
                {a.phone && <p className="mt-1 text-sm text-stone-600">{a.phone}</p>}
                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-6 text-xs">
                  <button type="button" className="link-underline" onClick={() => open(a)}>
                    Edit
                  </button>
                  {!a.isDefault && (
                    <button type="button" className="link-underline" onClick={() => makeDefault(a)}>
                      Set as default
                    </button>
                  )}
                  <button type="button" className="link-underline text-stone-500 disabled:opacity-50" disabled={removing === a.id} onClick={() => remove(a.id)}>
                    {removing === a.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit address' : 'New address'}>
        {editing && (
          <form onSubmit={save} noValidate className="space-y-6">
            <h3 className="font-display text-3xl font-light">{editing.id ? 'Edit address' : 'New address'}</h3>
            <FormError message={formError} />
            <AddressFields value={editing.values} onChange={(values) => setEditing({ ...editing, values })} errors={errors} showLabel />
            <Checkbox label="Use as my default address" checked={!!editing.values.isDefault} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, isDefault: e.target.checked } })} />
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                Save address
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
