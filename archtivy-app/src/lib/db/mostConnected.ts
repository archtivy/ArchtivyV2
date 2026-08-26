/**
 * "Most Connected" — the Discover section's ranking.
 *
 * ── WHY NOT VIEWS AND SAVES ─────────────────────────────────────────────────
 * The obvious ranking for a Discover rail is popularity, and the reference
 * mockup showed view and save counts on every card. Measured against
 * production before this was written:
 *
 *   listing_views   0 rows          listings.saves_count  0 on ALL 133 listings
 *   listing_saves   0 rows          listings.views_count  non-zero on 31, max 27
 *   bookmarks       0 rows
 *
 * Ranking by those would have put 31 listings with single-digit views above 102
 * tied at zero, with saves contributing nothing at all — a recency list wearing
 * a popularity label, next to a save icon reading 0 on every card. That is the
 * kind of number this codebase has repeatedly refused to render.
 *
 * Connection count is a real signal with real variance, and it is the thing the
 * platform is actually about. The tab is labelled "Most Connected" rather than
 * "Popular" so the label describes the sort.
 *
 * ── WHAT COUNTS ─────────────────────────────────────────────────────────────
 * The same definition the hero metric uses, narrowed to one listing:
 *
 *   project → linked live products + credited profiles
 *   product → linked live projects + credited profiles
 *
 * Both ends must be live, so a listing cannot be ranked up by an edge pointing
 * at something a visitor cannot open.
 *
 * Listings with zero connections are DROPPED, not ranked last. A "Most
 * Connected" rail whose tail is a run of zeroes is advertising the opposite of
 * what it claims; the section renders fewer cards instead.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";

export interface ConnectedListing {
  id: string;
  type: "project" | "product";
  slug: string | null;
  title: string;
  subtitle: string | null;
  location: string | null;
  imageUrl: string | null;
  taxonomySlugPath: string | null;
  connections: number;
}

export interface MostConnected {
  projects: ConnectedListing[];
  products: ConnectedListing[];
}

const EMPTY: MostConnected = { projects: [], products: [] };

async function fetchMostConnected(): Promise<MostConnected> {
  try {
    const sup = getSupabaseServiceClient();

    const [listingsRes, linksRes, creditsRes] = await Promise.all([
      sup
        .from("listings")
        .select(
          "id, type, slug, title, cover_image_url, location_text, owner_profile_id, created_at"
        )
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("project_product_links").select("project_id, product_id"),
      sup.from("listing_team_members").select("listing_id, profile_id").not("profile_id", "is", null),
    ]);
    if (listingsRes.error || linksRes.error || creditsRes.error) {
      console.error(
        "[mostConnected] query failed:",
        listingsRes.error?.message ?? linksRes.error?.message ?? creditsRes.error?.message
      );
      return EMPTY;
    }

    type Row = {
      id: string;
      type: string;
      slug: string | null;
      title: string | null;
      cover_image_url: string | null;
      location_text: string | null;
      owner_profile_id: string | null;
      created_at: string | null;
    };
    const rows = (listingsRes.data ?? []) as Row[];
    const byId = new Map(rows.map((r) => [r.id, r]));

    const counts = new Map<string, number>();
    const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

    for (const l of (linksRes.data ?? []) as { project_id: string; product_id: string }[]) {
      // Both ends live, and typed as expected, or the edge is not a connection
      // anyone can follow.
      if (byId.get(l.project_id)?.type !== "project") continue;
      if (byId.get(l.product_id)?.type !== "product") continue;
      bump(l.project_id);
      bump(l.product_id);
    }
    for (const c of (creditsRes.data ?? []) as { listing_id: string; profile_id: string | null }[]) {
      if (c.profile_id && byId.has(c.listing_id)) bump(c.listing_id);
    }

    // Owner display names, for the card subtitle.
    const ownerIds = [
      ...new Set(rows.map((r) => r.owner_profile_id).filter((v): v is string => Boolean(v))),
    ];
    const { data: profileRows } = ownerIds.length
      ? await sup.from("profiles").select("id, display_name, username").in("id", ownerIds)
      : { data: [] };
    const owners = new Map(
      ((profileRows ?? []) as { id: string; display_name: string | null; username: string | null }[]).map(
        (p) => [p.id, p.display_name ?? p.username]
      )
    );

    // Taxonomy paths drive canonical URLs. Resolved with the shared helper the
    // detail rails already use, rather than a second hand-rolled join that
    // could disagree with it. A miss is fine — getListingUrl falls back to the
    // flat /projects/{slug} form. Only ranked ids are resolved, not all 133.
    const rankedIds = rows.filter((r) => (counts.get(r.id) ?? 0) > 0).map((r) => r.id);
    const taxBy = await batchResolveTaxonomySlugPaths(rankedIds);

    const shape = (r: Row): ConnectedListing => ({
      id: r.id,
      type: r.type === "product" ? "product" : "project",
      slug: r.slug,
      title: r.title ?? "Untitled",
      subtitle: r.owner_profile_id ? owners.get(r.owner_profile_id) ?? null : null,
      location: r.location_text,
      imageUrl: r.cover_image_url,
      taxonomySlugPath: taxBy.get(r.id) ?? null,
      connections: counts.get(r.id) ?? 0,
    });

    // Ties broken by recency, so the order is deterministic rather than
    // dependent on row order coming back from PostgREST.
    const rank = (type: "project" | "product") =>
      rows
        .filter((r) => r.type === type && (counts.get(r.id) ?? 0) > 0)
        .map(shape)
        .sort(
          (a, b) =>
            b.connections - a.connections ||
            (byId.get(b.id)?.created_at ?? "").localeCompare(byId.get(a.id)?.created_at ?? "")
        )
        .slice(0, 12);

    return { projects: rank("project"), products: rank("product") };
  } catch (err) {
    console.error("[mostConnected] unexpected failure:", err);
    return EMPTY;
  }
}

export const getMostConnected = unstable_cache(fetchMostConnected, ["home:most-connected:v1"], {
  tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles],
  revalidate: 3600,
});
