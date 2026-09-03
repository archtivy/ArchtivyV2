/**
 * Image Regions — AI-detected product-like objects in listing images.
 * Stored as percentage-based coordinates for responsive rendering.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export interface ImageRegion {
  id: string;
  listing_image_id: string;
  region_index: number;
  label: string;
  object_type: string;
  keywords: string[];
  confidence: number;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  matched_listing_id: string | null;
  match_score: number | null;
  match_candidates: MatchCandidate[];
  selected_mode: "matched" | "similar" | "none";
  scene_summary: string | null;
  created_at: string;
  /**
   * The object's visual signature vector, as a pgvector literal on write.
   *
   * This is the durable asset: it is re-run against the CURRENT product index
   * every time someone clicks, so newly published products appear in old
   * projects without the old photograph ever going back through a vision
   * model. It replaces match_candidates, which froze the answer instead.
   */
  embedding: string | null;
}

export interface MatchCandidate {
  listing_id: string;
  score: number;
  title: string;
  slug: string | null;
  cover: string | null;
  brand: string | null;
  taxonomy_slug_path: string | null;
}

/** Minimum confidence to display a hotspot. Below this, the region is hidden. */
export const MIN_DISPLAY_CONFIDENCE = 0.7;

/** Minimum match score to show "Matched product" instead of just "Similar". */
export const HIGH_MATCH_THRESHOLD = 0.75;

/**
 * Fetch all regions for a set of image IDs.
 * Returns a map: imageId → ImageRegion[]
 */
export async function getRegionsByImageIds(
  imageIds: string[]
): Promise<Map<string, ImageRegion[]>> {
  const map = new Map<string, ImageRegion[]>();
  if (imageIds.length === 0) return map;

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("image_regions")
    .select("*")
    .in("listing_image_id", imageIds)
    .gte("confidence", MIN_DISPLAY_CONFIDENCE)
    .order("region_index", { ascending: true });

  if (error) {
    console.error("[imageRegions] getRegionsByImageIds error:", error.message);
    return map;
  }

  for (const row of (data ?? []) as ImageRegion[]) {
    const arr = map.get(row.listing_image_id);
    if (arr) arr.push(row);
    else map.set(row.listing_image_id, [row]);
  }

  return map;
}

/**
 * Delete all regions for an image (before regeneration).
 */
export async function deleteRegionsForImage(imageId: string): Promise<void> {
  const sup = getSupabaseServiceClient();
  await sup.from("image_regions").delete().eq("listing_image_id", imageId);
}

/**
 * Insert new regions for an image.
 */
export async function insertRegions(
  regions: Omit<ImageRegion, "id" | "created_at">[]
): Promise<{ count: number; error: string | null }> {
  if (regions.length === 0) return { count: 0, error: null };

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("image_regions")
    .insert(regions.map((r) => ({
      listing_image_id: r.listing_image_id,
      region_index: r.region_index,
      label: r.label,
      object_type: r.object_type,
      keywords: r.keywords,
      confidence: r.confidence,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      matched_listing_id: r.matched_listing_id,
      match_score: r.match_score,
      match_candidates: r.match_candidates,
      selected_mode: r.selected_mode,
      scene_summary: r.scene_summary,
      embedding: r.embedding,
    })))
    .select("id");

  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0, error: null };
}
