import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Replace a listing's gallery with the submitted set, preserving row ids.
 *
 * ── WHY THIS IS A DIFF AND NOT A DELETE-AND-REINSERT ────────────────────────
 * It used to delete every row and re-insert, on the reasoning that the wizard
 * posts an ordered array with no stable row ids, so a diff would have to
 * reconcile order anyway.
 *
 * That reasoning missed a foreign key. `photo_product_tags.listing_image_id`
 * references listing_images ON DELETE CASCADE, so wiping the rows destroyed
 * every photo product tag on the listing — including tags on images the author
 * had not touched, because a kept image came back with a new row id. Those tags
 * are the hotspots that link a product to the exact place it appears in a
 * photo, they can only be placed by an admin, and re-creating one means
 * re-finding the spot on the image.
 *
 * So rows are matched by image_url, which IS stable: it is the storage path the
 * uploader returned, and the wizard round-trips it untouched. Kept images
 * retain their id (and therefore their tags) while alt, caption and sort_order
 * are updated in place. Only genuinely removed images are deleted, and their
 * tags cascade away correctly — that part was always right.
 *
 * The delete only touches listing_images. Storage objects are intentionally
 * left in place — an image removed here may still be referenced by a cached
 * render or an older revision, and orphan cleanup is a background job's
 * problem, not an interactive save's.
 */
export async function replaceGallery(
  listingId: string,
  images: { url: string; alt?: string; caption?: string }[]
): Promise<string | null> {
  const supabase = getSupabaseServiceClient();

  const { data: existingRows, error: readErr } = await supabase
    .from("listing_images")
    .select("id, image_url")
    .eq("listing_id", listingId);
  if (readErr) return `Failed to read gallery: ${readErr.message}`;

  const existing = (existingRows ?? []) as { id: string; image_url: string }[];
  const submittedUrls = new Set(images.map((i) => i.url));

  // Gone from the submitted set — delete, and let their tags cascade.
  const removedIds = existing.filter((r) => !submittedUrls.has(r.image_url)).map((r) => r.id);
  if (removedIds.length > 0) {
    const { error: delErr } = await supabase
      .from("listing_images")
      .delete()
      .in("id", removedIds);
    if (delErr) return `Failed to update gallery: ${delErr.message}`;
  }

  if (images.length === 0) {
    // No images left: clear the cover too, or the listing keeps rendering a
    // thumbnail whose row no longer exists.
    await supabase.from("listings").update({ cover_image_url: null }).eq("id", listingId);
    return null;
  }

  const idByUrl = new Map(existing.map((r) => [r.image_url, r.id]));

  for (const [i, item] of images.entries()) {
    const row = {
      alt: item.alt?.trim() || null,
      caption: item.caption?.trim() || null,
      sort_order: i,
    };
    const existingId = idByUrl.get(item.url);
    if (existingId) {
      const { error } = await supabase
        .from("listing_images")
        .update(row)
        .eq("id", existingId);
      if (error) return `Failed to save gallery: ${error.message}`;
    } else {
      const { error } = await supabase
        .from("listing_images")
        .insert({ listing_id: listingId, image_url: item.url, ...row });
      if (error) return `Failed to save gallery: ${error.message}`;
    }
  }

  const { error: coverErr } = await supabase
    .from("listings")
    .update({ cover_image_url: images[0].url })
    .eq("id", listingId);
  if (coverErr) return `Failed to set cover image: ${coverErr.message}`;

  return null;
}
