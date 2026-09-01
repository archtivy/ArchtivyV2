/**
 * The two numbers under a profile's name: Listings · Connections.
 *
 * The reference mockup shows Projects / Followers / Following — generic social
 * metrics. Following is a fact about the viewer's habits, not about the
 * profile's value, and "Projects" undercounts a brand to zero. These two say
 * what a profile is worth inside a connected archive: how much it has
 * published, and how much of the graph it touches.
 *
 * ── FOLLOWERS IS GONE FROM THE DATA LAYER TOO ───────────────────────────────
 * The rail stopped rendering a follower count, but this module kept computing
 * one: a `followers` field on the type and a count query against `follows` in
 * the fan-out, whose result nothing read. A removed metric that still costs a
 * round trip is a metric waiting to be re-rendered by accident. Both are gone.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export interface ProfileMetrics {
  /** Published, publicly visible listings this profile OWNS. */
  listings: number;
  /** Distinct deduplicated graph edges. See the rule below. */
  connections: number;
}

export const EMPTY_PROFILE_METRICS: ProfileMetrics = {
  listings: 0,
  connections: 0,
};

/**
 * ── LISTINGS ────────────────────────────────────────────────────────────────
 * `listings` rows owned by this profile, of type project OR product, APPROVED
 * and not soft-deleted. One label, one query, and it adapts to the entity by
 * itself: a studio's number is mostly projects, a brand's is mostly products,
 * and a profile that publishes both gets both counted once each.
 *
 * NOT included: listings this profile is merely CREDITED on through
 * listing_team_members. A credit is a relationship, not a publication — the
 * studio that published the building would otherwise share its listing count
 * with every consultant on it. Those credits are counted as CONNECTIONS
 * instead, which is what they are.
 *
 * ── CONNECTIONS ─────────────────────────────────────────────────────────────
 * Distinct edges in the two relationship tables that actually connect one
 * entity to another, collected into a Set of canonical keys so an edge can
 * only ever be counted once:
 *
 *   ppl:{projectId}:{productId}
 *     from project_product_links, where EITHER end is owned by this profile.
 *     A studio that specified a product and the brand that makes it are both
 *     on the same edge and both see it — correctly, since it is one real
 *     relationship for both of them. When one profile happens to own both
 *     ends, the key is identical either way, so it counts once, not twice.
 *
 *   credit:{listingId}:{profileId}
 *     from listing_team_members, in BOTH directions: people credited on this
 *     profile's listings, and listings elsewhere where this profile is itself
 *     credited. Rows with no profile_id are skipped — an unresolved name is
 *     not an edge to anything.
 *
 * ── WHAT IS DELIBERATELY EXCLUDED, AND WHY ──────────────────────────────────
 *   `connections` table   A generic from/to edge store holding ONE row in the
 *                         entire database. Whatever it was meant to become, it
 *                         is not a source of truth today, and its single row
 *                         would risk double-counting an edge already held in
 *                         project_product_links — exactly the legacy-plus-
 *                         canonical double count to avoid.
 *   materials             A material is an ATTRIBUTE of a listing, not a
 *                         relationship between two entities in the graph.
 *                         Counting them would let a well-tagged listing
 *                         outscore a real collaboration, and materials arrive
 *                         through two disjoint systems (product_material_links
 *                         and the material taxonomy), so including them means
 *                         choosing which duplicate to trust.
 *   follows               Not counted at all. An edge to a viewer is not an
 *                         edge in the archive, and the Followers stat itself
 *                         has been removed — see the note at the top.
 *
 * The rule is deterministic: same profile, same inputs, same number, wherever
 * this metric is shown.
 */
export async function getProfileMetrics(profileId: string): Promise<ProfileMetrics> {
  if (!profileId) return EMPTY_PROFILE_METRICS;

  try {
    const sup = getSupabaseServiceClient();

    // Owned, live listing ids — needed for the count AND as one end of the
    // edges below, so it is fetched once and reused.
    const { data: ownedRows } = await sup
      .from("listings")
      .select("id, type")
      .eq("owner_profile_id", profileId)
      .in("type", ["project", "product"])
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    const owned = (ownedRows ?? []) as { id: string; type: string }[];
    const ownedIds = owned.map((r) => r.id);
    const ownedProjectIds = owned.filter((r) => r.type === "project").map((r) => r.id);
    const ownedProductIds = owned.filter((r) => r.type === "product").map((r) => r.id);

    const edges = new Set<string>();

    const [byProject, byProduct, creditsOnMine, creditsOfMine] =
      await Promise.all([
        ownedProjectIds.length
          ? sup
              .from("project_product_links")
              .select("project_id, product_id")
              .in("project_id", ownedProjectIds)
          : Promise.resolve({ data: [] as unknown[] }),
        ownedProductIds.length
          ? sup
              .from("project_product_links")
              .select("project_id, product_id")
              .in("product_id", ownedProductIds)
          : Promise.resolve({ data: [] as unknown[] }),
        ownedIds.length
          ? sup
              .from("listing_team_members")
              .select("listing_id, profile_id")
              .in("listing_id", ownedIds)
              .not("profile_id", "is", null)
          : Promise.resolve({ data: [] as unknown[] }),
        sup
          .from("listing_team_members")
          .select("listing_id, profile_id")
          .eq("profile_id", profileId),
      ]);

    for (const res of [byProject, byProduct]) {
      for (const r of (res.data ?? []) as { project_id: string; product_id: string }[]) {
        if (r.project_id && r.product_id) edges.add(`ppl:${r.project_id}:${r.product_id}`);
      }
    }

    for (const res of [creditsOnMine, creditsOfMine]) {
      for (const r of (res.data ?? []) as { listing_id: string; profile_id: string | null }[]) {
        if (r.listing_id && r.profile_id) edges.add(`credit:${r.listing_id}:${r.profile_id}`);
      }
    }

    return {
      listings: ownedIds.length,
      connections: edges.size,
    };
  } catch (err) {
    console.error("[profileMetrics] failed:", err);
    return EMPTY_PROFILE_METRICS;
  }
}

/**
 * Followers of a profile — the ONE definition.
 *
 * ── WHY IT LIVES HERE AND NOT IN ProfileMetrics ─────────────────────────────
 * The public rail deliberately stopped rendering a follower count (see the
 * note at the top of this file), so `followers` is not a field on
 * ProfileMetrics and must not come back as one. But the signed-in workspace
 * DOES show the owner their own follower number, which is a different question
 * from "what is this profile worth in the archive" — so it is a separate
 * exported function rather than a resurrected field.
 *
 * It exists because the count was written twice, byte-identically, in
 * lib/db/dashboard (loadFollowerCount) and lib/db/workspaceMetrics
 * (countFollowers). Two copies of one query is how the two surfaces eventually
 * disagree; both now call this.
 *
 * `target_type` is deliberately NOT filtered: a profile is followed as either
 * "designer" or "brand" depending on its role at the time, and filtering on
 * today's role would drop followers gained before a role change.
 */
export async function countProfileFollowers(profileId: string): Promise<number> {
  if (!profileId) return 0;
  const { count, error } = await getSupabaseServiceClient()
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("target_id", profileId);
  if (error) {
    console.error(`[profileMetrics] follower count failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}
