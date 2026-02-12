/**
 * Read API for matches: getProjectMatches, getProductMatchedProjects, getImageMatches.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { MatchRow } from "@/lib/matches/types";

export type MatchTierFilter = "verified" | "possible" | "all";

export interface GetProjectMatchesOptions {
  projectId: string;
  tier?: MatchTierFilter;
  limit?: number;
  offset?: number;
}

export interface GetProductMatchedProjectsOptions {
  productId: string;
  tier?: MatchTierFilter;
  limit?: number;
  offset?: number;
}

export interface GetImageMatchesOptions {
  imageId: string;
  tier?: MatchTierFilter;
  limit?: number;
}

/** Filter match rows to only those whose project and product still exist. */
async function filterExistingMatches(rows: MatchRow[]): Promise<MatchRow[]> {
  if (rows.length === 0) return rows;
  const sup = getSupabaseServiceClient();
  const projectIds = [...new Set(rows.map((r) => r.project_id))];
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const [projRes, prodRes] = await Promise.all([
    sup.from("listings").select("id").eq("type", "project").in("id", projectIds),
    sup.from("products").select("id").in("id", productIds),
  ]);
  const validProject = new Set((projRes.data ?? []).map((r: { id: string }) => r.id));
  const validProduct = new Set((prodRes.data ?? []).map((r: { id: string }) => r.id));
  return rows.filter((r) => validProject.has(r.project_id) && validProduct.has(r.product_id));
}

/**
 * Get product matches for a project, ordered by score desc. Excludes matches whose product no longer exists.
 */
export async function getProjectMatches(options: GetProjectMatchesOptions): Promise<{
  data: MatchRow[];
  total: number;
}> {
  const { projectId, tier = "all", limit = 50, offset = 0 } = options;
  const sup = getSupabaseServiceClient();
  let q = sup
    .from("matches")
    .select("project_id, product_id, score, tier, reasons, evidence_image_ids, updated_at", { count: "exact" })
    .eq("project_id", projectId)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);
  if (tier !== "all") {
    if (tier === "verified") q = q.in("tier", ["verified", "strong", "likely"]);
    else q = q.eq("tier", tier);
  }
  const { data, error, count } = await q;
  if (error) return { data: [], total: 0 };
  const rows = (data ?? []) as MatchRow[];
  const filtered = await filterExistingMatches(rows);
  return { data: filtered, total: count ?? filtered.length };
}

/**
 * Get projects that match a product (inverse of getProjectMatches), ordered by score desc. Excludes matches whose project no longer exists.
 */
export async function getProductMatchedProjects(options: GetProductMatchedProjectsOptions): Promise<{
  data: MatchRow[];
  total: number;
}> {
  const { productId, tier = "all", limit = 50, offset = 0 } = options;
  const sup = getSupabaseServiceClient();
  let q = sup
    .from("matches")
    .select("project_id, product_id, score, tier, reasons, evidence_image_ids, updated_at", { count: "exact" })
    .eq("product_id", productId)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);
  if (tier !== "all") {
    if (tier === "verified") q = q.in("tier", ["verified", "strong", "likely"]);
    else q = q.eq("tier", tier);
  }
  const { data, error, count } = await q;
  if (error) return { data: [], total: 0 };
  const rows = (data ?? []) as MatchRow[];
  const filtered = await filterExistingMatches(rows);
  return { data: filtered, total: count ?? filtered.length };
}

/**
 * Get matches where the given image (project or product) appears in evidence_image_ids.
 * Returns match rows; tier filter applies. Excludes matches whose project or product no longer exists.
 */
export async function getImageMatches(options: GetImageMatchesOptions): Promise<MatchRow[]> {
  const { imageId, tier = "all", limit = 20 } = options;
  const sup = getSupabaseServiceClient();
  let q = sup
    .from("matches")
    .select("project_id, product_id, score, tier, reasons, evidence_image_ids, updated_at")
    .contains("evidence_image_ids", [imageId])
    .order("score", { ascending: false })
    .limit(limit);
  if (tier !== "all") {
    if (tier === "verified") q = q.in("tier", ["verified", "strong", "likely"]);
    else q = q.eq("tier", tier);
  }
  const { data, error } = await q;
  if (error) return [];
  const rows = (data ?? []) as MatchRow[];
  return filterExistingMatches(rows);
}
