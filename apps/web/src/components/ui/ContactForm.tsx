'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { contactSchema } from '@maison/shared';
import { api, ApiRequestError } from '@/lib/api';
import { EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { Button } from './Button';
import { FormError, Input, Select, zodFieldErrors } from './Field';

const TOPICS = ['Sizing & fit advice', 'An existing order', 'Returns & exchanges', 'Repairs & aftercare', 'Something else'];

export function ContactForm() {
  const user = useAuth((s) => s.user);
  const [values, setValues] = useState({ name: '', email: '', subject: TOPICS[0], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const name = values.name || (user ? `${user.firstName} ${user.lastName}` : '');
  const email = values.email || user?.email || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ ...values, name, email });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setErrors({});
    setFormError('');
    setState('sending');
    try {
      await api('/contact', { method: 'POST', body: parsed.data, auth: false });
      setState('sent');
    } catch (err) {
      setState('idle');
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(Object.keys(err.fieldErrors).length ? '' : err.message);
      } else setFormError('Something went wrong. Please try again.');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'sent' ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="border border-stone-200 p-10 text-center" role="status">
          <span className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-bone">
            <Check className="h-5 w-5" />
          </span>
          <p className="font-display text-3xl font-light">Thank you, {name.split(' ')[0]}</p>
          <p className="mt-3 text-stone-600">Your message is with our client advisors. We will reply to {email} within one business day.</p>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} noValidate className="space-y-5" exit={{ opacity: 0 }}>
          <FormError message={formError} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Name" autoComplete="name" value={name} onChange={(e) => setValues({ ...values, name: e.target.value })} error={errors.name} />
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={errors.email} />
          </div>
          <Select label="Topic" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <label className="block">
            <span className="mb-2 block text-[0.68rem] tracking-[0.14em] uppercase">Message</span>
            <textarea
              value={values.message}
              onChange={(e) => setValues({ ...values, message: e.target.value })}
              rows={6}
              maxLength={4000}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
              placeholder="Include your order number if your question is about an order."
              className="w-full resize-y border border-stone-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink aria-[invalid=true]:border-sale"
            />
            {errors.message && (
              <span id="message-error" className="mt-1.5 block text-xs text-sale" role="alert">
                {errors.message}
              </span>
            )}
          </label>
          <Button type="submit" size="lg" loading={state === 'sending'}>
            Send message
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
