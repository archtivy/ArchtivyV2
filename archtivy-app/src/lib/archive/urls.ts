/**
 * Centralized archive URL generation.
 * Single source of truth for all archive-related paths.
 * Detail URLs now use taxonomy-aware paths via getListingUrl() in canonical.ts.
 * Archive URLs here stay stable and independent of detail URL structure.
 */

/** Hub page URL for a content type. */
export function getArchiveHubUrl(type: "project" | "product"): string {
  return type === "project" ? "/projects" : "/products";
}

/** Category archive URL from a taxonomy slug_path. */
export function getArchiveCategoryUrl(
  type: "project" | "product",
  slugPath: string
): string {
  const base = type === "project" ? "/projects" : "/products";
  return `${base}/${slugPath}`;
}

/**
 * Build breadcrumb segments from taxonomy ancestors for archive pages.
 * Each segment gets an archive URL (not explore URL).
 */
export function buildArchiveBreadcrumbSegments(
  type: "project" | "product",
  ancestors: { id: string; label: string; slug_path: string }[],
  currentNodeId: string
): { label: string; href: string }[] {
  const hub = type === "project" ? "Projects" : "Products";
  return [
    { label: hub, href: getArchiveHubUrl(type) },
    ...ancestors
      .filter((a) => a.id !== currentNodeId)
      .map((a) => ({
        label: a.label,
        href: getArchiveCategoryUrl(type, a.slug_path),
      })),
  ];
}
