/**
 * URL state for the Saved workspace.
 *
 * Every control writes to the URL, so a filtered library is a link: refresh,
 * back and forward all restore the exact result set. Same model the projects
 * and products directories use.
 */

export type SavedType = "all" | "project" | "product";
export type SavedSort = "newest" | "oldest" | "title";

export interface SavedParams {
  q: string;
  type: SavedType;
  sort: SavedSort;
  /** Board id, or null for the whole library. */
  board: string | null;
}

export const DEFAULT_SAVED_PARAMS: SavedParams = {
  q: "",
  type: "all",
  sort: "newest",
  board: null,
};

export const SAVED_SORTS: { value: SavedSort; label: string }[] = [
  { value: "newest", label: "Newest saved" },
  { value: "oldest", label: "Oldest saved" },
  // Alphabetical is the only third sort with a real field behind it. There is
  // deliberately no "popular" or "relevance": nothing on a save records either.
  { value: "title", label: "Title A-Z" },
];

export const SAVED_TYPES: { value: SavedType; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "project", label: "Projects" },
  { value: "product", label: "Products" },
];

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseSavedParams(raw: Raw): SavedParams {
  const type = one(raw.type);
  const sort = one(raw.sort);
  return {
    q: one(raw.q),
    type: type === "project" || type === "product" ? type : "all",
    sort: sort === "oldest" || sort === "title" ? sort : "newest",
    board: one(raw.board) || null,
  };
}

/** Only non-default values reach the URL, so a clean library is a clean URL. */
export function savedParamsToQuery(p: SavedParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.type !== "all") sp.set("type", p.type);
  if (p.sort !== "newest") sp.set("sort", p.sort);
  if (p.board) sp.set("board", p.board);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function savedHref(p: SavedParams): string {
  return `/me/saved${savedParamsToQuery(p)}`;
}

/** Filters only - the board is navigation, and Clear all must not leave it. */
export function hasActiveFilters(p: SavedParams): boolean {
  return Boolean(p.q) || p.type !== "all" || p.sort !== "newest";
}
