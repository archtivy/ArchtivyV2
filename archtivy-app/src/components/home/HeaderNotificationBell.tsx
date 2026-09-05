"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useMobilePanelPosition } from "@/lib/hooks/useMobilePanelPosition";
import Link from "next/link";
import { Bell, Settings, ArrowRight, ChevronRight } from "lucide-react";
import type { NotificationWithActor } from "@/lib/db/notifications";
import {
  NOTIFICATION_TABS,
  NOTIFICATION_TAB_LABELS,
  type NotificationTab,
} from "@/lib/notifications/tabs";

/**
 * Notification bell for the editorial header (HomeNav).
 *
 * Styled to the supplied mockup: WHITE panel (not cream), underline tabs (not
 * pills), 40px round avatar left, 48px rounded thumbnail right, unread dot on
 * the far right, and a bordered full-width "View all notifications" button.
 *
 * Separate from components/notifications/NotificationBell, which is the legacy
 * zinc-palette bell still used by TopNav. Not a fork of it: this has tabs, a
 * different layout, and a transparent-over-hero state the old one has no
 * concept of. They share the API route and the tab vocabulary.
 *
 * ── ON THE MOCKUP'S CONTENT ─────────────────────────────────────────────────
 * The mockup shows six notifications; only some correspond to event types the
 * platform actually produces today. "saved to their collection", "added to 5
 * new projects this week" and "Daily Digest / saved searches" are all
 * save-triggered or aggregated — deferred, and listing_saves is empty. This
 * component renders whatever the API returns and nothing else; it never
 * synthesises a row to fill the panel out.
 *
 * The layout does support all six shapes, so when those generators exist they
 * render correctly with no change here: the thumbnail, the digest chevron and
 * the icon-avatar fallback are all driven by the notification's own fields.
 */

const POLL_INTERVAL = 30_000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Left avatar: actor photo, actor initials, or a neutral bell for
 *  platform-authored notifications with no actor. */
function Avatar({ n }: { n: NotificationWithActor }) {
  if (n.actor_avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={n.actor_avatar_url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const label = initials(n.actor_display_name ?? n.actor_username);
  if (label) {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone/60 font-body text-[12px] font-semibold leading-tight text-ink"
        aria-hidden
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone/40 text-muted"
      aria-hidden
    >
      <Bell strokeWidth={1.5} className="h-4 w-4" />
    </span>
  );
}

export function HeaderNotificationBell({ onDark }: { onDark: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>("all");
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /* Phones position this against the viewport instead of the bell — see
     useMobilePanelPosition. `ref` wraps the button and the panel, but the panel
     is out of flow when fixed, so its bottom is still the button's bottom. */
  const mobilePos = useMobilePanelPosition(ref, open);

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
          /*
            Phones: fixed between two 16px gutters — width follows the viewport
            and neither edge can overhang. `top` and `maxHeight` are measured
            from the bell and the viewport, so a long list scrolls inside the
            panel rather than running off the bottom of a short screen. md and
            up: the original anchored 440px dropdown, unchanged.
          */
          className="fixed left-4 right-4 z-[100] flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)] md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-[440px]"
          style={mobilePos ? { top: mobilePos.top, maxHeight: mobilePos.maxHeight } : undefined}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-4">
            <h2 className="font-body text-[17px] font-semibold tracking-[-0.01em] text-ink">
              Notifications
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAllRead}
                className="font-body text-[13px] text-muted transition-colors hover:text-ink"
              >
                Mark all as read
              </button>
              <Link
                href="/me/settings"
                onClick={() => setOpen(false)}
                aria-label="Notification settings"
                className="text-muted transition-colors hover:text-ink"
              >
                <Settings strokeWidth={1.5} className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Underline tabs */}
          <div
            className="flex shrink-0 items-center gap-6 border-b border-black/[0.07] px-5"
            role="tablist"
            aria-label="Notification categories"
          >
            {NOTIFICATION_TABS.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  className={[
                    "relative -mb-px pb-2.5 pt-1 font-body text-[14px] transition-colors",
                    active ? "font-medium text-ink" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {NOTIFICATION_TAB_LABELS[t]}
                  {active && (
                    <span
                      className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-ink"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:max-h-[420px] md:flex-none">
            {loading ? (
              <div className="space-y-4 p-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-stone/40" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-stone/40" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-stone/30" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-5 py-12 text-center font-body text-[14px] text-muted">
                {tab === "all"
                  ? "Nothing yet. Follow designers and brands to see their work here."
                  : `No ${NOTIFICATION_TAB_LABELS[tab].toLowerCase()} yet.`}
              </p>
            ) : (
              <ul>
                {items.map((n) => {
                  const inner = (
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      <Avatar n={n} />

                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[14px] leading-[1.45] text-ink">
                          {n.actor_display_name && (
                            <span className="font-semibold">{n.actor_display_name} </span>
                          )}
                          <span className={n.actor_display_name ? "" : "font-semibold"}>
                            {n.title}
                          </span>
                        </p>
                        {n.body && (
                          <p className="mt-0.5 font-body text-[14px] leading-[1.45] text-muted">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 font-body text-[12px] text-muted/80">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>

                      {/* Unread marker, far right — matches the mockup's dot. */}
                      <span className="flex shrink-0 items-center self-center pl-1">
                        {n.is_read ? (
                          <ChevronRight
                            strokeWidth={1.5}
                            className="h-4 w-4 text-muted/50"
                            aria-hidden
                          />
                        ) : (
                          <>
                            <span
                              className="h-[7px] w-[7px] rounded-full bg-ink"
                              aria-hidden
                            />
                            <span className="sr-only">Unread</span>
                          </>
                        )}
                      </span>
                    </div>
                  );

                  return (
                    <li key={n.id} className="border-b border-black/[0.05] last:border-0">
                      {n.cta_url ? (
                        <Link
                          href={n.cta_url}
                          onClick={() => {
                            if (!n.is_read) markRead(n.id);
                            setOpen(false);
                          }}
                          className="block transition-colors hover:bg-black/[0.02]"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !n.is_read && markRead(n.id)}
                          className="block w-full text-left transition-colors hover:bg-black/[0.02]"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer button */}
          <div className="shrink-0 p-3">
            <Link
              href="/me/notifications"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.09] py-3 font-body text-[14px] font-medium text-ink transition-colors hover:bg-black/[0.02]"
            >
              View all notifications
              <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
