const KEY_PROJECTS = "archtivy_recent_search_projects";
const KEY_PRODUCTS = "archtivy_recent_search_products";
const MAX_RECENT = 10;

export type SearchScope = "projects" | "products";

function getKey(scope: SearchScope): string {
  return scope === "projects" ? KEY_PROJECTS : KEY_PRODUCTS;
}

export function getRecentSearches(scope: SearchScope): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(scope: SearchScope, q: string): void {
  const trimmed = q?.trim();
  if (!trimmed) return;
  if (typeof window === "undefined") return;
  try {
    const key = getKey(scope);
    const prev = getRecentSearches(scope);
    const next = [trimmed, ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearRecentSearches(scope: SearchScope): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(scope));
  } catch {
    // ignore
  }
}
