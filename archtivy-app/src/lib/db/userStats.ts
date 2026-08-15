/**
 * Server-side statistics for the user's listings dashboard.
 *
 * Rules enforced here:
 *  - Only APPROVED + non-deleted listings count.
 *  - Saves are counted live from `listing_saves`, not the denormalized column.
 *  - Connections counted once per pair (each row = one connection).
 *  - Service-role client bypasses RLS for accurate, trustworthy aggregation.
 *  - No client-side (browser) aggregation — runs only in Server Components.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

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
 *   total_saves      — COUNT(*) from listing_saves WHERE listing_id IN (...) — pure SQL COUNT via Supabase head query.
 *   total_connections — COUNT(*) from connections WHERE (requester_id = ? OR addressee_id = ?) AND status = 'ACCEPTED'.
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

  // ── 2. Live save count — SQL COUNT via head query ─────────────────────────
  // No rows are returned; Supabase sends COUNT(*) as the response header.
  // REPOINTED 2026-08-08: was `saved_listings`, which has never existed, so this
  // count was silently 0 for every profile. The real table is `listing_saves`.
  // See DATA_INTEGRITY_LOG.md item 6.
  let totalSaves = 0;
  if (listingIds.length > 0) {
    const { count, error } = await supa
      .from("listing_saves")
      .select("*", { count: "exact", head: true })
      .in("listing_id", listingIds);
    if (error) console.error(`[userStats] save count failed: ${error.code ?? "?"} ${error.message}`);
    totalSaves = count ?? 0;
  }

  // ── 3. Connection count — SQL COUNT, no double-counting ──────────────────
  // Each connections row represents one bilateral connection.
  // We count rows where the user is either party AND status is ACCEPTED.
  const { count: connectionsCount } = await supa
    .from("connections")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
    .eq("status", "ACCEPTED");

  return {
    totalListings,
    totalViews,
    totalSaves,
    totalConnections: connectionsCount ?? 0,
  };
}

/**
 * Fetch live per-listing save counts from the `listing_saves` table.
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

  const { data, error } = await getSupabaseServiceClient()
    .from("listing_saves")
    .select("listing_id")
    .in("listing_id", listingIds);

  if (error) {
    console.error(`[userStats] live save counts failed: ${error.code ?? "?"} ${error.message}`);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { listing_id: string };
    counts[r.listing_id] = (counts[r.listing_id] ?? 0) + 1;
  }
  return counts;
}
