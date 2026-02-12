/**
 * Lightweight event layer for analytics.
 * - Logs to console in development.
 * - Pushes to window.__archtivyEvents when defined (for verification / future integration).
 * Replace or extend with your analytics provider (GA, PostHog, etc.).
 */

export type TrackEventName =
  | "listing_view"
  | "listing_save"
  | "listing_share"
  | "search";

export type TrackPayload = {
  listing_view: { type: "project" | "product"; id: string };
  listing_save: { listingId: string; action: "add" | "remove" };
  listing_share: { listingId: string };
  search: { q: string; scope: "projects" | "products" };
};

export function track<E extends TrackEventName>(
  event: E,
  payload: TrackPayload[E]
): void {
  if (typeof window === "undefined") return;
  const item = { event, payload, at: new Date().toISOString() };
  if (process.env.NODE_ENV === "development") {
    console.log("[archtivy event]", item);
  }
  const w = window as Window & { __archtivyEvents?: unknown[] };
  if (!Array.isArray(w.__archtivyEvents)) w.__archtivyEvents = [];
  w.__archtivyEvents.push(item);
}
