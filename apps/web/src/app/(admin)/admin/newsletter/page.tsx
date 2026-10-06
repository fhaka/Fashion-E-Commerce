'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { DataTable, PageHeader, Pagination, Pill, SearchInput, Tabs, type Column } from '@/components/admin/ui';
import { useFeature } from '@/components/layout/SiteProvider';
import { Button } from '@/components/ui/Button';
import { downloadFile, formatDate, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toast';

interface Subscriber { id: string; email: string; status: 'SUBSCRIBED' | 'UNSUBSCRIBED'; source: string | null; createdAt: string; unsubscribedAt: string | null }
interface Message { id: string; name: string; email: string; subject: string | null; message: string; isRead: boolean; createdAt: string }

export default function NewsletterPage() {
  const newsletter = useFeature('newsletter');
  const [tab, setTab] = useState<'subscribers' | 'messages'>(newsletter ? 'subscribers' : 'messages');
  if (!newsletter) {
    return (
      <>
        <PageHeader title="Messages" description="Messages from the contact form." />
        <Messages />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Newsletter & messages" description="Your mailing list and messages from the contact form." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'subscribers', label: 'Subscribers' }, { value: 'messages', label: 'Contact messages' }]} />
      {tab === 'subscribers' ? <Subscribers /> : <Messages />}
    </>
  );
}

function Subscribers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'SUBSCRIBED' | 'UNSUBSCRIBED' | ''>('SUBSCRIBED');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { data, meta, loading } = useAdminQuery<Subscriber[], { total: number; page: number; limit: number; pages: number; subscribed: number }>('/admin/newsletter', {
    q: q || undefined,
    status: status || undefined,
    page,
    limit: 30,
  });

  const columns: Column<Subscriber>[] = [
    { key: 'email', header: 'Email', cell: (s) => s.email },
    { key: 'status', header: 'Status', cell: (s) => <Pill tone={s.status === 'SUBSCRIBED' ? 'good' : 'neutral'}>{s.status.toLowerCase()}</Pill> },
    { key: 'source', header: 'Source', cell: (s) => <span className="text-stone-600 capitalize">{s.source ?? '—'}</span> },
    { key: 'date', header: 'Joined', cell: (s) => <span className="text-stone-600">{formatDate(s.createdAt)}</span> },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Email" />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="h-10 border border-stone-300 bg-paper px-3 text-sm">
          <option value="SUBSCRIBED">Subscribed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="">All</option>
        </select>
        <span className="text-sm text-stone-500">{meta?.subscribed ?? '…'} active subscribers</span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          loading={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadFile('/admin/newsletter', { format: 'csv' }, `maison-subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
            } catch {
              toast.error('Export failed');
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download className="h-3.5 w-3.5" /> Export subscribed (CSV)
        </Button>
      </div>
      <DataTable columns={columns} rows={data} rowKey={(s) => s.id} loading={loading} empty="No subscribers match." />
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
    </>
  );
}

function Messages() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, meta, setData } = useAdminQuery<Message[], { total: number; page: number; limit: number; pages: number; unread: number }>('/admin/messages', { page, limit: 20 });

  const toggle = async (m: Message) => {
    const opening = openId !== m.id;
    setOpenId(opening ? m.id : null);
    if (opening && !m.isRead) {
      setData((rows) => rows?.map((r) => (r.id === m.id ? { ...r, isRead: true } : r)) ?? rows);
      await api(`/admin/messages/${m.id}`, { method: 'PATCH', body: { isRead: true } }).catch(() => undefined);
    }
  };

  if (!data) return <div className="skeleton h-72" />;
  return (
    <>
      <p className="mb-3 text-sm text-stone-500">{meta?.unread ?? 0} unread</p>
      {data.length === 0 ? (
        <p className="border border-stone-200 bg-paper py-16 text-center text-sm text-stone-500">No messages yet.</p>
      ) : (
        <ul className="divide-y divide-stone-200 border border-stone-200 bg-paper">
          {data.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => toggle(m)} aria-expanded={openId === m.id} className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm hover:bg-stone-100/60">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', m.isRead ? 'bg-transparent' : 'bg-camel')} aria-label={m.isRead ? undefined : 'Unread'} />
                <span className={cn('w-44 shrink-0 truncate', !m.isRead && 'font-medium')}>{m.name}</span>
                <span className="min-w-0 flex-1 truncate text-stone-600">{m.subject || m.message}</span>
                <span className="shrink-0 text-xs text-stone-500">{formatDate(m.createdAt)}</span>
              </button>
              {openId === m.id && (
                <div className="border-t border-stone-100 bg-stone-100/40 px-5 py-4 text-sm">
                  <p className="mb-2 text-xs text-stone-500">
                    From {m.name} &lt;{m.email}&gt;
                  </p>
                  <p className="whitespace-pre-line text-stone-800">{m.message}</p>
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? 'Your message'}`)}`} className="link-underline mt-4 inline-block text-xs">
                    Reply by email
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
    </>
  );
}
