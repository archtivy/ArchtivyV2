import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db/collections";

/** GET /api/inspiration-collections/{slug} — the collection, without its items. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  }
  // Items are a separate resource (/items) so a client that only needs the
  // header does not pay for up to 200 hydrated cards.
  const { items, ...rest } = collection;
  return NextResponse.json(
    { ...rest, itemCount: items.length },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
