"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, SlidersHorizontal, X, MapPin } from "lucide-react";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import { ActiveFilterChips, DirectoryEmptyState } from "@/components/directory/FilterPrimitives";
import {
  DesignersFilterRail,
  EMPTY_DESIGNER_FILTERS,
  type DesignerFilterState,
} from "@/components/designers/DesignersFilterRail";
import { DesignersHeaderBand } from "@/components/designers/DesignersHeaderBand";
import type { DirectoryDesigner, DesignerFacets } from "@/lib/db/designersDirectory";
import type { PlatformTotals } from "@/lib/db/platformTotals";
import type { HeroFeature } from "@/lib/db/heroFeature";

/**
 * Designers directory body (brief §2-§4).
 *
 * Same shape as ProjectsDirectory and ProductsDirectory: filter rail, result
 * grid/list, sort and view controls, mobile filter sheet. With 24 designers the
 * whole set ships once and filtering is instant.
 *
 * CARDS: EntityCard, unextended. A designer fills the existing slots — name in
 * the title, location in the subtitle, specialty in `chips`, project count in
 * `meta` — so no professional variant and no new aspect ratio were needed. The
 * card image is a real cover from one of that designer's own projects.
 *
 * NO SAVE CONTROL on these cards. SaveToggle writes through addToSaved, which
 * takes a listing id; profiles are not listings, and the follow model that does
 * cover designers has 8 rows platform-wide with no UI anywhere else. A bookmark
 * that silently did nothing would be worse than its absence.
 */

type SortKey = "projects" | "alphabetical" | "recent";

/**
 * Real sorts only. "Most Relevant" — the reference's default — is omitted:
 * there is no relevance signal to rank by. listing_views is empty,
 * profile_views does not exist, and `follows` holds 8 rows in total.
 * Default is "Most Projects", which is both real and the most useful ordering.
 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: "projects", label: "Most Projects" },
  { key: "alphabetical", label: "Alphabetical" },
  { key: "recent", label: "Recently Added" },
];

export function DesignersDirectory({
  designers,
  facets,
  total,
  totals,
  feature,
}: {
  designers: DirectoryDesigner[];
  facets: DesignerFacets;
  total: number;
  totals: PlatformTotals;
  feature: HeroFeature | null;
}) {
  const [filters, setFilters] = useState<DesignerFilterState>(EMPTY_DESIGNER_FILTERS);
  const [specialtyTab, setSpecialtyTab] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("projects");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  /*
   * Deep links that already exist keep working: CountryDiscoverySection points
   * at ?country=Denmark, which /explore/designers used to honour.
   *
   * Read from window in an effect, deliberately NOT via useSearchParams. That
   * hook opts the subtree out of prerendering, and with it the H1 and all 24
   * profile links left the server-rendered HTML entirely — verified against the
   * built output. Reading after mount keeps the full list in the SSR payload
   * for crawlers and for anyone arriving without a query string, and applies
   * the filter a frame later for those who do.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    const q = params.get("q");
    if (country) setFilters((f) => ({ ...f, countries: [country] }));
    if (q) setQuery(q);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = designers.filter((d) => {
      if (
        q &&
        ![d.name, d.city, d.country, d.discipline]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q))
      )
        return false;
      if (specialtyTab && d.discipline !== specialtyTab) return false;
      if (filters.specialties.length && !filters.specialties.includes(d.discipline ?? ""))
        return false;
      if (filters.countries.length && !filters.countries.includes(d.country ?? "")) return false;
      if (filters.withProjectsOnly && d.projectCount === 0) return false;
      return true;
    });

    return [...out].sort((a, b) => {
      if (sort === "alphabetical") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return b.projectCount - a.projectCount || a.name.localeCompare(b.name);
    });
  }, [designers, filters, specialtyTab, sort, query]);

  const clearAll = () => {
    setFilters(EMPTY_DESIGNER_FILTERS);
    setSpecialtyTab(null);
    setQuery("");
  };

  const chips: { label: string; clear: () => void }[] = [];
  for (const key of ["specialties", "countries"] as const) {
    for (const v of filters[key]) {
      chips.push({
        label: v,
        clear: () => setFilters((f) => ({ ...f, [key]: f[key].filter((x) => x !== v) })),
      });
    }
  }
  if (filters.withProjectsOnly) {
    chips.push({
      label: "Has published projects",
      clear: () => setFilters((f) => ({ ...f, withProjectsOnly: false })),
    });
  }
  // The hero search is a filter like any other, so it gets a removable chip.
  // Without one, a search that returns nothing looks like an empty archive
  // rather than a query the user can clear.
  if (query.trim()) {
    chips.push({ label: `“${query.trim()}”`, clear: () => setQuery("") });
  }

  const tabs = [
    { value: null as string | null, label: "All Designers", count: designers.length },
    ...facets.specialties.map((s) => ({
      value: s.value as string | null,
      label: s.label,
      count: s.count,
    })),
  ];

  const rail = (
    <DesignersFilterRail
      facets={facets}
      filters={filters}
      onChange={setFilters}
      onReset={clearAll}
    />
  );

  return (
    <div>
      <DesignersHeaderBand
        total={total}
        totals={totals}
        feature={feature}
        query={query}
        onQueryChange={setQuery}
      />

      <div className="h-10" />

      {/* ── Tab row + sort/view controls ───────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
        {/* Scrolls below lg, wraps above it — kept identical to the Brands rail
            so the two directories behave the same way. */}
        <ul className="flex min-w-0 gap-1 overflow-x-auto lg:flex-wrap lg:overflow-visible">
          {tabs.map((t) => {
            const isActive = t.value === specialtyTab;
            return (
              <li key={t.label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSpecialtyTab(t.value)}
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
            <span className="sr-only">Sort designers</span>
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
            {results.length} {results.length === 1 ? "designer" : "designers"}
          </p>

          {results.length === 0 ? (
            <DirectoryEmptyState noun="designers" chips={chips} onClearAll={clearAll} />
          ) : view === "grid" ? (
            /* 5-across at xl per the brief's density note; steps down to 3 on
               tablet and 2 on mobile (Blueprint §9). */
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
              {results.map((d, i) => (
                <EntityCard
                  key={d.id}
                  href={d.href}
                  title={d.name}
                  subtitle={d.locationText}
                  meta={metaFor(d)}
                  imageUrl={d.cover}
                  avatarUrl={d.avatarUrl}
                  avatarInitials={initialsOf(d.name)}
                  chips={d.discipline ? [d.discipline] : undefined}
                  priority={i < 5}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {results.map((d) => (
                <li key={d.id}>
                  <Link href={d.href} className="group flex items-center gap-4 py-4">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-stone">
                      {d.cover && (
                        <Image src={d.cover} alt="" fill sizes="96px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {d.locationText && (
                        <span className="flex items-center gap-1 font-body text-[12px] text-muted">
                          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{d.locationText}</span>
                        </span>
                      )}
                      <span className="mt-0.5 block truncate font-body text-[15px] text-ink">
                        {d.name}
                      </span>
                      <span className="block truncate font-body text-[13px] text-muted">
                        {metaFor(d)}
                      </span>
                    </span>
                    {d.discipline && (
                      <span className="hidden shrink-0 sm:block">
                        <span className="rounded border border-hairline px-2 py-0.5 font-body text-[11px] text-muted">
                          {d.discipline}
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

      {/* Mobile / tablet filter sheet. */}
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
              <span className="sr-only">Sort designers</span>
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
              Show {results.length} {results.length === 1 ? "designer" : "designers"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The count line doubles as the explanation for a card with no image: a
 * designer with no published project has no cover to borrow, so "No projects
 * yet" says why the tile is blank instead of leaving it unexplained.
 */
function metaFor(d: DirectoryDesigner): string {
  if (d.projectCount === 0) return "No projects yet";
  return `${d.projectCount} ${d.projectCount === 1 ? "project" : "projects"}`;
}
