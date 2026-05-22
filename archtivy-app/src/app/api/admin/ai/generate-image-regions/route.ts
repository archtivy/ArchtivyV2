import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { detectImageRegions } from "@/lib/ai/regions";
import { matchRegionToProducts } from "@/lib/ai/regionMatcher";
import { deleteRegionsForImage, insertRegions, HIGH_MATCH_THRESHOLD } from "@/lib/db/imageRegions";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * POST /api/admin/ai/generate-image-regions
 *
 * Detects product-like objects in a listing image and stores hotspot data.
 * Pipeline: detect regions → match to products → store results.
 *
 * Body: { imageId: string, imageUrl: string, listingType?: "project" | "product" }
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await request.json();
  const { imageId, imageUrl, listingType } = body as {
    imageId?: string;
    imageUrl?: string;
    listingType?: "project" | "product";
  };

  if (!imageId || !imageUrl) {
    return NextResponse.json({ error: "imageId and imageUrl are required" }, { status: 400 });
  }

  // Verify the image exists
  const sup = getSupabaseServiceClient();
  const { data: img, error: imgErr } = await sup
    .from("listing_images")
    .select("id")
    .eq("id", imageId)
    .maybeSingle();

  if (imgErr || !img) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    // Step 1: Detect regions using AI vision
    const detection = await detectImageRegions(imageUrl, listingType);

    if (detection.objects.length === 0) {
      // No objects detected — clear any existing regions
      await deleteRegionsForImage(imageId);
      return NextResponse.json({
        scene_summary: detection.scene_summary,
        regions: 0,
        message: "No product-like objects detected",
      });
    }

    // Step 2: Match each region to products
    const regionRows = [];
    for (let i = 0; i < detection.objects.length; i++) {
      const obj = detection.objects[i];
      const { bestMatch, candidates } = await matchRegionToProducts(obj);

      regionRows.push({
        listing_image_id: imageId,
        region_index: i,
        label: obj.label,
        object_type: obj.object_type,
        keywords: obj.keywords,
        confidence: obj.confidence,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        matched_listing_id: bestMatch?.listing_id ?? null,
        match_score: bestMatch?.score ?? null,
        match_candidates: candidates,
        selected_mode: bestMatch && bestMatch.score >= HIGH_MATCH_THRESHOLD ? "matched" as const : candidates.length > 0 ? "similar" as const : "none" as const,
        scene_summary: i === 0 ? detection.scene_summary : null,
        updated_at: new Date().toISOString(),
      });
    }

    // Step 3: Replace existing regions and insert new ones
    await deleteRegionsForImage(imageId);
    const { count, error } = await insertRegions(regionRows);

    if (error) {
      return NextResponse.json({ error: `Failed to store regions: ${error}` }, { status: 500 });
    }

    return NextResponse.json({
      scene_summary: detection.scene_summary,
      regions: count,
      objects: detection.objects.map((o) => ({
        label: o.label,
        object_type: o.object_type,
        confidence: o.confidence,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-image-regions] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
