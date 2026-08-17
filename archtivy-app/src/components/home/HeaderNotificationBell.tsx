"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationWithActor } from "@/lib/db/notifications";
import {
  NOTIFICATION_TABS,
  NOTIFICATION_TAB_LABELS,
  type NotificationTab,
} from "@/lib/notifications/tabs";

/**
 * Notification bell for the editorial header (HomeNav).
 *
 * Separate from components/notifications/NotificationBell, which is the legacy
 * zinc-palette bell still used by TopNav. This is not a fork of it: the panel
 * here has tabs, cream/ink styling, and a transparent-over-hero state that the
 * old one has no concept of. The two share the API route and the tab
 * vocabulary, which is where the real logic lives.
 *
 * Every notification it can show is one the platform genuinely creates —
 * follow events (the `follows` table is populated) and admin sends. Nothing
 * here fabricates activity to fill the panel.
 */

const POLL_INTERVAL = 30_000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HeaderNotificationBell({ onDark }: { onDark: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>("all");
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Unread badge — polled whether or not the panel is open.
  useEffect(() => {
    let cancelled = false;
    const fetchCount = () =>
      fetch("/api/notifications?limit=0")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!cancelled && j) setUnread(j.unread_count ?? 0);
        })
        .catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Panel contents — refetched per tab, server-side filtered.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/notifications?limit=12&tab=${tab}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setItems(j.data ?? []);
        setUnread(j.unread_count ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  // Click-outside and Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, []);

  const hasUnreadHere = items.some((n) => !n.is_read);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          onDark ? "text-cream hover:bg-cream/10" : "text-ink hover:bg-stone/50",
        ].join(" ")}
      >
        <Bell strokeWidth={1.5} className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-archtivy-primary px-1 font-body text-[10px] font-medium leading-none text-white"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-[100] mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-hairline bg-cream shadow-[0_12px_40px_rgba(22,22,22,0.12)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <h2 className="font-body text-[15px] font-semibold text-ink">Notifications</h2>
            {hasUnreadHere && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-body text-[12px] text-muted underline underline-offset-2 transition-colors hover:text-ink"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div
            className="flex items-center gap-1 border-b border-hairline px-2 py-2"
            role="tablist"
            aria-label="Notification categories"
          >
            {NOTIFICATION_TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={[
                  "rounded-full px-3 py-1.5 font-body text-[13px] transition-colors",
                  tab === t
                    ? "bg-ink font-medium text-cream"
                    : "text-muted hover:bg-stone/50 hover:text-ink",
                ].join(" ")}
              >
                {NOTIFICATION_TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-stone/40" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center font-body text-[14px] text-muted">
                {tab === "all"
                  ? "Nothing yet. Follow designers and brands to see their work here."
                  : `No ${NOTIFICATION_TAB_LABELS[tab].toLowerCase()} yet.`}
              </p>
            ) : (
              <ul>
                {items.map((n) => {
                  const body = (
                    <>
                      <span className="flex items-start gap-2.5">
                        {!n.is_read && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-archtivy-primary"
                            aria-hidden
                          />
                        )}
                        <span className={n.is_read ? "min-w-0 pl-4" : "min-w-0"}>
                          <span className="block font-body text-[14px] font-medium text-ink">
                            {n.title ?? "Update"}
                          </span>
                          {n.body && (
                            <span className="mt-0.5 block font-body text-[13px] leading-relaxed text-muted">
                              {n.body}
                            </span>
                          )}
                          <span className="mt-1 block font-body text-[12px] text-muted">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={n.id} className="border-b border-hairline/60 last:border-0">
                      {n.cta_url ? (
                        <Link
                          href={n.cta_url}
                          onClick={() => {
                            if (!n.is_read) markRead(n.id);
                            setOpen(false);
                          }}
                          className="block px-4 py-3 transition-colors hover:bg-stone/30"
                        >
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !n.is_read && markRead(n.id)}
                          className="block w-full px-4 py-3 text-left transition-colors hover:bg-stone/30"
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-hairline px-4 py-2.5">
            <Link
              href="/me/notifications"
              onClick={() => setOpen(false)}
              className="font-body text-[13px] text-ink underline-offset-4 hover:underline"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
