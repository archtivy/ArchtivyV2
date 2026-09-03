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
 *
 * ── WHAT IS STORED, AND WHY IT IS A VECTOR AND NOT AN ANSWER ────────────────
 * For every image: one signature vector on image_ai, plus the source_url and
 * pipeline version that say what was analysed and by which pipeline.
 * For a project photograph, additionally: one row per detected object, each
 * carrying its own bounding box and its own signature vector.
 *
 * The object row stores a VECTOR, not a product list. An earlier version
 * stored the list — the products nearest that object on the day it was
 * analysed — and that list can only ever get more wrong: a product published
 * next week cannot appear in it, and refreshing it would mean paying a vision
 * model again to re-read a photograph that has not changed. Storing the query
 * instead of the answer means a click runs against the catalogue as it stands
 * at that moment. New products become discoverable in old projects the instant
 * their own embedding lands, and no old image is ever re-analysed for it.
 */

import { describeImageVisually } from "@/lib/ai/visualSignature";
import { getSignatureEmbedding } from "@/lib/ai/embedding";
import { upsertImageAi, toVectorLiteral } from "@/lib/db/imageAi";
import { deleteRegionsForImage, insertRegions } from "@/lib/db/imageRegions";
import { PIPELINE_VERSION } from "@/lib/discovery/lifecycle";
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
      /*
       * Record the failure rather than leaving no trace.
       *
       * Without this row the image looks "never processed" forever, so every
       * run picks it up again and every run pays for the same unreadable file.
       * With it, the attempt is counted and abandoned after MAX_ATTEMPTS —
       * and a later fix can clear the status to try again.
       */
      await recordFailure(input, `vision: ${described.error}`);
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
      /* What was analysed and by which pipeline. Together these are the whole
         basis for never paying twice for the same photograph — see
         lib/discovery/lifecycle.ts. */
      source_url: imageUrl,
      pipeline_version: PIPELINE_VERSION,
      status: embedResult.embedding ? "ok" : "failed",
      error: embedResult.embedding ? null : embedResult.error ?? "no embedding",
      attempts: 0,
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

      /*
       * The object's own vector is STORED, not spent.
       *
       * This is the difference between discovery that ages and discovery that
       * does not. Keeping the vector means a click can search the catalogue as
       * it stands at that moment; keeping a product list instead would freeze
       * the answer at analysis time and leave every later product invisible to
       * every earlier project.
       */
      const objEmbed = obj.signature
        ? await getSignatureEmbedding(obj.signature)
        : { embedding: null as number[] | null };

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
        /* Superseded by `embedding`, and written empty so no stale list can be
           mistaken for a current one. See the migration's column comment. */
        match_candidates: [],
        embedding: objEmbed.embedding ? toVectorLiteral(objEmbed.embedding) : null,
        selected_mode: "none" as const,
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
    await recordFailure(input, errMsg);
    return { ok: false, error: errMsg };
  }
}

/**
 * Mark an attempt as failed and count it.
 *
 * Deliberately does NOT clear an embedding that is already there: a run that
 * fails on an image with a good vector should leave discovery working, not
 * blank it out because today's attempt went wrong.
 */
async function recordFailure(input: ProcessImageInput, message: string): Promise<void> {
  try {
    const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
    const sup = getSupabaseServiceClient();
    const { data: existing } = await sup
      .from("image_ai")
      .select("attempts")
      .eq("image_id", input.imageId)
      .eq("source", input.source)
      .maybeSingle();

    const attempts = Number((existing as { attempts?: number } | null)?.attempts ?? 0) + 1;

    if (existing) {
      await sup
        .from("image_ai")
        .update({ status: "failed", error: message.slice(0, 500), attempts })
        .eq("image_id", input.imageId)
        .eq("source", input.source);
      return;
    }

    await sup.from("image_ai").insert({
      image_id: input.imageId,
      source: input.source,
      listing_id: input.listing_id,
      listing_type: input.listing_type,
      embedding: null,
      attrs: {},
      confidence: 0,
      source_url: input.imageUrl,
      pipeline_version: PIPELINE_VERSION,
      status: "failed",
      error: message.slice(0, 500),
      attempts,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // Recording a failure must never become a second failure.
    console.error("[processImage] could not record failure:", e);
  }
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
