export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNetworkFeed } from "@/lib/db/networkFeed";

/**
 * GET /api/network-feed
 * Returns personalized feed items based on the user's follows.
 * Unauthenticated requests get an empty result.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ items: [], followCount: 0 });
  }

  const profileResult = await getProfileByClerkId(userId);
  if (!profileResult.data) {
    return NextResponse.json({ items: [], followCount: 0 });
  }

  const result = await getNetworkFeed(profileResult.data.id);
  return NextResponse.json(result);
}
