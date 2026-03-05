/**
 * photo_matches table access: per-image product match selection for lightbox sidebar.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/* ---------- Types ---------- */

export interface PhotoMatchRow {
  id: string;
  listing_image_id: string;
  product_id: string;
  score: number;
  embedding_score: number | null;
  attribute_score: number | null;
  shared_keyword_count: number;
  is_selected: boolean;
  selected_mode: "manual" | "auto" | null;
  selected_score: number | null;
  selected_at: string | null;
  run_id: string | null;
}

export interface PhotoMatchWithProduct {
  id: string;
  listing_image_id: string;
  product_id: string;
  score: number;
  selected_mode: "manual" | "auto";
  product_title: string | null;
  product_slug: string;
  product_thumbnail: string | null;
  product_owner_name: string | null;
}

export interface PhotoMatchUpsert {
  listing_image_id: string;
  product_id: string;
  score: number;
  embedding_score: number;
  attribute_score: number;
  shared_keyword_count: number;
  is_selected: boolean;
  selected_mode: "manual" | "auto" | null;
  selected_score: number | null;
  selected_at: string | null;
  run_id: string;
}

/* ---------- Queries ---------- */

/**
 * Fetch selected photo matches for a set of image IDs (for lightbox display).
 * Joins with listings + profiles to get product info.
 */
export async function getSelectedPhotoMatchesByImageIds(
  imageIds: string[]
): Promise<{ data: PhotoMatchWithProduct[]; error: string | null }> {
  if (imageIds.length === 0) return { data: [], error: null };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("photo_matches")
    .select("id, listing_image_id, product_id, score, selected_mode")
    .in("listing_image_id", imageIds)
    .eq("is_selected", true)
    .order("score", { ascending: false });

  if (error) return { data: [], error: error.message };
  if (!data || data.length === 0) return { data: [], error: null };

  // Fetch product details
  const productIds = [...new Set(data.map((r) => r.product_id as string))];
  const { data: products } = await supabase
    .from("listings")
    .select("id, title, slug, cover_image_url, owner_profile_id")
    .in("id", productIds)
    .eq("type", "product");

  const productMap = new Map<
    string,
    { title: string | null; slug: string; cover_image_url: string | null; owner_profile_id: string | null }
  >();
  for (const p of (products ?? []) as { id: string; title: string | null; slug: string; cover_image_url: string | null; owner_profile_id: string | null }[]) {
    productMap.set(p.id, p);
  }

  // Fetch brand names
  const profileIds = [
    ...new Set(
      (products ?? [])
        .map((p) => (p as { owner_profile_id: string | null }).owner_profile_id)
        .filter(Boolean) as string[]
    ),
  ];
  const profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) profileMap.set(p.id, p.display_name);
    }
  }

  const results: PhotoMatchWithProduct[] = (data as { id: string; listing_image_id: string; product_id: string; score: number; selected_mode: string }[]).map((r) => {
    const product = productMap.get(r.product_id);
    const ownerName = product?.owner_profile_id
      ? profileMap.get(product.owner_profile_id) ?? null
      : null;
    return {
      id: r.id,
      listing_image_id: r.listing_image_id,
      product_id: r.product_id,
      score: Number(r.score),
      selected_mode: (r.selected_mode ?? "auto") as "manual" | "auto",
      product_title: product?.title ?? null,
      product_slug: product?.slug ?? r.product_id,
      product_thumbnail: product?.cover_image_url ?? null,
      product_owner_name: ownerName,
    };
  });

  return { data: results, error: null };
}

/* ---------- Upserts ---------- */

/**
 * Batch upsert photo matches for a project run.
 * Uses (listing_image_id, product_id) as conflict target.
 */
export async function upsertPhotoMatchesBatch(
  rows: PhotoMatchUpsert[]
): Promise<{ upserted: number; errors: string[] }> {
  if (rows.length === 0) return { upserted: 0, errors: [] };

  const supabase = getSupabaseServiceClient();
  const errors: string[] = [];
  let upserted = 0;

  // Batch in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) => ({
      listing_image_id: r.listing_image_id,
      product_id: r.product_id,
      score: r.score,
      embedding_score: r.embedding_score,
      attribute_score: r.attribute_score,
      shared_keyword_count: r.shared_keyword_count,
      is_selected: r.is_selected,
      selected_mode: r.selected_mode,
      selected_score: r.selected_score,
      selected_at: r.selected_at,
      run_id: r.run_id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("photo_matches")
      .upsert(chunk, { onConflict: "listing_image_id,product_id" });
    if (error) {
      errors.push(error.message);
    } else {
      upserted += chunk.length;
    }
  }

  return { upserted, errors };
}

/**
 * Delete stale photo matches for a project after a run.
 * Deletes rows for the project's images where run_id != current.
 */
export async function deleteStalePhotoMatches(
  imageIds: string[],
  currentRunId: string
): Promise<{ error: string | null }> {
  if (imageIds.length === 0) return { error: null };

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("photo_matches")
    .delete()
    .in("listing_image_id", imageIds)
    .neq("run_id", currentRunId)
    // Preserve manual selections from previous runs
    .neq("selected_mode", "manual");

  return { error: error?.message ?? null };
}

/**
 * Toggle manual selection on a photo match.
 * If enabling manual, sets selected_mode='manual'.
 * If disabling, removes selection entirely.
 */
export async function setPhotoMatchManualSelection(
  photoMatchId: string,
  isSelected: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabaseServiceClient();
  const update: Record<string, unknown> = {
    is_selected: isSelected,
    updated_at: new Date().toISOString(),
  };
  if (isSelected) {
    update.selected_mode = "manual";
    update.selected_at = new Date().toISOString();
  } else {
    update.selected_mode = null;
    update.selected_score = null;
    update.selected_at = null;
  }
  const { error } = await supabase
    .from("photo_matches")
    .update(update)
    .eq("id", photoMatchId);
  return { error: error?.message ?? null };
}

/**
 * Check if any manual selections exist for a given image.
 */
export async function hasManualSelectionsForImage(
  listingImageId: string
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("photo_matches")
    .select("id")
    .eq("listing_image_id", listingImageId)
    .eq("is_selected", true)
    .eq("selected_mode", "manual")
    .limit(1);
  return (data ?? []).length > 0;
}
