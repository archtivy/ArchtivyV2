/**
 * URL state for the projects directory.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The directory used to hold every filter, the tab, the sort and the view mode
 * in React state alone. Nothing was shareable, nothing survived a reload, and
 * the browser's back button stepped off the page rather than undoing a filter.
 * Everything now round-trips through the query string, and this is the single
 * place that decides how.
 *
 * ── PARAM NAMES BORROW FROM THE EXPLORE SCHEMA ──────────────────────────────
 * Where a filter means the same thing in both places the name is the one
 * lib/explore/filters/schema.ts already uses — `category`, `country`,
 * `materials`, `year_min`, `year_max`, `sort` — so the two discovery surfaces
 * share a vocabulary instead of inventing a second one. `intervention`,
 * `style`, `area_min`, `area_max` and `with_products` have no explore
 * equivalent and are named after the facets they filter.
 *
 * Every list is comma-separated, empty values are omitted entirely, and the
 * default state serialises to no query string at all — so /projects stays a
 * clean canonical URL until the visitor actually filters something.
 */

export interface FilterState {
  locations: string[];
  buildingTypes: string[];
  projectTypes: string[];
  styles: string[];
  materials: string[];
  yearMin: number | null;
  yearMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  withProductsOnly: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  locations: [],
  buildingTypes: [],
  projectTypes: [],
  styles: [],
  materials: [],
  yearMin: null,
  yearMax: null,
  areaMin: null,
  areaMax: null,
  withProductsOnly: false,
};

/**
 * Sort keys the DATA can actually support. `recent` is created_at, which every
 * project has; `alphabetical` is the title; `products` is the real count of
 * project_product_links. There is deliberately no "trending" or "popular" —
 * see TABS for why.
 */
export const SORTS = [
  { key: "recent", label: "Most Recent" },
  { key: "alphabetical", label: "A – Z" },
  { key: "products", label: "Most Products" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

/**
 * ── WHICH TABS ARE REAL, MEASURED ───────────────────────────────────────────
 * The reference shows four: All Projects, Featured, Most Viewed, Most Saved.
 * Two have nothing behind them:
 *
 *   FEATURED     `featured_slots` does not exist in the database (PGRST205),
 *                and no listing column marks a project as featured. /admin
 *                /featured is inert for the same reason.
 *   MOST SAVED   `listing_saves` holds 0 rows, `bookmarks` holds 0 rows, and
 *                saves_count is 0 on all 53 projects. The tab would sort a
 *                column of zeroes and present the result as a ranking.
 *
 *   MOST VIEWED  real: views_count is above zero on 21 of 53 projects, written
 *                by the ListingViewTracker on every detail page.
 *
 * So two tabs ship. The other two are omitted rather than faked, and can be
 * added the moment their data exists.
 */
export const TABS = [
  { key: "all", label: "All Projects" },
  { key: "viewed", label: "Most Viewed" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

const list = (v: string | null): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

const num = (v: string | null): number | null => {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

export interface DirectoryState {
  filters: FilterState;
  sort: SortKey;
  tab: TabKey;
  view: "grid" | "list";
}

export function parseDirectoryState(sp: URLSearchParams): DirectoryState {
  const sort = SORTS.find((s) => s.key === sp.get("sort"))?.key ?? "recent";
  const tab = TABS.find((t) => t.key === sp.get("tab"))?.key ?? "all";
  return {
    filters: {
      locations: list(sp.get("country")),
      buildingTypes: list(sp.get("category")),
      projectTypes: list(sp.get("intervention")),
      styles: list(sp.get("style")),
      materials: list(sp.get("materials")),
      yearMin: num(sp.get("year_min")),
      yearMax: num(sp.get("year_max")),
      areaMin: num(sp.get("area_min")),
      areaMax: num(sp.get("area_max")),
      withProductsOnly: sp.get("with_products") === "1",
    },
    sort,
    tab,
    view: sp.get("view") === "list" ? "list" : "grid",
  };
}

/** Serialises back to a query string. Defaults are omitted, not written. */
export function serializeDirectoryState(s: DirectoryState): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string[]) => {
    if (v.length) p.set(k, v.join(","));
  };
  put("country", s.filters.locations);
  put("category", s.filters.buildingTypes);
  put("intervention", s.filters.projectTypes);
  put("style", s.filters.styles);
  put("materials", s.filters.materials);
  if (s.filters.yearMin != null) p.set("year_min", String(s.filters.yearMin));
  if (s.filters.yearMax != null) p.set("year_max", String(s.filters.yearMax));
  if (s.filters.areaMin != null) p.set("area_min", String(s.filters.areaMin));
  if (s.filters.areaMax != null) p.set("area_max", String(s.filters.areaMax));
  if (s.filters.withProductsOnly) p.set("with_products", "1");
  if (s.sort !== "recent") p.set("sort", s.sort);
  if (s.tab !== "all") p.set("tab", s.tab);
  if (s.view !== "grid") p.set("view", s.view);
  return p.toString();
}

/** How many filters are active, for the badge on the Filter button. */
export function countActiveFilters(f: FilterState): number {
  return (
    f.locations.length +
    f.buildingTypes.length +
    f.projectTypes.length +
    f.styles.length +
    f.materials.length +
    (f.yearMin != null || f.yearMax != null ? 1 : 0) +
    (f.areaMin != null || f.areaMax != null ? 1 : 0) +
    (f.withProductsOnly ? 1 : 0)
  );
}
