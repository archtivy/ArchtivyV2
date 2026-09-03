import { NextResponse } from "next/server";
import { getImageDiscovery } from "@/lib/discovery/visualDiscovery";

/**
 * GET /api/discovery/image/[imageId]
 *
 * Everything the lightbox's right-hand feed needs for one photograph: the
 * whole-room feed, the clickable object regions, and each region's products.
 * Fetched once when a slide is shown, so selecting an object costs no further
 * network request and no model call.
 *
 * ── PUBLIC, AND ONLY EVER PUBLIC DATA ───────────────────────────────────────
 * No auth: this is the same information the gallery beneath it already shows
 * to anonymous visitors. getImageDiscovery refuses any image whose listing is
 * not APPROVED and not soft-deleted, and hydrates products under the same
 * filter, so an unpublished listing cannot be read through this route by id.
 *
 * The response carries geometry and products. It deliberately carries no
 * labels, keywords, confidences or scores — the sidebar shows none of them,
 * and an endpoint that returned them would invite a future surface to.
 */

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;

  // Cheap guard before touching the database: these ids are always uuids.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const discovery = await getImageDiscovery(imageId);
  if (!discovery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(discovery, {
    headers: {
      // Shared cache only. The payload is identical for every visitor, and a
      // five-minute window keeps a newly published product from taking an hour
      // to appear in a room feed.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
