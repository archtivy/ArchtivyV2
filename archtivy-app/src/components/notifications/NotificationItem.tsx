"use client";

import Image from "next/image";
import type { NotificationWithActor } from "@/lib/db/notifications";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SystemIcon() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#002abf]/10">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#002abf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  );
}

export function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationWithActor;
  onRead?: (id: string) => void;
}) {
  const hasActor = notification.actor_profile_id && notification.actor_display_name;
  const isSystem = notification.source === "system" || notification.source === "admin";

  const handleClick = () => {
    if (!notification.is_read && onRead) {
      onRead(notification.id);
    }
    if (notification.cta_url) {
      window.location.href = notification.cta_url;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
        !notification.is_read ? "bg-[#002abf]/[0.02] dark:bg-[#5b7cff]/[0.03]" : ""
      }`}
    >
      {/* Avatar / Icon */}
      {isSystem || !hasActor ? (
        <SystemIcon />
      ) : notification.actor_avatar_url ? (
        <Image
          src={notification.actor_avatar_url}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          {(notification.actor_display_name ?? "?")[0].toUpperCase()}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {notification.title && (
          <p className="text-[13px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">
            {notification.title}
          </p>
        )}
        {notification.body && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#002abf] dark:bg-[#5b7cff]" />
      )}
    </button>
  );
}
