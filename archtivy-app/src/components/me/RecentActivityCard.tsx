import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import type { FeedItem } from "@/lib/db/dashboard";

/**
 * Recent Activity — the notifications this profile actually received.
 *
 * ── NOTHING HERE IS SYNTHESISED ─────────────────────────────────────────────
 * The reference shows "Your project Casa O was saved by Design Bureau",
 * "New connection made between…", each with a thumbnail. Those events are not
 * recorded: nothing writes a save event, a connection event or a publish event
 * to `notifications`, and folder_items carries no actor a feed could name.
 * The table holds 15 rows platform-wide, all admin/system notices.
 *
 * So this renders the real feed when there is one and an honest empty state
 * when there is not. It does not fabricate rows to fill the card, and it does
 * not draw thumbnails for events that have no entity attached.
 */
export function RecentActivityCard({ feed }: { feed: FeedItem[] }) {
  const items = feed.slice(0, 4);

  return (
    <section className="flex flex-col rounded-xl border border-hairline bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">
          Recent Activity
        </h2>
        {items.length > 0 && (
          <Link
            href="/me/notifications"
            className="flex items-center gap-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
          >
            View all
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone/40">
            <Bell strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
          </span>
          <p className="mt-3 font-body text-[14px] text-ink">No activity yet</p>
          <p className="mx-auto mt-1 max-w-[260px] font-body text-[12px] leading-[17px] text-muted">
            Saves, new connections and platform updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {items.map((item) => {
            const body = (
              <>
                <p className="font-body text-[13px] leading-[18px] text-ink">{item.title}</p>
                {item.body && (
                  <p className="mt-0.5 line-clamp-2 font-body text-[12px] leading-[17px] text-muted">
                    {item.body}
                  </p>
                )}
                <p className="mt-1 font-body text-[11px] text-muted">{relativeTime(item.createdAt)}</p>
              </>
            );
            return (
              <li key={item.id}>
                {item.ctaUrl ? (
                  <Link href={item.ctaUrl} className="block rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-stone/20">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Coarse on purpose — a feed this sparse does not need minutes. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const hours = Math.floor((Date.now() - then) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}
