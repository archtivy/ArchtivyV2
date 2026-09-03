import type { NotificationEventType } from "@/lib/db/notifications";

/**
 * Notification tab vocabulary: All / Updates / Mentions / System.
 *
 * Mapped onto the event_type values that already exist — no new column, no
 * new classification field. Every tab is a partition of the live vocabulary,
 * so a tab can only ever show notifications the platform actually creates.
 *
 * Shared by the API route and the dropdown so the filter and the labels cannot
 * drift: the tab a user clicks is the same list the query filters by.
 */

export const NOTIFICATION_TABS = ["all", "updates", "for_you", "mentions", "system"] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_LABELS: Record<NotificationTab, string> = {
  all: "All",
  updates: "Updates",
  for_you: "For you",
  mentions: "Mentions",
  system: "System",
};

/**
 * Updates — things the people and topics you follow have done.
 * Backed by the `follows` table, which is populated (8 rows live).
 */
const UPDATE_EVENTS: NotificationEventType[] = [
  "new_follower",
  "designer_published_project",
  "brand_published_product",
  "followed_category_new_listing",
  "followed_material_new_listing",
];

/** Mentions — someone credited you on their listing. */
const MENTION_EVENTS: NotificationEventType[] = [
  "mentioned_in_project",
  "mentioned_in_product",
];

/**
 * System — platform-authored.
 *
 * `admin_update` is the admin composer built in the previous round.
 * `opportunity_nearby` is included because it is part of the enum and would
 * otherwise be unreachable from any tab — but nothing generates it today, so
 * this tab shows admin messages in practice. Deliberately not given its own
 * tab: a tab that is always empty reads as a broken feature.
 */
const SYSTEM_EVENTS: NotificationEventType[] = ["admin_update", "opportunity_nearby"];

/**
 * For you — everything the personalization layer produced.
 *
 * A tab rather than a rename: Updates, Mentions and System keep their exact
 * meanings, and the new events get somewhere of their own instead of being
 * filed under a heading that does not describe them. A connection event ("a
 * product you saved was specified here") is not an update from someone you
 * follow, and a digest is not a system message.
 *
 * They also reach the All tab, which applies no filter — this only makes them
 * reachable from a second, more specific place.
 */
const FOR_YOU_EVENTS: NotificationEventType[] = [
  "saved_product_in_project",
  "followed_brand_in_project",
  "interest_digest",
  "board_digest",
  "local_digest",
];

/**
 * Event types for a tab, or null for "all" (no filter).
 *
 * Returning null rather than the full list matters: it keeps the "all" query
 * free of an `.in()` clause, so a future event_type that nobody has mapped
 * still appears somewhere instead of silently vanishing from the UI.
 */
export function eventTypesForTab(tab: NotificationTab): NotificationEventType[] | null {
  switch (tab) {
    case "updates":
      return UPDATE_EVENTS;
    case "mentions":
      return MENTION_EVENTS;
    case "for_you":
      return FOR_YOU_EVENTS;
    case "system":
      return SYSTEM_EVENTS;
    case "all":
    default:
      return null;
  }
}

export function isNotificationTab(v: string | null | undefined): v is NotificationTab {
  return !!v && (NOTIFICATION_TABS as readonly string[]).includes(v);
}
