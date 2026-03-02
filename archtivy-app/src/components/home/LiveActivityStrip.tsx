"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  text: string;
}

export function LiveActivityStrip() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data: { items?: ActivityItem[] }) => {
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  // Duplicate items to create a seamless infinite loop
  const displayItems = [...items, ...items];
  const duration = items.length * 5;

  return (
    <>
      <style>{`
        @keyframes archtivy-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="relative mt-8 overflow-hidden border-y border-zinc-100 py-2.5 dark:border-zinc-800"
        aria-hidden
      >
        <div
          className="flex gap-10 whitespace-nowrap"
          style={{
            animation: `archtivy-ticker ${duration}s linear infinite`,
            willChange: "transform",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState = "paused";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState = "running";
          }}
        >
          {displayItems.map((item, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500"
            >
              <span
                className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600"
                aria-hidden
              />
              {item.text}
            </span>
          ))}
        </div>
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white dark:from-zinc-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white dark:from-zinc-950" />
      </div>
    </>
  );
}
