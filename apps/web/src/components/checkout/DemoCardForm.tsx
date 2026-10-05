'use client';

import { CreditCard, FlaskConical } from 'lucide-react';
import { Input } from '../ui/Field';

/**
 * DEMO PAYMENT FORM — used only while the API runs the mock payment provider.
 * Card details are validated in the browser and are NEVER sent to the server;
 * the server only learns whether the demo payment should succeed or be declined.
 */
export interface CardValues {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
}

export const EMPTY_CARD: CardValues = { number: '', name: '', expiry: '', cvc: '' };
export const DECLINE_CARD = '4000000000000002';

const digits = (v: string) => v.replace(/\D/g, '');

function luhn(num: string) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string) {
  const n = digits(num);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return null;
}

export function validateCard(c: CardValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const n = digits(c.number);
  if (n.length < 13 || n.length > 19 || !luhn(n)) errors.number = 'Enter a valid card number';
  if (c.name.trim().length < 2) errors.name = 'Enter the name on the card';
  const m = c.expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) errors.expiry = 'Use MM / YY';
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const now = new Date();
    if (month < 1 || month > 12) errors.expiry = 'Invalid month';
    else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.expiry = 'This card has expired';
  }
  if (!/^\d{3,4}$/.test(c.cvc)) errors.cvc = 'Enter the 3–4 digit code';
  return errors;
}

export function demoOutcome(c: CardValues): 'success' | 'decline' {
  return digits(c.number) === DECLINE_CARD ? 'decline' : 'success';
}

export function DemoCardForm({ value, onChange, errors }: { value: CardValues; onChange: (v: CardValues) => void; errors: Record<string, string> }) {
  const brand = cardBrand(value.number);
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 border border-dashed border-camel bg-camel/5 px-4 py-3 text-xs text-stone-700">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-camel-dark" />
        <div>
          <p className="font-medium text-ink">Test mode — no real charge is made</p>
          <p className="mt-1">
            Use <button type="button" className="font-mono underline" onClick={() => onChange({ ...value, number: '4242 4242 4242 4242' })}>4242 4242 4242 4242</button> to succeed or{' '}
            <button type="button" className="font-mono underline" onClick={() => onChange({ ...value, number: '4000 0000 0000 0002' })}>4000 0000 0000 0002</button> to simulate a decline. Any future date and any CVC.
          </p>
        </div>
      </div>
      <div className="relative">
        <Input
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={value.number}
          onChange={(e) => onChange({ ...value, number: digits(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })}
          error={errors.number}
        />
        <span className="pointer-events-none absolute top-[2.35rem] right-4 flex items-center gap-1.5 text-xs text-stone-500">
          {brand ?? <CreditCard className="h-4 w-4" strokeWidth={1.3} />}
        </span>
      </div>
      <Input label="Name on card" autoComplete="cc-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} error={errors.name} />
      <div className="grid grid-cols-2 gap-5">
        <Input
          label="Expiry"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM / YY"
          value={value.expiry}
          onChange={(e) => {
            const d = digits(e.target.value).slice(0, 4);
            onChange({ ...value, expiry: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d });
          }}
          error={errors.expiry}
        />
        <Input label="CVC" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={value.cvc} onChange={(e) => onChange({ ...value, cvc: digits(e.target.value).slice(0, 4) })} error={errors.cvc} />
      </div>
    </div>
  );
}
