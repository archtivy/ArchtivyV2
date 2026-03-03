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
  /** Prefer slug over id for canonical, SEO-safe URLs. */
  slug?: string | null;
}

/**
 * Single canonical resolver for listing URLs.
 * Always prefers slug when available; falls back to id so UUID-based rows
 * still resolve (they will 308-redirect server-side to the slug URL).
 */
export function getListingUrl(listing: ListingRouteParams): string {
  const segment = listing.slug?.trim() || listing.id;
  return listing.type === "project"
    ? `/projects/${segment}`
    : `/products/${segment}`;
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
