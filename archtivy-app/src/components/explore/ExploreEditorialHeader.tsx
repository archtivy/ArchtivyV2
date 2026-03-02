"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { ExploreSearchBar } from "@/components/search/ExploreSearchBar";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { Container } from "@/components/layout/Container";
import type { ExploreFilters, ExploreType } from "@/lib/explore/filters/schema";
import { EXPLORE_SORT_PROJECTS, EXPLORE_SORT_PRODUCTS } from "@/lib/explore/filters/schema";
import { filtersToQueryString } from "@/lib/explore/filters/query";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";
import type { ExploreNetworkCounts } from "@/lib/db/explore";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  year_desc: "Year (newest first)",
  area_desc: "Largest area",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export interface ExploreEditorialHeaderProps {
  type: ExploreType;
  counts: ExploreNetworkCounts | null;
  options: ExploreFilterOptions;
  currentFilters: ExploreFilters;
}

export function ExploreEditorialHeader({
  type,
  counts,
  options,
  currentFilters,
}: ExploreEditorialHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sort = currentFilters.sort;
  const sortOptions = type === "projects" ? EXPLORE_SORT_PROJECTS : EXPLORE_SORT_PRODUCTS;

  const [sortOpen, setSortOpen] = useState(false);
  const [sortPos, setSortPos] = useState({ top: 0, right: 0 });
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const sortPanelRef = useRef<HTMLDivElement>(null);

  const updateSortPos = useCallback(() => {
    const el = sortTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSortPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, []);

  const handleSortChange = useCallback(
    (value: string) => {
      setSortOpen(false);
      const qs = filtersToQueryString(currentFilters, type);
      if (value && value !== "newest") qs.set("sort", value);
      else qs.delete("sort");
      const search = qs.toString();
      router.push(search ? `${pathname}?${search}` : pathname);
    },
    [currentFilters, type, pathname, router]
  );

  // Build stats line
  const statParts: string[] = [];
  if (counts != null) {
    statParts.push(`${formatCount(counts.projectCount)} Projects`);
    statParts.push(`${formatCount(counts.productCount)} Products`);
    if (counts.connectionCount != null) {
      statParts.push(`${formatCount(counts.connectionCount)} Connections`);
    }
  }
  const statsLine = statParts.length > 0 ? statParts.join(" · ") : null;

  const subline =
    type === "projects"
      ? "Mapped projects. Matched products."
      : "Explore products by material, brand, and usage.";

  const currentSortLabel = SORT_LABELS[sort] ?? "Newest";

  // Sort dropdown portal
  const sortPanelContent =
    sortOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 999 }}
              aria-hidden
              onClick={() => setSortOpen(false)}
            />
            <div
              ref={sortPanelRef}
              className="border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                position: "fixed",
                top: sortPos.top,
                right: sortPos.right,
                minWidth: 168,
                zIndex: 1000,
                borderRadius: 4,
              }}
            >
              {sortOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSortChange(s)}
                  className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                    sort === s
                      ? "font-medium text-[#002abf] dark:text-blue-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {SORT_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <header
      className="border-b border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950"
      aria-label="Explore header"
    >
      <Container>
        {/* Top row: title/subline/stats ← → sort control */}
        <div className="flex items-start justify-between gap-4 py-6 sm:py-8">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-light tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
              Explore
            </h1>
            <p className="mt-1 font-serif text-sm text-zinc-500 dark:text-zinc-400">
              {subline}
            </p>
            {statsLine && (
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500" aria-hidden>
                {statsLine}
              </p>
            )}
          </div>

          {/* Sort control */}
          <div className="shrink-0 self-start pt-1.5">
            <button
              ref={sortTriggerRef}
              type="button"
              onClick={() => {
                setSortOpen((prev) => !prev);
                if (!sortOpen) setTimeout(updateSortPos, 0);
              }}
              className="flex items-center gap-1.5 border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              style={{ borderRadius: 4 }}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              <span className="text-zinc-400 dark:text-zinc-500">Sort by:</span>
              <span className="font-medium">{currentSortLabel}</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className={`shrink-0 text-zinc-400 transition-transform duration-150 ${sortOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {sortPanelContent}
          </div>
        </div>

        {/* Search bar — 48px tall, radius 4px, full-width within Container */}
        <div className="pb-4">
          <ExploreSearchBar
            type={type}
            currentFilters={currentFilters}
            placeholder="Search projects, products, designers, brands, materials, cities…"
            className="w-full"
            inputClassName="h-12 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-[#002abf]"
            showCmdK
          />
        </div>

        {/* Filter row — refined pills, sort handled above */}
        <div className="pb-5">
          <ExploreFilterBar
            type={type}
            currentFilters={currentFilters}
            options={options}
            sort={sort}
            hideSort
          />
        </div>
      </Container>
    </header>
  );
}
