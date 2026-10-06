'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { SearchSuggestions } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import { useScrollLock } from '../ui/Drawer';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';
import { useFeature } from './SiteProvider';

const POPULAR = ['Cashmere', 'Wool coat', 'Tailoring', 'Leather', 'Silk dress', 'Denim'];

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUi();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const suggest = useFeature('searchSuggestions');
  useScrollLock(searchOpen);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, closeSearch]);

  // Debounced suggestions; ignore responses for stale queries.
  useEffect(() => {
    const term = q.trim();
    // Instant suggestions are part of the Advanced plan; otherwise Enter goes to the results page.
    if (term.length < 2 || !suggest) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<SearchSuggestions>('/search/suggest', { query: { q: term }, auth: false });
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, suggest]);

  const go = (href: string) => {
    closeSearch();
    router.push(href);
  };
  const submit = (term: string) => term.trim() && go(`/search?q=${encodeURIComponent(term.trim())}`);

  return (
    <AnimatePresence>
      {searchOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
            aria-hidden
          />
          <motion.div
            className="relative max-h-[90svh] overflow-y-auto bg-paper"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="container-site py-6 sm:py-10">
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(q);
                }}
                className="flex items-center gap-4 border-b border-ink pb-4"
              >
                <Search className="h-5 w-5 shrink-0" strokeWidth={1.3} aria-hidden />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search for coats, cashmere, tailoring…"
                  aria-label="Search products"
                  className="w-full bg-transparent font-display text-2xl outline-none placeholder:text-stone-500 sm:text-4xl"
                  maxLength={100}
                />
                {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-[1.5px] border-ink border-t-transparent" aria-label="Loading" />}
                <button type="button" onClick={closeSearch} className="shrink-0 p-1 transition-transform duration-500 ease-luxe hover:rotate-90" aria-label="Close search">
                  <X className="h-6 w-6" strokeWidth={1.2} />
                </button>
              </form>

              <div className="py-8" aria-live="polite">
                {!results ? (
                  <div>
                    <p className="eyebrow mb-4 text-stone-500">Popular searches</p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => submit(term)}
                          className="border border-stone-300 px-4 py-2 text-sm transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-bone"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : results.products.length + results.categories.length + results.collections.length === 0 ? (
                  <p className="text-stone-500">
                    No results for “{q}”. Try a different term, or browse <Link className="underline" href="/shop" onClick={closeSearch}>all products</Link>.
                  </p>
                ) : (
                  <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
                    <div className="space-y-8">
                      {results.categories.length > 0 && (
                        <div>
                          <p className="eyebrow mb-3 text-stone-500">Categories</p>
                          <ul className="space-y-2">
                            {results.categories.map((c) => (
                              <li key={c.slug}>
                                <button type="button" onClick={() => go(`/category/${c.slug}`)} className="link-underline text-left">
                                  {c.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {results.collections.length > 0 && (
                        <div>
                          <p className="eyebrow mb-3 text-stone-500">Collections</p>
                          <ul className="space-y-2">
                            {results.collections.map((c) => (
                              <li key={c.slug}>
                                <button type="button" onClick={() => go(`/collections/${c.slug}`)} className="link-underline text-left">
                                  {c.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <p className="eyebrow text-stone-500">Products</p>
                        <button type="button" onClick={() => submit(q)} className="link-underline flex items-center gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
                          View all results <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {results.products.map((p, i) => (
                          <motion.li key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}>
                            <button type="button" onClick={() => go(`/product/${p.slug}`)} className="group block w-full text-left">
                              <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                                {p.image && <Img src={p.image.url} alt={p.image.alt} fill sizes="(min-width:1024px) 14vw, 45vw" className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105" />}
                              </div>
                              <p className="mt-2 truncate text-sm">{p.name}</p>
                              <Price price={p.price} compareAtPrice={p.compareAtPrice} className="text-xs text-stone-600" />
                            </button>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
