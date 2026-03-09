"use client";

import { useState, useTransition } from "react";
import { NotificationItem } from "./NotificationItem";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import type { NotificationWithActor, NotificationEventType } from "@/lib/db/notifications";

type FilterTab = "all" | "following" | "mentions" | "admin";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "mentions", label: "Mentions" },
  { key: "admin", label: "Admin" },
];

const followingEventTypes: NotificationEventType[] = [
  "new_follower",
  "designer_published_project",
  "brand_published_product",
  "followed_category_new_listing",
  "followed_material_new_listing",
];

const mentionEventTypes: NotificationEventType[] = [
  "mentioned_in_project",
  "mentioned_in_product",
];

function filterItems(items: NotificationWithActor[], tab: FilterTab): NotificationWithActor[] {
  switch (tab) {
    case "following":
      return items.filter((n) => followingEventTypes.includes(n.event_type));
    case "mentions":
      return items.filter((n) => mentionEventTypes.includes(n.event_type));
    case "admin":
      return items.filter((n) => n.event_type === "admin_update");
    default:
      return items;
  }
}

function countForTab(items: NotificationWithActor[], tab: FilterTab): number {
  return filterItems(items, tab).length;
}

interface NetworkUpdatesListProps {
  initialItems: NotificationWithActor[];
  initialTotal: number;
}

export function NetworkUpdatesList({ initialItems, initialTotal }: NetworkUpdatesListProps) {
  const [items, setItems] = useState(initialItems);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = filterItems(items, activeTab);
  const hasUnread = items.some((n) => !n.is_read);

  const handleRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  };

  return (
    <div>
      {/* Filter tabs + Mark all */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1">
          {tabs.map(({ key, label }) => {
            const count = countForTab(items, key);
            const isActive = activeTab === key;
            // Always show "All"; hide others if zero
            if (key !== "all" && count === 0) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`relative px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-300 dark:text-zinc-600"}`}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-zinc-900 dark:bg-zinc-100" />
                )}
              </button>
            );
          })}
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-[12px] font-medium text-zinc-400 transition hover:text-[#002abf] disabled:opacity-50 dark:text-zinc-500 dark:hover:text-[#5b7cff]"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            {items.length === 0
              ? "No updates yet. Follow designers, brands, or categories to receive updates here."
              : `No ${activeTab === "all" ? "" : activeTab + " "}updates.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {filtered.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={handleRead} />
          ))}
        </div>
      )}

      {/* Load more hint */}
      {initialTotal > items.length && (
        <div className="border-t border-zinc-100 py-4 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Showing {items.length} of {initialTotal} updates
          </p>
        </div>
      )}
    </div>
  );
}
