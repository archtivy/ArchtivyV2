import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * POST /api/track-view
 * Body: { listingId: string } (uuid)
 * Calls increment_listing_views(listing_id) RPC to bump listings.views_count.
 * No auth required; call once per listing detail view (client guards duplicate).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : null;
    if (!listingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
      return Response.json({ error: "Invalid listingId" }, { status: 400 });
    }
    const sup = getSupabaseServiceClient();
    const { error } = await sup.rpc("increment_listing_views", { p_listing_id: listingId });
    if (error) {
      console.warn("[track-view] RPC error:", error.message);
      return Response.json({ error: "Failed to record view" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.warn("[track-view]", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
