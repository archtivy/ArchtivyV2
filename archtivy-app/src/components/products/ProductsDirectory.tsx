"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { EntityCard } from "@/components/home/EntityCard";
import {
  ActiveFilterChips,
  DirectoryEmptyState,
} from "@/components/directory/FilterPrimitives";
import {
  ProductsFilterRail,
  EMPTY_PRODUCT_FILTERS,
  type ProductFilterState,
} from "@/components/products/ProductsFilterRail";
import type { DirectoryProduct, ProductFacets } from "@/lib/db/productsDirectory";

/**
 * Products directory body (brief §2).
 *
 * Same structure as ProjectsDirectory, sharing the filter primitives, chips and
 * empty state. Differences are only what the data requires: a 5-across grid
 * (Blueprint §20 — product grids may run denser), product-specific facets, and
 * product-specific sorts.
 *
 * Client-side filtering: 76 products ship once and filter instantly. Beyond a
 * few hundred this should move server-side.
 */

type SortKey = "recent" | "alphabetical" | "used" | "brand";

/**
 * Sorts limited to signals that exist.
 * "Most Popular" is omitted — listing_views has 0 rows platform-wide, the same
 * reason "Most Viewed" was omitted from the Projects Index.
 * "Most Relevant" is omitted absent a query; default is Most Recent.
 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most Recent" },
  { key: "alphabetical", label: "Alphabetical" },
  { key: "brand", label: "Brand" },
  { key: "used", label: "Most Used in Projects" },
];

export function ProductsDirectory({
  products,
  facets,
}: {
  products: DirectoryProduct[];
  facets: ProductFacets;
}) {
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_PRODUCT_FILTERS);
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const usedInProjectsCount = useMemo(
    () => products.filter((p) => p.usedInProjects > 0).length,
    [products]
  );

  const results = useMemo(() => {
    const out = products.filter((p) => {
      if (filters.categories.length && !filters.categories.includes(p.category ?? "")) return false;
      if (filters.brands.length && !filters.brands.includes(p.brandId ?? "")) return false;
      if (filters.colors.length && !p.colors.some((c) => filters.colors.includes(c))) return false;
      if (filters.materials.length && !p.materials.some((m) => filters.materials.includes(m)))
        return false;
      if (filters.finishes.length && !p.finishes.some((f) => filters.finishes.includes(f)))
        return false;
      if (
        filters.sustainability.length &&
        !p.sustainability.some((s) => filters.sustainability.includes(s))
      )
        return false;
      if (filters.usedInProjectsOnly && p.usedInProjects === 0) return false;
      return true;
    });

    return out.sort((a, b) => {
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      if (sort === "used") return b.usedInProjects - a.usedInProjects;
      if (sort === "brand") return (a.brand ?? "").localeCompare(b.brand ?? "");
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [products, filters, sort]);

  const labelFor = (group: keyof Omit<ProductFilterState, "usedInProjectsOnly">, value: string) => {
    const source =
      group === "categories"
        ? facets.categories
        : group === "brands"
          ? facets.brands
          : group === "colors"
            ? facets.colors
            : group === "materials"
              ? facets.materials
              : group === "finishes"
                ? facets.finishes
                : facets.sustainability;
    return source.find((f) => f.value === value)?.label ?? value;
  };

  const chips: { label: string; clear: () => void }[] = [];
  const groups = [
    "categories",
    "brands",
    "colors",
    "materials",
    "finishes",
    "sustainability",
  ] as const;
  for (const g of groups) {
    for (const v of filters[g]) {
      chips.push({
        label: labelFor(g, v),
        clear: () => setFilters((f) => ({ ...f, [g]: f[g].filter((x) => x !== v) })),
      });
    }
  }
  if (filters.usedInProjectsOnly) {
    chips.push({
      label: "Used in projects",
      clear: () => setFilters((f) => ({ ...f, usedInProjectsOnly: false })),
    });
  }

  const rail = (
    <ProductsFilterRail
      facets={facets}
      filters={filters}
      onChange={setFilters}
      onReset={() => setFilters(EMPTY_PRODUCT_FILTERS)}
      usedInProjectsCount={usedInProjectsCount}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <aside className="hidden lg:col-span-3 lg:block">{rail}</aside>

      <div className="min-w-0 lg:col-span-9">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-[14px] text-ink">
            {results.length} {results.length === 1 ? "product" : "products"}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-body text-[13px] text-ink lg:hidden"
            >
              <SlidersHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
              Sort &amp; Filter
            </button>

            <div className="hidden items-center gap-1 rounded-lg border border-hairline p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                className={`rounded p-1.5 ${view === "grid" ? "bg-ink text-cream" : "text-muted"}`}
              >
                <LayoutGrid strokeWidth={1.5} className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-label="List view"
                aria-pressed={view === "list"}
                className={`rounded p-1.5 ${view === "list" ? "bg-ink text-cream" : "text-muted"}`}
              >
                <List strokeWidth={1.5} className="h-4 w-4" />
              </button>
            </div>

            <label className="hidden sm:block">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[13px] text-ink"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <ActiveFilterChips chips={chips} onClearAll={() => setFilters(EMPTY_PRODUCT_FILTERS)} />

        {results.length === 0 ? (
          <DirectoryEmptyState
            noun="products"
            chips={chips}
            onClearAll={() => setFilters(EMPTY_PRODUCT_FILTERS)}
          />
        ) : view === "grid" ? (
          // 5-across on wide desktop — denser than the 4-across Projects grid,
          // per Blueprint §20.
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
            {results.map((p, i) => (
              <EntityCard
                key={p.id}
                href={p.href}
                title={p.title}
                subtitle={p.brand}
                meta={p.typeLabel}
                imageUrl={p.cover}
                imageCount={p.imageCount}
                saveListingId={p.id}
                ratio="1/1"
                priority={i < 5}
                sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1280px) 30vw, 15vw"
              />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {results.map((p) => (
              <li key={p.id}>
                <Link href={p.href} className="group flex items-center gap-4 py-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-stone">
                    {p.cover && (
                      <Image src={p.cover} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-[15px] text-ink">{p.title}</span>
                    {p.brand && (
                      <span className="block truncate font-body text-[13px] text-muted">
                        {p.brand}
                      </span>
                    )}
                  </span>
                  {p.typeLabel && (
                    <span className="hidden shrink-0 rounded border border-hairline px-2 py-0.5 font-body text-[11px] text-muted sm:inline">
                      {p.typeLabel}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-cream p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-body text-[15px] text-ink">Sort &amp; Filter</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="text-ink"
              >
                <X strokeWidth={1.5} className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 block">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[13px] text-ink"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {rail}

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 w-full rounded-full bg-ink py-3 font-body text-[14px] text-cream"
            >
              Show {results.length} {results.length === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
