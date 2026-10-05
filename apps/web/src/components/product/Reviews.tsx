'use client';

import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, Star } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { reviewSchema } from '@maison/shared';
import { api, apiFetch, ApiRequestError } from '@/lib/api';
import type { Paginated, ProductDetail } from '@/lib/types';
import { cn, EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { Reveal } from '../motion';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  fit: 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  author: string;
}

const FIT_LABEL = { RUNS_SMALL: 'Runs small', TRUE_TO_SIZE: 'True to size', RUNS_LARGE: 'Runs large' } as const;

export function Reviews({ product }: { product: ProductDetail }) {
  const summary = product.reviewSummary;
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [rating, setRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);

  const load = useCallback(
    async (page: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await apiFetch<Paginated<Review>>(`/products/${product.slug}/reviews`, { query: { sort, rating: rating ?? undefined, page, limit: 6 }, auth: false });
        setReviews((prev) => (append ? [...prev, ...res.data] : res.data));
        setMeta({ page: res.meta.page, pages: res.meta.pages, total: res.meta.total });
      } finally {
        setLoading(false);
      }
    },
    [product.slug, sort, rating],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const fitTotal = Object.values(summary.fit).reduce((a, b) => a + (b ?? 0), 0);
  const fitWinner = fitTotal ? (Object.entries(summary.fit).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0] as keyof typeof FIT_LABEL) : null;

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-stone-200 bg-bone/50 py-(--spacing-section)" aria-labelledby="reviews-heading">
      <div className="container-site grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal>
            <p className="eyebrow mb-4 text-stone-500">Client reviews</p>
            <h2 id="reviews-heading" className="font-display text-display-sm font-light">
              {summary.count ? 'What our clients say' : 'Be the first to review'}
            </h2>
          </Reveal>
          {summary.count > 0 && (
            <Reveal delay={0.1} className="mt-8">
              <div className="flex items-end gap-4">
                <span className="font-display text-7xl leading-none font-light">{summary.average.toFixed(1)}</span>
                <div className="pb-2">
                  <Stars rating={summary.average} size="md" />
                  <p className="mt-1 text-xs text-stone-500">Based on {summary.count} reviews</p>
                </div>
              </div>
              <ul className="mt-8 space-y-2">
                {summary.distribution.map((d) => {
                  const pct = summary.count ? (d.count / summary.count) * 100 : 0;
                  const active = rating === d.rating;
                  return (
                    <li key={d.rating}>
                      <button
                        type="button"
                        disabled={d.count === 0}
                        onClick={() => setRating(active ? null : d.rating)}
                        aria-pressed={active}
                        className={cn('group flex w-full items-center gap-3 text-xs disabled:opacity-40', active && 'font-medium')}
                      >
                        <span className="flex w-8 items-center gap-1">
                          {d.rating} <Star className="h-3 w-3 fill-current" />
                        </span>
                        <span className="relative h-1 flex-1 overflow-hidden bg-stone-200">
                          <motion.span
                            className={cn('absolute inset-y-0 left-0', active ? 'bg-camel' : 'bg-ink group-hover:bg-camel')}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: EASE }}
                          />
                        </span>
                        <span className="w-6 text-right text-stone-500 tabular-nums">{d.count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {fitWinner && (
                <div className="mt-8">
                  <p className="text-[0.7rem] tracking-[0.16em] uppercase">Fit</p>
                  <div className="relative mt-3 h-1 bg-stone-200">
                    <span
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
                      style={{ left: fitWinner === 'RUNS_SMALL' ? '10%' : fitWinner === 'RUNS_LARGE' ? '90%' : '50%' }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[0.68rem] text-stone-500">
                    <span>Runs small</span>
                    <span>True to size</span>
                    <span>Runs large</span>
                  </div>
                  <p className="mt-3 text-xs text-stone-600">
                    Most clients say this piece {fitWinner === 'TRUE_TO_SIZE' ? 'fits true to size' : fitWinner === 'RUNS_SMALL' ? 'runs small — consider sizing up' : 'runs large — consider sizing down'}.
                  </p>
                </div>
              )}
            </Reveal>
          )}
          <div className="mt-10">
            <Button variant="outline" onClick={() => setWriting((w) => !w)} aria-expanded={writing}>
              {writing ? 'Cancel' : 'Write a review'}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <AnimatePresence>{writing && <ReviewForm slug={product.slug} onDone={() => setWriting(false)} />}</AnimatePresence>

          {meta.total > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-stone-200 pb-4 text-xs">
              <p className="text-stone-500">
                {meta.total} review{meta.total === 1 ? '' : 's'}
                {rating && (
                  <>
                    {' '}
                    with {rating} stars ·{' '}
                    <button type="button" className="underline underline-offset-4" onClick={() => setRating(null)}>
                      show all
                    </button>
                  </>
                )}
              </p>
              <label className="flex items-center gap-2">
                <span className="text-stone-500">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-transparent outline-none">
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                </select>
              </label>
            </div>
          )}

          <ul className="divide-y divide-stone-200">
            {reviews.map((r, i) => (
              <motion.li key={r.id} className="py-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: (i % 6) * 0.05, ease: EASE }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Stars rating={r.rating} />
                  <time className="text-xs text-stone-500" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </time>
                </div>
                <h3 className="mt-3 font-display text-2xl">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-stone-700">{r.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500">
                  <span className="font-medium text-ink">{r.author}</span>
                  {r.isVerifiedPurchase && (
                    <span className="flex items-center gap-1 text-success">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                    </span>
                  )}
                  {r.fit && <span>Fit: {FIT_LABEL[r.fit]}</span>}
                </div>
              </motion.li>
            ))}
          </ul>

          {loading && reviews.length === 0 && (
            <div className="space-y-6">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-3 py-6">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-5 w-1/2" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-4/5" />
                </div>
              ))}
            </div>
          )}
          {!loading && reviews.length === 0 && !writing && <p className="text-stone-500">No reviews yet. Share your thoughts and help others choose.</p>}
          {meta.page < meta.pages && (
            <Button variant="outline" className="mt-6" onClick={() => load(meta.page + 1, true)} loading={loading}>
              More reviews
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { user, status } = useAuth();
  const [form, setForm] = useState({ rating: 0, title: '', body: '', fit: '' as '' | 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [eligible, setEligible] = useState<{ canReview: boolean; existingStatus: string | null } | null>(null);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ canReview: boolean; existingStatus: string | null }>(`/products/${slug}/reviews/eligibility`, { cache: 'no-store' })
      .then(setEligible)
      .catch(() => setEligible({ canReview: true, existingStatus: null }));
  }, [user, slug]);

  const wrap = (children: React.ReactNode) => (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mb-10 overflow-hidden">
      <div className="border border-stone-200 bg-paper p-6 sm:p-8">{children}</div>
    </motion.div>
  );

  if (status === 'loading') return wrap(<div className="skeleton h-24" />);
  if (!user) {
    return wrap(
      <div className="text-center">
        <p className="font-display text-2xl">Sign in to write a review</p>
        <p className="mt-2 text-sm text-stone-500">Reviews from verified clients help everyone choose with confidence.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => (window.location.href = `/login?next=${encodeURIComponent(`/product/${slug}#reviews`)}`)}>Sign in</Button>
        </div>
      </div>,
    );
  }
  if (eligible && !eligible.canReview) {
    return wrap(
      <p className="text-sm text-stone-600">
        You have already reviewed this piece{eligible.existingStatus === 'PENDING' ? ' — it will appear once approved.' : '.'} Thank you!
      </p>,
    );
  }
  if (state === 'done') {
    return wrap(
      <div className="text-center">
        <p className="font-display text-2xl">Thank you, {user.firstName}</p>
        <p className="mt-2 text-sm text-stone-500">Your review will appear once our team has approved it.</p>
        <Button variant="outline" className="mt-6" onClick={onDone}>
          Close
        </Button>
      </div>,
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ ...form, fit: form.fit || null });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] ??= i.path[0] === 'rating' ? 'Choose a rating' : i.message;
      setErrors(errs);
      return;
    }
    setState('sending');
    try {
      await api(`/products/${slug}/reviews`, { method: 'POST', body: parsed.data });
      setState('done');
    } catch (err) {
      setState('idle');
      setErrors(err instanceof ApiRequestError ? { ...err.fieldErrors, form: err.message } : { form: 'Something went wrong' });
    }
  };

  const field = 'w-full border border-stone-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-ink';
  return wrap(
    <form onSubmit={submit} noValidate className="space-y-6">
      <p className="font-display text-2xl">Your review</p>
      <fieldset>
        <legend className="mb-2 text-[0.7rem] tracking-[0.16em] uppercase">Rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={form.rating === n}>
              <Star className={cn('h-7 w-7 transition-colors', (hover || form.rating) >= n ? 'fill-ink text-ink' : 'text-stone-300')} strokeWidth={1.2} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-2 text-xs text-sale">{errors.rating}</p>}
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-[0.7rem] tracking-[0.16em] uppercase">Title</span>
        <input className={field} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={!!errors.title} />
        {errors.title && <span className="mt-1 block text-xs text-sale">{errors.title}</span>}
      </label>
      <label className="block">
        <span className="mb-2 block text-[0.7rem] tracking-[0.16em] uppercase">Review</span>
        <textarea className={cn(field, 'min-h-32 resize-y')} value={form.body} maxLength={2000} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-invalid={!!errors.body} />
        {errors.body && <span className="mt-1 block text-xs text-sale">{errors.body}</span>}
      </label>
      <fieldset>
        <legend className="mb-2 text-[0.7rem] tracking-[0.16em] uppercase">How does it fit? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIT_LABEL) as (keyof typeof FIT_LABEL)[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={form.fit === f}
              onClick={() => setForm({ ...form, fit: form.fit === f ? '' : f })}
              className={cn('border px-3 py-2 text-xs', form.fit === f ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink')}
            >
              {FIT_LABEL[f]}
            </button>
          ))}
        </div>
      </fieldset>
      {errors.form && (
        <p className="text-sm text-sale" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" loading={state === 'sending'}>
        Submit review
      </Button>
      <p className="text-xs text-stone-500">
        Reviews are moderated and published within 48 hours. See our <Link href="/terms" className="underline">review guidelines</Link>.
      </p>
    </form>,
  );
}
