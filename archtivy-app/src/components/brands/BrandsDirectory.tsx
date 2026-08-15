"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, SlidersHorizontal, X, MapPin } from "lucide-react";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import { ActiveFilterChips, DirectoryEmptyState } from "@/components/directory/FilterPrimitives";
import { BrandsHeaderBand } from "@/components/brands/BrandsHeaderBand";
import {
  BrandsFilterRail,
  EMPTY_BRAND_FILTERS,
  type BrandFilterState,
} from "@/components/brands/BrandsFilterRail";
import type { DirectoryBrand, BrandFacets } from "@/lib/db/brandsDirectory";
import type { PlatformTotals } from "@/lib/db/platformTotals";
import type { HeroFeature } from "@/lib/db/heroFeature";

/**
 * Brands directory body (brief §2-§4). Fourth page on this pattern; structure
 * is identical to Designers by design, so the two stay learnable as one.
 *
 * CARDS: EntityCard with ZERO new props, as the brief predicted — but only
 * because the tile is a product cover and the logo goes in the existing avatar
 * badge. Putting the logo in the tile (the brief's literal wording) would have
 * needed an object-contain variant; the reference screenshot shows product
 * photography on these cards, not logos, so the mapping below matches both the
 * reference and the Designers precedent.
 *
 * NO SAVE CONTROL, same reason as Designers: SaveToggle writes through
 * addToSaved, which takes a listing id, and a brand profile is not a listing.
 */

type SortKey = "products" | "alphabetical" | "recent";

/**
 * Real signals only. No "Most Relevant" — nothing ranks brands. "Most Projects"
 * is also omitted: only 4 of 17 brands have a project at all, so the sort would
 * be 13 ties at zero pretending to be an ordering.
 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: "products", label: "Most Products" },
  { key: "alphabetical", label: "Alphabetical" },
  { key: "recent", label: "Recently Added" },
];

export function BrandsDirectory({
  brands,
  facets,
  total,
  totals,
  feature,
}: {
  brands: DirectoryBrand[];
  facets: BrandFacets;
  total: number;
  totals: PlatformTotals;
  feature: HeroFeature | null;
}) {
  const [filters, setFilters] = useState<BrandFilterState>(EMPTY_BRAND_FILTERS);
  const [categoryTab, setCategoryTab] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("products");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  /* Deep links read after mount, never via useSearchParams — that hook pulls
     the whole subtree out of the prerender, which on /designers silently
     removed the H1 and every profile link from the server-rendered HTML. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    const category = params.get("category");
    const q = params.get("q");
    if (country) setFilters((f) => ({ ...f, countries: [country] }));
    if (category) setFilters((f) => ({ ...f, categories: [category] }));
    if (q) setQuery(q);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = brands.filter((b) => {
      if (
        q &&
        ![b.name, b.city, b.country, b.brandType, ...b.categories]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q))
      )
        return false;
      if (categoryTab && !b.categories.includes(categoryTab)) return false;
      if (filters.categories.length && !b.categories.some((c) => filters.categories.includes(c)))
        return false;
      if (filters.brandTypes.length && !filters.brandTypes.includes(b.brandType ?? "")) return false;
      if (filters.countries.length && !filters.countries.includes(b.country ?? "")) return false;
      if (filters.withProjectsOnly && b.projectCount === 0) return false;
      return true;
    });

    return [...out].sort((a, b) => {
      if (sort === "alphabetical") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return b.productCount - a.productCount || a.name.localeCompare(b.name);
    });
  }, [brands, filters, categoryTab, sort, query]);

  const clearAll = () => {
    setFilters(EMPTY_BRAND_FILTERS);
    setCategoryTab(null);
    setQuery("");
  };

  const chips: { label: string; clear: () => void }[] = [];
  for (const key of ["categories", "brandTypes", "countries"] as const) {
    for (const v of filters[key]) {
      chips.push({
        label: v,
        clear: () => setFilters((f) => ({ ...f, [key]: f[key].filter((x) => x !== v) })),
      });
    }
  }
  if (filters.withProjectsOnly) {
    chips.push({
      label: "Used in a project",
      clear: () => setFilters((f) => ({ ...f, withProjectsOnly: false })),
    });
  }
  if (query.trim()) {
    chips.push({ label: `“${query.trim()}”`, clear: () => setQuery("") });
  }

  const tabs = [
    { value: null as string | null, label: "All Brands", count: brands.length },
    ...facets.categories.map((c) => ({
      value: c.value as string | null,
      label: c.label,
      count: c.count,
    })),
  ];

  const rail = (
    <BrandsFilterRail facets={facets} filters={filters} onChange={setFilters} onReset={clearAll} />
  );

  return (
    <div>
      <BrandsHeaderBand
        total={total}
        totals={totals}
        feature={feature}
        query={query}
        onQueryChange={setQuery}
      />

      <div className="h-10" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
        {/* Scrolls below lg, wraps above it. With 11 real categories the row is
            12 pills wide, and a pure scroll container clipped the last tab
            mid-word on desktop with no affordance suggesting it could scroll. */}
        <ul className="flex min-w-0 gap-1 overflow-x-auto lg:flex-wrap lg:overflow-visible">
          {tabs.map((t) => {
            const isActive = t.value === categoryTab;
            return (
              <li key={t.label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setCategoryTab(t.value)}
                  aria-pressed={isActive}
                  className={[
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 font-body text-[13px] transition-colors",
                    isActive ? "bg-ink text-cream" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label} <span className="opacity-60">{t.count}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-3">
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
            <span className="sr-only">Sort brands</span>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">{rail}</aside>

        <div className="min-w-0 lg:col-span-9">
          <ActiveFilterChips chips={chips} onClearAll={clearAll} />

          <p className="mb-5 font-body text-[13px] text-muted">
            {results.length} {results.length === 1 ? "brand" : "brands"}
          </p>

          {results.length === 0 ? (
            <DirectoryEmptyState noun="brands" chips={chips} onClearAll={clearAll} />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
              {results.map((b, i) => (
                <EntityCard
                  key={b.id}
                  href={b.href}
                  title={b.name}
                  subtitle={b.locationText}
                  meta={metaFor(b)}
                  imageUrl={b.cover}
                  avatarUrl={b.logoUrl}
                  avatarInitials={initialsOf(b.name)}
                  chips={b.categories.slice(0, 2)}
                  priority={i < 5}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {results.map((b) => (
                <li key={b.id}>
                  <Link href={b.href} className="group flex items-center gap-4 py-4">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-stone">
                      {b.cover && (
                        <Image src={b.cover} alt="" fill sizes="96px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {b.locationText && (
                        <span className="flex items-center gap-1 font-body text-[12px] text-muted">
                          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{b.locationText}</span>
                        </span>
                      )}
                      <span className="mt-0.5 block truncate font-body text-[15px] text-ink">
                        {b.name}
                      </span>
                      <span className="block truncate font-body text-[13px] text-muted">
                        {metaFor(b)}
                      </span>
                    </span>
                    {b.brandType && (
                      <span className="hidden shrink-0 sm:block">
                        <span className="rounded border border-hairline px-2 py-0.5 font-body text-[11px] text-muted">
                          {b.brandType}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
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
              <span className="sr-only">Sort brands</span>
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
              Show {results.length} {results.length === 1 ? "brand" : "brands"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Doubles as the explanation for a blank tile: a brand with no published
 * product has no cover to borrow, so the line says why rather than leaving it
 * unexplained. Projects are appended only for the 4 brands that have any.
 */
function metaFor(b: DirectoryBrand): string {
  if (b.productCount === 0) return "No products yet";
  const products = `${b.productCount} ${b.productCount === 1 ? "product" : "products"}`;
  if (b.projectCount === 0) return products;
  return `${products} · ${b.projectCount} ${b.projectCount === 1 ? "project" : "projects"}`;
}
