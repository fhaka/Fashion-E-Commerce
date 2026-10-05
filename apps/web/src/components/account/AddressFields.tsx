'use client';

import { Input, Select } from '../ui/Field';

export const COUNTRIES = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['NL', 'Netherlands'],
  ['CH', 'Switzerland'],
  ['AU', 'Australia'],
  ['JP', 'Japan'],
] as const;

export interface AddressValues {
  label?: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export const EMPTY_ADDRESS: AddressValues = { fullName: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US', phone: '' };

/** Controlled address inputs. `prefix` maps nested API error keys (e.g. "shippingAddress.city"). */
export function AddressFields({
  value,
  onChange,
  errors = {},
  prefix = '',
  showLabel = false,
}: {
  value: AddressValues;
  onChange: (v: AddressValues) => void;
  errors?: Record<string, string>;
  prefix?: string;
  showLabel?: boolean;
}) {
  const set = (k: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: string) => errors[`${prefix}${k}`];
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {showLabel && <Input label="Label" placeholder="Home, Studio…" value={value.label ?? ''} onChange={set('label')} error={err('label')} optional className="sm:col-span-2" />}
      <Input label="Full name" autoComplete="name" value={value.fullName} onChange={set('fullName')} error={err('fullName')} className="sm:col-span-2" />
      <Input label="Address" autoComplete="address-line1" value={value.line1} onChange={set('line1')} error={err('line1')} className="sm:col-span-2" />
      <Input label="Apartment, suite" autoComplete="address-line2" value={value.line2} onChange={set('line2')} error={err('line2')} optional className="sm:col-span-2" />
      <Input label="City" autoComplete="address-level2" value={value.city} onChange={set('city')} error={err('city')} />
      <Input label="State / region" autoComplete="address-level1" value={value.state} onChange={set('state')} error={err('state')} optional />
      <Input label="Postal code" autoComplete="postal-code" value={value.postalCode} onChange={set('postalCode')} error={err('postalCode')} />
      <Select label="Country" autoComplete="country" value={value.country} onChange={set('country')} error={err('country')}>
        {COUNTRIES.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </Select>
      <Input label="Phone" type="tel" autoComplete="tel" value={value.phone} onChange={set('phone')} error={err('phone')} optional hint="For delivery updates only." className="sm:col-span-2" />
    </div>
  );
}
