/**
 * URL state for the Saved workspace.
 *
 * Every control writes to the URL, so a filtered library is a link: refresh,
 * back and forward all restore the exact result set. Same model the projects
 * and products directories use, and the same one /me/files uses.
 *
 * ── FOUR AXES, AND ONLY FOUR ────────────────────────────────────────────────
 * q, type, window, board, sort. The reference mockup's other controls — file
 * type, source, brand-as-a-source, project-as-a-source — describe documents,
 * not saved listings, and have no column behind them here. They are not
 * translated into near-equivalents; they are absent.
 *
 * ── "RECENTLY ADDED" AND "DATE SAVED" ARE ONE PARAM ─────────────────────────
 * The rail offers "Recently added" and the toolbar offers a "Date saved"
 * select. Both write `window`. Two entry points onto one axis, rather than two
 * pieces of state that can disagree about which 30 days you meant — a rail row
 * that says "Recently added" while the toolbar says "All time" is the kind of
 * split this codebase has been bitten by before.
 */

export type SavedType = "all" | "project" | "product";
export type SavedSort = "newest" | "oldest" | "title";
/** "recent" is the rail's "Recently added", as a real 30-day window. */
export type SavedWindow = "all" | "recent" | "half" | "year";

export interface SavedParams {
  q: string;
  type: SavedType;
  sort: SavedSort;
  window: SavedWindow;
  /** Board id, or null for the whole library. */
  board: string | null;
}

export const DEFAULT_SAVED_PARAMS: SavedParams = {
  q: "",
  type: "all",
  sort: "newest",
  window: "all",
  board: null,
};

export const SAVED_SORTS: { value: SavedSort; label: string }[] = [
  { value: "newest", label: "Newest added" },
  { value: "oldest", label: "Oldest added" },
  // Alphabetical is the only third sort with a real field behind it. There is
  // deliberately no "popular" and no "relevance": a save records who, what and
  // when, and nothing else. Neither could be computed without inventing it.
  { value: "title", label: "Title A-Z" },
];

export const SAVED_TYPES: { value: SavedType; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "project", label: "Projects" },
  { value: "product", label: "Products" },
];

export const SAVED_WINDOWS: { value: SavedWindow; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "recent", label: "Last 30 days" },
  { value: "half", label: "Last 6 months" },
  { value: "year", label: "Last year" },
];

/** Cut-offs in days. `all` has none. */
export const WINDOW_DAYS: Partial<Record<SavedWindow, number>> = {
  recent: 30,
  half: 182,
  year: 365,
};

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseSavedParams(raw: Raw): SavedParams {
  const type = one(raw.type);
  const sort = one(raw.sort);
  const window = one(raw.window);
  return {
    q: one(raw.q),
    type: type === "project" || type === "product" ? type : "all",
    sort: sort === "oldest" || sort === "title" ? sort : "newest",
    window:
      window === "recent" || window === "half" || window === "year" ? window : "all",
    board: one(raw.board) || null,
  };
}

/** Only non-default values reach the URL, so a clean library is a clean URL. */
export function savedParamsToQuery(p: SavedParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.type !== "all") sp.set("type", p.type);
  if (p.sort !== "newest") sp.set("sort", p.sort);
  if (p.window !== "all") sp.set("window", p.window);
  if (p.board) sp.set("board", p.board);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function savedHref(p: SavedParams): string {
  return `/me/saved${savedParamsToQuery(p)}`;
}

/**
 * A rail destination: a whole-library view, with filters cleared.
 *
 * The rail is NAVIGATION — "All saved", "Projects", "Products", "Recently
 * added" are places, and arriving at one should not silently inherit a date
 * window or a board you set somewhere else. `q` survives because a search is
 * the user's, not the view's. Filtering WITHIN a view is the toolbar's job.
 */
export function savedViewHref(
  p: SavedParams,
  view: { type?: SavedType; window?: SavedWindow }
): string {
  return savedHref({
    ...DEFAULT_SAVED_PARAMS,
    q: p.q,
    sort: p.sort,
    type: view.type ?? "all",
    window: view.window ?? "all",
  });
}

/** True when `p` is exactly the given rail view, board and all. */
export function isSavedView(
  p: SavedParams,
  view: { type?: SavedType; window?: SavedWindow }
): boolean {
  return (
    p.board === null &&
    p.type === (view.type ?? "all") &&
    p.window === (view.window ?? "all")
  );
}

/**
 * Filters only — the board is navigation, and "Clear all" must not move you
 * out of the board you opened.
 */
export function hasActiveFilters(p: SavedParams): boolean {
  return Boolean(p.q) || p.type !== "all" || p.window !== "all" || p.sort !== "newest";
}
