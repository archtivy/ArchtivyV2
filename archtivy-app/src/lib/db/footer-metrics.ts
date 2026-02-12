/**
 * Footer metrics: total connections for the CTA.
 * totalConnections = project_product_links count + connections table count (if exists).
 * Cached (revalidate: 3600) so the footer updates hourly.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const FOOTER_METRICS_REVALIDATE = 3600;

/**
 * Returns total connection count used in the footer CTA.
 * Sums:
 * - project_product_links (project–product links)
 * - connections (from_type, from_id, to_type, to_id) if the table exists
 * Skips any missing table safely.
 */
export async function getTotalConnections(): Promise<number> {
  const sup = getSupabaseServiceClient();
  let total = 0;

  const { count: pplCount, error: pplErr } = await sup
    .from("project_product_links")
    .select("project_id", { count: "exact", head: true });

  if (!pplErr && pplCount != null) {
    total += pplCount;
  }

  const { count: connCount, error: connErr } = await sup
    .from("connections")
    .select("from_id", { count: "exact", head: true });

  if (!connErr && connCount != null) {
    total += connCount;
  }

  return total;
}

const CACHE_KEY = "footer-total-connections";

/** Cached total connections for the footer CTA. Revalidates every hour. */
export const getCachedTotalConnections = unstable_cache(
  getTotalConnections,
  [CACHE_KEY],
  { revalidate: FOOTER_METRICS_REVALIDATE }
);
