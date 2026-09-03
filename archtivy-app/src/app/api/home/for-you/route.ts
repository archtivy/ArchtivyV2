import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { buildPersonalizedFeed } from "@/lib/personalization/feed";
import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { projectToCardModel, productToCardModel } from "@/lib/cards/toListingCardModel";
import type { ListingCardModel } from "@/components/listing/ListingCardShared";

/**
 * GET /api/home/for-you
 *
 * The personalized half of the homepage. The page itself stays statically
 * cached for everyone — this is fetched after hydration by signed-in viewers
 * only, so the editorial homepage keeps its ISR and anonymous visitors pay
 * nothing for a feature they cannot use.
 *
 * ── PRIVATE BY CONSTRUCTION ─────────────────────────────────────────────────
 * Everything is derived from the CALLER'S own session. There is no user id in
 * the request, so one viewer cannot ask for another's feed, and the response
 * contains only public listing data plus labels naming things the caller
 * already knows — their own follows, their own boards, their own city.
 *
 * Scores and reasons are stripped unless the caller is an admin.
 */

export const dynamic = "force-dynamic";

/** Personalization is per-viewer; it must never be stored in a shared cache. */
const PRIVATE_NO_STORE = "private, no-store";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  // Anonymous: an explicit empty answer, not an error. The client renders
  // nothing and the editorial homepage is the whole experience.
  if (!userId) {
    return NextResponse.json(
      { sections: [], confidence: 0, anonymous: true },
      { headers: { "Cache-Control": PRIVATE_NO_STORE } }
    );
  }

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data as { id: string } | null;
  if (!profile?.id) {
    return NextResponse.json(
      { sections: [], confidence: 0 },
      { headers: { "Cache-Control": PRIVATE_NO_STORE } }
    );
  }

  /*
   * Debug is admin-only AND opt-in, so scores and reasons can never appear in
   * a normal response by accident. requireAdminApi returns a rejection
   * response for non-admins; here that rejection is simply read as "not an
   * admin" rather than returned, because a non-admin asking for debug should
   * still get their feed — just without the internals.
   */
  const wantsDebug = request.nextUrl.searchParams.get("debug") === "1";
  const includeDebug = wantsDebug ? (await requireAdminApi()) === null : false;

  const seen = (request.nextUrl.searchParams.get("seen") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  const [feed, projects, products] = await Promise.all([
    buildPersonalizedFeed({
      profileId: profile.id,
      clerkUserId: userId,
      includeDebug,
      seenListingIds: seen,
    }),
    /* The same two cached fetchers the homepage already runs, so the card
       models are byte-identical to the ones elsewhere on the page and this
       costs no additional round trip in practice. */
    getProjectsCanonical(200),
    getProductsCanonical(200),
  ]);

  const cards = new Map<string, ListingCardModel>();
  for (const p of projects) cards.set(p.id, projectToCardModel(p));
  for (const p of products) cards.set(p.id, productToCardModel(p));

  const sections = feed.sections
    .map((section) => ({
      key: section.key,
      title: section.title,
      subtitle: section.subtitle,
      items: section.items
        // A listing that vanished between the pool being cached and now — or
        // that was unpublished — simply has no card and is dropped.
        .filter((item) => cards.has(item.listingId))
        .map((item) => ({
          model: cards.get(item.listingId)!,
          contextLabel: item.contextLabel,
          ...(includeDebug ? { score: item.score, reasons: item.reasons } : {}),
        })),
    }))
    // Re-check after hydration: a section that lost its items to the filter
    // above must not render as an empty heading.
    .filter((section) => section.items.length >= 2);

  return NextResponse.json(
    {
      sections,
      confidence: feed.confidence,
      ...(includeDebug ? { debug: feed.debug } : {}),
    },
    { headers: { "Cache-Control": PRIVATE_NO_STORE } }
  );
}
