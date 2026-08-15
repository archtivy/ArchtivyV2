import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db/collections";

/**
 * GET /api/inspiration-collections/{slug}/items
 *
 * Paginated, per API Standards ("large datasets should never require loading
 * every record at once"). Same `page` / `perPage` params as /api/inspirations.
 */
export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 24;
const MAX_PER_PAGE = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Number.parseInt(sp.get("perPage") ?? String(DEFAULT_PER_PAGE), 10) || DEFAULT_PER_PAGE)
  );

  const total = collection.items.length;
  const start = (page - 1) * perPage;

  return NextResponse.json(
    {
      items: collection.items.slice(start, start + perPage),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
