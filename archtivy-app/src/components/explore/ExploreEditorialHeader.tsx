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
import type { PlatformStats } from "@/lib/db/platformActivity";

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
  platformStats?: PlatformStats | null;
}

export function ExploreEditorialHeader({
  type,
  counts,
  options,
  currentFilters,
  platformStats,
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

  // Primary dominant metric
  const primaryCount =
    counts != null
      ? type === "projects"
        ? `${formatCount(counts.projectCount)} Projects`
        : `${formatCount(counts.productCount)} Products`
      : null;

  // Secondary metrics line (contextual labeling per page type)
  const secondaryParts: string[] = [];
  if (counts != null) {
    if (type === "projects") {
      if (counts.productCount > 0) {
        secondaryParts.push(`${formatCount(counts.productCount)} Connected Products`);
      }
      if (platformStats?.professionalsCount) {
        const profStr = `${formatCount(platformStats.professionalsCount)} Professionals`;
        const locStr =
          platformStats.countriesCount > 0
            ? `${profStr} across ${platformStats.countriesCount} ${platformStats.countriesCount === 1 ? "Country" : "Countries"}`
            : profStr;
        secondaryParts.push(locStr);
      }
    } else {
      if (counts.connectionCount != null && counts.connectionCount > 0) {
        secondaryParts.push(`${formatCount(counts.connectionCount)} Appearances in Projects`);
      }
      if (platformStats?.professionalsCount) {
        secondaryParts.push(`${formatCount(platformStats.professionalsCount)} Professionals`);
      }
      if (platformStats?.countriesCount) {
        secondaryParts.push(`${platformStats.countriesCount} ${platformStats.countriesCount === 1 ? "Country" : "Countries"}`);
      }
    }
  }
  const secondaryLine = secondaryParts.length > 0 ? secondaryParts.join(" · ") : null;

  // Micro-activity line — real-time signal below stats
  const microParts: string[] = [];
  if (platformStats?.projectsThisWeek > 0) {
    if (type === "projects") {
      microParts.push(
        `${platformStats.projectsThisWeek} new project${platformStats.projectsThisWeek !== 1 ? "s" : ""} this week`
      );
    } else {
      microParts.push(
        `${platformStats.projectsThisWeek} new project connections this week`
      );
    }
  }
  const microLine = microParts.length > 0 ? microParts.join(" · ") : null;

  const title = type === "projects" ? "Explore Projects" : "Explore Products";
  const subline =
    type === "projects"
      ? "A living index of architectural work and its material decisions."
      : "Discover products specified in real architectural projects.";

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
              className="border border-zinc-200 bg-white py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                position: "fixed",
                top: sortPos.top,
                right: sortPos.right,
                minWidth: 160,
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
                      : "text-zinc-600 dark:text-zinc-300"
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
        {/* Top section: 2-column — title/stats left, sort right */}
        <div className="flex items-start justify-between gap-6 pb-6 pt-6 sm:pb-7 sm:pt-8">
          {/* Left: title + subline + stats hierarchy */}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
              {title}
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-zinc-300">
              {subline}
            </p>

            {/* Stats — two-tier visual hierarchy */}
            {primaryCount && (
              <div className="mt-4 space-y-0.5">
                <p className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                  {primaryCount}
                </p>
                {secondaryLine && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {secondaryLine}
                  </p>
                )}
                {microLine && (
                  <p className="pt-1.5 text-sm text-gray-600 dark:text-zinc-400">
                    {microLine}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: sort — compact, lower visual weight */}
          <div className="shrink-0 pt-1">
            <button
              ref={sortTriggerRef}
              type="button"
              onClick={() => {
                setSortOpen((prev) => !prev);
                if (!sortOpen) setTimeout(updateSortPos, 0);
              }}
              className="flex items-center gap-1.5 border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
              style={{ borderRadius: 4 }}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              <span className="text-zinc-400 dark:text-zinc-500">Sort:</span>
              <span className="font-medium">{currentSortLabel}</span>
              <svg
                width="9"
                height="9"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className={`shrink-0 text-zinc-400 transition-transform duration-150 ${sortOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {sortPanelContent}
          </div>
        </div>

        {/* Subtle divider between content and search */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/60" />

        {/* Search bar — slightly reduced height */}
        <div className="py-3.5">
          <ExploreSearchBar
            type={type}
            currentFilters={currentFilters}
            placeholder="Search by material, category, brand, or location…"
            className="w-full"
            inputClassName="h-10 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-[#002abf]"
            showCmdK
          />
        </div>

        {/* Filter row */}
        <div className="pb-4">
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
