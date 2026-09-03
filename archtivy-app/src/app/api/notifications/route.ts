import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNotificationsForProfile, getUnreadCount } from "@/lib/db/notifications";
import {
  eventTypesForTab,
  isNotificationTab,
  type NotificationTab,
} from "@/lib/notifications/tabs";
import { materialiseSmartNotifications } from "@/lib/personalization/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
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

  /*
   * ── DIGESTS ARE BUILT WHEN SOMEONE LOOKS ─────────────────────────────────
   * Awaited deliberately, so a digest earned before this request appears in
   * the very response that triggered it rather than a page-load later. It is
   * idempotent within its window, does nothing when there is nothing to say,
   * and swallows its own failures — a personalization error must never stop
   * someone reading their existing notifications.
   *
   * Only on the first page: paging through history should not re-run it.
   */
  if (offset === 0) {
    await materialiseSmartNotifications(profile.id, userId);
  }

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

  return NextResponse.json(
    {
      data: result.data!.items,
      unread_count: unreadCount,
      total: result.data!.total,
      tab,
    },
    /*
     * ── PER-VIEWER, SO NEVER STORED ──────────────────────────────────────────
     * This body is one person's notifications and unread count. `dynamic =
     * "force-dynamic"` stops Next and Vercel caching the route, but it emits no
     * Cache-Control of its own — verified: the response carried none at all —
     * which leaves the payload heuristically cacheable by a browser or any
     * intermediary proxy. Stated explicitly rather than relied upon.
     */
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
