import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processImage } from "@/lib/matches/pipeline";

/**
 * POST /api/admin/ai/generate-image-regions
 *
 * Re-runs the visual precompute for ONE image: signature, embedding, and the
 * clickable object regions with their product candidates. This is the admin
 * workstation's per-image button; the catalogue-wide version is
 * /api/cron/visual-discovery.
 *
 * ── IT NO LONGER HAS ITS OWN PIPELINE ───────────────────────────────────────
 * This route used to own a second implementation: detectImageRegions (gpt-4o,
 * its own prompt, its own object vocabulary) plus matchRegionToProducts (ILIKE
 * over product titles, scored by keyword overlap). Neither shared anything
 * with lib/matches/pipeline, which was looking at the same photographs through
 * a different model with a different prompt and writing a different table.
 * Both are deleted; this calls the one pipeline. The request and response
 * shapes are unchanged so the admin caller keeps working.
 *
 * Body: { imageId: string, imageUrl?: string, listingType?: "project"|"product" }
 * imageUrl and listingType are accepted but no longer trusted — both are read
 * from the image's own row, so a caller cannot point the run at another URL.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { imageId?: string };
  const imageId = body.imageId;
  if (!imageId) {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  const sup = getSupabaseServiceClient();
  const { data: img } = await sup
    .from("listing_images")
    .select("id, image_url, listing_id, listings:listing_id(type)")
    .eq("id", imageId)
    .maybeSingle();

  if (!img) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const row = img as unknown as {
    id: string;
    image_url: string;
    listing_id: string;
    listings: { type: string } | { type: string }[] | null;
  };
  const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
  const listingType = listing?.type;
  if (listingType !== "project" && listingType !== "product") {
    return NextResponse.json({ error: "Image's listing is not a project or product" }, { status: 400 });
  }

  const result = await processImage({
    imageId: row.id,
    source: listingType,
    imageUrl: row.image_url,
    listing_id: row.listing_id,
    listing_type: listingType,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({
    imageId: row.id,
    regions: result.regions ?? 0,
    embedded: result.embedded ?? false,
  });
}
