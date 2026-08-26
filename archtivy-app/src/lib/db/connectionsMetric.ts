/**
 * "N connections mapped" — the hero's one honest claim about the graph.
 *
 * ── WHAT COUNTS AS A CONNECTION ─────────────────────────────────────────────
 * A discovered relationship BETWEEN TWO DISTINCT ENTITIES. Three terms:
 *
 *   A. project ↔ product   project_product_links, both ends live
 *   B. product ↔ product   public product_tags whose PARENT is a product gallery
 *   C. listing ↔ person    listing_team_members with a real profile_id
 *
 * ── WHY B IS NOT "ALL PUBLIC TAGS" ──────────────────────────────────────────
 * This is the double-count the whole formula turns on. Since the tagging repair
 * (lib/db/productTagLinks.ts), every publicly-visible tag on a PROJECT is
 * guaranteed to have a project_product_links row standing behind it — that is
 * the enforced invariant. So counting public tags wholesale would count those
 * pairs twice, once as a link and once as a tag. Measured against production
 * when this was written: 5 live photo_tag links each had a public tag, and all
 * 5 are already inside term A.
 *
 * B therefore counts only tags whose parent listing is a PRODUCT. Those never
 * become project_product_links rows (that table is a project→product edge), so
 * they are additive rather than duplicated. Today that is 0. The term stays in
 * the formula regardless, because a product gallery CAN carry tags and the
 * number would silently be wrong the first time one does.
 *
 * ── WHY OWNERSHIP IS EXCLUDED ───────────────────────────────────────────────
 * listing → owner is 132 more edges and was deliberately left out. Every
 * listing has an author by definition; counting that is counting rows, not
 * mapped relationships. "Connections mapped" should mean something a visitor
 * would recognise as a connection.
 *
 * ── WHY TEXT-ONLY CREDITS ARE EXCLUDED ──────────────────────────────────────
 * A credit naming someone with no profile_id is a string, not an edge between
 * two platform entities. 215 of 241 credits qualify; the other 26 name people
 * and firms that are not on the platform.
 *
 * ── UNROUNDED, ALWAYS ───────────────────────────────────────────────────────
 * The reference mockup said "24,891 connections mapped". The real number is
 * 233. At this scale precision reads as confidence and a rounded number reads
 * as marketing, so this renders exactly what it counts. Same rule the hero
 * statistics rail already follows (see HeroStatPanel: REAL NUMBERS ONLY).
 *
 * ── SCALE NOTE ──────────────────────────────────────────────────────────────
 * The three sets are fetched and intersected in JS rather than pushed into SQL,
 * because PostgREST cannot express "both ends live" as a single counted query
 * without nested inner-join syntax that is harder to read than it is worth at
 * this size. Today that is ~400 rows per rebuild, once an hour. If
 * project_product_links or listing_team_members reaches five figures, move this
 * to a database view or an RPC — do not paginate it here.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { PUBLIC_STATUSES } from "@/lib/db/productTags";

export interface ConnectionsMapped {
  /** The number rendered in the hero. */
  total: number;
  /** Kept so the figure can be explained without re-deriving it. */
  projectProduct: number;
  productGalleryTags: number;
  credits: number;
}

const EMPTY: ConnectionsMapped = {
  total: 0,
  projectProduct: 0,
  productGalleryTags: 0,
  credits: 0,
};

async function fetchConnectionsMapped(): Promise<ConnectionsMapped> {
  try {
    const sup = getSupabaseServiceClient();

    const [listingsRes, linksRes, tagsRes, creditsRes] = await Promise.all([
      sup
        .from("listings")
        .select("id, type")
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("project_product_links").select("project_id, product_id"),
      sup
        .from("product_tags")
        .select("listing_id, tagged_listing_id")
        .in("verification_status", PUBLIC_STATUSES),
      sup.from("listing_team_members").select("listing_id, profile_id").not("profile_id", "is", null),
    ]);

    // A failure in any one term would understate the total silently, which is
    // the one thing this number must never do. Fall back to not rendering.
    if (listingsRes.error || linksRes.error || tagsRes.error || creditsRes.error) {
      console.error(
        "[connectionsMetric] query failed:",
        listingsRes.error?.message ??
          linksRes.error?.message ??
          tagsRes.error?.message ??
          creditsRes.error?.message
      );
      return EMPTY;
    }

    const liveType = new Map<string, string>(
      ((listingsRes.data ?? []) as { id: string; type: string }[]).map((r) => [r.id, r.type])
    );
    const isLive = (id: string | null) => Boolean(id && liveType.has(id));

    // A — project ↔ product, both ends live.
    const links = (linksRes.data ?? []) as { project_id: string; product_id: string }[];
    const projectProduct = links.filter(
      (r) => isLive(r.project_id) && isLive(r.product_id)
    ).length;

    // B — public tags hanging off a PRODUCT gallery. De-duplicated by pair: two
    // pins of the same product in the same gallery are one relationship.
    const tags = (tagsRes.data ?? []) as { listing_id: string; tagged_listing_id: string }[];
    const galleryPairs = new Set(
      tags
        .filter(
          (r) =>
            liveType.get(r.listing_id) === "product" && isLive(r.tagged_listing_id)
        )
        .map((r) => `${r.listing_id}:${r.tagged_listing_id}`)
    );

    // C — credits naming a real profile, on a live listing.
    const credits = ((creditsRes.data ?? []) as { listing_id: string; profile_id: string | null }[])
      .filter((r) => isLive(r.listing_id) && r.profile_id).length;

    return {
      total: projectProduct + galleryPairs.size + credits,
      projectProduct,
      productGalleryTags: galleryPairs.size,
      credits,
    };
  } catch (err) {
    console.error("[connectionsMetric] unexpected failure:", err);
    return EMPTY;
  }
}

/**
 * Cached for an hour, matching the homepage's `revalidate = 3600`, and tagged
 * with the listings domain so the existing admin mutation flow already busts it.
 */
export const getConnectionsMapped = unstable_cache(
  fetchConnectionsMapped,
  ["home:connections-mapped:v1"],
  { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
);
