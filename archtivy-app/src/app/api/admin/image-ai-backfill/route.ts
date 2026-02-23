/**
 * POST /api/admin/image-ai-backfill
 * Admin-only. Backfill alt text and image_ai for listing_images where alt is null or empty.
 * Batches of 10; MAX_IMAGES_PER_RUN (env or 200); skips listings with too many images.
 * Returns: processed, updatedAlt, upsertedImageAi, skippedListings, errors (cap 20).
 */
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processImage } from "@/lib/matches/pipeline";

const BATCH_SIZE = 10;
const MAX_ERRORS_RETURNED = 20;
const DEFAULT_MAX_IMAGES_PER_RUN = 200;
const MAX_IMAGES_PER_LISTING = 100;

async function ensureAdmin(): Promise<
  { ok: true } | { ok: false; status: number; body: { error: string } }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, body: { error: "Unauthorized" } };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, status: 403, body: { error: "Forbidden" } };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, status: 403, body: { error: "Forbidden" } };
  return { ok: true };
}

type ListingType = "project" | "product";

interface ImageRow {
  id: string;
  listing_id: string;
  image_url: string;
}

export async function POST(_request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return Response.json(admin.body, { status: admin.status });
  }

  const errors: string[] = [];
  const skippedListings: string[] = [];
  let processed = 0;
  let updatedAlt = 0;
  let upsertedImageAi = 0;

  const maxImagesPerRun =
    typeof process.env.MAX_IMAGES_PER_RUN !== "undefined"
      ? Math.max(1, parseInt(process.env.MAX_IMAGES_PER_RUN, 10) || DEFAULT_MAX_IMAGES_PER_RUN)
      : DEFAULT_MAX_IMAGES_PER_RUN;

  try {
    const sup = getSupabaseServiceClient();

    const { data: nullRows } = await sup
      .from("listing_images")
      .select("id, listing_id, image_url")
      .is("alt", null);
    const { data: emptyRows } = await sup
      .from("listing_images")
      .select("id, listing_id, image_url")
      .eq("alt", "");

    const byId = new Map<string, ImageRow>();
    for (const r of (nullRows ?? []) as ImageRow[]) {
      if (r?.id && r?.listing_id && r?.image_url) byId.set(r.id, r);
    }
    for (const r of (emptyRows ?? []) as ImageRow[]) {
      if (r?.id && r?.listing_id && r?.image_url) byId.set(r.id, r);
    }
    let images = Array.from(byId.values());

    if (images.length === 0) {
      return Response.json({
        processed: 0,
        updatedAlt: 0,
        upsertedImageAi: 0,
        skippedListings: [],
        errors: [],
        message: "No listing_images with null or empty alt.",
      });
    }

    const listingIds = [...new Set(images.map((i) => i.listing_id))];
    const { data: listingRows } = await sup
      .from("listings")
      .select("id, type")
      .in("id", listingIds);
    const listingTypeMap = new Map<string, ListingType>();
    for (const row of (listingRows ?? []) as { id: string; type: string }[]) {
      if (row.type === "project" || row.type === "product") {
        listingTypeMap.set(row.id, row.type as ListingType);
      }
    }

    const countByListing = new Map<string, number>();
    for (const img of images) {
      countByListing.set(img.listing_id, (countByListing.get(img.listing_id) ?? 0) + 1);
    }
    for (const [listingId, count] of countByListing) {
      if (count > MAX_IMAGES_PER_LISTING) {
        skippedListings.push(listingId);
        images = images.filter((i) => i.listing_id !== listingId);
      }
    }
    if (skippedListings.length > 0) {
      console.warn("[image-ai-backfill] skipped listings (over limit):", skippedListings);
    }

    const totalEligible = images.length;
    images = images.slice(0, maxImagesPerRun);
    if (totalEligible > maxImagesPerRun) {
      console.log("[image-ai-backfill] capped at", maxImagesPerRun, "images this run (eligible:", totalEligible, ")");
    }

    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      const batch = images.slice(i, i + BATCH_SIZE);
      for (const row of batch) {
        const listingType = listingTypeMap.get(row.listing_id);
        if (!listingType) {
          if (errors.length < MAX_ERRORS_RETURNED) {
            errors.push(`listing_id ${row.listing_id} not found or not project/product`);
          }
          continue;
        }

        const onAltGenerated = async (imageId: string, alt: string) => {
          await sup.from("listing_images").update({ alt }).eq("id", imageId);
          updatedAlt++;
        };

        const result = await processImage({
          imageId: row.id,
          source: listingType,
          imageUrl: row.image_url,
          listing_id: row.listing_id,
          listing_type: listingType,
          onAltGenerated,
        });

        processed++;
        if (result.ok) upsertedImageAi++;
        else if (result.error && errors.length < MAX_ERRORS_RETURNED) {
          errors.push(`${row.id}: ${result.error}`);
        }
      }
    }

    console.log("[image-ai-backfill] done:", { processed, updatedAlt, upsertedImageAi, skippedListings: skippedListings.length, errors: errors.length });

    return Response.json({
      processed,
      updatedAlt,
      upsertedImageAi,
      skippedListings,
      errors: errors.slice(0, MAX_ERRORS_RETURNED),
    });
  } catch (e) {
    console.error("[image-ai-backfill]", e);
    errors.push(String(e));
    return Response.json(
      {
        processed,
        updatedAlt,
        upsertedImageAi,
        skippedListings,
        errors: errors.slice(0, MAX_ERRORS_RETURNED),
      },
      { status: 500 }
    );
  }
}
