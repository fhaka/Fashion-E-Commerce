'use client';

import { Check, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { contrastRatio, FEATURES, PLAN_NAMES, PLANS, SOCIAL_NETWORKS, storeSettingsSchema, themeColors, type Feature, type Plan } from '@maison/shared';
import { ImageField, PageHeader, Panel, TextArea, Toggle } from '@/components/admin/ui';
import { useDemo, useSite } from '@/components/layout/SiteProvider';
import { Button } from '@/components/ui/Button';
import { FormError, Input, zodFieldErrors } from '@/components/ui/Field';
import { toCents, toDollars, useAdminQuery } from '@/lib/admin';
import { api, ApiRequestError } from '@/lib/api';
import type { SiteSettings } from '@/lib/types';
import { cn, STORE_CURRENCY, STORE_LOCALE } from '@/lib/utils';
import { toast } from '@/stores/toast';

type Settings = Omit<SiteSettings, 'theme' | 'currency' | 'locale' | 'reservationMinutes' | 'shippingMethods'>;

/** Form state: free text for numbers so typing "12." doesn't fight the input. */
interface Draft {
  storeName: string;
  legalName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  supportEmail: string;
  phone: string;
  address: string;
  openingHours: string;
  socialLinks: Record<string, string>;
  announcements: string;
  highlights: string;
  storyStats: { value: string; label: string }[];
  shippingStandardPrice: string;
  shippingStandardEta: string;
  shippingExpressPrice: string;
  shippingExpressEta: string;
  expressEnabled: boolean;
  freeShippingThreshold: string;
  taxPercent: string;
  pricesIncludeTax: boolean;
  returnDays: string;
  themeInk: string;
  themeBone: string;
  themeAccent: string;
}

const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', pinterest: 'Pinterest', tiktok: 'TikTok', x: 'X (Twitter)', youtube: 'YouTube' };
const lines = (v: string) =>
  v
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function toDraft(s: Settings): Draft {
  return {
    storeName: s.storeName,
    legalName: s.legalName === s.storeName ? '' : (s.legalName ?? ''),
    tagline: s.tagline,
    description: s.description,
    logoUrl: s.logoUrl ?? '',
    supportEmail: s.supportEmail,
    phone: s.phone ?? '',
    address: s.address ?? '',
    openingHours: s.openingHours ?? '',
    socialLinks: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, s.socialLinks[n] ?? ''])),
    announcements: s.announcements.join('\n'),
    highlights: s.highlights.join('\n'),
    storyStats: [0, 1, 2].map((i) => s.storyStats[i] ?? { value: '', label: '' }),
    shippingStandardPrice: toDollars(s.shippingStandardPrice),
    shippingStandardEta: s.shippingStandardEta,
    shippingExpressPrice: toDollars(s.shippingExpressPrice),
    shippingExpressEta: s.shippingExpressEta,
    expressEnabled: s.expressEnabled,
    freeShippingThreshold: toDollars(s.freeShippingThreshold),
    taxPercent: String(s.taxRate / 100),
    pricesIncludeTax: s.pricesIncludeTax,
    returnDays: String(s.returnDays),
    themeInk: s.themeInk,
    themeBone: s.themeBone,
    themeAccent: s.themeAccent,
  };
}

function toPayload(d: Draft) {
  return {
    storeName: d.storeName,
    legalName: d.legalName || null,
    tagline: d.tagline,
    description: d.description,
    logoUrl: d.logoUrl || null,
    supportEmail: d.supportEmail,
    phone: d.phone || null,
    address: d.address || null,
    openingHours: d.openingHours || null,
    socialLinks: Object.fromEntries(Object.entries(d.socialLinks).map(([k, v]) => [k, v.trim() || null])),
    announcements: lines(d.announcements),
    highlights: lines(d.highlights),
    storyStats: d.storyStats.filter((s) => s.value.trim() || s.label.trim()),
    shippingStandardPrice: toCents(d.shippingStandardPrice || 0),
    shippingStandardEta: d.shippingStandardEta,
    shippingExpressPrice: toCents(d.shippingExpressPrice || 0),
    shippingExpressEta: d.shippingExpressEta,
    expressEnabled: d.expressEnabled,
    freeShippingThreshold: d.freeShippingThreshold.trim() === '' ? null : toCents(d.freeShippingThreshold),
    taxRate: Math.round(Number(d.taxPercent || 0) * 100),
    pricesIncludeTax: d.pricesIncludeTax,
    returnDays: Number(d.returnDays || 0),
    themeInk: d.themeInk,
    themeBone: d.themeBone,
    themeAccent: d.themeAccent,
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const demo = useDemo();
  const { plan, features } = useSite();
  const { data, error } = useAdminQuery<Settings>('/admin/settings');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  if (error) return <FormError message={error} />;
  if (!draft) return <div className="skeleton h-96" />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const field = (key: keyof Draft, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={label} value={draft[key] as string} onChange={(e) => set(key, e.target.value as never)} error={errors[key === 'taxPercent' ? 'taxRate' : key]} {...extra} />
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const payload = toPayload(draft);
    const parsed = storeSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error.issues));
      setFormError('Please check the highlighted fields.');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await api<Settings>('/admin/settings', { method: 'PUT', body: payload });
      setDraft(toDraft(saved));
      toast.success('Settings saved. The storefront is updated.');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
      } else setFormError('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-8">
      <PageHeader
        title="Store settings"
        description="Branding, contact details, shipping and tax for the whole shop."
        actions={
          <Button type="submit" loading={saving} disabled={!!demo}>
            Save settings
          </Button>
        }
      />
      {demo && (
        <p className="border border-camel/40 bg-camel/10 px-4 py-3 text-sm text-stone-700" role="status">
          This screen is read-only in the demo. Try the colour fields: the preview updates live. In a real shop, saving updates the whole site instantly.
        </p>
      )}
      <FormError message={formError} />

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel title="Brand" bodyClassName="space-y-5 p-6">
          {field('storeName', 'Store name', { hint: 'Shown in the header, page titles, emails and the footer.' })}
          {field('legalName', 'Legal / company name', { hint: 'Used in the copyright line and legal pages. Leave empty to use the store name.' })}
          {field('tagline', 'Tagline', { hint: 'Short line used in the home page title and social previews, e.g. “Modern Luxury Clothing”.' })}
          <TextArea label="Description" value={draft.description} onChange={(v) => set('description', v)} rows={3} error={errors.description} hint="Search engines and social networks show this under your name (about 150 characters)." />
          <ImageField label="Logo" value={draft.logoUrl} onChange={(v) => set('logoUrl', v)} folder="brand" previewClassName="h-16 w-40" hint="Optional. A transparent PNG or SVG-converted PNG works best; without a logo the store name is used." />
        </Panel>

        <Panel title="Contact" bodyClassName="space-y-5 p-6">
          {field('supportEmail', 'Customer service email', { type: 'email' })}
          {field('phone', 'Phone', { optional: true })}
          {field('openingHours', 'Opening hours', { optional: true, placeholder: 'Monday – Friday, 9am – 6pm' })}
          <TextArea label="Address" value={draft.address} onChange={(v) => set('address', v)} rows={3} error={errors.address} hint="Shown on the contact page and in emails. One line per row." />
        </Panel>

        <Panel title="Shipping & returns" bodyClassName="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {field('shippingStandardPrice', `Standard price (${STORE_CURRENCY})`, { inputMode: 'decimal' })}
            {field('shippingStandardEta', 'Standard delivery time')}
          </div>
          <Toggle checked={draft.expressEnabled} onChange={(v) => set('expressEnabled', v)} label="Offer express delivery" />
          {draft.expressEnabled && (
            <div className="grid gap-5 sm:grid-cols-2">
              {field('shippingExpressPrice', `Express price (${STORE_CURRENCY})`, { inputMode: 'decimal' })}
              {field('shippingExpressEta', 'Express delivery time')}
            </div>
          )}
          {field('freeShippingThreshold', `Free standard shipping over (${STORE_CURRENCY})`, { inputMode: 'decimal', hint: 'Leave empty if shipping is never free.' })}
          {field('returnDays', 'Return window (days)', { inputMode: 'numeric', hint: 'Shown on the cart, in emails and on the Shipping & returns page. 0 hides it.' })}
        </Panel>

        <Panel title="Tax & currency" bodyClassName="space-y-5 p-6">
          {field('taxPercent', 'Tax rate (%)', { inputMode: 'decimal', hint: 'A single rate for the whole shop, e.g. 20 for 20% VAT. Use 0 if prices are tax-free or tax is handled elsewhere.' })}
          <Toggle checked={draft.pricesIncludeTax} onChange={(v) => set('pricesIncludeTax', v)} label="Product prices already include tax (common for EU VAT)" />
          <p className="text-sm text-stone-600">
            Currency: <strong className="font-medium text-ink">{STORE_CURRENCY}</strong> · format {STORE_LOCALE}. The currency is fixed when the shop is set up, because prices are stored in it.
          </p>
        </Panel>

        <Panel title="Home page & announcements" bodyClassName="space-y-5 p-6">
          <TextArea label="Announcement bar" value={draft.announcements} onChange={(v) => set('announcements', v)} rows={3} error={errors.announcements} hint="One message per line (up to 5). They rotate at the top of every page; leave empty to hide the bar." />
          <TextArea label="Highlights" value={draft.highlights} onChange={(v) => set('highlights', v)} rows={4} error={errors.highlights} hint="One per line (up to 8). Scrolls under the home page hero." />
          {features.editorialHome && (
          <fieldset>
            <legend className="mb-2 block text-[0.68rem] tracking-[0.14em] uppercase">Brand story figures</legend>
            <p className="mb-3 text-xs text-stone-500">Up to three short facts in the brand story section, e.g. “2009 / Founded in Paris”.</p>
            <div className="space-y-3">
              {draft.storyStats.map((s, i) => (
                <div key={i} className="grid grid-cols-[7rem_1fr] gap-3">
                  <input
                    aria-label={`Figure ${i + 1}`}
                    value={s.value}
                    placeholder="2009"
                    onChange={(e) => set('storyStats', draft.storyStats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    className="h-11 border border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-ink"
                  />
                  <input
                    aria-label={`Figure ${i + 1} label`}
                    value={s.label}
                    placeholder="Founded in Paris"
                    onChange={(e) => set('storyStats', draft.storyStats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    className="h-11 border border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-ink"
                  />
                </div>
              ))}
            </div>
            {errors.storyStats && <p className="mt-2 text-xs text-sale">{errors.storyStats}</p>}
          </fieldset>
          )}
        </Panel>

        <Panel title="Social links" bodyClassName="space-y-5 p-6">
          {SOCIAL_NETWORKS.map((n) => (
            <Input
              key={n}
              label={SOCIAL_LABELS[n]}
              type="url"
              placeholder="https://"
              optional
              value={draft.socialLinks[n] ?? ''}
              onChange={(e) => set('socialLinks', { ...draft.socialLinks, [n]: e.target.value })}
              error={errors[`socialLinks.${n}`]}
            />
          ))}
        </Panel>

        <Panel title="Brand colours" className="xl:col-span-2" bodyClassName="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <ColourField label="Dark (text, buttons, footer)" value={draft.themeInk} onChange={(v) => set('themeInk', v)} error={errors.themeInk} />
            <ColourField label="Light (backgrounds)" value={draft.themeBone} onChange={(v) => set('themeBone', v)} error={errors.themeBone} />
            <ColourField label="Accent (highlights)" value={draft.themeAccent} onChange={(v) => set('themeAccent', v)} error={errors.themeAccent} />
            <p className="text-xs text-stone-500">Colours are checked for readability (WCAG AA). A darker shade of the accent is generated automatically for small text.</p>
          </div>
          <ThemePreview ink={draft.themeInk} bone={draft.themeBone} accent={draft.themeAccent} name={draft.storeName || 'Store'} />
        </Panel>

        <PlanPanel plan={plan} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!!demo}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

function ColourField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <span className="mb-2 block text-[0.68rem] tracking-[0.14em] uppercase">{label}</span>
      <div className="flex items-center gap-3">
        <input type="color" value={HEX.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} className="h-11 w-14 cursor-pointer border border-stone-300 bg-transparent p-1" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          aria-label={label}
          aria-invalid={!!error || undefined}
          maxLength={7}
          className={cn('h-11 w-32 border bg-transparent px-3 font-mono text-sm uppercase outline-none focus:border-ink', error ? 'border-sale' : 'border-stone-300')}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-sale">{error}</p>}
    </div>
  );
}

/** Live preview of the brand colours on the key storefront surfaces. */
function ThemePreview({ ink, bone, accent, name }: { ink: string; bone: string; accent: string; name: string }) {
  const valid = [ink, bone, accent].every((c) => HEX.test(c));
  const t = useMemo(() => (valid ? themeColors({ themeInk: ink, themeBone: bone, themeAccent: accent }) : null), [valid, ink, bone, accent]);
  if (!t) return <div className="flex items-center justify-center border border-dashed border-stone-300 p-8 text-sm text-stone-500">Enter valid colours to preview.</div>;
  const ratio = contrastRatio(t.ink, t.bone);
  return (
    <div aria-label="Colour preview" className="overflow-hidden border border-stone-200">
      <div style={{ background: t.ink, color: t.bone }} className="px-4 py-2 text-center text-[0.62rem] tracking-[0.18em] uppercase">
        Free shipping on orders over 100
      </div>
      <div style={{ background: t.bone, color: t.ink }} className="space-y-4 px-6 py-8">
        <p className="text-center font-display text-3xl tracking-[0.3em] uppercase">{name}</p>
        <p style={{ color: t.accentDark }} className="text-[0.66rem] tracking-[0.2em] uppercase">
          New season
        </p>
        <p className="font-display text-2xl">The collection</p>
        <div className="flex gap-2">
          <span style={{ background: t.ink, color: t.bone }} className="px-5 py-3 text-[0.62rem] tracking-[0.16em] uppercase">
            Shop now
          </span>
          <span style={{ borderColor: t.ink }} className="border px-5 py-3 text-[0.62rem] tracking-[0.16em] uppercase">
            Discover
          </span>
        </div>
      </div>
      <div style={{ background: t.ink, color: t.bone }} className="flex items-baseline justify-between px-6 py-5">
        <span style={{ color: t.accent }} className="font-display text-3xl">
          01
        </span>
        <span className="text-xs opacity-70">Text contrast {ratio.toFixed(1)}:1</span>
      </div>
    </div>
  );
}

/** What the store's package includes, and what the next ones add. */
function PlanPanel({ plan }: { plan: Plan }) {
  const byPlan = (p: Plan) => (Object.keys(FEATURES) as Feature[]).filter((f) => FEATURES[f].plan === p);
  const current = PLANS.indexOf(plan);
  return (
    <Panel title={`Your plan: ${PLAN_NAMES[plan]}`} className="xl:col-span-2" bodyClassName="grid gap-8 p-6 md:grid-cols-3">
      {PLANS.map((p, i) => {
        const included = i <= current;
        return (
          <div key={p}>
            <p className={cn('mb-1 font-display text-2xl', !included && 'text-stone-500')}>{PLAN_NAMES[p]}</p>
            <p className="mb-4 text-xs text-stone-500">{i === 0 ? 'Complete shop, checkout, accounts and admin, plus:' : `Everything in ${PLAN_NAMES[PLANS[i - 1]]}, plus:`}</p>
            <ul className="space-y-2 text-sm">
              {byPlan(p).map((f) => (
                <li key={f} className={cn('flex items-start gap-2', !included && 'text-stone-500')}>
                  {included ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Included" /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="Not included" />}
                  {FEATURES[f].label}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {current < PLANS.length - 1 && <p className="text-sm text-stone-600 md:col-span-3">To add features, ask your developer to upgrade the store plan. Your products, orders and settings stay as they are.</p>}
    </Panel>
  );
}
