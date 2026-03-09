export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { isFollowing, type FollowTargetType } from "@/lib/db/follows";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";

/**
 * GET /api/follows/taxonomy-check?targetType=category&slugPath=furniture/seating&domain=product
 * Returns { following: boolean } or { following: false } if not signed in.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") as FollowTargetType | null;
  const slugPath = url.searchParams.get("slugPath");
  const domain = url.searchParams.get("domain");

  if (!targetType || !slugPath || !domain) {
    return NextResponse.json({ following: false });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ following: false });

  const profileResult = await getProfileByClerkId(userId);
  if (!profileResult.data) return NextResponse.json({ following: false });

  const nodeResult = await getTaxonomyNodeBySlugPath(domain, slugPath);
  if (!nodeResult.data) return NextResponse.json({ following: false });

  const following = await isFollowing(profileResult.data.id, targetType, nodeResult.data.id);
  return NextResponse.json({ following });
}
