/**
 * Full card models for project rails on the project detail page.
 *
 * The mirror of lib/cards/productRailCards.ts, and for the same reason: the
 * "related projects" rail renders ListingCardShared — the one canonical card —
 * but the detail loader produces a small hand-built shape with only a title,
 * a cover and an architect name. The same component with fewer inputs draws a
 * poorer card than /projects does, with no category line, no location, no
 * year, no studio avatar and no relationship badge, which reads as a second
 * card design.
 *
 * The rail's SELECTION is untouched — this resolves presentation fields for
 * ids the detail loader has already chosen. Five round trips for the whole
 * page regardless of card count: listings, taxonomy nodes, profiles, and the
 * two batched count queries.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getCardBadgeCounts, getCreditCounts } from "@/lib/db/cardBadgeCounts";
import { projectRowToCardModel } from "@/lib/cards/toListingCardModel";
import type { ListingCardModel } from "@/components/listing/ListingCardShared";

export async function getProjectRailCards(
  ids: string[]
): Promise<Map<string, ListingCardModel>> {
  const out = new Map<string, ListingCardModel>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;

  try {
    const sup = getSupabaseServiceClient();

    const { data: rows } = await sup
      .from("listings")
      .select(
        "id, slug, title, cover_image_url, location_city, location_country, year, owner_profile_id, taxonomy_node_id"
      )
      .in("id", unique)
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    type Row = {
      id: string;
      slug: string | null;
      title: string | null;
      cover_image_url: string | null;
      location_city: string | null;
      location_country: string | null;
      year: number | null;
      owner_profile_id: string | null;
      taxonomy_node_id: string | null;
    };
    const listRows = (rows ?? []) as Row[];
    if (listRows.length === 0) return out;

    const nodeIds = [...new Set(listRows.map((r) => r.taxonomy_node_id).filter(Boolean) as string[])];
    const ownerIds = [...new Set(listRows.map((r) => r.owner_profile_id).filter(Boolean) as string[])];
    const rowIds = listRows.map((r) => r.id);

    const [nodesRes, ownersRes, badges, credits] = await Promise.all([
      nodeIds.length
        ? sup.from("taxonomy_nodes").select("id, label, slug_path").in("id", nodeIds)
        : Promise.resolve({ data: [] as unknown[] }),
      ownerIds.length
        ? sup.from("profiles").select("id, display_name, username, avatar_url").in("id", ownerIds)
        : Promise.resolve({ data: [] as unknown[] }),
      getCardBadgeCounts(rowIds, "project"),
      getCreditCounts(rowIds),
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
        projectRowToCardModel(
          {
            id: r.id,
            slug: r.slug,
            title: r.title,
            cover: r.cover_image_url,
            location_city: r.location_city,
            location_country: r.location_country,
            year: r.year,
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
          { badge: badges[r.id], credits: credits[r.id] }
        )
      );
    }
  } catch (err) {
    console.error("[projectRailCards] failed:", err);
  }

  return out;
}
