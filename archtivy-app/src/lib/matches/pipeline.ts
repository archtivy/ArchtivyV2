/**
 * AI pipeline: generate alt, embedding (from alt text), attributes for an image and save to image_ai.
 * Trigger when a new listing_image (project) or product_image is created.
 */

import { getImageAltText } from "@/lib/ai/attributes";
import { getImageAttributes } from "@/lib/ai/attributes";
import { getImageEmbedding } from "@/lib/ai/embedding";
import { upsertImageAi } from "@/lib/db/imageAi";
import type { ImageSource } from "@/lib/matches/types";
import { EMBEDDING_DIM } from "@/lib/matches/types";

export interface ProcessImageInput {
  imageId: string;
  source: ImageSource;
  imageUrl: string;
  /** When set, stored in image_ai for project/product lookups. */
  listing_id?: string | null;
  listing_type?: "project" | "product" | null;
  /** When set, called with generated alt so caller can update listing_images.alt (e.g. backfill). */
  onAltGenerated?: (imageId: string, alt: string) => Promise<void>;
}

export interface ProcessImageResult {
  ok: boolean;
  error?: string;
}

/**
 * Generate alt, persist to listing_images.alt, then embedding and attributes and upsert into image_ai.
 * Errors in one image do not throw; they return { ok: false, error } so batch runs can continue.
 */
export async function processImage(input: ProcessImageInput): Promise<ProcessImageResult> {
  const { source, listing_id, listing_type, imageUrl } = input;

  if (listing_id == null || listing_id === "") {
    return { ok: false, error: "image_ai requires listing_id (never null)." };
  }
  if (source === "product" && listing_type !== "product") {
    return { ok: false, error: "Product image_ai requires listing_type='product'." };
  }
  if (source === "project" && listing_type !== "project") {
    return { ok: false, error: "Project image_ai requires listing_type='project'." };
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return { ok: false, error: "processImage requires imageUrl (non-empty string)." };
  }

  try {
    console.log("[processImage] alt+embed+attrs for image_id", input.imageId, "listing_id", listing_id);

    const altResult = await getImageAltText(imageUrl);
    const altForEmbed = (altResult.alt ?? "").trim() || undefined;
    const altToStore = altForEmbed || "Architecture or product image.";

    if (input.onAltGenerated) {
      await input.onAltGenerated(input.imageId, altToStore);
    }
    if (!input.onAltGenerated) {
      const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
      const sup = getSupabaseServiceClient();
      const { error: updateError } = await sup
        .from("listing_images")
        .update({ alt: altToStore })
        .eq("id", input.imageId);
      if (updateError) {
        console.error("[processImage] listing_images.alt update failed:", updateError.message);
        return { ok: false, error: `alt update: ${updateError.message}` };
      }
    }

    const embedResult = await getImageEmbedding(imageUrl, altForEmbed);
    const raw = embedResult.embedding;
    const embedding: number[] =
      Array.isArray(raw) && raw.length === EMBEDDING_DIM
        ? raw
        : Array.from({ length: EMBEDDING_DIM }, () => 0);

    const attrResult = await getImageAttributes(imageUrl);
    const attrs = attrResult.attrs ?? {};
    const confidence = Math.min(100, Math.max(0, attrResult.confidence ?? altResult.confidence ?? 0));

    const { error } = await upsertImageAi({
      image_id: input.imageId,
      source: input.source,
      listing_id: input.listing_id,
      listing_type: input.listing_type,
      embedding,
      attrs,
      confidence,
    });

    if (error) {
      console.error("[processImage] upsertImageAi failed:", error);
      return { ok: false, error };
    }
    console.log("[processImage] image_ai upserted for image_id", input.imageId);
    return { ok: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[processImage] failed for image_id", input.imageId, errMsg);
    return { ok: false, error: errMsg };
  }
}

/**
 * Process all images for a project (listing_id = project_id) and upsert image_ai.
 * Reads from listing_images. Use after project gallery is created or updated.
 */
export async function processProjectImages(projectId: string): Promise<{ processed: number; errors: string[] }> {
  const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
  const sup = getSupabaseServiceClient();
  const { data: rows, error } = await sup
    .from("listing_images")
    .select("id, image_url")
    .eq("listing_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[image_ai] processProjectImages listing_images fetch error:", error.message);
    return { processed: 0, errors: [error.message] };
  }
  const list = (rows ?? []) as { id: string; image_url: string }[];
  console.log("[image_ai] processProjectImages(projectId) found", list.length, "images in listing_images");
  if (list.length === 0) return { processed: 0, errors: [] };
  const errors: string[] = [];
  let processed = 0;
  for (const row of list) {
    const result = await processImage({
      imageId: row.id,
      source: "project",
      imageUrl: row.image_url,
      listing_id: projectId,
      listing_type: "project",
    });
    if (result.ok) processed++;
    else if (result.error) {
      errors.push(`${row.id}: ${result.error}`);
      console.error("[image_ai] project image embedding/upsert error:", row.id, result.error);
    }
  }
  console.log("[image_ai] processProjectImages(projectId) upserted", processed, "image_ai rows, errors:", errors.length);
  return { processed, errors };
}

/**
 * Process all images for a product and upsert image_ai.
 * Reads from listing_images where listing_id = productId (same as projects).
 * Use after product gallery is created or updated.
 */
export async function processProductImages(productId: string): Promise<{ processed: number; errors: string[] }> {
  const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
  const sup = getSupabaseServiceClient();
  const { data: rows, error } = await sup
    .from("listing_images")
    .select("id, image_url")
    .eq("listing_id", productId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[processProductImages] listing_images fetch error:", error.message);
    return { processed: 0, errors: [error.message] };
  }
  const images = (rows ?? []) as { id: string; image_url: string }[];
  console.log("[processProductImages] productId=", productId, "imagesFound=", images.length);

  if (images.length === 0) return { processed: 0, errors: [] };

  const errors: string[] = [];
  let processed = 0;
  for (const image of images) {
    console.log("[processProductImages] processing image", image.id, image.image_url);
    try {
      const result = await processImage({
        imageId: image.id,
        source: "product",
        imageUrl: image.image_url,
        listing_id: productId,
        listing_type: "product",
      });
      console.log("[processProductImages] processImage result for", image.id, result);
      if (result.ok) processed++;
      else if (result.error) {
        errors.push(`${image.id}: ${result.error}`);
      }
    } catch (err) {
      console.error("[processProductImages] processImage FAILED for", image.id, err);
      errors.push(`${image.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("[processProductImages] done. upserted", processed, "image_ai rows, errors:", errors.length);
  return { processed, errors };
}
