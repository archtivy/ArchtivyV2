/**
 * URL state for /me/files.
 *
 * Every control writes to the URL, so a filtered file list is a link and
 * refresh / back / forward restore it exactly. Same model the directories and
 * the Saved workspace use.
 */

export type FileSort = "newest" | "oldest" | "name";
/** "recent" is the reference's "Recently added", as a real 30-day window. */
export type FileWindow = "all" | "recent" | "year";

export interface FilesParams {
  q: string;
  /** A real format from listing_documents.file_type, or "all". */
  format: string;
  /** Source profile id, or "all". */
  source: string;
  window: FileWindow;
  sort: FileSort;
}

export const DEFAULT_FILES_PARAMS: FilesParams = {
  q: "",
  format: "all",
  source: "all",
  window: "all",
  sort: "newest",
};

export const FILE_SORTS: { value: FileSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "File name" },
];

export const FILE_WINDOWS: { value: FileWindow; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "recent", label: "Last 30 days" },
  { value: "year", label: "Last 12 months" },
];

export const WINDOW_DAYS: Record<FileWindow, number | null> = {
  all: null,
  recent: 30,
  year: 365,
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseFilesParams(raw: Raw): FilesParams {
  const sort = one(raw.sort);
  const window = one(raw.window);
  return {
    q: one(raw.q),
    format: one(raw.format) || "all",
    source: one(raw.source) || "all",
    window: window === "recent" || window === "year" ? window : "all",
    sort: sort === "oldest" || sort === "name" ? sort : "newest",
  };
}

export function filesParamsToQuery(p: FilesParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.format !== "all") sp.set("format", p.format);
  if (p.source !== "all") sp.set("source", p.source);
  if (p.window !== "all") sp.set("window", p.window);
  if (p.sort !== "newest") sp.set("sort", p.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function filesHref(p: FilesParams): string {
  return `/me/files${filesParamsToQuery(p)}`;
}

export function hasActiveFileFilters(p: FilesParams): boolean {
  return (
    Boolean(p.q) || p.format !== "all" || p.source !== "all" || p.window !== "all"
  );
}
