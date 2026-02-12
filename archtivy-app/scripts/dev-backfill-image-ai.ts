/**
 * Dev-only: backfill image_ai for two hardcoded images to verify the pipeline.
 * Run: npm run dev:backfill:image-ai
 * Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (e.g. from .env.local).
 * Expected: embedding_length 1536 and embedding_ok true for both rows.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseServiceClient } from "../src/lib/supabaseServer";
import { processImage } from "../src/lib/matches/pipeline";
import { parseVector } from "../src/lib/db/imageAi";

const PROJECT_IMAGE_ID = "e1cd2f48-c7a7-487f-8712-2903b50afd31";
const PROJECT_IMAGE_URL =
  "https://rrjmtschrbnwzoijlatq.supabase.co/storage/v1/object/public/gallery/50439a12-4982-44a9-9565-5717b522f6fe/f4f7c3f5-dcd3-4585-a30a-bc7605369712.jpg";

const PRODUCT_IMAGE_ID = "e55c9031-26e4-4fab-a8b6-ae5b7e2f03a2";
const PRODUCT_IMAGE_URL =
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80";

async function main() {
  const sup = getSupabaseServiceClient();

  const { data: listingRow, error: listingError } = await sup
    .from("listing_images")
    .select("listing_id")
    .eq("id", PROJECT_IMAGE_ID)
    .maybeSingle();

  if (listingError) {
    console.error("listing_images lookup error:", listingError.message);
    process.exit(1);
  }
  const listingId = (listingRow as { listing_id: string } | null)?.listing_id ?? null;
  if (!listingId) {
    console.warn("No listing_images row for project image; proceeding with listing_id = null");
  }

  console.log("Processing project image...");
  const projectResult = await processImage({
    imageId: PROJECT_IMAGE_ID,
    source: "project",
    imageUrl: PROJECT_IMAGE_URL,
    listing_id: listingId ?? undefined,
    listing_type: "project",
  });
  console.log("Project:", projectResult.ok ? "ok" : projectResult.error);

  console.log("Processing product image...");
  const productResult = await processImage({
    imageId: PRODUCT_IMAGE_ID,
    source: "product",
    imageUrl: PRODUCT_IMAGE_URL,
    listing_id: null,
    listing_type: "product",
  });
  console.log("Product:", productResult.ok ? "ok" : productResult.error);

  const { data: rows, error: selectError } = await sup
    .from("image_ai")
    .select("image_id, embedding, listing_type, listing_id")
    .in("image_id", [PROJECT_IMAGE_ID, PRODUCT_IMAGE_ID]);

  if (selectError) {
    console.error("SELECT image_ai error:", selectError.message);
    process.exit(1);
  }

  console.log("\nimage_ai rows:");
  for (const row of rows ?? []) {
    const r = row as { image_id: string; embedding: unknown; listing_type: string | null; listing_id: string | null };
    const parsed = parseVector(r.embedding);
    const embedding_length = parsed ? parsed.length : 0;
    const embedding_ok = embedding_length === 1536;
    console.log({
      image_id: r.image_id,
      embedding_length,
      embedding_ok,
      listing_type: r.listing_type,
      listing_id: r.listing_id,
    });
  }
  console.log("\nNote: Run with npm run dev:backfill:image-ai; expect embedding_length 1536 and embedding_ok true for both rows.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
