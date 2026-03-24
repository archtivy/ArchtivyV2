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
  /**
   * The primary taxonomy slug_path (e.g. "residential/houses").
   * When provided, the URL becomes /projects/{taxonomySlugPath}/{slug}.
   * When omitted, falls back to flat /projects/{slug}.
   */
  taxonomySlugPath?: string | null;
  /** Snake-case alias for taxonomySlugPath. Accepted for compatibility with DB models. */
  taxonomy_slug_path?: string | null;
}

/**
 * Single canonical resolver for listing URLs.
 * Always prefers slug when available; falls back to id so UUID-based rows
 * still resolve (they will 308-redirect server-side to the slug URL).
 *
 * When taxonomySlugPath is provided, the URL becomes taxonomy-aware:
 *   /products/{type}/{cat}/{subcat}/{slug}  (3-level product taxonomy)
 *   /projects/{cat}/{subcat}/{slug}         (2-level project taxonomy)
 *   /projects/{cat}/{slug}                  (1-level taxonomy)
 *   /projects/{slug}                        (no taxonomy — fallback)
 */
export function getListingUrl(listing: ListingRouteParams): string {
  const segment = listing.slug?.trim() || listing.id;
  const base = listing.type === "project" ? "/projects" : "/products";

  const taxPath = listing.taxonomySlugPath ?? listing.taxonomy_slug_path ?? null;
  if (taxPath) {
    return `${base}/${taxPath}/${segment}`;
  }

  return `${base}/${segment}`;
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
