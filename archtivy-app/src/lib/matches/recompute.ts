/**
 * Central match recomputation orchestrator.
 *
 * Every listing mutation (create, update, delete, gallery change) should call
 * `enqueueMatchRecomputation()` instead of directly invoking engine functions.
 *
 * This module:
 *  1. Determines what processing is needed based on the trigger event
 *  2. Runs image AI pipeline + match computation
 *  3. Invalidates all affected caches AFTER matches are computed
 *
 * All work runs fire-and-forget so the user-facing response is never blocked.
 * Errors are logged but never propagated to the caller.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ── Trigger types ────────────────────────────────────────────────────────────

export type MatchTrigger =
  | { event: "project_created"; listingId: string }
  | { event: "project_updated"; listingId: string }
  | { event: "product_created"; listingId: string }
  | { event: "product_updated"; listingId: string }
  | { event: "project_deleted"; listingId: string }
  | { event: "product_deleted"; listingId: string }
  | { event: "gallery_changed"; listingId: string; listingType: "project" | "product" }
  | { event: "image_metadata_changed"; listingId: string; listingType: "project" | "product" };

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire-and-forget match recomputation. Call after any listing mutation.
 * Runs image processing, match computation, then cache invalidation.
 */
export function enqueueMatchRecomputation(trigger: MatchTrigger): void {
  runMatchJob(trigger).catch((err) =>
    console.error(`[match-recompute] ${trigger.event} id=${trigger.listingId} error:`, err)
  );
}

// ── Internal job runner ──────────────────────────────────────────────────────

async function runMatchJob(trigger: MatchTrigger): Promise<void> {
  const start = Date.now();
  const tag = `[match-recompute] ${trigger.event} id=${trigger.listingId}`;

  try {
    switch (trigger.event) {
      // ── Project events ──────────────────────────────────────────────────
      case "project_created": {
        // Process new project images → compute matches against all products
        const { processProjectImages } = await import("./pipeline");
        const { computeAndUpsertMatchesForProject } = await import("./engine");
        const pipeline = await processProjectImages(trigger.listingId);
        console.log(`${tag} pipeline: processed=${pipeline.processed} errors=${pipeline.errors.length}`);
        const matches = await computeAndUpsertMatchesForProject(trigger.listingId);
        console.log(`${tag} matches: upserted=${matches.upserted} errors=${matches.errors.length}`);
        break;
      }

      case "project_updated": {
        // Re-evaluate matches using existing embeddings + updated text/metadata
        const { computeAndUpsertMatchesForProject } = await import("./engine");
        const matches = await computeAndUpsertMatchesForProject(trigger.listingId);
        console.log(`${tag} matches: upserted=${matches.upserted} errors=${matches.errors.length}`);
        break;
      }

      case "project_deleted": {
        // Matches table uses project_id — rows will become orphaned.
        // Clean up matches for this project.
        const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
        const supabase = getSupabaseServiceClient();
        await supabase.from("matches").delete().eq("project_id", trigger.listingId);
        await supabase.from("photo_matches").delete().in(
          "photo_id",
          (await supabase
            .from("listing_images")
            .select("id")
            .eq("listing_id", trigger.listingId)
          ).data?.map((r: { id: string }) => r.id) ?? []
        );
        console.log(`${tag} cleaned up orphaned matches`);
        break;
      }

      // ── Product events ──────────────────────────────────────────────────
      case "product_created": {
        // Process product images → recompute ALL projects (new product = new candidates)
        const { processProductImages } = await import("./pipeline");
        const { computeAndUpsertAllMatches, recomputeAllKeywordPhotoMatches } = await import("./engine");
        const pipeline = await processProductImages(trigger.listingId);
        console.log(`${tag} pipeline: processed=${pipeline.processed} errors=${pipeline.errors.length}`);
        const matches = await computeAndUpsertAllMatches();
        console.log(`${tag} all-project matches: projects=${matches.projectsProcessed} upserted=${matches.totalUpserted} errors=${matches.errors.length}`);
        await recomputeAllKeywordPhotoMatches();
        console.log(`${tag} keyword photo matches recomputed`);
        break;
      }

      case "product_updated": {
        // Product metadata changed — recompute keyword matches (text-based, fast)
        // Also recompute embedding matches since product attributes may have changed
        const { recomputeAllKeywordPhotoMatches } = await import("./engine");
        await recomputeAllKeywordPhotoMatches();
        console.log(`${tag} keyword photo matches recomputed`);
        break;
      }

      case "product_deleted": {
        // Product removed — recompute keyword matches to clear stale references
        const { recomputeAllKeywordPhotoMatches } = await import("./engine");
        await recomputeAllKeywordPhotoMatches();
        console.log(`${tag} keyword photo matches recomputed after deletion`);
        break;
      }

      // ── Gallery events ──────────────────────────────────────────────────
      case "gallery_changed": {
        if (trigger.listingType === "project") {
          const { processProjectImages } = await import("./pipeline");
          const { computeAndUpsertMatchesForProject } = await import("./engine");
          await processProjectImages(trigger.listingId);
          await computeAndUpsertMatchesForProject(trigger.listingId);
          console.log(`${tag} project gallery: pipeline + matches done`);
        } else {
          const { processProductImages } = await import("./pipeline");
          const { computeAndUpsertAllMatches, recomputeAllKeywordPhotoMatches } = await import("./engine");
          await processProductImages(trigger.listingId);
          await computeAndUpsertAllMatches();
          await recomputeAllKeywordPhotoMatches();
          console.log(`${tag} product gallery: pipeline + all matches done`);
        }
        break;
      }

      // ── Image metadata events ───────────────────────────────────────────
      case "image_metadata_changed": {
        if (trigger.listingType === "project") {
          // Alt text / caption changed on a project image — recompute keyword matches
          const { computeKeywordPhotoMatches } = await import("./engine");
          await computeKeywordPhotoMatches(trigger.listingId);
          console.log(`${tag} project image metadata: keyword matches recomputed`);
        }
        // Product image metadata changes don't affect matching (products are the target, not source)
        break;
      }
    }
  } catch (err) {
    console.error(`${tag} job failed:`, err);
  }

  // ── Cache invalidation (runs regardless of match success) ──────────────
  await invalidateAfterMatchJob(trigger);

  console.log(`${tag} completed in ${Date.now() - start}ms`);
}

// ── Post-match cache invalidation ────────────────────────────────────────────

/**
 * Invalidate all caches that may show stale relationship/match data.
 * Called AFTER match computation completes so re-cached pages get fresh data.
 */
async function invalidateAfterMatchJob(trigger: MatchTrigger): Promise<void> {
  // Domain-level tags: bust all listing and match caches
  revalidateTag(CACHE_TAGS.listings);
  revalidateTag(CACHE_TAGS.matches);
  revalidateTag(CACHE_TAGS.explore);

  // Invalidate the specific listing's detail page
  try {
    const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
    const supabase = getSupabaseServiceClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("slug, type")
      .eq("id", trigger.listingId)
      .single();

    if (listing?.slug) {
      const prefix = listing.type === "project" ? "projects" : "products";
      revalidatePath(`/${prefix}/${listing.slug}`, "page");
      revalidateTag(`${listing.type === "project" ? "project" : "product"}:${listing.slug}`);
    }
  } catch {
    // Non-fatal: listing may have been deleted
  }

  // For product events that affect ALL projects, do a broad invalidation
  const isProductWide =
    trigger.event === "product_created" ||
    trigger.event === "product_updated" ||
    trigger.event === "product_deleted" ||
    (trigger.event === "gallery_changed" && trigger.listingType === "product");

  if (isProductWide) {
    revalidatePath("/", "layout");
    revalidatePath("/explore/projects");
    revalidatePath("/explore/products");
  }
}
