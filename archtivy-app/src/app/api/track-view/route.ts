import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * POST /api/track-view
 * Body: { listingId: string } (uuid)
 * Calls increment_listing_views(listing_id) RPC to bump listings.views_count.
 *
 * PARAM NAME: `listing_id`, not `p_listing_id`. This called it with `p_listing_id`
 * and every view therefore 500d with PGRST202 "could not find the function" —
 * the function exists, the argument name did not match. Postgres resolves
 * named RPC args exactly, so a rename here is a breaking change to the caller.
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

    /*
     * ── THE PER-VIEWER ROW, WHICH WAS NEVER BEING WRITTEN ────────────────────
     * `listing_views` has existed with exactly the right shape the whole time —
     * clerk_user_id, anon_id, viewed_on, and two partial unique indexes
     * (uniq_listing_views_user_day / uniq_listing_views_anon_day) that make one
     * row per viewer per listing per day — and nothing ever inserted into it.
     * The table was empty, so "you keep looking at this kind of thing" was a
     * signal the personalization layer could not read.
     *
     * This completes the existing table rather than adding another. Writing is
     * best-effort and never blocks the counter below: a duplicate on the daily
     * unique index is the NORMAL case, not an error, and a failure here must
     * not cost a page its view count.
     *
     * Only the signed-in id is recorded. There is no anon_id cookie in this
     * app, and minting one to build browsing history for people who have not
     * signed in is not something personalization needs.
     */
    const { userId } = await auth();
    if (userId) {
      await sup
        .from("listing_views")
        .insert({
          listing_id: listingId,
          clerk_user_id: userId,
          viewed_on: new Date().toISOString().slice(0, 10),
        })
        .then(undefined, () => undefined);
    }

    const { error } = await sup.rpc("increment_listing_views", { listing_id: listingId });
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
