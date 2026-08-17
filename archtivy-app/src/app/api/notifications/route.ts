import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNotificationsForProfile, getUnreadCount } from "@/lib/db/notifications";
import {
  eventTypesForTab,
  isNotificationTab,
  type NotificationTab,
} from "@/lib/notifications/tabs";

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

  // Tab filter. An unrecognised value falls back to "all" rather than erroring
  // — a bad query string should not blank someone's notifications.
  const tabParam = url.searchParams.get("tab");
  const tab: NotificationTab = isNotificationTab(tabParam) ? tabParam : "all";
  const eventTypes = eventTypesForTab(tab);

  const [result, unreadCount] = await Promise.all([
    getNotificationsForProfile(profile.id, {
      limit,
      offset,
      ...(eventTypes ? { eventTypes } : {}),
    }),
    // Always the GLOBAL unread count, never the tab's. The bell badge is a
    // single number on a single icon; scoping it to whichever tab happened to
    // be open last would make it mean something different each time.
    getUnreadCount(profile.id),
  ]);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    data: result.data!.items,
    unread_count: unreadCount,
    total: result.data!.total,
    tab,
  });
}
