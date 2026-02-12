const DEFAULT_BASE = "https://archtivy.com";
const LOCALHOST = "http://localhost:3000";

/**
 * Base URL for the site (no trailing slash). Always returns a valid absolute URL with protocol.
 * Used for canonical URLs, Open Graph, and server-side fetch (e.g. matches API).
 * Prefer: NEXT_PUBLIC_SITE_URL → VERCEL_URL (with https) → localhost.
 */
export function getBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const siteTrimmed = typeof site === "string" ? site.trim().replace(/\/$/, "") : "";
  if (siteTrimmed) return siteTrimmed;

  const vercel = process.env.VERCEL_URL;
  const vercelTrimmed = typeof vercel === "string" ? vercel.trim() : "";
  if (vercelTrimmed) {
    const host = vercelTrimmed.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return typeof window !== "undefined" ? "" : LOCALHOST;
}

/** Absolute URL for a path (e.g. /projects/foo -> https://archtivy.com/projects/foo). */
export function getAbsoluteUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Minimal listing shape for URL resolution. */
export interface ListingRouteParams {
  id: string;
  type: "project" | "product";
}

/**
 * Single canonical resolver for listing URLs. Use everywhere instead of hardcoded /listing/[id].
 * Projects → /projects/[id], Products → /products/[id].
 */
export function getListingUrl(listing: ListingRouteParams): string {
  return listing.type === "project"
    ? `/projects/${listing.id}`
    : `/products/${listing.id}`;
}

/**
 * @deprecated Use getListingUrl({ id, type }) for type-safe canonical URLs.
 * Kept for backward compatibility where only type + slug are available.
 */
export function getCanonicalUrl(
  type: "project" | "product",
  slugOrId: string
): string {
  return type === "project" ? `/projects/${slugOrId}` : `/products/${slugOrId}`;
}
