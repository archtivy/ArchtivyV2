/**
 * Dual-read helpers for the taxonomy transition period.
 * These functions prefer the new taxonomy_node data, falling back to legacy text columns.
 */

import { findNodeByLegacyProduct, findNodeByLegacyProject, getTaxonomyRedirect, type TaxonomyNode } from "./taxonomyDb";

/**
 * Resolve display label for a product listing.
 * Prefers taxonomy node label, falls back to legacy product_type column.
 */
export function resolveProductCategory(listing: {
  taxonomy_node?: { label: string } | null;
  product_type?: string | null;
}): string {
  if (listing.taxonomy_node?.label) return listing.taxonomy_node.label;
  return listing.product_type ?? "Other";
}

/**
 * Resolve display label for a project listing.
 * Prefers taxonomy node label, falls back to legacy category column.
 */
export function resolveProjectCategory(listing: {
  taxonomy_node?: { label: string } | null;
  category?: string | null;
}): string {
  if (listing.taxonomy_node?.label) return listing.taxonomy_node.label;
  return listing.category ?? "Other";
}

/**
 * Resolve full taxonomy breadcrumb for display.
 * Returns array like ["Furniture", "Seating", "Dining chair"].
 */
export function resolveTaxonomyBreadcrumb(slugPath: string | null | undefined): string[] {
  if (!slugPath) return [];
  return slugPath.split("/").map((s) =>
    s
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Find the taxonomy_node_id from legacy product columns.
 * Used for backfill and for resolving explore filter params.
 */
export async function legacySlugsToNodeId(
  productType: string,
  productCategory?: string | null,
  productSubcategory?: string | null
): Promise<string | null> {
  // Try deepest match first (subcategory), then category, then type
  if (productSubcategory) {
    const res = await findNodeByLegacyProduct(productType, productCategory, productSubcategory);
    if (res.data) return res.data.id;
  }
  if (productCategory) {
    const res = await findNodeByLegacyProduct(productType, productCategory);
    if (res.data) return res.data.id;
  }
  const res = await findNodeByLegacyProduct(productType);
  return res.data?.id ?? null;
}

/**
 * Find the taxonomy_node_id from a legacy project category.
 */
export async function legacyProjectCategoryToNodeId(
  category: string
): Promise<string | null> {
  const res = await findNodeByLegacyProject(category);
  return res.data?.id ?? null;
}

/**
 * Build a partial taxonomy context object from a listing row
 * that may or may not have the new taxonomy_node join.
 */
export function buildTaxonomyContext(listing: {
  taxonomy_node_id?: string | null;
  taxonomy_node?: TaxonomyNode | null;
  product_type?: string | null;
  product_category?: string | null;
  product_subcategory?: string | null;
  category?: string | null;
  type?: string | null;
}): {
  taxonomy_node_id: string | null;
  taxonomy_slug_path: string | null;
  taxonomy_label: string | null;
} {
  if (listing.taxonomy_node) {
    return {
      taxonomy_node_id: listing.taxonomy_node.id,
      taxonomy_slug_path: listing.taxonomy_node.slug_path,
      taxonomy_label: listing.taxonomy_node.label,
    };
  }
  return {
    taxonomy_node_id: listing.taxonomy_node_id ?? null,
    taxonomy_slug_path: null,
    taxonomy_label: null,
  };
}

/**
 * Check if a taxonomy slug_path has been moved via taxonomy_redirects.
 * Returns the new slug_path if a redirect exists, null otherwise.
 * Used by explore pages to issue a 301 redirect when an old slug is in the URL.
 */
export async function checkTaxonomySlugRedirect(
  domain: "product" | "project",
  slugPath: string
): Promise<string | null> {
  const res = await getTaxonomyRedirect(domain, slugPath);
  return res.data?.new_slug_path ?? null;
}
