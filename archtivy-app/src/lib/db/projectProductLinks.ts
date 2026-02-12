import { supabase } from "@/lib/supabaseClient";
import { listingCardSelect } from "@/lib/db/selects";
import type { BrandUsed, ListingCardData, ListingSummary, TeamMember } from "@/lib/types/listings";

const PPL = "project_product_links";
const LISTINGS = "listings";

function normalizeListingCardRow(row: Record<string, unknown>): ListingCardData {
  return {
    ...row,
    team_members: Array.isArray(row.team_members) ? (row.team_members as TeamMember[]) : [],
    brands_used: Array.isArray(row.brands_used) ? (row.brands_used as BrandUsed[]) : [],
    views_count: typeof row.views_count === "number" && !Number.isNaN(row.views_count) ? row.views_count : 0,
    saves_count: typeof row.saves_count === "number" && !Number.isNaN(row.saves_count) ? row.saves_count : 0,
    updated_at: typeof row.updated_at === "string" && row.updated_at ? row.updated_at : null,
  } as ListingCardData;
}

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Create a project–product link. Idempotent: if already linked, returns success.
 */
export async function linkProductToProject(
  projectId: string,
  productId: string
): Promise<DbResult<{ linked: boolean }>> {
  const { error } = await supabase.from(PPL).upsert(
    { project_id: projectId, product_id: productId },
    { onConflict: "project_id,product_id" }
  );

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: { linked: true }, error: null };
}

/**
 * Remove a project–product link.
 */
export async function unlinkProductFromProject(
  projectId: string,
  productId: string
): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(PPL)
    .delete()
    .eq("project_id", projectId)
    .eq("product_id", productId);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: undefined, error: null };
}

export type ProjectProductLinkSource = "manual" | "photo_tag";

/**
 * Fetch all products linked to a project (listing summaries).
 * Optionally filter by source(s): manual (brand/products UI) and/or photo_tag (photo-level tags).
 */
export async function getProductsForProject(
  projectId: string,
  options?: { sources?: ProjectProductLinkSource[] }
): Promise<DbResult<ListingSummary[]>> {
  let query = supabase
    .from(PPL)
    .select("product_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (options?.sources?.length) {
    query = query.in("source", options.sources);
  }
  const { data: links, error: linksError } = await query;

  if (linksError) {
    return { data: null, error: linksError.message };
  }

  const productIds = (links ?? []).map((r) => r.product_id).filter(Boolean);
  if (productIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: listings, error: listError } = await supabase
    .from(LISTINGS)
    .select("id, type, title, description, created_at")
    .in("id", productIds)
    .eq("type", "product")
    .is("deleted_at", null);

  if (listError) {
    return { data: null, error: listError.message };
  }

  const order = new Map(productIds.map((id, i) => [id, i]));
  const sorted = (listings ?? []).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
  return { data: sorted as ListingSummary[], error: null };
}

/**
 * Fetch all projects linked to a product (listing summaries).
 */
export async function getProjectsForProduct(
  productId: string
): Promise<DbResult<ListingSummary[]>> {
  const { data: links, error: linksError } = await supabase
    .from(PPL)
    .select("project_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (linksError) {
    return { data: null, error: linksError.message };
  }

  const projectIds = (links ?? []).map((r) => r.project_id).filter(Boolean);
  if (projectIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: listings, error: listError } = await supabase
    .from(LISTINGS)
    .select(`${listingCardSelect}, slug`)
    .in("id", projectIds)
    .eq("type", "project")
    .is("deleted_at", null);

  if (listError) {
    return { data: null, error: listError.message };
  }

  const normalized = (listings ?? []).map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  const order = new Map(projectIds.map((id, i) => [id, i]));
  const sorted = normalized.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { data: sorted, error: null };
}

/**
 * Fetch distinct project IDs that are linked to any of the given product IDs.
 */
export async function getProjectIdsLinkedToProducts(
  productIds: string[]
): Promise<DbResult<string[]>> {
  if (productIds.length === 0) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from(PPL)
    .select("project_id")
    .in("product_id", productIds);

  if (error) {
    return { data: null, error: error.message };
  }
  const ids = Array.from(
    new Set((data ?? []).map((r) => r.project_id).filter(Boolean))
  );
  return { data: ids, error: null };
}

/**
 * Fetch connection counts per project (number of linked products) for many project IDs.
 * Returns a map projectId -> count.
 */
export async function getConnectionCountsByProjectIds(
  projectIds: string[]
): Promise<DbResult<Record<string, number>>> {
  if (projectIds.length === 0) {
    return { data: {}, error: null };
  }
  const { data, error } = await supabase
    .from(PPL)
    .select("project_id")
    .in("project_id", projectIds);

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []) as { project_id: string }[];
  const map: Record<string, number> = {};
  for (const id of projectIds) {
    map[id] = 0;
  }
  for (const r of rows) {
    if (r.project_id && map[r.project_id] !== undefined) {
      map[r.project_id]++;
    }
  }
  return { data: map, error: null };
}

/**
 * Fetch connection counts per product (number of linked projects) for many product IDs.
 * Returns a map productId -> count.
 */
export async function getConnectionCountsByProductIds(
  productIds: string[]
): Promise<DbResult<Record<string, number>>> {
  if (productIds.length === 0) {
    return { data: {}, error: null };
  }
  const { data, error } = await supabase
    .from(PPL)
    .select("product_id")
    .in("product_id", productIds);

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []) as { product_id: string }[];
  const map: Record<string, number> = {};
  for (const id of productIds) {
    map[id] = 0;
  }
  for (const r of rows) {
    if (r.product_id && map[r.product_id] !== undefined) {
      map[r.product_id]++;
    }
  }
  return { data: map, error: null };
}
