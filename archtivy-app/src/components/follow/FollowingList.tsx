"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toggleFollow } from "@/app/actions/follows";
import type { FollowTargetType } from "@/lib/db/follows";

export interface FollowingItem {
  followId: string;
  targetType: FollowTargetType;
  targetId: string;
  name: string;
  avatarUrl: string | null;
  href: string;
  meta: string;
  createdAt: string;
}

type FilterTab = "all" | "designer" | "brand" | "category" | "material";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "designer", label: "Designers" },
  { key: "brand", label: "Brands" },
  { key: "category", label: "Categories" },
  { key: "material", label: "Materials" },
];

function InitialAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone/60 text-sm font-semibold text-muted">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function CategoryIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone/60">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </div>
  );
}

function MaterialIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone/60">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

function FollowingRow({
  item,
  onUnfollow,
}: {
  item: FollowingItem;
  onUnfollow: (item: FollowingItem) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  const handleUnfollow = () => {
    if (!confirmUnfollow) {
      setConfirmUnfollow(true);
      return;
    }
    startTransition(async () => {
      await toggleFollow(item.targetType, item.targetId);
      onUnfollow(item);
    });
  };

  const avatar =
    item.targetType === "category" ? (
      <CategoryIcon />
    ) : item.targetType === "material" ? (
      <MaterialIcon />
    ) : item.avatarUrl ? (
      <Image
        src={item.avatarUrl}
        alt={item.name}
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        unoptimized
      />
    ) : (
      <InitialAvatar name={item.name} />
    );

  return (
    <div className="flex items-center gap-3 rounded px-3 py-3 transition hover:bg-stone/40 sm:px-4">
      {avatar}
      <div className="min-w-0 flex-1">
        <Link
          href={item.href}
          className="text-sm font-medium text-ink underline-offset-4 transition hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-xs text-muted">{item.meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={item.href}
          className="hidden rounded border border-hairline px-3 py-1.5 text-xs font-medium text-muted transition hover:border-ink hover:text-ink sm:inline-flex"
        >
          View
        </Link>
        <button
          type="button"
          onClick={handleUnfollow}
          onMouseLeave={() => setConfirmUnfollow(false)}
          disabled={isPending}
          className={`rounded border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            confirmUnfollow
              ? "border-red-300 text-red-500 hover:bg-red-50"
              : "border-hairline text-muted hover:border-ink/40 hover:text-ink"
          }`}
        >
          {isPending ? "Removing..." : confirmUnfollow ? "Confirm" : "Unfollow"}
        </button>
      </div>
    </div>
  );
}

export function FollowingList({ items: initialItems }: { items: FollowingItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    activeTab === "all" ? items : items.filter((i) => i.targetType === activeTab);

  const counts: Record<FilterTab, number> = {
    all: items.length,
    designer: items.filter((i) => i.targetType === "designer").length,
    brand: items.filter((i) => i.targetType === "brand").length,
    category: items.filter((i) => i.targetType === "category").length,
    material: items.filter((i) => i.targetType === "material").length,
  };

  const handleUnfollow = (item: FollowingItem) => {
    setItems((prev) => prev.filter((i) => i.followId !== item.followId));
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-hairline">
        {tabs.map(({ key, label }) => {
          const count = counts[key];
          const isActive = activeTab === key;
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? "text-muted" : "text-muted/70"}`}>
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted">
            {items.length === 0
              ? "You're not following anyone yet. Follow designers, brands, categories, or materials to see them here."
              : `No ${activeTab === "all" ? "" : activeTab + " "}follows yet.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {filtered.map((item) => (
            <FollowingRow key={item.followId} item={item} onUnfollow={handleUnfollow} />
          ))}
        </div>
      )}
    </div>
  );
}
