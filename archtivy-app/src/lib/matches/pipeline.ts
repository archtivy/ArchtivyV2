/**
 * The per-image precompute: one vision call, one embedding, and — for project
 * photographs — the clickable object regions and their product candidates.
 *
 * ── EVERYTHING EXPENSIVE HAPPENS HERE, NOT WHEN SOMEONE OPENS A LIGHTBOX ────
 * This is the only place in the visual-discovery feature that calls a model.
 * The reader-facing path (lib/discovery/visualDiscovery.ts) does an indexed
 * vector lookup and a few selects. That is the whole cost design: a lightbox
 * open costs database time, and model time is paid once per image, offline,
 * in a batch someone triggered.
 *
 * ── WHAT CHANGED ────────────────────────────────────────────────────────────
 * This used to make three model calls per image — alt, embedding, attributes —
 * and object detection was a fourth, in a different admin route, over the same
 * photograph. It is now one vision call (visualSignature) plus one embedding
 * per vector. Fewer calls, lower cost, and one consistent reading of the image
 * instead of three that could disagree.
 *
 * The embedding is of a VISUAL SIGNATURE, not of the alt sentence and not of a
 * hash of the URL. See the notes in ai/visualSignature.ts and ai/embedding.ts.
 */

import { describeImageVisually } from "@/lib/ai/visualSignature";
import { getSignatureEmbedding } from "@/lib/ai/embedding";
import { upsertImageAi } from "@/lib/db/imageAi";
import { deleteRegionsForImage, insertRegions } from "@/lib/db/imageRegions";
import { findSimilarProducts } from "@/lib/discovery/visualDiscovery";
import type { ImageSource } from "@/lib/matches/types";

export interface ProcessImageInput {
  imageId: string;
  source: ImageSource;
  imageUrl: string;
  listing_id?: string | null;
  listing_type?: "project" | "product" | null;
  /** When set, the caller persists the alt text itself (the backfill counts them). */
  onAltGenerated?: (imageId: string, alt: string) => Promise<void>;
}

export interface ProcessImageResult {
  ok: boolean;
  error?: string;
  /** Regions written. Always 0 for a product photograph. */
  regions?: number;
  /** False when the model produced no usable signature, so nothing was indexed. */
  embedded?: boolean;
}

/** How many suggestions to precompute per detected object. */
const CANDIDATES_PER_REGION = 12;

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
    const kind = listing_type === "product" ? ("product" as const) : ("project" as const);
    const described = await describeImageVisually(imageUrl, kind);

    if (described.error && !described.signature) {
      return { ok: false, error: `vision: ${described.error}` };
    }

    // ── Alt text ───────────────────────────────────────────────────────────
    // Only written when the model actually produced one. The old pipeline
    // stored the placeholder "Architecture or product image." on failure,
    // which is worse for a screen reader than an empty alt and permanently
    // removed the row from the backfill's own "alt is null" queue.
    const alt = described.alt.trim();
    if (alt) {
      if (input.onAltGenerated) {
        await input.onAltGenerated(input.imageId, alt);
      } else {
        const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
        await getSupabaseServiceClient()
          .from("listing_images")
          .update({ alt })
          .eq("id", input.imageId);
      }
    }

    // ── Image-level vector ─────────────────────────────────────────────────
    const embedResult = described.signature
      ? await getSignatureEmbedding(described.signature)
      : { embedding: null as number[] | null, error: "no signature" };

    const { error: upsertError } = await upsertImageAi({
      image_id: input.imageId,
      source: input.source,
      listing_id: input.listing_id,
      listing_type: input.listing_type,
      // null, never a stand-in vector: an unusable row must be visibly
      // unusable rather than quietly ranked against real ones.
      embedding: embedResult.embedding,
      attrs: described.attrs,
      confidence: described.confidence,
    });
    if (upsertError) return { ok: false, error: upsertError };

    // ── Clickable objects (project photographs only) ───────────────────────
    if (kind === "product" || described.objects.length === 0) {
      // A re-run that now finds nothing must clear what a previous run left,
      // or the photograph keeps click targets its own pixels no longer justify.
      if (kind === "project") await deleteRegionsForImage(input.imageId);
      return {
        ok: true,
        regions: 0,
        embedded: embedResult.embedding !== null,
      };
    }

    const rows = [];
    for (let i = 0; i < described.objects.length; i++) {
      const obj = described.objects[i];

      /* The object's own vector is used and thrown away. Storing it would mean
         a `vector(1536)` column on image_regions and a third HNSW index; the
         candidates it produces are what the reader actually needs, and they
         fit the match_candidates column that already exists for them. */
      const objEmbed = obj.signature ? await getSignatureEmbedding(obj.signature) : { embedding: null };

      const candidates = objEmbed.embedding
        ? await findSimilarProducts(objEmbed.embedding, {
            limit: CANDIDATES_PER_REGION,
            excludeListingId: listing_id,
            objectType: obj.object_type,
          })
        : [];

      rows.push({
        listing_image_id: input.imageId,
        region_index: i,
        label: obj.label,
        object_type: obj.object_type,
        keywords: obj.keywords,
        confidence: obj.confidence,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        /*
         * matched_listing_id and match_score stay NULL, always.
         *
         * They exist to record "the AI believes this object IS this product",
         * and nothing in this feature is allowed to make that claim. Whether a
         * confirmed product sits on an object is decided by whether an owner's
         * product_tags pin falls inside this box — read at request time, from
         * the human-entered table, never mirrored into an AI row.
         */
        matched_listing_id: null,
        match_score: null,
        match_candidates: candidates.map((c) => ({
          listing_id: c.id,
          score: 0,
          title: c.title,
          // href is rebuilt from these two on read, so a taxonomy change is
          // picked up without a rebuild.
          slug: c.href.split("/").pop() ?? null,
          cover: c.cover,
          brand: c.brandName,
          taxonomy_slug_path: taxonomyPathFromHref(c.href),
        })),
        selected_mode: candidates.length > 0 ? ("similar" as const) : ("none" as const),
        scene_summary: i === 0 ? described.scene_summary || null : null,
      });
    }

    await deleteRegionsForImage(input.imageId);
    const { count, error: insertError } = await insertRegions(rows);
    if (insertError) return { ok: false, error: `regions: ${insertError}` };

    return { ok: true, regions: count, embedded: embedResult.embedding !== null };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[processImage] failed for image_id", input.imageId, errMsg);
    return { ok: false, error: errMsg };
  }
}

/** "/products/furniture/seating/lounge-chair/eames-lounge" -> "furniture/seating/lounge-chair" */
function taxonomyPathFromHref(href: string): string | null {
  const parts = href.split("/").filter(Boolean); // ["products", ...path, slug]
  if (parts.length <= 2) return null;
  return parts.slice(1, -1).join("/") || null;
}

/** Process every image of a listing. Errors on one image never stop the rest. */
async function processListingImages(
  listingId: string,
  type: "project" | "product"
): Promise<{ processed: number; regions: number; errors: string[] }> {
  const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
  const sup = getSupabaseServiceClient();
  const { data: rows, error } = await sup
    .from("listing_images")
    .select("id, image_url")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) return { processed: 0, regions: 0, errors: [error.message] };

  const errors: string[] = [];
  let processed = 0;
  let regions = 0;
  for (const row of (rows ?? []) as { id: string; image_url: string }[]) {
    const result = await processImage({
      imageId: row.id,
      source: type,
      imageUrl: row.image_url,
      listing_id: listingId,
      listing_type: type,
    });
    if (result.ok) {
      processed++;
      regions += result.regions ?? 0;
    } else if (result.error) {
      errors.push(`${row.id}: ${result.error}`);
    }
  }
  return { processed, regions, errors };
}

export function processProjectImages(projectId: string) {
  return processListingImages(projectId, "project");
}

export function processProductImages(productId: string) {
  return processListingImages(productId, "product");
}
