/**
 * Badge counts for the shared listing card, batched for a whole grid.
 *
 *   project card → "Used N products from M brands"
 *   product card → "Used in N projects by M studios"
 *
 * ── TWO QUERIES, WHATEVER THE GRID SIZE ─────────────────────────────────────
 * The second half of each badge — the BRAND or STUDIO count — is the reason
 * this module exists. The existing helpers
 * (projectProductLinks.getConnectionCountsByProjectIds / ByProductIds) already
 * batch the first half, but they count edges only; neither can say how many
 * DISTINCT OWNERS sit on the far end. Computing that per card is what would
 * turn a 30-item grid into 60 round trips.
 *
 * So: one query for the edges, one for the far-end owners, then count in
 * memory. Cost is constant in the number of cards, and the shape matches the
 * fan-out getProjectsCanonical already uses for images, profiles, materials and
 * taxonomy — this drops into the same Promise.all rather than adding a stage.
 *
 * ── WHY NOT canonical-models' connectionCount ───────────────────────────────
 * ProjectCanonical already carries a `connectionCount`, and it is the wrong
 * number for this badge. It is computed from the LEGACY jsonb columns
 * (listings.team_members + listings.brands_used, canonical-models.ts ~line 254),
 * not from project_product_links or listing_team_members. Those jsonb columns
 * are the duplicated-credits problem logged separately; a badge built on them
 * would disagree with every relational surface on the site — the detail page
 * rails, Explore, the homepage metric.
 *
 * ── BOTH ENDS MUST BE LIVE ──────────────────────────────────────────────────
 * An edge to a DRAFT or soft-deleted listing is not something a visitor can
 * follow, so it must not inflate a public badge. This is the same APPROVED +
 * deleted_at filter the "used in" rails apply, for the same reason.
 *
 * ── ZERO IS NOT A BADGE ─────────────────────────────────────────────────────
 * Counts of zero are returned as zero and the card renders nothing. Measured
 * when written: only 8 of 53 projects and 15 of 80 products have any link at
 * all, so the empty case is the COMMON case, not an edge case. See the note in
 * ListingCardBadge.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export interface CardBadgeCount {
  /** Linked products (project card) or linked projects (product card). */
  related: number;
  /** Distinct owners on the far end: brands for a project, studios for a product. */
  owners: number;
}

export type CardBadgeCounts = Record<string, CardBadgeCount>;

const EMPTY: CardBadgeCount = { related: 0, owners: 0 };

/**
 * Badge counts for many listings of ONE type.
 *
 * `type` is the type of the CARDS being rendered, not of the far end:
 *   "project" → counts its products and their brands
 *   "product" → counts its projects and their studios
 *
 * Every requested id is present in the result, zero-filled, so a caller can
 * index without a null check and a missing row is never mistaken for a bug.
 *
 * Failures degrade to zeros rather than throwing: a grid must still render if
 * the badge data cannot be read.
 */
export async function getCardBadgeCounts(
  ids: string[],
  type: "project" | "product"
): Promise<CardBadgeCounts> {
  const out: CardBadgeCounts = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (const id of unique) out[id] = { ...EMPTY };
  if (unique.length === 0) return out;

  try {
    const sup = getSupabaseServiceClient();

    // The column holding the cards' ids, and the column holding the far end.
    const selfCol = type === "project" ? "project_id" : "product_id";
    const farCol = type === "project" ? "product_id" : "project_id";
    const farType = type === "project" ? "product" : "project";

    const { data: linkRows, error: linkError } = await sup
      .from("project_product_links")
      .select("project_id, product_id")
      .in(selfCol, unique);
    if (linkError) {
      console.error("[cardBadgeCounts] link query failed:", linkError.code, linkError.message);
      return out;
    }

    const links = (linkRows ?? []) as Record<string, string>[];
    if (links.length === 0) return out;

    const farIds = Array.from(new Set(links.map((r) => r[farCol]).filter(Boolean)));
    const { data: farRows, error: farError } = await sup
      .from("listings")
      .select("id, owner_profile_id")
      .in("id", farIds)
      .eq("type", farType)
      .eq("status", "APPROVED")
      .is("deleted_at", null);
    if (farError) {
      console.error("[cardBadgeCounts] far-end query failed:", farError.code, farError.message);
      return out;
    }

    // Only live far-end rows survive; anything filtered out above is dropped
    // from the counts entirely rather than counted with a null owner.
    const ownerByFarId = new Map<string, string | null>(
      ((farRows ?? []) as { id: string; owner_profile_id: string | null }[]).map((r) => [
        r.id,
        r.owner_profile_id,
      ])
    );

    const relatedBySelf = new Map<string, Set<string>>();
    const ownersBySelf = new Map<string, Set<string>>();

    for (const row of links) {
      const selfId = row[selfCol];
      const farId = row[farCol];
      if (!selfId || !farId) continue;
      if (!ownerByFarId.has(farId)) continue; // far end not live
      if (out[selfId] === undefined) continue; // not one of the requested cards

      const related = relatedBySelf.get(selfId);
      if (related) related.add(farId);
      else relatedBySelf.set(selfId, new Set([farId]));

      // An unowned listing contributes to `related` but not to `owners` — it is
      // a real product in the project, just one with nobody to credit.
      const ownerId = ownerByFarId.get(farId);
      if (!ownerId) continue;
      const owners = ownersBySelf.get(selfId);
      if (owners) owners.add(ownerId);
      else ownersBySelf.set(selfId, new Set([ownerId]));
    }

    for (const id of unique) {
      out[id] = {
        related: relatedBySelf.get(id)?.size ?? 0,
        owners: ownersBySelf.get(id)?.size ?? 0,
      };
    }
    return out;
  } catch (err) {
    console.error("[cardBadgeCounts] unexpected failure:", err);
    return out;
  }
}

/**
 * Credited-people count per listing — the project card's bottom line.
 *
 * Only credits carrying a real profile_id count. A text-only credit names
 * someone who is not on the platform, so it is not a connection to anything;
 * this is the same rule the homepage "connections mapped" metric applies.
 *
 * Batched for the same reason as above. Well populated, unlike the badge above:
 * 46 of 53 live projects have at least one.
 */
export async function getCreditCounts(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (const id of unique) out[id] = 0;
  if (unique.length === 0) return out;

  try {
    const sup = getSupabaseServiceClient();
    const { data, error } = await sup
      .from("listing_team_members")
      .select("listing_id, profile_id")
      .in("listing_id", unique)
      .not("profile_id", "is", null);
    if (error) {
      console.error("[cardBadgeCounts] credit query failed:", error.code, error.message);
      return out;
    }
    // Distinct by profile, so one person credited twice on a listing counts once.
    const seen = new Map<string, Set<string>>();
    for (const r of (data ?? []) as { listing_id: string; profile_id: string | null }[]) {
      if (!r.profile_id || out[r.listing_id] === undefined) continue;
      const set = seen.get(r.listing_id);
      if (set) set.add(r.profile_id);
      else seen.set(r.listing_id, new Set([r.profile_id]));
    }
    for (const id of unique) out[id] = seen.get(id)?.size ?? 0;
    return out;
  } catch (err) {
    console.error("[cardBadgeCounts] unexpected credit failure:", err);
    return out;
  }
}
