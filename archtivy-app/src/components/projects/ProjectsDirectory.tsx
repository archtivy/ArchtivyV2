"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { ProjectsFilterPanel } from "@/components/projects/ProjectsFilterPanel";
import { ProjectsSearchBar } from "@/components/projects/ProjectsSearchBar";
import { ProjectsCategoryRail } from "@/components/projects/ProjectsCategoryRail";
import {
  EMPTY_FILTERS,
  SORTS,
  TABS,
  countActiveFilters,
  parseDirectoryState,
  serializeDirectoryState,
  type DirectoryState,
  type FilterState,
  type SortKey,
  type TabKey,
} from "@/lib/projects/directoryParams";
import type { DirectoryProject, DirectoryFacets } from "@/lib/db/projectsDirectory";

/**
 * Projects directory.
 *
 * ── URL IS THE STATE ────────────────────────────────────────────────────────
 * Filters, sort and tab used to live in React state alone: nothing was
 * shareable, a reload lost everything, and the back button left the page
 * instead of undoing a filter. All of it now round-trips through the query
 * string via lib/projects/directoryParams, written with router.replace so a
 * filter session does not bury the previous page under fifty history entries —
 * except the tab, which is a navigation and gets a real push.
 *
 * Results are still derived client-side. With 53 projects the whole set ships
 * once and filtering is instant; past a few hundred this moves server-side,
 * where getProjectsCanonicalFiltered already waits.
 *
 * ── THE CARD IS THE CANONICAL ONE ───────────────────────────────────────────
 * ListingCardShared with the full model — taxonomy line, location, year,
 * studio avatar, relationship badge, save behaviour. No directory-specific
 * card variant exists, and five columns are reached through the grid and its
 * gutters, never by changing the card.
 */

const NUMBER = new Intl.NumberFormat("en-US");
const PAGE = 20;

export function ProjectsDirectory({
  projects,
  facets,
  total,
}: {
  projects: DirectoryProject[];
  facets: DirectoryFacets;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterBtn = useRef<HTMLButtonElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const state: DirectoryState = useMemo(
    () => parseDirectoryState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const { filters, sort, tab } = state;

  const write = useCallback(
    (next: Partial<DirectoryState>, mode: "replace" | "push" = "replace") => {
      const qs = serializeDirectoryState({ ...state, ...next });
      router[mode](qs ? `/projects?${qs}` : "/projects", { scroll: false });
      // A changed result set should start at the top of itself, not wherever
      // the previous, longer list had been scrolled to.
      setShown(PAGE);
    },
    [router, state]
  );

  const setFilters = useCallback((f: FilterState) => write({ filters: f }), [write]);

  const results = useMemo(() => {
    const out = projects.filter((p) => {
      if (filters.buildingTypes.length && !filters.buildingTypes.includes(p.buildingType ?? ""))
        return false;
      if (filters.locations.length && !filters.locations.includes(p.country ?? "")) return false;
      if (
        filters.projectTypes.length &&
        !p.projectTypes.some((t) => filters.projectTypes.includes(t))
      )
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

    /*
     * The "Most Viewed" tab sorts on views_count, which is real and non-zero on
     * 21 of 53 projects. Projects with no views yet keep their place at the
     * end rather than being filtered out, so the tab narrows the ORDER, not the
     * archive.
     */
    if (tab === "viewed") {
      return [...out].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
    }

    return [...out].sort((a, b) => {
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      if (sort === "products") return b.productCount - a.productCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [projects, filters, sort, tab]);

  const activeCount = countActiveFilters(filters);

  /** Active filters as individually removable chips. */
  const chips: { label: string; clear: () => void }[] = [];
  const listKeys = ["buildingTypes", "locations", "projectTypes", "styles", "materials"] as const;
  for (const key of listKeys) {
    for (const v of filters[key]) {
      const facetList =
        key === "buildingTypes"
          ? facets.buildingTypes
          : key === "locations"
            ? facets.locations
            : key === "projectTypes"
              ? facets.projectTypes
              : key === "styles"
                ? facets.styles
                : facets.materials;
      chips.push({
        label: facetList.find((f) => f.value === v)?.label ?? v,
        clear: () => setFilters({ ...filters, [key]: filters[key].filter((x) => x !== v) }),
      });
    }
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    chips.push({
      label: `Year ${filters.yearMin ?? facets.yearRange?.min} – ${filters.yearMax ?? facets.yearRange?.max}`,
      clear: () => setFilters({ ...filters, yearMin: null, yearMax: null }),
    });
  }
  if (filters.areaMin !== null || filters.areaMax !== null) {
    chips.push({
      label: `Size ${filters.areaMin ?? facets.areaRange?.min} – ${filters.areaMax ?? facets.areaRange?.max} ft²`,
      clear: () => setFilters({ ...filters, areaMin: null, areaMax: null }),
    });
  }
  if (filters.withProductsOnly) {
    chips.push({
      label: "With products",
      clear: () => setFilters({ ...filters, withProductsOnly: false }),
    });
  }

  const visible = results.slice(0, shown);

  return (
    <div>
      {/* ── Control bar ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          ref={filterBtn}
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          className={[
            "inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 font-body text-[14px] transition-colors",
            activeCount > 0 || panelOpen
              ? "border-ink/40 text-ink"
              : "border-hairline text-ink hover:border-ink/30",
          ].join(" ")}
        >
          <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          Filter
          {activeCount > 0 && (
            <span className="font-body text-[13px] text-muted">· {activeCount}</span>
          )}
          <ChevronDown
            strokeWidth={1.5}
            className={`h-4 w-4 text-muted transition-transform ${panelOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        <ProjectsSearchBar />

        <label className="relative shrink-0">
          <span className="sr-only">Sort projects</span>
          <select
            value={sort}
            onChange={(e) => write({ sort: e.target.value as SortKey })}
            className="appearance-none rounded-full border border-hairline bg-cream py-3 pl-5 pr-11 font-body text-[14px] text-ink focus:border-ink/40 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            strokeWidth={1.5}
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </label>

        {panelOpen && (
          <ProjectsFilterPanel
            facets={facets}
            filters={filters}
            onChange={setFilters}
            onClose={() => setPanelOpen(false)}
            triggerRef={filterBtn}
          />
        )}
      </div>

      {/* ── Category rail ───────────────────────────────────────────────── */}
      <div className="mt-4">
        <ProjectsCategoryRail categories={facets.buildingTypes} total={total} />
      </div>

      {/* ── Results header + tabs ───────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-hairline pb-0">
        <p className="font-body text-[15px] text-ink">
          {NUMBER.format(results.length)}
          {results.length !== total && (
            <span className="text-muted"> of {NUMBER.format(total)}</span>
          )}{" "}
          {results.length === 1 ? "Project" : "Projects"}
        </p>

        {/* Featured and Most Saved are absent, not disabled: featured_slots
            does not exist and every save table is empty. See TABS. */}
        <ul className="flex gap-6" role="tablist">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => write({ tab: t.key as TabKey }, "push")}
                  className={[
                    "border-b-2 pb-3 font-body text-[14px] transition-colors",
                    on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-body text-[12px] text-ink transition-colors hover:border-ink/30"
            >
              {c.label}
              <X strokeWidth={1.5} className="h-3 w-3 text-muted" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="mt-12 font-body text-[14px] text-muted">
          No projects match these filters.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((p, i) => (
            <ListingCardShared
              key={p.id}
              model={{
                id: p.id,
                type: "project",
                title: p.title,
                href: p.href,
                imageUrl: p.cover,
                categoryLabel: p.buildingTypeLabel,
                categoryHref: p.buildingType ? `/projects/${p.buildingType}` : null,
                metaLabel: p.locationText,
                metaHref: p.locationText
                  ? `/explore/projects?city=${encodeURIComponent(p.locationText)}`
                  : null,
                authorName: p.architect,
                authorHref: p.architectHref,
                logoUrl: p.architectAvatar,
                year: p.year,
                yearHref: p.year ? `/explore/projects?year=${p.year}` : null,
                relatedCount: p.badge.related,
                ownerCount: p.badge.owners,
                creditCount: p.creditCount,
              }}
              priority={i < 5}
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1280px) 24vw, 18vw"
            />
          ))}
        </div>
      )}

      {/* Load more, kept from the existing architecture rather than swapped for
          infinite scroll. It reveals already-loaded rows, so it is instant and
          costs no request — the point is not fetching, it is not painting the
          whole archive at once. */}
      {visible.length < results.length && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3 font-body text-[14px] text-ink transition-colors hover:border-ink/30"
          >
            Load more
            <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
