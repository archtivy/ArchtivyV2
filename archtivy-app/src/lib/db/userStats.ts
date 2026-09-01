/**
 * Server-side statistics for the user's listings dashboard.
 *
 * Rules enforced here:
 *  - Only APPROVED + non-deleted listings count.
 *  - Saves are counted live from `folder_items`, the platform's one save table.
 *  - Connections are delegated to getProfileMetrics, the one connection rule.
 *  - Service-role client bypasses RLS for accurate, trustworthy aggregation.
 *  - No client-side (browser) aggregation — runs only in Server Components.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileMetrics } from "@/lib/db/profileMetrics";

export interface UserListingStats {
  totalListings: number;
  totalViews: number;
  totalSaves: number;
  totalConnections: number;
}

/**
 * Aggregate dashboard statistics for a user's APPROVED listings.
 *
 * SQL approach:
 *   total_listings   — server-side count of deduplicated IDs after two indexed lookups.
 *   total_views      — SUM of views_count column (fetched as a single narrow column, summed server-side).
 *   total_saves      — COUNT(*) from folder_items WHERE entity_id IN (...) — pure SQL COUNT via Supabase head query.
 *   total_connections — getProfileMetrics(profileId).connections.
 */
export async function getUserListingStats(
  clerkUserId: string,
  profileId: string
): Promise<UserListingStats> {
  const supa = getSupabaseServiceClient();

  // ── 1. Fetch APPROVED listing IDs + views for this user ───────────────────
  // Two indexed lookups (owner_clerk_user_id | owner_profile_id) run in parallel.
  const [byClerkRes, byProfileRes] = await Promise.all([
    supa
      .from("listings")
      .select("id, views_count")
      .eq("owner_clerk_user_id", clerkUserId)
      .eq("status", "APPROVED")
      .is("deleted_at", null),
    supa
      .from("listings")
      .select("id, views_count")
      .eq("owner_profile_id", profileId)
      .eq("status", "APPROVED")
      .is("deleted_at", null),
  ]);

  // Deduplicate across both ownership fields.
  const seen = new Set<string>();
  const listingIds: string[] = [];
  let totalViews = 0;

  for (const row of [
    ...(byClerkRes.data ?? []),
    ...(byProfileRes.data ?? []),
  ]) {
    const r = row as { id: string; views_count: number | null };
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    listingIds.push(r.id);
    totalViews += r.views_count ?? 0;
  }

  const totalListings = listingIds.length;

  // ── 2. Live save count ────────────────────────────────────────────────────
  // THIRD repoint of this one metric: `saved_listings` (never existed) →
  // `listing_saves` (exists, 0 rows, written by nothing) → folder_items, which
  // is what every SaveToggle on the platform actually writes. Both earlier
  // targets returned 0 for every profile, which is why neither was noticed.
  // getLiveSaveCountsByListingIds below reads the same table for the same
  // reason; that is the single definition of a save.
  let totalSaves = 0;
  if (listingIds.length > 0) {
    const { count, error } = await supa
      .from("folder_items")
      .select("*", { count: "exact", head: true })
      .in("entity_id", listingIds);
    if (error) console.error(`[userStats] save count failed: ${error.code ?? "?"} ${error.message}`);
    totalSaves = count ?? 0;
  }

  // ── 3. Connection count ───────────────────────────────────────────────────
  // Delegated to getProfileMetrics, the platform's one definition of a
  // connection (distinct project_product_links + profile-linked credit edges).
  // This used to COUNT the `connections` table, which holds ONE row database-
  // wide and is explicitly rejected as a source of truth in profileMetrics —
  // so the public profile and this dashboard reported different numbers for
  // the same word.
  const { connections } = await getProfileMetrics(profileId);

  return {
    totalListings,
    totalViews,
    totalSaves,
    totalConnections: connections,
  };
}

/**
 * Fetch live per-listing save counts from `folder_items`.
 * Returns listing_id → count map. Runs server-side only.
 *
 * Fetches only the `listing_id` column, then counts occurrences — a single
 * narrow query replaces N individual count queries.
 *
 * REPOINTED 2026-08-08 from `saved_listings` (never existed). The error was
 * previously destructured away entirely, so /me/listings showed "0 saves" for
 * everything with nothing to indicate the query had failed.
 */
export async function getLiveSaveCountsByListingIds(
  listingIds: string[]
): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {};

  /*
   * ── SAVES COME FROM folder_items ────────────────────────────────────────
   * This read `listing_saves`, which holds 0 rows and is written by nothing.
   * The live save mechanism is folder_items — every SaveToggle on the platform
   * writes one row there, keyed (entity_type, entity_id). So this function
   * returned {} for every listing and /me/listings showed "0 saves" beside
   * work that had genuinely been saved.
   *
   * folder_items.entity_id is the listing id and entity_type is
   * project | product, so a listing-id filter alone is unambiguous.
   *
   * Counted per ROW, not per distinct user: two people saving the same listing
   * is two saves, and one person filing it into two boards is two rows. That
   * matches what folder_items means and what the Saved workspace shows.
   */
  const { data, error } = await getSupabaseServiceClient()
    .from("folder_items")
    .select("entity_id")
    .in("entity_id", listingIds);

  if (error) {
    console.error(`[userStats] live save counts failed: ${error.code ?? "?"} ${error.message}`);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { entity_id: string };
    counts[r.entity_id] = (counts[r.entity_id] ?? 0) + 1;
  }
  return counts;
}
