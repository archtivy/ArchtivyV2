"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
 * ── URL IS THE STATE, AND THE SERVER READS IT ───────────────────────────────
 * Filters, sort, tab and the query round-trip through the query string via
 * lib/projects/directoryParams. The parsed state arrives as a PROP from the
 * server rather than from useSearchParams, which is the difference between a
 * result set that exists in the HTML and one that only appears after
 * hydration: that hook opts a component out of server rendering, so the whole
 * grid used to sit behind a Suspense fallback and a crawler — or a visitor on
 * a slow connection — saw an empty page at /projects?q=house.
 *
 * Next re-renders the server component on every navigation, so the prop
 * updates on its own when this component pushes a new URL. The URL is
 * therefore sufficient to reproduce the result set on a fresh request, which
 * is exactly the guarantee a shareable filter link needs.
 *
 * Results are derived here rather than in the query. With 53 projects the
 * whole set ships once and filtering is instant; past a few hundred this moves
 * server-side, where getProjectsCanonicalFiltered already waits.
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
  state,
  scope,
}: {
  projects: DirectoryProject[];
  facets: DirectoryFacets;
  total: number;
  /** Parsed from the request URL on the server. See the note above. */
  state: DirectoryState;
  /**
   * Set on a category archive route. The taxonomy path is fixed by the URL
   * there, so the Category facet is removed from the panel rather than offered
   * as a control that would contradict the page you are on. Every OTHER
   * filter, the search and the sort keep working, and they compose onto the
   * archive's own path: /projects/residential?q=house&country=Italy.
   */
  scope?: { slugPath: string; label: string; basePath: string } | null;
}) {
  const router = useRouter();
  const filterBtn = useRef<HTMLButtonElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const { filters, sort, tab } = state;

  const basePath = scope?.basePath ?? "/projects";

  const write = useCallback(
    (next: Partial<DirectoryState>, mode: "replace" | "push" = "replace") => {
      const qs = serializeDirectoryState({ ...state, ...next });
      router[mode](qs ? `${basePath}?${qs}` : basePath, { scroll: false });
      // A changed result set should start at the top of itself, not wherever
      // the previous, longer list had been scrolled to.
      setShown(PAGE);
    },
    [router, state, basePath]
  );

  /*
   * ── PUSH FOR FILTERS, REPLACE FOR TYPING ──────────────────────────────────
   * A discrete filter change — ticking a facet, clearing a chip, changing the
   * sort or the tab — is a step the visitor took, so it gets a history entry
   * and Back undoes it. Typing in the search box does not: one push per
   * keystroke would bury the previous page under "h", "ho", "hou", "hous",
   * "house" and make Back useless. The query still lands in the URL on every
   * keystroke, so the address bar stays shareable throughout; only the history
   * entry is coalesced.
   */
  const setFilters = useCallback(
    (f: FilterState) => write({ filters: f }, "push"),
    [write]
  );
  const setQuery = useCallback(
    (q: string) => write({ filters: { ...filters, q } }, "replace"),
    [write, filters]
  );

  const results = useMemo(() => {
    /*
     * Keyword match across the fields a visitor would expect "house" to reach:
     * the title, the studio, the place, the category and the materials. It is
     * a substring match over 53 rows already in memory, not a search engine —
     * when this archive outgrows client-side filtering the whole pipeline
     * moves server-side, where getProjectsCanonicalFiltered already waits.
     */
    const needle = filters.q.trim().toLowerCase();

    const out = projects.filter((p) => {
      if (scope && !(p.taxonomySlugPath ?? "").startsWith(scope.slugPath)) return false;
      if (needle) {
        const hay = [
          p.title,
          p.architect,
          p.locationText,
          p.country,
          p.buildingTypeLabel,
          ...p.materialLabels,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.city && p.locationText !== filters.city) return false;
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
      if (filters.statuses.length && !filters.statuses.includes(p.projectStatus ?? ""))
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
  }, [projects, filters, sort, tab, scope]);

  const activeCount = countActiveFilters(filters);

  /** Active filters as individually removable chips. */
  const chips: { label: string; clear: () => void }[] = [];
  const listKeys = ["buildingTypes", "locations", "projectTypes", "styles", "materials", "statuses"] as const;
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
                : key === "materials"
                  ? facets.materials
                  : facets.statuses;
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
  // `city` arrives from a card's own meta link and from redirected
  // /explore/projects?city= URLs, so it needs a way out that is not the
  // filter panel — it has no column there.
  if (filters.city) {
    chips.push({
      label: filters.city,
      clear: () => setFilters({ ...filters, city: null }),
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

        <ProjectsSearchBar value={filters.q} onChange={setQuery} />

        <label className="relative shrink-0">
          <span className="sr-only">Sort projects</span>
          <select
            value={sort}
            onChange={(e) => write({ sort: e.target.value as SortKey }, "push")}
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
            hideCategory={Boolean(scope)}
            filters={filters}
            onChange={setFilters}
            onClose={() => setPanelOpen(false)}
            triggerRef={filterBtn}
          />
        )}
      </div>

      {/* ── Category rail ───────────────────────────────────────────────── */}
      <div className="mt-4">
        <ProjectsCategoryRail
          categories={facets.buildingTypes}
          total={total}
          activeSlug={scope ? scope.slugPath.split("/")[0] : null}
        />
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
          {filters.q
            ? `No projects match “${filters.q}”${activeCount > 0 ? " with these filters" : ""}.`
            : "No projects match these filters."}
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
                  ? `/projects?city=${encodeURIComponent(p.locationText)}`
                  : null,
                authorName: p.architect,
                authorHref: p.architectHref,
                logoUrl: p.architectAvatar,
                year: p.year,
                yearHref: p.year ? `/projects?year_min=${p.year}&year_max=${p.year}` : null,
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
