import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "listing_images";

/** Blocked image domain; URLs from this domain must not be passed to next/image. */
const BLOCKED_IMAGE_DOMAIN = "archinect.gumlet.io";

/** Returns null for empty or blocked URLs so they are never used as Image src. */
export function sanitizeListingImageUrl(
  url: string | null | undefined
): string | null {
  const u = typeof url === "string" ? url.trim() : "";
  if (!u || u.includes(BLOCKED_IMAGE_DOMAIN)) return null;
  return u;
}

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  alt: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * Add image records for a listing. Assigns sort_order 0, 1, 2, ...
 * alt is set to null; can be extended later for per-image alt text.
 */
export async function addImages(
  listingId: string,
  uploadedUrls: string[]
): Promise<DbResult<number>> {
  if (uploadedUrls.length === 0) {
    return { data: 0, error: null };
  }
  const rows = uploadedUrls.map((image_url, i) => ({
    listing_id: listingId,
    image_url,
    alt: null as string | null,
    sort_order: i,
  }));
  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select("id");

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data?.length ?? 0, error: null };
}

/**
 * Get first image URL per listing (for many listing IDs in one query).
 * Returns a map of listingId -> image_url; listings with no images are omitted.
 */
export async function getFirstImageUrlPerListingIds(
  listingIds: string[]
): Promise<DbResult<Record<string, string>>> {
  if (listingIds.length === 0) {
    return { data: {}, error: null };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select("listing_id, image_url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []) as { listing_id: string; image_url: string; sort_order: number }[];
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (map[row.listing_id] == null) {
      const url = sanitizeListingImageUrl(row.image_url);
      if (url) map[row.listing_id] = url;
    }
  }
  return { data: map, error: null };
}

/**
 * Get all gallery images for a listing, ordered by sort_order.
 */
export async function getImages(
  listingId: string
): Promise<DbResult<ListingImage[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, listing_id, image_url, alt, sort_order, created_at")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []) as ListingImage[];
  const filtered = rows.filter((row) => sanitizeListingImageUrl(row.image_url) != null);
  return { data: filtered, error: null };
}

/** Listing image row for canonical normalizer (no id/created_at needed). */
export type ListingImageRow = {
  listing_id: string;
  image_url: string;
  alt: string | null;
  sort_order: number;
};

/**
 * Get all gallery images for multiple listing IDs in one query, sorted by sort_order.
 * Returns array of rows; group by listing_id in app code.
 */
export async function getImagesByListingIds(
  listingIds: string[]
): Promise<DbResult<ListingImageRow[]>> {
  if (listingIds.length === 0) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select("listing_id, image_url, alt, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []) as ListingImageRow[];
  const filtered = rows.filter((row) => sanitizeListingImageUrl(row.image_url) != null);
  return { data: filtered, error: null };
}

/**
 * Get all gallery images for a single listing with ids (for photo tags, etc.).
 */
export async function getListingImagesWithIds(
  listingId: string
): Promise<
  DbResult<
    { id: string; listing_id: string; image_url: string; alt: string | null; sort_order: number }[]
  >
> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, listing_id, image_url, alt, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) return { data: null, error: error.message };
  const rows = (data ?? []).filter((row: { image_url: string }) => sanitizeListingImageUrl(row.image_url) != null);
  return { data: rows, error: null };
}

/**
 * Delete a single listing image by id.
 */
export async function deleteImage(
  imageId: string
): Promise<DbResult<void>> {
  const { error } = await supabase.from(TABLE).delete().eq("id", imageId);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: undefined, error: null };
}

/**
 * Update sort order for a listing's images. orderedImageIds is the desired order (ids).
 */
export async function updateSortOrder(
  listingId: string,
  orderedImageIds: string[]
): Promise<DbResult<void>> {
  if (orderedImageIds.length === 0) {
    return { data: undefined, error: null };
  }
  const updates = orderedImageIds.map((id, i) => ({ id, sort_order: i }));
  for (const u of updates) {
    const { error } = await supabase
      .from(TABLE)
      .update({ sort_order: u.sort_order })
      .eq("id", u.id)
      .eq("listing_id", listingId);
    if (error) {
      return { data: null, error: error.message };
    }
  }
  return { data: undefined, error: null };
}
