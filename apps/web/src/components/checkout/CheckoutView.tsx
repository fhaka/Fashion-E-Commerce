'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Lock, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkoutSchema, type ShippingMethod } from '@maison/shared';
import { api, ApiRequestError } from '@/lib/api';
import type { Address } from '@/lib/types';
import { cn, EASE, formatMoney } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { AddressFields, EMPTY_ADDRESS, type AddressValues } from '../account/AddressFields';
import { Button, ButtonLink } from '../ui/Button';
import { Checkbox, FormError, Input, zodFieldErrors } from '../ui/Field';
import { Img } from '../ui/Img';
import { DemoCardForm, EMPTY_CARD, demoOutcome, validateCard, type CardValues } from './DemoCardForm';
import { StripePayment } from './StripePayment';
import { useDemo, useSite } from '../layout/SiteProvider';

interface QuoteLine {
  variantId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
interface Quote {
  lines: QuoteLine[];
  coupon: { code: string; type: string; value: number; description: string } | null;
  couponError: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  taxIncluded: boolean;
  total: number;
  amountToFreeShipping: number;
}
interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  total: number;
  payment: { provider: 'mock' | 'stripe'; clientSecret: string };
}

/** A started-but-unpaid attempt survives reloads so it can be released instead of blocking stock. */
const PENDING_KEY = 'maison:pending-checkout';
type PendingAttempt = PlacedOrder & { fingerprint: string };
function storePending(p: PendingAttempt | null) {
  try {
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderNumber: p.orderNumber, clientSecret: p.payment.clientSecret }));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

const fromSaved = (a: Address): AddressValues => ({
  fullName: a.fullName,
  line1: a.line1,
  line2: a.line2 ?? '',
  city: a.city,
  state: a.state ?? '',
  postalCode: a.postalCode,
  country: a.country,
  phone: a.phone ?? '',
});

export function CheckoutView() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, status } = useAuth();
  const { cart, loaded: cartLoaded, fetch: refetchCart } = useCart();
  const demo = useDemo();
  const site = useSite();

  // "Buy now" checks out a single variant without touching the bag.
  const buyVariant = params.get('buy');
  const buyQty = Math.min(20, Math.max(1, Number(params.get('qty')) || 1));
  const items = useMemo(() => (buyVariant ? [{ variantId: buyVariant, quantity: buyQty }] : undefined), [buyVariant, buyQty]);

  const [provider, setProvider] = useState<'mock' | 'stripe' | null>(null);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('new');
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<ShippingMethod>('standard');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [card, setCard] = useState<CardValues>(EMPTY_CARD);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [pending, setPendingState] = useState<PendingAttempt | null>(null);
  const pendingRef = useRef<PendingAttempt | null>(null);
  const setPending = (p: PendingAttempt | null) => {
    pendingRef.current = p;
    setPendingState(p);
    storePending(p);
  };
  /** Cancels an unpaid attempt so its reserved stock doesn't block the shopper's own re-quote. */
  const releasePending = async () => {
    const p = pendingRef.current;
    if (!p) return;
    setPending(null);
    await api(`/checkout/${p.orderNumber}/abandon`, { method: 'POST', body: { clientSecret: p.payment.clientSecret }, auth: false }).catch(() => undefined);
  };
  const [stripeOrder, setStripeOrder] = useState<PlacedOrder | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Returning after a reload or an earlier declined card: release that attempt's reserved stock.
  const [releasing, setReleasing] = useState(true);
  useEffect(() => {
    let previous: { orderNumber: string; clientSecret: string } | null = null;
    try {
      previous = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null');
    } catch {
      previous = null;
    }
    if (!previous?.orderNumber || !previous.clientSecret) return setReleasing(false);
    api(`/checkout/${previous.orderNumber}/abandon`, { method: 'POST', body: { clientSecret: previous.clientSecret }, auth: false })
      .catch(() => undefined)
      .finally(() => {
        storePending(null);
        setReleasing(false);
      });
  }, []);

  useEffect(() => {
    api<{ paymentProvider: 'mock' | 'stripe' }>('/checkout/config', { auth: false })
      .then((c) => setProvider(c.paymentProvider))
      .catch(() => setProvider('mock'));
  }, []);

  // Prefill for signed-in clients.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    api<Address[]>('/account/addresses', { cache: 'no-store' })
      .then((list) => {
        setSaved(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) {
          setAddressId(def.id);
          setAddress(fromSaved(def));
        }
      })
      .catch(() => undefined);
  }, [user]);

  // Public demo: sample contact, address and test card so prospects never type real data.
  const fillDemoDetails = () => {
    if (!user) setEmail('demo.shopper@example.com');
    setAddressId('new');
    setAddress({ ...EMPTY_ADDRESS, fullName: user ? `${user.firstName} ${user.lastName}` : 'Demo Shopper', line1: '350 Fifth Avenue', city: 'New York', state: 'NY', postalCode: '10118', country: 'US', phone: '+1 212 555 0100' });
    setCard({ number: '4242 4242 4242 4242', name: user ? `${user.firstName} ${user.lastName}` : 'Demo Shopper', expiry: '12 / 30', cvc: '123' });
    setErrors({});
  };

  // Server-side quote: prices, discount, shipping and tax are always computed by the API.
  const cartSignature = cart.items.map((i) => `${i.variantId}:${i.quantity}`).join();
  const cartMode = !items;
  const emptyBag = cartMode && cartLoaded && cart.items.length === 0;
  useEffect(() => {
    if (releasing || status === 'loading' || (cartMode && !cartLoaded)) return;
    if (emptyBag) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const t = setTimeout(async () => {
      try {
        // Price-affecting change after a declined attempt: free that attempt's stock first.
        await releasePending();
        const q = await api<Quote>('/checkout/quote', { method: 'POST', body: { shippingMethod: method, couponCode: couponCode || null, items, email: email || undefined }, cache: 'no-store' });
        if (cancelled) return;
        setQuote(q);
        setStockError('');
        if (q.couponError) {
          setErrors((e) => ({ ...e, couponCode: q.couponError! }));
          setCouponCode('');
        }
      } catch (err) {
        if (cancelled) return;
        setQuote(null);
        setStockError(err instanceof ApiRequestError ? err.message : 'We could not price your order.');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, couponCode, items, cartSignature, status, cartLoaded, emptyBag, releasing]);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    setFormError('');
    setErrors((e) => ({ ...e, couponCode: '' }));
    if (!code) return;
    setCouponCode(code);
  };
  const removeCoupon = () => {
    setCouponCode('');
    setCouponInput('');
    setErrors((e) => ({ ...e, couponCode: '' }));
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      email,
      shippingAddress: { ...address, line2: address.line2 || null, state: address.state || null, phone: address.phone || null },
      billingSameAsShipping: true,
      shippingMethod: method,
      couponCode: quote?.coupon?.code ?? null,
      items,
      saveAddress: !!user && addressId === 'new' && saveAddress,
    };
    const parsed = checkoutSchema.safeParse(payload);
    const fieldErrors = parsed.success ? {} : zodFieldErrors(parsed.error.issues);
    const cardErrors = provider === 'mock' ? Object.fromEntries(Object.entries(validateCard(card)).map(([k, v]) => [`card.${k}`, v])) : {};
    if (!parsed.success || Object.keys(cardErrors).length) {
      setErrors({ ...fieldErrors, ...cardErrors });
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    setPlacing(true);
    try {
      // Re-use the pending order after a declined card, unless the details changed.
      const fingerprint = JSON.stringify(parsed.data);
      let order: PlacedOrder;
      if (pending && pending.fingerprint === fingerprint) order = pending;
      else {
        // Details changed since the last attempt: release the old reservation straight away.
        await releasePending();
        order = await api<PlacedOrder>('/checkout', { method: 'POST', body: parsed.data });
        setPending({ ...order, fingerprint });
      }

      if (order.payment.provider === 'stripe') {
        setStripeOrder(order);
        setPlacing(false);
        return;
      }

      await api(`/checkout/${order.orderNumber}/confirm-mock`, { method: 'POST', body: { clientSecret: order.payment.clientSecret, outcome: demoOutcome(card) }, auth: false });
      storePending(null);
      await refetchCart();
      router.replace(`/checkout/success/${order.orderNumber}?key=${encodeURIComponent(order.payment.clientSecret)}`);
    } catch (err) {
      setPlacing(false);
      if (!(err instanceof ApiRequestError)) return setFormError('Something went wrong. Please try again.');
      if (err.code === 'CARD_DECLINED') return setFormError(err.message);
      if (err.code === 'STOCK_CHANGED') {
        setPending(null);
        setStockError(err.message);
        void refetchCart();
        return;
      }
      if (err.code === 'INVALID_COUPON') {
        setErrors({ couponCode: err.message });
        setCouponCode('');
        return;
      }
      setErrors(err.fieldErrors);
      setFormError(Object.keys(err.fieldErrors).length ? 'Please check the highlighted fields.' : err.message);
    }
  };

  if (emptyBag && !pending) {
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-4xl font-light">Your bag is empty</h1>
        <p className="mt-4 text-stone-500">Add a piece or two before checking out.</p>
        <ButtonLink href="/shop" className="mt-10">
          Continue shopping
        </ButtonLink>
      </div>
    );
  }

  const locked = !!stripeOrder;
  const summary = <OrderSummary quote={quote} loading={quoteLoading} couponInput={couponInput} setCouponInput={setCouponInput} applyCoupon={applyCoupon} removeCoupon={removeCoupon} couponError={errors.couponCode} locked={locked} />;

  return (
    <div className="container-site py-8 lg:py-14">
      <h1 className="sr-only">Checkout</h1>
      {/* Mobile summary toggle */}
      <div className="mb-8 border-y border-stone-200 lg:hidden">
        <button type="button" className="flex w-full items-center justify-between py-4 text-sm" onClick={() => setSummaryOpen((o) => !o)} aria-expanded={summaryOpen}>
          <span className="flex items-center gap-2">
            {summaryOpen ? 'Hide' : 'Show'} order summary <ChevronDown className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')} />
          </span>
          <span className="font-display text-xl tabular-nums">{quote ? formatMoney(quote.total) : '—'}</span>
        </button>
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
              <div className="pb-6">{summary}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <form onSubmit={placeOrder} noValidate className="space-y-12 lg:col-span-7">
          {stockError && (
            <div className="border-l-2 border-sale bg-sale/5 px-4 py-3 text-sm text-sale" role="alert">
              {stockError}{' '}
              <Link href="/cart" className="underline underline-offset-4">
                Review your bag
              </Link>
            </div>
          )}

          {demo && !locked && (
            <div className="mb-10 flex flex-col gap-3 border border-camel/40 bg-camel/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-700">Demo store: use sample details instead of your own.</p>
              <Button type="button" size="sm" variant="outline" onClick={fillDemoDetails}>
                Fill in demo details
              </Button>
            </div>
          )}

          <Step n={1} title="Contact">
            {user ? (
              <p className="text-sm text-stone-600">
                Signed in as <span className="text-ink">{user.email}</span>
              </p>
            ) : (
              <div className="space-y-3">
                <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={locked} hint="Your order confirmation and tracking will be sent here." />
                <p className="text-xs text-stone-500">
                  Have an account?{' '}
                  <Link href={`/login?next=${encodeURIComponent(`/checkout${buyVariant ? `?buy=${buyVariant}&qty=${buyQty}` : ''}`)}`} className="underline underline-offset-4">
                    Sign in
                  </Link>{' '}
                  for faster checkout.
                </p>
              </div>
            )}
          </Step>

          <Step n={2} title="Delivery address">
            {saved.length > 0 && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                {saved.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={addressId === a.id}
                    disabled={locked}
                    onClick={() => {
                      setAddressId(a.id);
                      setAddress(fromSaved(a));
                    }}
                    className={cn('border p-4 text-left text-sm transition-colors', addressId === a.id ? 'border-ink ring-1 ring-ink' : 'border-stone-300 hover:border-stone-500')}
                  >
                    <p className="text-[0.66rem] tracking-[0.14em] uppercase">{a.label || 'Address'}</p>
                    <p className="mt-2">{a.fullName}</p>
                    <p className="text-stone-600">
                      {a.line1}, {a.city} {a.postalCode}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={addressId === 'new'}
                  disabled={locked}
                  onClick={() => {
                    setAddressId('new');
                    setAddress({ ...EMPTY_ADDRESS, fullName: user ? `${user.firstName} ${user.lastName}` : '' });
                  }}
                  className={cn('border p-4 text-left text-sm transition-colors', addressId === 'new' ? 'border-ink ring-1 ring-ink' : 'border-dashed border-stone-300 hover:border-stone-500')}
                >
                  + Use a new address
                </button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {addressId === 'new' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                  <fieldset disabled={locked} className="space-y-5">
                    <AddressFields value={address} onChange={setAddress} errors={errors} prefix="shippingAddress." />
                    {user && <Checkbox label="Save this address to my account" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />}
                  </fieldset>
                </motion.div>
              )}
            </AnimatePresence>
          </Step>

          <Step n={3} title="Delivery method">
            <div className="space-y-3" role="radiogroup" aria-label="Delivery method">
              {site.shippingMethods.map((info) => {
                const m = info.id;
                const free = m === 'standard' && info.freeOver !== null && quote && quote.amountToFreeShipping === 0;
                const freeByCoupon = quote?.coupon?.type === 'FREE_SHIPPING';
                return (
                  <label key={m} className={cn('flex cursor-pointer items-center gap-4 border p-4 transition-colors', method === m ? 'border-ink ring-1 ring-ink' : 'border-stone-300 hover:border-stone-500', locked && 'pointer-events-none opacity-60')}>
                    <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 accent-ink" disabled={locked} />
                    <span className="flex-1">
                      <span className="block text-sm">{info.label}</span>
                      <span className="block text-xs text-stone-500">{info.eta}</span>
                    </span>
                    <span className="text-sm tabular-nums">{free || freeByCoupon ? 'Complimentary' : formatMoney(info.price)}</span>
                  </label>
                );
              })}
            </div>
          </Step>

          <Step n={4} title="Payment">
            {provider === null ? (
              <div className="skeleton h-48" />
            ) : stripeOrder ? (
              <StripePayment
                clientSecret={stripeOrder.payment.clientSecret}
                total={stripeOrder.total}
                returnUrl={`${window.location.origin}/checkout/success/${stripeOrder.orderNumber}?key=${encodeURIComponent(stripeOrder.payment.clientSecret)}`}
              />
            ) : provider === 'mock' ? (
              <DemoCardForm
                value={card}
                onChange={setCard}
                errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('card.')).map(([k, v]) => [k.slice(5), v]))}
              />
            ) : (
              <p className="text-sm text-stone-600">You will enter your card details securely with Stripe in the next step.</p>
            )}
          </Step>

          {!stripeOrder && (
            <div className="space-y-4">
              <FormError message={formError} />
              <Button type="submit" size="lg" className="w-full" loading={placing} disabled={!quote || quoteLoading || !!stockError}>
                <Lock className="h-3.5 w-3.5" />
                {provider === 'stripe' ? 'Continue to payment' : `Pay ${quote ? formatMoney(quote.total) : ''}`}
              </Button>
              <p className="text-center text-xs text-stone-500">
                By placing your order you agree to our{' '}
                <Link href="/terms" className="underline">
                  terms of sale
                </Link>
                . Items are reserved for 30 minutes while you complete payment.
              </p>
            </div>
          )}
        </form>

        <aside className="hidden lg:col-span-5 lg:block" aria-label="Order summary">
          <div className="sticky top-8 bg-bone p-8">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-6 flex items-center gap-4 border-b border-stone-200 pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs text-bone">{n}</span>
        <span className="font-display text-2xl font-light">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function OrderSummary({
  quote,
  loading,
  couponInput,
  setCouponInput,
  applyCoupon,
  removeCoupon,
  couponError,
  locked,
}: {
  quote: Quote | null;
  loading: boolean;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  removeCoupon: () => void;
  couponError?: string;
  locked: boolean;
}) {
  if (!quote) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-32" />
      </div>
    );
  }
  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')}>
      <h2 className="mb-6 font-display text-2xl font-light">Your order</h2>
      <ul className="max-h-[40vh] space-y-4 overflow-y-auto pr-1">
        {quote.lines.map((l) => (
          <li key={l.variantId} className="flex gap-4">
            <div className="relative h-20 w-16 shrink-0 bg-stone-100">
              {l.image && <Img src={l.image} alt={l.productName} fill sizes="64px" className="object-cover" />}
              <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.62rem] text-bone tabular-nums">{l.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{l.productName}</p>
              <p className="text-xs text-stone-500">{l.variantLabel}</p>
            </div>
            <p className="text-sm tabular-nums">{formatMoney(l.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-stone-300 pt-6">
        {quote.coupon ? (
          <div className="flex items-center justify-between bg-paper px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" /> {quote.coupon.code} <span className="text-xs text-stone-500">· {quote.coupon.description}</span>
            </span>
            {!locked && (
              <button type="button" onClick={removeCoupon} aria-label="Remove discount code">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="coupon">
                Discount code
              </label>
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder="Discount code"
                disabled={locked}
                aria-invalid={!!couponError}
                className={cn('h-11 flex-1 border bg-paper px-3 text-sm uppercase outline-none placeholder:normal-case focus:border-ink', couponError ? 'border-sale' : 'border-stone-300')}
              />
              <button type="button" onClick={applyCoupon} disabled={locked || !couponInput.trim()} className="h-11 border border-ink px-4 text-[0.66rem] tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-bone disabled:opacity-40">
                Apply
              </button>
            </div>
            {couponError && (
              <p className="mt-2 text-xs text-sale" role="alert">
                {couponError}
              </p>
            )}
          </div>
        )}
      </div>

      <dl className="mt-6 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-600">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(quote.subtotal)}</dd>
        </div>
        {quote.discountTotal > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd className="tabular-nums">−{formatMoney(quote.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-stone-600">Shipping</dt>
          <dd className="tabular-nums">{quote.shippingTotal === 0 ? 'Complimentary' : formatMoney(quote.shippingTotal)}</dd>
        </div>
        {quote.taxTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-stone-600">{quote.taxIncluded ? 'Includes tax' : 'Tax'}</dt>
            <dd className="tabular-nums">{formatMoney(quote.taxTotal)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-stone-300 pt-4">
          <dt>Total</dt>
          <dd className="font-display text-3xl tabular-nums">{formatMoney(quote.total)}</dd>
        </div>
      </dl>
      {quote.amountToFreeShipping > 0 && <p className="mt-4 text-xs text-stone-500">Add {formatMoney(quote.amountToFreeShipping)} more for complimentary standard shipping.</p>}
    </div>
  );
}
