import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getUserListingStats } from "@/lib/db/userStats";
import { countProfileFollowers } from "@/lib/db/profileMetrics";

/**
 * The four headline numbers on the /me workspace dashboard.
 *
 * ── ALL FOUR ARE QUERIED. NONE ARE ESTIMATED. ───────────────────────────────
 * The reference mockup shows Profile Views 12,846 ↑18%, Saves 2,439 ↑11%,
 * Connections 8,731 ↑24% and Engagement 6.2% ↑9%. Two of those metrics have no
 * source in this database at all and none of the four percentages do:
 *
 *   Profile Views   NO SOURCE. There is no profile_views table and no view
 *                   counter on `profiles`. Replaced by Listing Views, which is
 *                   a real column (listings.views_count) and is the number an
 *                   owner actually wants: how often their work was opened.
 *   Engagement      NO SOURCE. It is a ratio of two things we do not both
 *                   measure. Replaced by Followers, a plain count of `follows`
 *                   rows pointing at this profile.
 *   ↑18% etc.       NO HISTORY. views_count is a running counter with no
 *                   per-event rows, so there is nothing to compare a window
 *                   against. `trend` is therefore absent from this type
 *                   entirely rather than present and null — a field that can
 *                   only ever be null invites a renderer to draw "0%".
 *
 * Live platform scale, measured 2026-08-31: 330 total listing views across 135
 * listings (max 109 on one), 12 folder_items, 9 follows. Sparse is the normal
 * case; every consumer of this type must read well at zero.
 */

export interface WorkspaceMetric {
  id: "views" | "saves" | "connections" | "followers";
  label: string;
  value: number;
  /** Shown under the value when the number needs a word to be honest. */
  note?: string;
}

/**
 * @param clerkUserId  Ownership is recorded on listings under BOTH
 *                     owner_clerk_user_id and owner_profile_id, and neither is
 *                     complete on its own, so getUserListingStats dedupes
 *                     across the two. Passing only one silently undercounts.
 */
export async function getWorkspaceMetrics(
  clerkUserId: string,
  profileId: string
): Promise<WorkspaceMetric[]> {
  const [stats, followers] = await Promise.all([
    getUserListingStats(clerkUserId, profileId),
    countProfileFollowers(profileId),
  ]);

  return [
    {
      id: "views",
      label: "Listing Views",
      value: stats.totalViews,
      note: "Across your published work",
    },
    {
      id: "saves",
      label: "Saves",
      value: stats.totalSaves,
      note: "Times others saved your listings",
    },
    {
      id: "connections",
      label: "Connections",
      value: stats.totalConnections,
      note: "Products and people linked to you",
    },
    {
      id: "followers",
      label: "Followers",
      value: followers,
      note: "People following this profile",
    },
  ];
}

/**
 * How many people this owner has credited across their listings.
 *
 * Feeds the "Credit your team" item in Profile Strength. Counts DISTINCT
 * credited profiles, not rows: crediting the same photographer on eight
 * projects is one collaborator, and the checklist item asks whether the owner
 * credits anyone at all.
 *
 * Rows with a null profile_id are counted too — a credited name that has not
 * been matched to a profile is still a credit the owner entered. They are
 * keyed by their listing+name so two unmatched names do not collapse into one.
 */
export async function countTeamCredits(listingIds: string[]): Promise<number> {
  if (listingIds.length === 0) return 0;
  const { data, error } = await getSupabaseServiceClient()
    .from("listing_team_members")
    .select("listing_id, profile_id, display_name")
    .in("listing_id", listingIds);

  if (error) {
    console.error(`[workspaceMetrics] team credit count failed: ${error.message}`);
    return 0;
  }

  const seen = new Set<string>();
  for (const row of (data ?? []) as { listing_id: string; profile_id: string | null; display_name: string | null }[]) {
    seen.add(row.profile_id ? `p:${row.profile_id}` : `n:${row.listing_id}:${row.display_name ?? ""}`);
  }
  return seen.size;
}
