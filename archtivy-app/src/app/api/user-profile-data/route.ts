import { auth } from "@clerk/nextjs/server";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ userId: null, role: undefined, displayName: null }, { status: 200 });
  }

  try {
    const profileResult = await getDefaultProfileForClerkUserId(userId);
    const profile = profileResult.data;

    const role = profile?.role ?? undefined;
    const displayName = profile?.display_name ?? profile?.username ?? null;

    return NextResponse.json({ userId, role, displayName }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user profile data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
