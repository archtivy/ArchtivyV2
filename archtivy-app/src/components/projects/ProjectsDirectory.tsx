"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, SlidersHorizontal, X, MapPin } from "lucide-react";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import {
  ProjectsFilterRail,
  EMPTY_FILTERS,
  type FilterState,
} from "@/components/projects/ProjectsFilterRail";
import type { DirectoryProject, DirectoryFacets } from "@/lib/db/projectsDirectory";

/**
 * Projects directory body (brief §2 and §3).
 *
 * Holds tab / filter / sort / view state and derives results client-side. With
 * 50 projects the whole set ships once and filtering is instant; there is no
 * pagination round trip to get wrong. If the archive grows past a few hundred
 * this should move to server-side filtering — getProjectsCanonicalFiltered
 * already exists for that.
 */

const NUMBER = new Intl.NumberFormat("en-US");

type SortKey = "recent" | "alphabetical" | "products";

/** Sort options are limited to ones the data can actually support.
 *  "Featured" is omitted: promotion_campaigns has 0 rows.
 *  "Most Viewed" is omitted: listing_views has 0 rows. */
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most Recent" },
  { key: "alphabetical", label: "Alphabetical" },
  { key: "products", label: "Most Products" },
];

export function ProjectsDirectory({
  projects,
  facets,
}: {
  projects: DirectoryProject[];
  facets: DirectoryFacets;
}) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [tab, setTab] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const results = useMemo(() => {
    const out = projects.filter((p) => {
      if (tab && p.buildingType !== tab) return false;
      if (filters.buildingTypes.length && !filters.buildingTypes.includes(p.buildingType ?? ""))
        return false;
      if (filters.locations.length && !filters.locations.includes(p.country ?? "")) return false;
      if (filters.projectTypes.length && !p.projectTypes.some((t) => filters.projectTypes.includes(t)))
        return false;
      if (filters.styles.length && !p.styles.some((s) => filters.styles.includes(s))) return false;
      if (filters.materials.length && !p.materials.some((m) => filters.materials.includes(m)))
        return false;
      if (filters.yearMin !== null && (p.year ?? -Infinity) < filters.yearMin) return false;
      if (filters.yearMax !== null && (p.year ?? Infinity) > filters.yearMax) return false;
      if (filters.areaMin !== null && (p.areaSqft ?? -Infinity) < filters.areaMin) return false;
      if (filters.areaMax !== null && (p.areaSqft ?? Infinity) > filters.areaMax) return false;
      if (filters.withProductsOnly && p.productCount === 0) return false;
      return true;
    });

    return out.sort((a, b) => {
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      if (sort === "products") return b.productCount - a.productCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [projects, filters, tab, sort]);

  /** Active filters as individually removable chips (UX Guidelines). */
  const chips: { label: string; clear: () => void }[] = [];
  const listKeys = ["locations", "buildingTypes", "projectTypes", "styles", "materials"] as const;
  for (const key of listKeys) {
    for (const v of filters[key]) {
      chips.push({
        label: v.replace(/-/g, " "),
        clear: () =>
          setFilters((f) => ({ ...f, [key]: f[key].filter((x) => x !== v) })),
      });
    }
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    chips.push({
      label: `Year ${filters.yearMin ?? facets.yearRange?.min} – ${filters.yearMax ?? facets.yearRange?.max}`,
      clear: () => setFilters((f) => ({ ...f, yearMin: null, yearMax: null })),
    });
  }
  if (filters.areaMin !== null || filters.areaMax !== null) {
    chips.push({
      label: "Area",
      clear: () => setFilters((f) => ({ ...f, areaMin: null, areaMax: null })),
    });
  }
  if (filters.withProductsOnly) {
    chips.push({
      label: "With products",
      clear: () => setFilters((f) => ({ ...f, withProductsOnly: false })),
    });
  }

  const tabs = [
    { value: null as string | null, label: "All Projects", count: projects.length },
    ...facets.buildingTypes.map((b) => ({
      value: b.value as string | null,
      label: b.label,
      count: b.count,
    })),
  ];

  function chipsFor(p: DirectoryProject): string[] {
    const out: string[] = [];
    if (p.buildingTypeLabel) out.push(p.buildingTypeLabel);
    if (p.year) out.push(String(p.year));
    if (p.areaSqft && p.areaSqft > 100) out.push(`${NUMBER.format(p.areaSqft)} ft²`);
    return out;
  }

  const rail = (
    <ProjectsFilterRail
      facets={facets}
      filters={filters}
      onChange={setFilters}
      onReset={() => {
        setFilters(EMPTY_FILTERS);
        setTab(null);
      }}
    />
  );

  return (
    <div>
      {/* ── §2 Tab row ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
        <ul className="flex min-w-0 gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <li key={t.label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setTab(t.value)}
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
            <span className="sr-only">Sort projects</span>
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
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3 py-1 font-body text-[12px] capitalize text-ink"
                >
                  {c.label}
                  <X strokeWidth={2} className="h-3 w-3" aria-hidden />
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setTab(null);
                }}
                className="font-body text-[12px] text-muted underline underline-offset-4 hover:text-ink"
              >
                Clear all
              </button>
            </div>
          )}

          <p className="mb-5 font-body text-[13px] text-muted">
            {results.length} {results.length === 1 ? "project" : "projects"}
          </p>

          {results.length === 0 ? (
            <EmptyResults
              chips={chips}
              onClearAll={() => {
                setFilters(EMPTY_FILTERS);
                setTab(null);
              }}
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
              {results.map((p, i) => (
                <ListingCardShared
                  key={p.id}
                  model={{
                    id: p.id,
                    type: "project",
                    title: p.title,
                    href: p.href,
                    imageUrl: p.cover,
                    // First line is category · location. buildingTypeLabel was
                    // already fetched here and simply never passed, so the line
                    // rendered as location alone.
                    categoryLabel: p.buildingTypeLabel,
                    metaLabel: p.locationText,
                    authorName: p.architect,
                    logoUrl: p.architectAvatar,
                    relatedCount: p.badge.related,
                    ownerCount: p.badge.owners,
                    creditCount: p.creditCount,
                  }}
                  priority={i < 4}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 17vw"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {results.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="group flex items-center gap-4 py-4">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-stone">
                      {p.cover && (
                        <Image src={p.cover} alt="" fill sizes="96px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {p.locationText && (
                        <span className="flex items-center gap-1 font-body text-[12px] text-muted">
                          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{p.locationText}</span>
                        </span>
                      )}
                      <span className="mt-0.5 block truncate font-body text-[15px] text-ink">
                        {p.title}
                      </span>
                      {p.architect && (
                        <span className="block truncate font-body text-[13px] text-muted">
                          {p.architect}
                        </span>
                      )}
                    </span>
                    <span className="hidden shrink-0 gap-1.5 sm:flex">
                      {chipsFor(p).map((c) => (
                        <span
                          key={c}
                          className="rounded border border-hairline px-2 py-0.5 font-body text-[11px] text-muted"
                        >
                          {c}
                        </span>
                      ))}
                    </span>
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
              <span className="sr-only">Sort projects</span>
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
              Show {results.length} {results.length === 1 ? "project" : "projects"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Empty state (Blueprint §17): says which filter is responsible and offers a
 * specific action, never a bare "no results".
 */
function EmptyResults({
  chips,
  onClearAll,
}: {
  chips: { label: string; clear: () => void }[];
  onClearAll: () => void;
}) {
  const last = chips[chips.length - 1];
  return (
    <div className="rounded-xl border border-hairline px-6 py-14 text-center">
      <p className="font-body text-[15px] text-ink">No projects match these filters.</p>
      <p className="mx-auto mt-2 max-w-[44ch] font-body text-[13px] leading-[20px] text-muted">
        {chips.length > 1
          ? "The combination is narrower than the archive currently covers. Try removing one filter."
          : "Nothing in the archive matches yet."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {last && (
          <button
            type="button"
            onClick={last.clear}
            className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] capitalize text-ink transition-colors hover:bg-stone/50"
          >
            Remove “{last.label}”
          </button>
        )}
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-full bg-ink px-4 py-2 font-body text-[13px] text-cream transition-opacity hover:opacity-90"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
