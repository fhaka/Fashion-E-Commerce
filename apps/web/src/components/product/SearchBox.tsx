'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SearchBox({ defaultValue = '', className }: { defaultValue?: string; className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  return (
    <form
      role="search"
      className={cn('flex items-center gap-3 border-b border-ink pb-3', className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="h-5 w-5 shrink-0" strokeWidth={1.3} aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the collection"
        aria-label="Search products"
        maxLength={100}
        className="w-full bg-transparent text-lg outline-none placeholder:text-stone-500"
      />
      <button type="submit" className="text-[0.7rem] tracking-[0.16em] uppercase">
        Search
      </button>
    </form>
  );
}
