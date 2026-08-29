/**
 * URL state for the products directory — the sibling of
 * lib/projects/directoryParams, and deliberately the same shape.
 *
 * ── PARAM NAMES ─────────────────────────────────────────────────────────────
 * Where a concept already has a name in lib/explore/filters/schema.ts, that
 * name is used: `q`, `category`, `materials`, `color`, `brands`, `sort`. The
 * two that have no explore equivalent — `finish` and `sustainability` — are
 * named after the facets they filter. Nothing invents a second word for a
 * concept the application already names.
 *
 * Every list is comma-separated, empty values are omitted, and the default
 * state serialises to no query string at all, so /products stays a clean
 * canonical URL until the visitor actually filters something.
 */

export interface ProductFilterState {
  /** Free-text query. A filter like any other, not a separate search system. */
  q: string;
  categories: string[];
  brands: string[];
  colors: string[];
  materials: string[];
  finishes: string[];
  sustainability: string[];
  usedInProjectsOnly: boolean;
}

export const EMPTY_PRODUCT_FILTERS: ProductFilterState = {
  q: "",
  categories: [],
  brands: [],
  colors: [],
  materials: [],
  finishes: [],
  sustainability: [],
  usedInProjectsOnly: false,
};

/**
 * Sorts the data can actually support. `used` is the real count of
 * project_product_links; `brand` groups by the owning profile's name. No
 * "trending" and no "popular": there is no engagement signal behind either.
 */
export const PRODUCT_SORTS = [
  { key: "recent", label: "Most Recent" },
  { key: "alphabetical", label: "A – Z" },
  { key: "used", label: "Most Used" },
  { key: "brand", label: "By Brand" },
] as const;

export type ProductSortKey = (typeof PRODUCT_SORTS)[number]["key"];

/**
 * ── WHICH TABS ARE REAL, MEASURED ───────────────────────────────────────────
 * The reference shows four: All Products, Featured, Most Viewed, Most Saved.
 * Two have nothing behind them, exactly as on the projects side:
 *
 *   FEATURED     `featured_slots` does not exist in the database, and no
 *                listing column marks a product as featured.
 *   MOST SAVED   listing_saves and bookmarks are both empty, and saves_count
 *                is 0 on all 80 live products. The tab would sort a column of
 *                zeroes and present the result as a ranking.
 *
 *   MOST VIEWED  real: views_count is above zero on 26 of 80 products, written
 *                by ListingViewTracker on every product detail page.
 */
export const PRODUCT_TABS = [
  { key: "all", label: "All Products" },
  { key: "viewed", label: "Most Viewed" },
] as const;

export type ProductTabKey = (typeof PRODUCT_TABS)[number]["key"];

const list = (v: string | null): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

export interface ProductDirectoryState {
  filters: ProductFilterState;
  sort: ProductSortKey;
  tab: ProductTabKey;
  view: "grid" | "list";
}

export function parseProductDirectoryState(sp: URLSearchParams): ProductDirectoryState {
  const sort = PRODUCT_SORTS.find((s) => s.key === sp.get("sort"))?.key ?? "recent";
  const tab = PRODUCT_TABS.find((t) => t.key === sp.get("tab"))?.key ?? "all";
  return {
    filters: {
      q: (sp.get("q") ?? "").trim(),
      categories: list(sp.get("category")),
      brands: list(sp.get("brands")),
      colors: list(sp.get("color")),
      materials: list(sp.get("materials")),
      finishes: list(sp.get("finish")),
      sustainability: list(sp.get("sustainability")),
      usedInProjectsOnly: sp.get("used_in_projects") === "1",
    },
    sort,
    tab,
    view: sp.get("view") === "list" ? "list" : "grid",
  };
}

export function serializeProductDirectoryState(s: ProductDirectoryState): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string[]) => {
    if (v.length) p.set(k, v.join(","));
  };
  if (s.filters.q) p.set("q", s.filters.q);
  put("category", s.filters.categories);
  put("brands", s.filters.brands);
  put("color", s.filters.colors);
  put("materials", s.filters.materials);
  put("finish", s.filters.finishes);
  put("sustainability", s.filters.sustainability);
  if (s.filters.usedInProjectsOnly) p.set("used_in_projects", "1");
  if (s.sort !== "recent") p.set("sort", s.sort);
  if (s.tab !== "all") p.set("tab", s.tab);
  if (s.view !== "grid") p.set("view", s.view);
  return p.toString();
}

/**
 * How many filters are active, for the badge on the Filter button. `q` is
 * excluded: it has its own always-visible input, so counting it would make the
 * Filter button claim a filter the panel does not contain.
 */
export function countActiveProductFilters(f: ProductFilterState): number {
  return (
    f.categories.length +
    f.brands.length +
    f.colors.length +
    f.materials.length +
    f.finishes.length +
    f.sustainability.length +
    (f.usedInProjectsOnly ? 1 : 0)
  );
}
