"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationItem } from "./NotificationItem";
import type { NotificationWithActor } from "@/lib/db/notifications";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch notifications
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?limit=10")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setItems(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const hasUnread = items.some((n) => !n.is_read);

  return (
    <div
      role="dialog"
      aria-label="Network Updates"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-5px)",
        transition: "opacity 130ms ease-out, transform 130ms ease-out",
      }}
      className="absolute right-0 top-full z-[100] mt-2 w-[380px] overflow-hidden rounded border border-zinc-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
          Network Updates
        </p>
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[12px] font-medium text-zinc-400 transition hover:text-[#002abf] dark:text-zinc-500 dark:hover:text-[#5b7cff]"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No updates yet.
            </p>
            <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
              Follow designers, brands, or categories to receive updates.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={handleRead} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href="/me/notifications"
            onClick={onClose}
            className="block py-2.5 text-center text-[12px] font-medium text-zinc-400 transition hover:text-[#002abf] dark:text-zinc-500 dark:hover:text-[#5b7cff]"
          >
            View all updates
          </Link>
        </div>
      )}
    </div>
  );
}
