import Link from "next/link";
import type { FeedItem } from "@/lib/db/dashboard";

/**
 * Activity feed, with events about the user's own work raised above general
 * platform activity.
 *
 * ── THE RANKING IS REAL; THE DATA IS THIN ───────────────────────────────────
 * Direct events (someone followed you, your product was specified) sort above
 * everything else and carry a marker rail. That ordering is applied in
 * loadFeed().
 *
 * What does not exist yet is most of the event types worth ranking: the
 * notifications table holds new_follower and admin_update only, and the brief's
 * "your product was saved" has no source at all — listing_saves is empty and
 * nothing writes a save event. So the mechanism is here and correct, and it
 * will start mattering the moment those events are emitted.
 */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardFeed({ items }: { items: FeedItem[] }) {
  return (
    <section aria-label="Recent activity" className="rounded-2xl border border-hairline bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
          Activity
        </h2>
        {items.length > 0 && (
          <Link
            href="/me/notifications"
            className="font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 max-w-[46ch] font-body text-[13px] leading-[21px] text-muted">
          Nothing yet. Follows, credits and specifications involving your work
          will appear here as they happen.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              {/* The rail is the whole visual distinction between "about you"
                  and "about the platform" — a second colour or a badge would
                  compete with the draft chips elsewhere on the page. */}
              <span
                aria-hidden
                className={[
                  "mt-1 w-0.5 shrink-0 rounded-full",
                  item.isDirect ? "bg-ink" : "bg-stone",
                ].join(" ")}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "font-body text-[13px] leading-[20px]",
                    item.isDirect ? "text-ink" : "text-muted",
                  ].join(" ")}
                >
                  {item.ctaUrl ? (
                    <Link href={item.ctaUrl} className="underline-offset-4 hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                  {item.body && (
                    <span className="text-muted"> — {item.body}</span>
                  )}
                </p>
                <p className="mt-0.5 font-body text-[11px] text-muted">
                  {relativeTime(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
