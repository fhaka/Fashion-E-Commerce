"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api";
import {
  activeFilterCount,
  SORT_LABELS,
  toApiQuery,
  toSearchString,
  type ListingState,
} from "@/lib/listing";
import type {
  CategoryNode,
  Paginated,
  ProductCard as Card,
  ProductFacets,
} from "@/lib/types";
import { cn, EASE, pluralize } from "@/lib/utils";
import { useUi } from "@/stores/ui";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { FilterPanel } from "./FilterPanel";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

interface Props {
  basePath: string;
  state: ListingState;
  fixed?: (keyof ListingState)[];
  initial: Paginated<Card> & { meta: { facets: ProductFacets } };
  categories?: CategoryNode[];
  emptyMessage?: string;
}

export function ProductListing({
  basePath,
  state,
  fixed = [],
  initial,
  categories,
  emptyMessage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.data);
  const [page, setPage] = useState(initial.meta.page);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // New server results (filters changed): reset the accumulated "load more" pages.
  // The component itself stays mounted so the mobile filter drawer remains open between taps.
  useEffect(() => {
    setItems(initial.data);
    setPage(initial.meta.page);
  }, [initial]);
  const total = initial.meta.total;
  const facets = initial.meta.facets;
  const count = activeFilterCount(state, fixed);
  const headerHidden = useUi((s) => s.headerHidden);

  const navigate = (next: ListingState) => {
    startTransition(() =>
      router.push(`${basePath}${toSearchString(next, fixed)}`, {
        scroll: false,
      }),
    );
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await apiFetch<Paginated<Card>>("/products", {
        query: toApiQuery(state, page + 1, PAGE_SIZE),
        auth: false,
      });
      setItems((prev) => [
        ...prev,
        ...res.data.filter((p) => !prev.some((x) => x.id === p.id)),
      ]);
      setPage(res.meta.page);
    } finally {
      setLoadingMore(false);
    }
  };

  const chips = buildChips(state, fixed, facets, categories);
  const panel = (
    <FilterPanel
      state={state}
      facets={facets}
      categories={categories}
      fixed={fixed}
      onChange={navigate}
    />
  );

  return (
    <div className="container-site pb-(--spacing-section)">
      {/* Toolbar */}
      <div
        className={cn(
          "sticky z-20 -mx-(--spacing-gutter) mb-8 flex items-center justify-between gap-4 border-y border-stone-200 bg-paper/95 px-(--spacing-gutter) py-3 backdrop-blur-md transition-[top] duration-500 ease-luxe",
          headerHidden ? "top-0" : "top-16 lg:top-[4.5rem]",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 text-[0.7rem] tracking-[0.16em] uppercase lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.4} /> Filters{" "}
            {count > 0 && `(${count})`}
          </button>
          <p
            className="text-xs text-stone-500 max-lg:hidden"
            aria-live="polite"
          >
            {pluralize(total, "piece")}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
          <span className="text-stone-500 max-sm:sr-only">Sort</span>
          <select
            value={state.sort}
            onChange={(e) =>
              navigate({
                ...state,
                sort: e.target.value as ListingState["sort"],
              })
            }
            className="cursor-pointer appearance-none bg-transparent bg-[length:10px] bg-[right_center] bg-no-repeat pr-5 text-[0.7rem] tracking-[0.16em] uppercase outline-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%230e0e0e' stroke-width='1.2'/%3E%3C/svg%3E\")",
            }}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {/* Navigation progress */}
        <AnimatePresence>
          {pending && (
            <motion.span
              className="absolute right-0 -bottom-px left-0 h-px origin-left bg-ink"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 0.85 }}
              exit={{ scaleX: 1, opacity: 0 }}
              transition={{ duration: 1.2, ease: EASE }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] xl:gap-14">
        <aside aria-label="Filters" className="max-lg:hidden">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 no-scrollbar">
            {panel}
          </div>
        </aside>

        <div>
          {chips.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => navigate({ ...state, ...c.clear })}
                  className="group flex items-center gap-2 border border-stone-300 px-3 py-1.5 text-xs transition-colors hover:border-ink"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.swatch && (
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-stone-300"
                      style={{ backgroundColor: c.swatch }}
                    />
                  )}
                  {c.label}
                  <X className="h-3 w-3 text-stone-500 group-hover:text-ink" />
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  navigate({
                    ...state,
                    size: [],
                    color: [],
                    minPrice: undefined,
                    maxPrice: undefined,
                    inStock: false,
                    ...(fixed.includes("onSale") ? {} : { onSale: false }),
                    ...(fixed.includes("isNew") ? {} : { isNew: false }),
                    ...(fixed.includes("bestSeller")
                      ? {}
                      : { bestSeller: false }),
                    ...(fixed.includes("gender") ? {} : { gender: undefined }),
                    ...(fixed.includes("category")
                      ? {}
                      : { category: undefined }),
                  })
                }
                className="link-underline ml-2 text-xs text-stone-600"
              >
                Clear all
              </button>
            </div>
          )}

          <div
            className={cn(
              "transition-opacity duration-500",
              pending && "pointer-events-none opacity-40",
            )}
            aria-busy={pending}
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-24 text-center">
                <p className="font-display text-3xl">Nothing matches — yet</p>
                <p className="mt-3 max-w-sm text-sm text-stone-500">
                  {emptyMessage ??
                    "Try removing a filter or two to see more pieces."}
                </p>
                {count > 0 && (
                  <Button
                    variant="outline"
                    className="mt-8"
                    onClick={() =>
                      navigate({
                        ...state,
                        size: [],
                        color: [],
                        minPrice: undefined,
                        maxPrice: undefined,
                        inStock: false,
                      })
                    }
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <h2 className="sr-only">Products</h2>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">
                  {items.map((p, i) => (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: Math.min(i % PAGE_SIZE, 8) * 0.05,
                        ease: EASE,
                      }}
                    >
                      <ProductCard
                        product={p}
                        priority={i < 3}
                        sizes="(min-width: 1280px) 26vw, (min-width: 1024px) 36vw, 50vw"
                      />
                    </motion.li>
                  ))}
                </ul>
              </>
            )}

            {items.length > 0 && (
              <div className="mt-16 flex flex-col items-center gap-4">
                <p className="text-xs text-stone-500">
                  Showing {items.length} of {total}
                </p>
                <div className="h-px w-48 bg-stone-200">
                  <div
                    className="h-px bg-ink transition-[width] duration-700 ease-luxe"
                    style={{
                      width: `${(items.length / Math.max(total, 1)) * 100}%`,
                    }}
                  />
                </div>
                {items.length < total && (
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    loading={loadingMore}
                    className="mt-2"
                  >
                    Load more
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title={`Filters${count ? ` (${count})` : ""}`}
        footer={
          <div className="p-5">
            <Button
              className="w-full"
              onClick={() => setFiltersOpen(false)}
              loading={pending}
            >
              Show {pluralize(total, "piece")}
            </Button>
          </div>
        }
      >
        <div className="px-6">{panel}</div>
      </Drawer>
    </div>
  );
}

interface Chip {
  key: string;
  label: string;
  swatch?: string;
  clear: Partial<ListingState>;
}

function buildChips(
  s: ListingState,
  fixed: (keyof ListingState)[],
  facets: ProductFacets,
  categories?: CategoryNode[],
): Chip[] {
  const chips: Chip[] = [];
  const skip = new Set(fixed);
  if (s.category && !skip.has("category")) {
    const all = (categories ?? []).flatMap((c) => [c, ...c.children]);
    chips.push({
      key: "category",
      label: all.find((c) => c.slug === s.category)?.name ?? s.category,
      clear: { category: undefined },
    });
  }
  if (s.gender && !skip.has("gender"))
    chips.push({
      key: "gender",
      label: s.gender[0] + s.gender.slice(1).toLowerCase(),
      clear: { gender: undefined },
    });
  for (const size of s.size)
    chips.push({
      key: `size-${size}`,
      label: `Size ${size}`,
      clear: { size: s.size.filter((x) => x !== size) },
    });
  for (const color of s.color) {
    const f = facets.colors.find((c) => c.slug === color);
    chips.push({
      key: `color-${color}`,
      label: f?.name ?? color,
      swatch: f?.hex,
      clear: { color: s.color.filter((x) => x !== color) },
    });
  }
  if (s.minPrice !== undefined || s.maxPrice !== undefined) {
    const label =
      s.minPrice !== undefined && s.maxPrice !== undefined
        ? `$${s.minPrice} – $${s.maxPrice}`
        : s.minPrice !== undefined
          ? `From $${s.minPrice}`
          : `Up to $${s.maxPrice}`;
    chips.push({
      key: "price",
      label,
      clear: { minPrice: undefined, maxPrice: undefined },
    });
  }
  if (s.inStock)
    chips.push({
      key: "inStock",
      label: "In stock",
      clear: { inStock: false },
    });
  if (s.onSale && !skip.has("onSale"))
    chips.push({ key: "onSale", label: "On sale", clear: { onSale: false } });
  if (s.isNew && !skip.has("isNew"))
    chips.push({
      key: "isNew",
      label: "New arrivals",
      clear: { isNew: false },
    });
  if (s.bestSeller && !skip.has("bestSeller"))
    chips.push({
      key: "bestSeller",
      label: "Best sellers",
      clear: { bestSeller: false },
    });
  return chips;
}
