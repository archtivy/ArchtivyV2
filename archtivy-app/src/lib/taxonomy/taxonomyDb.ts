/**
 * DB access layer for the taxonomy system.
 * All functions use the service-role client (server-side only).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const supa = () => getSupabaseServiceClient();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaxonomyNode {
  id: string;
  domain: string;
  parent_id: string | null;
  depth: number;
  slug: string;
  slug_path: string;
  label: string;
  label_plural: string | null;
  description: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
  legacy_product_type: string | null;
  legacy_product_category: string | null;
  legacy_product_subcategory: string | null;
  legacy_project_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Facet {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  applies_to: string[];
  is_multi_select: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface FacetValue {
  id: string;
  facet_id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface FacetWithValues extends Facet {
  values: FacetValue[];
}

export interface ListingFacetValue {
  facet_slug: string;
  facet_label: string;
  value_id: string;
  value_slug: string;
  value_label: string;
}

export interface SynonymResult {
  term: string;
  taxonomy_node_id: string | null;
  facet_value_id: string | null;
}

type DbResult<T> = { data: T; error: null } | { data: null; error: string };

// ─── Taxonomy Nodes ──────────────────────────────────────────────────────────

const NODE_SELECT =
  "id, domain, parent_id, depth, slug, slug_path, label, label_plural, description, icon_key, sort_order, is_active, legacy_product_type, legacy_product_category, legacy_product_subcategory, legacy_project_category, created_at, updated_at";

/** Get all taxonomy nodes for a domain, ordered by depth then sort_order. */
export async function getTaxonomyTree(
  domain: "product" | "project" | "material" | "style"
): Promise<DbResult<TaxonomyNode[]>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("domain", domain)
    .eq("is_active", true)
    .order("depth", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TaxonomyNode[], error: null };
}

/** Get all taxonomy nodes (all domains, including inactive) for admin. */
export async function getAllTaxonomyNodes(): Promise<DbResult<TaxonomyNode[]>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .order("domain")
    .order("depth", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TaxonomyNode[], error: null };
}

/** Get a single taxonomy node by slug_path + domain. */
export async function getTaxonomyNodeBySlugPath(
  domain: string,
  slugPath: string
): Promise<DbResult<TaxonomyNode | null>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("domain", domain)
    .eq("slug_path", slugPath)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as TaxonomyNode) ?? null, error: null };
}

/** Get a single taxonomy node by ID. */
export async function getTaxonomyNodeById(
  id: string
): Promise<DbResult<TaxonomyNode | null>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as TaxonomyNode) ?? null, error: null };
}

/** Get direct children of a parent node. */
export async function getChildNodes(
  parentId: string
): Promise<DbResult<TaxonomyNode[]>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TaxonomyNode[], error: null };
}

/** Find taxonomy node by legacy product columns (for backfill). */
export async function findNodeByLegacyProduct(
  productType: string,
  productCategory?: string | null,
  productSubcategory?: string | null
): Promise<DbResult<TaxonomyNode | null>> {
  let query = supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("domain", "product")
    .eq("legacy_product_type", productType);

  if (productSubcategory) {
    query = query.eq("legacy_product_subcategory", productSubcategory);
  } else if (productCategory) {
    query = query.eq("legacy_product_category", productCategory).is("legacy_product_subcategory", null);
  } else {
    query = query.is("legacy_product_category", null).is("legacy_product_subcategory", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as TaxonomyNode) ?? null, error: null };
}

/** Find taxonomy node by legacy project category (for backfill). */
export async function findNodeByLegacyProject(
  projectCategory: string
): Promise<DbResult<TaxonomyNode | null>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("domain", "project")
    .eq("legacy_project_category", projectCategory)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as TaxonomyNode) ?? null, error: null };
}

// ─── Node CRUD (admin) ──────────────────────────────────────────────────────

export async function createTaxonomyNode(input: {
  domain: string;
  parent_id: string | null;
  depth: number;
  slug: string;
  slug_path: string;
  label: string;
  label_plural?: string;
  description?: string;
  icon_key?: string;
  sort_order: number;
}): Promise<DbResult<TaxonomyNode>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .insert({
      domain: input.domain,
      parent_id: input.parent_id,
      depth: input.depth,
      slug: input.slug,
      slug_path: input.slug_path,
      label: input.label,
      label_plural: input.label_plural ?? null,
      description: input.description ?? null,
      icon_key: input.icon_key ?? null,
      sort_order: input.sort_order,
    })
    .select(NODE_SELECT)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as TaxonomyNode, error: null };
}

export async function updateTaxonomyNode(
  id: string,
  updates: Partial<Pick<TaxonomyNode, "label" | "label_plural" | "description" | "icon_key" | "sort_order" | "is_active">>
): Promise<DbResult<TaxonomyNode>> {
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(NODE_SELECT)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as TaxonomyNode, error: null };
}

// ─── Listing ↔ Taxonomy Node ────────────────────────────────────────────────

/** Set the primary taxonomy node for a listing (upserts). */
export async function setListingTaxonomyNode(
  listingId: string,
  nodeId: string
): Promise<DbResult<void>> {
  const s = supa();

  // Update the direct column on listings
  const { error: updateErr } = await s
    .from("listings")
    .update({ taxonomy_node_id: nodeId })
    .eq("id", listingId);
  if (updateErr) return { data: null, error: updateErr.message };

  // Upsert the junction row
  const { error: junctionErr } = await s
    .from("listing_taxonomy_node")
    .upsert(
      { listing_id: listingId, taxonomy_node_id: nodeId, is_primary: true },
      { onConflict: "listing_id,taxonomy_node_id" }
    );
  if (junctionErr) return { data: null, error: junctionErr.message };

  return { data: undefined, error: null };
}

/** Get taxonomy nodes linked to a listing. */
export async function getListingTaxonomyNodes(
  listingId: string
): Promise<DbResult<(TaxonomyNode & { is_primary: boolean })[]>> {
  const { data, error } = await supa()
    .from("listing_taxonomy_node")
    .select(`is_primary, taxonomy_nodes:taxonomy_node_id (${NODE_SELECT})`)
    .eq("listing_id", listingId);
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as unknown as { is_primary: boolean; taxonomy_nodes: TaxonomyNode }[];
  const result = rows
    .filter((r) => r.taxonomy_nodes)
    .map((r) => ({ ...r.taxonomy_nodes, is_primary: r.is_primary }));
  return { data: result, error: null };
}

/**
 * Get all ancestor nodes for a slug_path (including the node itself).
 * E.g., "furniture/seating/dining-chair" → nodes for "furniture", "furniture/seating", "furniture/seating/dining-chair".
 */
export async function getTaxonomyAncestors(
  domain: string,
  slugPath: string
): Promise<DbResult<TaxonomyNode[]>> {
  const segments = slugPath.split("/");
  const prefixes: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    prefixes.push(segments.slice(0, i + 1).join("/"));
  }
  const { data, error } = await supa()
    .from("taxonomy_nodes")
    .select(NODE_SELECT)
    .eq("domain", domain)
    .in("slug_path", prefixes)
    .order("depth", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TaxonomyNode[], error: null };
}

// ─── Listing ↔ Material Taxonomy Nodes ──────────────────────────────────────

/** Get material taxonomy node IDs linked to a listing (domain='material', is_primary=false). */
export async function getListingMaterialNodeIds(
  listingId: string
): Promise<DbResult<string[]>> {
  const { data, error } = await supa()
    .from("listing_taxonomy_node")
    .select("taxonomy_node_id, taxonomy_nodes:taxonomy_node_id (domain)")
    .eq("listing_id", listingId)
    .eq("is_primary", false);
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as unknown as {
    taxonomy_node_id: string;
    taxonomy_nodes: { domain: string } | null;
  }[];
  const ids = rows
    .filter((r) => r.taxonomy_nodes?.domain === "material")
    .map((r) => r.taxonomy_node_id);
  return { data: ids, error: null };
}

/**
 * Replace material taxonomy node links for a listing.
 * Deletes existing material-domain links (is_primary=false), inserts new ones.
 */
export async function setListingMaterialNodes(
  listingId: string,
  nodeIds: string[]
): Promise<DbResult<void>> {
  const s = supa();
  const ids = Array.from(new Set(nodeIds.filter(Boolean)));

  // Find existing material-domain junction rows to delete
  const { data: existing, error: fetchErr } = await s
    .from("listing_taxonomy_node")
    .select("id, taxonomy_node_id, taxonomy_nodes:taxonomy_node_id (domain)")
    .eq("listing_id", listingId)
    .eq("is_primary", false);
  if (fetchErr) return { data: null, error: fetchErr.message };

  const materialJunctionIds = ((existing ?? []) as unknown as {
    id: string;
    taxonomy_node_id: string;
    taxonomy_nodes: { domain: string } | null;
  }[])
    .filter((r) => r.taxonomy_nodes?.domain === "material")
    .map((r) => r.id);

  // Delete existing material links
  if (materialJunctionIds.length > 0) {
    const { error: delErr } = await s
      .from("listing_taxonomy_node")
      .delete()
      .in("id", materialJunctionIds);
    if (delErr) return { data: null, error: delErr.message };
  }

  // Insert new material links
  if (ids.length > 0) {
    const rows = ids.map((taxonomy_node_id) => ({
      listing_id: listingId,
      taxonomy_node_id,
      is_primary: false,
    }));
    const { error: insErr } = await s.from("listing_taxonomy_node").insert(rows);
    if (insErr) return { data: null, error: insErr.message };
  }

  return { data: undefined, error: null };
}

// ─── Facets ──────────────────────────────────────────────────────────────────

/** Get all facets with their values for a domain. */
export async function getFacetsForDomain(
  domain: "product" | "project"
): Promise<DbResult<FacetWithValues[]>> {
  const { data: facets, error: facetErr } = await supa()
    .from("facets")
    .select("id, slug, label, description, applies_to, is_multi_select, sort_order, is_active")
    .eq("is_active", true)
    .contains("applies_to", [domain])
    .order("sort_order", { ascending: true });
  if (facetErr) return { data: null, error: facetErr.message };

  const facetRows = (facets ?? []) as Facet[];
  if (facetRows.length === 0) return { data: [], error: null };

  const facetIds = facetRows.map((f) => f.id);
  const { data: values, error: valErr } = await supa()
    .from("facet_values")
    .select("id, facet_id, slug, label, sort_order, is_active")
    .in("facet_id", facetIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (valErr) return { data: null, error: valErr.message };

  const valueRows = (values ?? []) as FacetValue[];
  const valuesByFacet = new Map<string, FacetValue[]>();
  for (const v of valueRows) {
    const arr = valuesByFacet.get(v.facet_id) ?? [];
    arr.push(v);
    valuesByFacet.set(v.facet_id, arr);
  }

  const result: FacetWithValues[] = facetRows.map((f) => ({
    ...f,
    values: valuesByFacet.get(f.id) ?? [],
  }));
  return { data: result, error: null };
}

/** Get all facets (admin, including inactive). */
export async function getAllFacets(): Promise<DbResult<FacetWithValues[]>> {
  const { data: facets, error: facetErr } = await supa()
    .from("facets")
    .select("id, slug, label, description, applies_to, is_multi_select, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (facetErr) return { data: null, error: facetErr.message };

  const facetRows = (facets ?? []) as Facet[];
  if (facetRows.length === 0) return { data: [], error: null };

  const facetIds = facetRows.map((f) => f.id);
  const { data: values, error: valErr } = await supa()
    .from("facet_values")
    .select("id, facet_id, slug, label, sort_order, is_active")
    .in("facet_id", facetIds)
    .order("sort_order", { ascending: true });
  if (valErr) return { data: null, error: valErr.message };

  const valueRows = (values ?? []) as FacetValue[];
  const valuesByFacet = new Map<string, FacetValue[]>();
  for (const v of valueRows) {
    const arr = valuesByFacet.get(v.facet_id) ?? [];
    arr.push(v);
    valuesByFacet.set(v.facet_id, arr);
  }

  return {
    data: facetRows.map((f) => ({ ...f, values: valuesByFacet.get(f.id) ?? [] })),
    error: null,
  };
}

// ─── Listing ↔ Facet Values ─────────────────────────────────────────────────

/** Get facet values assigned to a listing (with facet metadata). */
export async function getListingFacets(
  listingId: string
): Promise<DbResult<ListingFacetValue[]>> {
  const { data, error } = await supa()
    .from("listing_facets")
    .select(`
      facet_value_id,
      facet_values:facet_value_id (
        id, slug, label, facet_id,
        facets:facet_id (slug, label)
      )
    `)
    .eq("listing_id", listingId);
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as unknown as {
    facet_value_id: string;
    facet_values: {
      id: string;
      slug: string;
      label: string;
      facet_id: string;
      facets: { slug: string; label: string };
    };
  }[];

  const result: ListingFacetValue[] = rows
    .filter((r) => r.facet_values?.facets)
    .map((r) => ({
      facet_slug: r.facet_values.facets.slug,
      facet_label: r.facet_values.facets.label,
      value_id: r.facet_values.id,
      value_slug: r.facet_values.slug,
      value_label: r.facet_values.label,
    }));
  return { data: result, error: null };
}

/** Set facet values for a listing (replace all). */
export async function setListingFacets(
  listingId: string,
  facetValueIds: string[]
): Promise<DbResult<void>> {
  const s = supa();
  const ids = Array.from(new Set(facetValueIds.filter(Boolean)));

  // Delete existing
  const { error: delErr } = await s
    .from("listing_facets")
    .delete()
    .eq("listing_id", listingId);
  if (delErr) return { data: null, error: delErr.message };

  // Insert new
  if (ids.length > 0) {
    const rows = ids.map((facet_value_id) => ({
      listing_id: listingId,
      facet_value_id,
    }));
    const { error: insErr } = await s.from("listing_facets").insert(rows);
    if (insErr) return { data: null, error: insErr.message };
  }

  return { data: undefined, error: null };
}

// ─── Search Synonyms ─────────────────────────────────────────────────────────

/** Search synonyms by term (case-insensitive prefix match). */
export async function searchSynonyms(
  term: string
): Promise<DbResult<SynonymResult[]>> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return { data: [], error: null };

  const { data, error } = await supa()
    .from("search_synonyms")
    .select("term, taxonomy_node_id, facet_value_id")
    .ilike("term", `${normalized}%`);
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as SynonymResult[], error: null };
}

// ─── Taxonomy Redirects ──────────────────────────────────────────────────────

/** Look up a redirect for a given old slug path. */
export async function getTaxonomyRedirect(
  domain: string,
  oldSlugPath: string
): Promise<DbResult<{ new_slug_path: string } | null>> {
  const { data, error } = await supa()
    .from("taxonomy_redirects")
    .select("new_slug_path")
    .eq("domain", domain)
    .eq("old_slug_path", oldSlugPath)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as { new_slug_path: string } | null, error: null };
}

// ─── Stats (admin) ───────────────────────────────────────────────────────────

/** Count listings per taxonomy node (for admin dashboard). */
export async function getNodeListingCounts(): Promise<DbResult<Record<string, number>>> {
  const { data, error } = await supa()
    .from("listing_taxonomy_node")
    .select("taxonomy_node_id");
  if (error) return { data: null, error: error.message };

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { taxonomy_node_id: string }[]) {
    counts[row.taxonomy_node_id] = (counts[row.taxonomy_node_id] ?? 0) + 1;
  }
  return { data: counts, error: null };
}

/** Count listings that have no taxonomy_node_id set. */
export async function getUnmappedListingCount(): Promise<DbResult<number>> {
  const { count, error } = await supa()
    .from("listings")
    .select("id", { count: "exact", head: true })
    .is("taxonomy_node_id", null)
    .is("deleted_at", null);
  if (error) return { data: null, error: error.message };
  return { data: count ?? 0, error: null };
}
