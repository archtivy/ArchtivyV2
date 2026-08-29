/**
 * Full card models for the product detail page's recommendation rails.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * "Often specified with", "More from {brand}" and the category rail all render
 * ListingCardShared — the one canonical card — but they were handing it a
 * stripped model: title, image and author only. The same component with fewer
 * inputs draws a visibly poorer card than the products directory does, with no
 * category line, no sub-type, no brand logo chip and no relationship badge.
 * That reads as a second card design, which is exactly what the shared card
 * was built to end.
 *
 * The recommendation QUERIES are untouched. They still decide which products
 * appear and in what order; this only resolves the presentation fields the
 * directory already shows, for ids those queries have already chosen.
 *
 * ── FOUR QUERIES FOR THE WHOLE PAGE ─────────────────────────────────────────
 * Call it ONCE with every id the page's rails need and slice the result. The
 * cost is four round trips regardless of how many rails or cards there are:
 * listings, taxonomy nodes, owner profiles, and the batched badge counts.
 * Per-rail or per-card calls would reintroduce the fan-out the shared card and
 * getCardBadgeCounts were written to avoid.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getCardBadgeCounts } from "@/lib/db/cardBadgeCounts";
import { productRowToCardModel } from "@/lib/cards/toListingCardModel";
import type { ListingCardModel } from "@/components/listing/ListingCardShared";

export async function getProductRailCards(
  ids: string[]
): Promise<Map<string, ListingCardModel>> {
  const out = new Map<string, ListingCardModel>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;

  try {
    const sup = getSupabaseServiceClient();

    // Liveness is enforced here as well as in the recommendation queries: this
    // is the last step before render, so a product soft-deleted between the
    // two simply drops out rather than rendering as a dead card.
    const { data: rows } = await sup
      .from("listings")
      .select("id, slug, title, cover_image_url, product_category, owner_profile_id, taxonomy_node_id")
      .in("id", unique)
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    type Row = {
      id: string;
      slug: string | null;
      title: string | null;
      cover_image_url: string | null;
      product_category: string | null;
      owner_profile_id: string | null;
      taxonomy_node_id: string | null;
    };
    const listRows = (rows ?? []) as Row[];
    if (listRows.length === 0) return out;

    const nodeIds = [...new Set(listRows.map((r) => r.taxonomy_node_id).filter(Boolean) as string[])];
    const ownerIds = [...new Set(listRows.map((r) => r.owner_profile_id).filter(Boolean) as string[])];

    const [nodesRes, ownersRes, badges] = await Promise.all([
      nodeIds.length
        ? sup.from("taxonomy_nodes").select("id, label, slug_path").in("id", nodeIds)
        : Promise.resolve({ data: [] as unknown[] }),
      ownerIds.length
        ? sup.from("profiles").select("id, display_name, username, avatar_url").in("id", ownerIds)
        : Promise.resolve({ data: [] as unknown[] }),
      getCardBadgeCounts(listRows.map((r) => r.id), "product"),
    ]);

    const nodes = new Map(
      ((nodesRes.data ?? []) as { id: string; label: string | null; slug_path: string | null }[]).map(
        (n) => [n.id, n]
      )
    );
    const owners = new Map(
      (
        (ownersRes.data ?? []) as {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[]
      ).map((p) => [p.id, p])
    );

    for (const r of listRows) {
      const node = r.taxonomy_node_id ? nodes.get(r.taxonomy_node_id) ?? null : null;
      const prof = r.owner_profile_id ? owners.get(r.owner_profile_id) ?? null : null;
      out.set(
        r.id,
        productRowToCardModel(
          {
            id: r.id,
            slug: r.slug,
            title: r.title,
            cover: r.cover_image_url,
            product_category: r.product_category,
            taxonomy_label: node?.label ?? null,
            taxonomy_slug_path: node?.slug_path ?? null,
            owner: prof
              ? {
                  displayName: prof.display_name ?? "",
                  avatarUrl: prof.avatar_url,
                  profileId: prof.id,
                  username: prof.username,
                }
              : null,
          },
          { badge: badges[r.id] }
        )
      );
    }
  } catch (err) {
    // A rail that cannot resolve its cards renders nothing, which is the same
    // outcome as having no recommendations — never a page-level failure.
    console.error("[productRailCards] failed:", err);
  }

  return out;
}
