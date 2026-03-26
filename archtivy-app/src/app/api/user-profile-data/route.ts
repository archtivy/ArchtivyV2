import { auth } from "@clerk/nextjs/server";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";
import { isFeatureListingEnabled } from "@/lib/db/siteSettings";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ userId: null, role: undefined, displayName: null, featureListingEnabled: false }, { status: 200 });
  }

  try {
    const [profileResult, featureListingOn] = await Promise.all([
      getDefaultProfileForClerkUserId(userId),
      isFeatureListingEnabled(),
    ]);
    const profile = profileResult.data;

    const role = profile?.role ?? undefined;
    const displayName = profile?.display_name ?? profile?.username ?? null;
    const locationCity = profile?.location_city ?? null;

    return NextResponse.json({ userId, role, displayName, locationCity, featureListingEnabled: featureListingOn }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user profile data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
