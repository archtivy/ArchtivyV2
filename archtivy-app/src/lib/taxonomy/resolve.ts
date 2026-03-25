/**
 * Dual-read helpers for the taxonomy transition period.
 * These functions prefer the new taxonomy_node data, falling back to legacy text columns.
 */

import {
  findNodeByLegacyProduct,
  findNodeByLegacyProject,
  getTaxonomyRedirect,
  getTaxonomyAncestors,
  getListingTaxonomyNodes,
  setListingTaxonomyNode,
  type TaxonomyNode,
} from "./taxonomyDb";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { fuzzyMatchProductNode, fuzzyMatchProjectNode, type TaxonomyNodeForMatch } from "./normalize";

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

// ─── Taxonomy Path Helper ────────────────────────────────────────────────────

/** A single segment in a listing's taxonomy path. */
export interface TaxonomyPathSegment {
  /** taxonomy_nodes.id */
  id: string;
  label: string;
  slug: string;
  slug_path: string;
  depth: number;
  domain: string;
}

/** The full resolved taxonomy path for a listing. */
export interface ListingTaxonomyPath {
  /** All segments from root to deepest node, ordered by depth ascending. */
  segments: TaxonomyPathSegment[];
  /** The primary (deepest assigned) node, or null if no taxonomy is set. */
  primary: TaxonomyPathSegment | null;
  /** The root category (depth 0), or null. */
  category: TaxonomyPathSegment | null;
  /** The subcategory (depth 1), or null. */
  subcategory: TaxonomyPathSegment | null;
  /** Display string like "Residential → Houses". */
  display: string;
}

const EMPTY_PATH: ListingTaxonomyPath = {
  segments: [],
  primary: null,
  category: null,
  subcategory: null,
  display: "",
};

/**
 * Build a ListingTaxonomyPath from a resolved primary node.
 */
async function buildPathFromNode(node: TaxonomyNode): Promise<ListingTaxonomyPath> {
  const ancestorsRes = await getTaxonomyAncestors(node.domain, node.slug_path);
  const ancestors = ancestorsRes.data ?? [];

  const segments: TaxonomyPathSegment[] = ancestors.map((n) => ({
    id: n.id,
    label: n.label,
    slug: n.slug,
    slug_path: n.slug_path,
    depth: n.depth,
    domain: n.domain,
  }));

  const category = segments.find((s) => s.depth === 0) ?? null;
  const subcategory = segments.find((s) => s.depth === 1) ?? null;
  const primary = segments.length > 0 ? segments[segments.length - 1] : null;
  const display = segments.map((s) => s.label).join(" → ");

  return { segments, primary, category, subcategory, display };
}

/**
 * Just-in-time taxonomy resolution from legacy fields.
 * When a listing has no taxonomy link but does have legacy category fields,
 * resolve the matching taxonomy node and write it back (lazy backfill).
 * Returns the resolved node or null if no match.
 */
async function resolveFromLegacyFields(listingId: string): Promise<TaxonomyNode | null> {
  const supa = getSupabaseServiceClient();
  const { data: listing, error } = await supa
    .from("listings")
    .select("type, category, product_type, product_category, product_subcategory")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) return null;

  const row = listing as {
    type: string;
    category: string | null;
    product_type: string | null;
    product_category: string | null;
    product_subcategory: string | null;
  };

  let matched: TaxonomyNode | null = null;

  if (row.type === "product" && row.product_type) {
    // Step 1: Exact match via DB query
    if (row.product_subcategory && row.product_category) {
      const res = await findNodeByLegacyProduct(row.product_type, row.product_category, row.product_subcategory);
      matched = res.data ?? null;
    }
    if (!matched && row.product_category) {
      const res = await findNodeByLegacyProduct(row.product_type, row.product_category);
      matched = res.data ?? null;
    }
    if (!matched) {
      const res = await findNodeByLegacyProduct(row.product_type);
      matched = res.data ?? null;
    }

    // Step 2: Fuzzy match if exact failed
    if (!matched) {
      const { data: allNodes } = await supa
        .from("taxonomy_nodes")
        .select("id, slug_path, slug, label, depth, legacy_product_type, legacy_product_category, legacy_product_subcategory, legacy_project_category")
        .eq("is_active", true);
      const fuzzy = fuzzyMatchProductNode(
        (allNodes ?? []) as TaxonomyNodeForMatch[],
        row.product_type,
        row.product_category,
        row.product_subcategory,
      );
      if (fuzzy) {
        matched = fuzzy.node as unknown as TaxonomyNode;
      }
    }
  } else if (row.type === "project" && row.category) {
    // Step 1: Exact match
    const res = await findNodeByLegacyProject(row.category);
    matched = res.data ?? null;

    // Step 2: Fuzzy match if exact failed
    if (!matched) {
      const { data: allNodes } = await supa
        .from("taxonomy_nodes")
        .select("id, slug_path, slug, label, depth, legacy_product_type, legacy_product_category, legacy_product_subcategory, legacy_project_category")
        .eq("is_active", true);
      const fuzzy = fuzzyMatchProjectNode(
        (allNodes ?? []) as TaxonomyNodeForMatch[],
        row.category,
      );
      if (fuzzy) {
        matched = fuzzy.node as unknown as TaxonomyNode;
      }
    }
  }

  if (!matched) return null;

  // Write back: persist the link so future lookups are instant
  await setListingTaxonomyNode(listingId, matched.id);

  return matched;
}

/**
 * Resolve the full primary taxonomy path for a listing.
 * Returns the ancestor chain from root to the assigned node.
 *
 * Resolution order:
 * 1. listing_taxonomy_node junction table (primary source)
 * 2. listings.taxonomy_node_id direct column (fallback, handled by getListingTaxonomyNodes)
 * 3. Legacy fields → taxonomy node match (just-in-time backfill, writes back for future)
 *
 * Use this for breadcrumbs, detail pages, canonical route generation,
 * archive page linking, and internal linking.
 */
export async function getListingTaxonomyPath(
  listingId: string
): Promise<ListingTaxonomyPath> {
  // Layer 1+2: junction table + direct column fallback
  const nodesRes = await getListingTaxonomyNodes(listingId);
  const nodes = nodesRes.data ?? [];
  const primaryNode = nodes.find((n) => n.is_primary) ?? null;

  if (primaryNode) {
    return buildPathFromNode(primaryNode);
  }

  // Layer 3: just-in-time resolution from legacy fields
  const legacyNode = await resolveFromLegacyFields(listingId);
  if (legacyNode) {
    return buildPathFromNode(legacyNode);
  }

  return EMPTY_PATH;
}

/**
 * Resolve taxonomy path from a listing that already has taxonomy data loaded.
 * Synchronous — does not hit the DB. For use when you already have taxonomy
 * crumbs from the detail page fetch.
 */
export function buildTaxonomyPathFromCrumbs(
  crumbs: { label: string; slug_path: string }[]
): Pick<ListingTaxonomyPath, "display" | "category" | "subcategory"> {
  const display = crumbs.map((c) => c.label).join(" → ");
  const category = crumbs.length > 0
    ? { ...crumbs[0], id: "", slug: crumbs[0].slug_path.split("/").pop() ?? "", depth: 0, domain: "" }
    : null;
  const subcategory = crumbs.length > 1
    ? { ...crumbs[1], id: "", slug: crumbs[1].slug_path.split("/").pop() ?? "", depth: 1, domain: "" }
    : null;
  return { display, category, subcategory };
}
