import { NextResponse } from "next/server";
import { getCollections } from "@/lib/db/collections";

/**
 * GET /api/inspiration-collections — published collections (spec §5, §8).
 *
 * Resource-oriented naming, not /getCollections. Returns an empty list rather
 * than an error when the collections table does not exist yet, so the
 * Inspiration page degrades to "no collections row" instead of failing.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const collections = await getCollections();
  return NextResponse.json(
    { collections, total: collections.length },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
