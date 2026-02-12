import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "photo_product_tags";
const PPL = "project_product_links";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface PhotoProductTag {
  id: string;
  listing_image_id: string;
  product_id: string;
  x: number;
  y: number;
  created_at: string;
}

/** Get all photo product tags for the given listing image ids. */
export async function getPhotoProductTagsByImageIds(
  listingImageIds: string[]
): Promise<DbResult<PhotoProductTag[]>> {
  if (listingImageIds.length === 0) return { data: [], error: null };
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, listing_image_id, product_id, x, y, created_at")
    .in("listing_image_id", listingImageIds)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as PhotoProductTag[], error: null };
}

/**
 * Add a photo product tag and optionally upsert project_product_links with source='photo_tag'.
 * Manual links take priority: if a project_product_links row already exists with source='manual',
 * it is left unchanged (manual > photo_tag).
 * x/y are clamped to 0..1 (normalized).
 */
export async function addPhotoProductTag(
  listingImageId: string,
  listingId: string,
  productId: string,
  x: number,
  y: number
): Promise<DbResult<PhotoProductTag>> {
  const supabase = getSupabaseServiceClient();
  const xNorm = Math.max(0, Math.min(1, Number(x)));
  const yNorm = Math.max(0, Math.min(1, Number(y)));

  const { data: tag, error: tagError } = await supabase
    .from(TABLE)
    .insert({
      listing_image_id: listingImageId,
      product_id: productId,
      x: xNorm,
      y: yNorm,
    })
    .select("id, listing_image_id, product_id, x, y, created_at")
    .single();

  if (tagError) return { data: null, error: tagError.message };

  const { data: existing } = await supabase
    .from(PPL)
    .select("source")
    .eq("project_id", listingId)
    .eq("product_id", productId)
    .maybeSingle();

  if ((existing as { source?: string } | null)?.source === "manual") {
    return { data: tag as PhotoProductTag, error: null };
  }

  await supabase
    .from(PPL)
    .upsert(
      { project_id: listingId, product_id: productId, source: "photo_tag" },
      { onConflict: "project_id,product_id" }
    );

  return { data: tag as PhotoProductTag, error: null };
}

/** Remove a photo product tag by id. Does not remove project_product_links (product may still be linked manually). */
export async function removePhotoProductTag(
  tagId: string
): Promise<DbResult<void>> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", tagId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
