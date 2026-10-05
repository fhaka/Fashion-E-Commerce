'use client';

import { BadgeCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog, FilterSelect, PageHeader, Pagination, Pill, SearchInput, Tabs, Thumb } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/ui/Stars';
import { api } from '@/lib/api';
import { formatDate, useAdminQuery } from '@/lib/admin';
import { toast } from '@/stores/toast';

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  fit: string | null;
  isVerifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  product: { id: string; name: string; slug: string; image: string | null };
}

export default function ReviewsPage() {
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');
  const [rating, setRating] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const { data, meta, reload } = useAdminQuery<Review[]>('/admin/reviews', { status: status || undefined, rating: rating || undefined, q: q || undefined, page, limit: 20 });

  const setReviewStatus = async (r: Review, next: Review['status']) => {
    setBusy(r.id);
    try {
      await api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: { status: next } });
      toast.success(next === 'APPROVED' ? 'Review published' : 'Review rejected');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Reviews" description="Approved reviews are published on the product page and count towards its rating." />
      <Tabs
        value={status}
        onChange={(v) => { setStatus(v); setPage(1); }}
        tabs={[
          { value: 'PENDING', label: 'Awaiting moderation' },
          { value: 'APPROVED', label: 'Published' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: '', label: 'All' },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Text or product" />
        <FilterSelect label="Rating" value={rating} onChange={(v) => { setRating(v); setPage(1); }} options={[{ value: '', label: 'Any' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` }))]} />
      </div>

      {!data ? (
        <div className="skeleton h-80" />
      ) : data.length === 0 ? (
        <p className="border border-stone-200 bg-paper py-16 text-center text-sm text-stone-500">{status === 'PENDING' ? 'All caught up — no reviews waiting.' : 'No reviews match.'}</p>
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="border border-stone-200 bg-paper p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Link href={`/admin/products/${r.product.id}`} className="flex items-center gap-3 text-sm hover:underline">
                  <Thumb src={r.product.image} />
                  <span className="max-w-[12rem] truncate">{r.product.name}</span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars rating={r.rating} />
                    <Pill tone={r.status === 'APPROVED' ? 'good' : r.status === 'REJECTED' ? 'bad' : 'warn'}>{r.status.toLowerCase()}</Pill>
                    {r.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium">{r.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{r.body}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    {r.user.firstName} {r.user.lastName} · {r.user.email} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== 'APPROVED' && (
                    <Button size="sm" onClick={() => setReviewStatus(r, 'APPROVED')} loading={busy === r.id}>
                      Approve
                    </Button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <Button size="sm" variant="outline" onClick={() => setReviewStatus(r, 'REJECTED')} disabled={busy === r.id}>
                      Reject
                    </Button>
                  )}
                  <button type="button" onClick={() => setDeleting(r)} className="p-2 text-stone-500 hover:text-sale" aria-label="Delete review">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this review?"
        body="The product rating will be recalculated."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/admin/reviews/${deleting.id}`, { method: 'DELETE' });
          toast.show('Review deleted');
          setDeleting(null);
          await reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
