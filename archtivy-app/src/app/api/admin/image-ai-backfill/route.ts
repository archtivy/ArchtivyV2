/**
 * POST /api/admin/image-ai-backfill
 * Dev-only: backfill image_ai for two specific images to verify the pipeline.
 * Body: { projectImageId, projectImageUrl, productImageId, productImageUrl }
 */
import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processImage } from "@/lib/matches/pipeline";

export async function POST(request: NextRequest) {
  const errors: string[] = [];
  let projectOk = false;
  let productOk = false;
  let projectImageId = "";
  let productImageId = "";

  try {
    const body = await request.json();
    const {
      projectImageId: pid,
      projectImageUrl: projectImageUrl,
      productImageId: prid,
      productImageUrl: productImageUrl,
    } = body;

    if (!pid || !projectImageUrl || !prid || !productImageUrl) {
      return Response.json(
        {
          project: { ok: false, image_id: pid ?? "" },
          product: { ok: false, image_id: prid ?? "" },
          errors: ["Missing required fields: projectImageId, projectImageUrl, productImageId, productImageUrl"],
        },
        { status: 400 }
      );
    }

    projectImageId = String(pid);
    productImageId = String(prid);

    const sup = getSupabaseServiceClient();
    const { data: listingRow, error: listingError } = await sup
      .from("listing_images")
      .select("listing_id")
      .eq("id", projectImageId)
      .maybeSingle();

    if (listingError) {
      errors.push(`listing_images lookup: ${listingError.message}`);
    }
    const listingId = (listingRow as { listing_id: string } | null)?.listing_id ?? null;
    if (!listingId) {
      errors.push(`No listing_images row found for projectImageId ${projectImageId}`);
    }

    const projectResult = await processImage({
      imageId: projectImageId,
      source: "project",
      imageUrl: String(projectImageUrl),
      listing_id: listingId ?? undefined,
      listing_type: "project",
    });
    projectOk = projectResult.ok;
    if (!projectResult.ok && projectResult.error) errors.push(`project: ${projectResult.error}`);

    const productResult = await processImage({
      imageId: productImageId,
      source: "product",
      imageUrl: String(productImageUrl),
      listing_id: null,
      listing_type: "product",
    });
    productOk = productResult.ok;
    if (!productResult.ok && productResult.error) errors.push(`product: ${productResult.error}`);

    return Response.json({
      project: { ok: projectOk, image_id: projectImageId },
      product: { ok: productOk, image_id: productImageId },
      errors,
    });
  } catch (e) {
    console.error("[image-ai-backfill]", e);
    errors.push(String(e));
    return Response.json(
      {
        project: { ok: projectOk, image_id: projectImageId },
        product: { ok: productOk, image_id: productImageId },
        errors,
      },
      { status: 500 }
    );
  }
}
