"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export type ExploreViewMode = "grid" | "map" | "intelligence";

const VIEWS: { mode: ExploreViewMode; label: string }[] = [
  { mode: "grid", label: "Grid" },
  { mode: "map", label: "Map" },
  { mode: "intelligence", label: "Intelligence" },
];

export function ExploreViewSwitcher({ current }: { current: ExploreViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setView = useCallback(
    (mode: ExploreViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "grid") {
        params.delete("view");
      } else {
        params.set("view", mode);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
      {VIEWS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => setView(mode)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            current === mode
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
