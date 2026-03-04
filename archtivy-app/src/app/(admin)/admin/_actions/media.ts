"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { appendImages, deleteImage, updateSortOrder } from "@/lib/db/listingImages";
import { uploadGalleryImagesServer } from "@/lib/storage/gallery";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

const GALLERY_BUCKET = "gallery";

async function ensureAdmin(): Promise<{ ok: true; adminUserId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, error: "Profile not found" };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, error: "Forbidden" };
  return { ok: true, adminUserId: userId };
}

/** Extract Supabase Storage path from a public URL (the part after /storage/v1/object/public/gallery/). */
function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${GALLERY_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

function revalidateListingPaths(listingId: string) {
  revalidatePath(`/admin/projects/${listingId}`, "page");
  revalidatePath(`/admin/products/${listingId}`, "page");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidateTag(CACHE_TAGS.listings);
}

// ─── Upload images ──────────────────────────────────────────────────────────

export async function uploadListingImages(formData: FormData) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return { ok: false as const, error: admin.error };

    const listingId = (formData.get("listingId") as string)?.trim();
    if (!listingId) return { ok: false as const, error: "Missing listingId" };

    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { ok: false as const, error: "No files provided" };

    // Reject individual files that are too large (10MB)
    const MAX_SERVER_FILE = 10 * 1024 * 1024;
    for (const f of files) {
      if (f.size > MAX_SERVER_FILE) {
        const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
        return { ok: false as const, error: `"${f.name}" is ${sizeMb}MB — max 10MB per file.` };
      }
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadGalleryImagesServer(listingId, files);
    if (uploadResult.error || !uploadResult.data?.length) {
      return { ok: false as const, error: uploadResult.error ?? "Upload failed" };
    }

    // Insert DB rows with correct sort_order
    const appendResult = await appendImages(listingId, uploadResult.data);
    if (appendResult.error) {
      return { ok: false as const, error: appendResult.error };
    }

    // If these are the first images, set the cover
    const supabase = getSupabaseServiceClient();
    const firstInserted = appendResult.data?.[0];
    if (firstInserted && firstInserted.sort_order === 0) {
      await supabase.from("listings").update({ cover_image_url: firstInserted.image_url }).eq("id", listingId);
    }

    revalidateListingPaths(listingId);
    return { ok: true as const, images: appendResult.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed unexpectedly";
    return { ok: false as const, error: msg };
  }
}

// ─── Delete image ───────────────────────────────────────────────────────────

export async function deleteListingImage(imageId: string, listingId: string) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();

  // Fetch the image row
  const { data: imgRow, error: fetchErr } = await supabase
    .from("listing_images")
    .select("id, image_url, sort_order")
    .eq("id", imageId)
    .single();
  if (fetchErr || !imgRow) return { ok: false as const, error: "Image not found" };

  const row = imgRow as { id: string; image_url: string; sort_order: number };

  // Delete from storage (only if it's a Supabase storage URL)
  const storagePath = extractStoragePath(row.image_url);
  if (storagePath) {
    await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
  }

  // Delete DB row
  const delResult = await deleteImage(imageId);
  if (delResult.error) return { ok: false as const, error: delResult.error };

  // If deleted image was the cover (sort_order 0), update cover to new first image
  if (row.sort_order === 0) {
    const { data: nextImages } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true })
      .limit(1);
    const newCover = (nextImages as { image_url: string }[] | null)?.[0]?.image_url ?? null;
    await supabase.from("listings").update({ cover_image_url: newCover }).eq("id", listingId);
  }

  revalidateListingPaths(listingId);
  return { ok: true as const };
}

// ─── Reorder images ─────────────────────────────────────────────────────────

export async function reorderListingImages(listingId: string, orderedImageIds: string[]) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const reorderResult = await updateSortOrder(listingId, orderedImageIds);
  if (reorderResult.error) return { ok: false as const, error: reorderResult.error };

  // First ID is the new cover
  if (orderedImageIds.length > 0) {
    const supabase = getSupabaseServiceClient();
    const { data: coverRow } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("id", orderedImageIds[0])
      .single();
    if (coverRow) {
      await supabase.from("listings").update({ cover_image_url: (coverRow as { image_url: string }).image_url }).eq("id", listingId);
    }
  }

  revalidateListingPaths(listingId);
  return { ok: true as const };
}

// ─── Set primary image ──────────────────────────────────────────────────────

export async function setPrimaryListingImage(listingId: string, imageId: string) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();

  // Fetch all images for the listing
  const { data: allImages, error: fetchErr } = await supabase
    .from("listing_images")
    .select("id, image_url")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  if (fetchErr || !allImages) return { ok: false as const, error: "Failed to fetch images" };

  const images = allImages as { id: string; image_url: string }[];
  const targetIdx = images.findIndex((img) => img.id === imageId);
  if (targetIdx === -1) return { ok: false as const, error: "Image not found in listing" };

  // Build new order with target first
  const newOrder = [imageId, ...images.filter((img) => img.id !== imageId).map((img) => img.id)];
  const reorderResult = await updateSortOrder(listingId, newOrder);
  if (reorderResult.error) return { ok: false as const, error: reorderResult.error };

  // Update cover
  await supabase.from("listings").update({ cover_image_url: images[targetIdx].image_url }).eq("id", listingId);

  revalidateListingPaths(listingId);
  return { ok: true as const };
}

// ─── Update alt text (generic for any listing) ──────────────────────────────

export async function updateImageAlt(input: {
  imageId: string;
  alt: string | null;
  title?: string | null;
  caption?: string | null;
}) {
  const supabase = getSupabaseServiceClient();
  const alt = toText(input.alt);
  const title = toText(input.title);
  const caption = toText(input.caption);
  const { error } = await supabase
    .from("listing_images")
    .update({
      alt: alt.length ? alt : null,
      title: title.length ? title : null,
      caption: caption.length ? caption : null,
    })
    .eq("id", input.imageId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/media");
  revalidatePath("/admin/seo-quality");
  return { ok: true as const };
}

/** Update listing image alt and revalidate project edit page (for Editorial Image Manager). */
export async function updateImageAltForProject(input: {
  imageId: string;
  alt: string | null;
  projectId: string;
}) {
  const res = await updateImageAlt({ imageId: input.imageId, alt: input.alt });
  if (!res.ok) return res;
  revalidatePath(`/admin/projects/${input.projectId}`, "page");
  return { ok: true as const };
}

/** Update listing image alt, title, and caption for any listing type (projects or products). */
export async function updateImageAltForListing(input: {
  imageId: string;
  alt: string | null;
  title?: string | null;
  caption?: string | null;
  listingId: string;
}) {
  const res = await updateImageAlt({
    imageId: input.imageId,
    alt: input.alt,
    title: input.title,
    caption: input.caption,
  });
  if (!res.ok) return res;
  revalidateListingPaths(input.listingId);
  return { ok: true as const };
}
