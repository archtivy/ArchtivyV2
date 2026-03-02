"use client";

import { useEffect, useRef, useState } from "react";

interface ActivityItem {
  text: string;
}

export function LiveActivityStrip() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (items.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 250);
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items]);

  if (items.length === 0) return null;

  const currentText = items[activeIndex]?.text ?? "";

  return (
    <div className="mt-8 border-t border-zinc-100 pt-5 dark:border-zinc-800">
      <p
        className="text-center text-sm font-medium text-gray-700 dark:text-zinc-300"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 250ms ease",
          minHeight: "1.25rem",
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {currentText}
      </p>
    </div>
  );
}
