import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNotificationsForProfile, getUnreadCount } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const [result, unreadCount] = await Promise.all([
    getNotificationsForProfile(profile.id, { limit, offset }),
    getUnreadCount(profile.id),
  ]);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    data: result.data!.items,
    unread_count: unreadCount,
    total: result.data!.total,
  });
}
