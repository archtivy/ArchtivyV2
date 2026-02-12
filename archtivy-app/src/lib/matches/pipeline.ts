/**
 * AI pipeline: generate embedding + attributes for an image and save to image_ai.
 * Trigger when a new listing_image (project) or product_image is created.
 */

import { getImageEmbedding } from "@/lib/ai/embedding";
import { getImageAttributes } from "@/lib/ai/attributes";
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
}

export interface ProcessImageResult {
  ok: boolean;
  error?: string;
}

/**
 * Generate embedding and attributes for one image and upsert into image_ai.
 * Call this after a new project image (listing_images) or product image (listing_images) is created.
 */
export async function processImage(input: ProcessImageInput): Promise<ProcessImageResult> {
  const { source, listing_id, listing_type, imageUrl } = input;
  console.log("[processImage] called with", { source, listing_id, listing_type, imageUrl: imageUrl ?? "(empty)" });

  if (listing_id == null || listing_id === "") {
    const msg = "image_ai requires listing_id (never null).";
    console.error("[processImage] validation FAILED:", msg);
    throw new Error(msg);
  }
  if (source === "product" && listing_type !== "product") {
    const msg = "Product image_ai requires listing_type='product'.";
    console.error("[processImage] validation FAILED:", msg);
    throw new Error(msg);
  }
  if (source === "project" && listing_type !== "project") {
    const msg = "Project image_ai requires listing_type='project'.";
    console.error("[processImage] validation FAILED:", msg);
    throw new Error(msg);
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    const msg = "processImage requires imageUrl (non-empty string).";
    console.error("[processImage] validation FAILED:", msg);
    throw new Error(msg);
  }

  console.log("[processImage] generating embedding for", imageUrl);
  const embedResult = await getImageEmbedding(imageUrl);
  const raw = embedResult.embedding;
  const embedding: number[] =
    Array.isArray(raw) && raw.length === EMBEDDING_DIM
      ? raw
      : Array.from({ length: EMBEDDING_DIM }, () => 0);
  console.log("[processImage] embedding length after generation:", embedding.length);

  const attrResult = await getImageAttributes(imageUrl);
  const attrs = attrResult.attrs ?? {};
  const confidence = Math.min(100, Math.max(0, attrResult.confidence ?? 0));

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
