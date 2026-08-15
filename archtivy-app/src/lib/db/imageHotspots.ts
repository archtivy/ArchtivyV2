import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { PUBLIC_STATUSES } from "@/lib/db/productTags";

/**
 * Public product pins for a listing's images.
 *
 * Shared by Project Detail and Product Detail so there is one definition of
 * "which pins are public" rather than two that can drift.
 *
 * ── FILTERED TO verified/official, MATCHING RLS EXACTLY ─────────────────────
 * The read goes through the service-role client, which BYPASSES row-level
 * security — so the RLS policy on product_tags is not doing any filtering here.
 * PUBLIC_STATUSES is imported from the same constant the policy was written
 * from, so the two cannot disagree: if the policy widens, this widens with it.
 * Reading with the service client and forgetting this filter would publish
 * every unverified AI guess as though the owner had confirmed it — which is the
 * one outcome the whole verification workflow exists to prevent.
 *
 * Today that means 1 visible pin of 7: six migrated placeholders sit at
 * `unverified` awaiting owner confirmation (migration 20260810).
 *
 * FAILS SOFT: a missing table or a query error yields no hotspots rather than
 * breaking the detail page. Pins are an enhancement to a gallery, never the
 * reason the page exists.
 */

export interface ImageHotspot {
  id: string;
  /** 0–100, as stored. Never pixels. */
  xPercent: number;
  yPercent: number;
  productTitle: string;
  productHref: string;
  productCover: string | null;
  brandName: string | null;
}

/** listing_image_id -> hotspots on that image. */
export type HotspotsByImage = Record<string, ImageHotspot[]>;

const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

export async function getHotspotsForListing(listingId: string): Promise<HotspotsByImage> {
  const sup = getSupabaseServiceClient();

  const { data: tagRows, error } = await sup
    .from("product_tags")
    .select("id, listing_image_id, tagged_listing_id, x_percent, y_percent")
    .eq("listing_id", listingId)
    .in("verification_status", PUBLIC_STATUSES);

  if (error) {
    if (!MISSING_TABLE.has(error.code ?? "")) {
      console.error("[hotspots] query failed:", error.code, error.message);
    }
    return {};
  }

  const tags = (tagRows ?? []) as {
    id: string;
    listing_image_id: string;
    tagged_listing_id: string;
    x_percent: string | number;
    y_percent: string | number;
  }[];
  if (tags.length === 0) return {};

  // Hydrate the tagged products in one round trip, not one per pin.
  const productIds = [...new Set(tags.map((t) => t.tagged_listing_id))];
  const { data: prodRows } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url, owner_profile_id")
    .in("id", productIds)
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  const products = new Map(
    ((prodRows ?? []) as {
      id: string;
      slug: string | null;
      title: string;
      cover_image_url: string | null;
      owner_profile_id: string | null;
    }[]).map((p) => [p.id, p])
  );

  const ownerIds = [
    ...new Set(
      [...products.values()].map((p) => p.owner_profile_id).filter((v): v is string => Boolean(v))
    ),
  ];
  const brands = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profileRows } = await sup
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    for (const p of (profileRows ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) brands.set(p.id, p.display_name);
    }
  }

  const out: HotspotsByImage = {};
  for (const t of tags) {
    const product = products.get(t.tagged_listing_id);
    // A pin whose product was unpublished or deleted is dropped, not rendered
    // as a dead marker pointing at a 404.
    if (!product) continue;
    const hotspot: ImageHotspot = {
      id: t.id,
      xPercent: Number(t.x_percent),
      yPercent: Number(t.y_percent),
      productTitle: product.title,
      productHref: `/products/${product.slug ?? product.id}`,
      productCover: product.cover_image_url,
      brandName: product.owner_profile_id ? brands.get(product.owner_profile_id) ?? null : null,
    };
    (out[t.listing_image_id] ||= []).push(hotspot);
  }

  return out;
}
