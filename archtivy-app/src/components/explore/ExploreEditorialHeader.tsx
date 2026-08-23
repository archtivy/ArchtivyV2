"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { Container } from "@/components/layout/Container";
import type { ExploreFilters, ExploreType } from "@/lib/explore/filters/schema";
import { EXPLORE_SORT_PROJECTS, EXPLORE_SORT_PRODUCTS } from "@/lib/explore/filters/schema";
import { buildExploreUrl } from "@/lib/explore/filters/query";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";
import type { ExploreNetworkCounts } from "@/lib/db/explore";
import type { PlatformStats } from "@/lib/db/platformActivity";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  year_desc: "Year",
  area_desc: "Area",
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
      const filtersWithSort = { ...currentFilters, sort: value };
      router.push(buildExploreUrl(type, currentFilters.taxonomy, filtersWithSort));
    },
    [currentFilters, type, router]
  );

  // Build metadata stat fragments
  const statParts: string[] = [];
  if (counts) {
    if (type === "projects" && counts.projectCount > 0) {
      statParts.push(`${formatCount(counts.projectCount)} projects`);
    }
    if (type === "products" && counts.productCount > 0) {
      statParts.push(`${formatCount(counts.productCount)} products`);
    }
    if (type === "projects" && counts.productCount > 0) {
      statParts.push(`${formatCount(counts.productCount)} connected products`);
    }
    if (type === "products" && counts.connectionCount != null && counts.connectionCount > 0) {
      statParts.push(`${formatCount(counts.connectionCount)} project appearances`);
    }
    if (platformStats?.professionalsCount) {
      statParts.push(`${formatCount(platformStats.professionalsCount)} professionals`);
    }
    if (type === "projects" && platformStats?.countriesCount && platformStats.countriesCount > 0) {
      statParts.push(`${platformStats.countriesCount} countries`);
    }
  }

  const title = type === "projects" ? "Explore Projects" : "Explore Products";
  const subtitle =
    type === "projects"
      ? "A curated index of architecture, interiors, and material decisions."
      : "Discover products specified in real architectural projects.";

  const currentSortLabel = SORT_LABELS[sort] ?? "Newest";

  // Sort dropdown portal
  const sortPanel =
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
              className="border border-hairline bg-cream py-1 shadow-sm"
              style={{
                position: "fixed",
                top: sortPos.top,
                right: sortPos.right,
                minWidth: 150,
                zIndex: 1000,
                borderRadius: 4,
              }}
            >
              {sortOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSortChange(s)}
                  className={`flex w-full items-center px-3.5 py-1.5 text-left text-sm transition hover:bg-stone/40 ${
                    sort === s
                      ? "font-medium text-ink"
                      : "text-muted"
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
    <header aria-label="Explore header">
      <Container>
        {/* Title + subtitle — left-aligned */}
        <div className="pt-10 pb-4 sm:pt-12">
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            {subtitle}
          </p>

          {/* Stats as a single metadata line */}
          {statParts.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              {statParts.join(" · ")}
            </p>
          )}
        </div>

        {/* Filter row + sort */}
        <div className="flex items-start gap-2 border-t border-hairline pt-4 pb-5">
          <div className="min-w-0 flex-1">
            <ExploreFilterBar
              type={type}
              currentFilters={currentFilters}
              options={options}
              sort={sort}
              hideSort
            />
          </div>

          <div className="shrink-0">
            <button
              ref={sortTriggerRef}
              type="button"
              onClick={() => {
                setSortOpen((prev) => !prev);
                if (!sortOpen) setTimeout(updateSortPos, 0);
              }}
              className="flex items-center gap-1 rounded border border-hairline bg-cream px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-ink/40 hover:bg-stone/40 hover:text-ink"
              style={{ borderRadius: 4 }}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              {currentSortLabel}
              <svg
                width="8"
                height="8"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className={`text-muted transition-transform duration-150 ${sortOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {sortPanel}
          </div>
        </div>
      </Container>
    </header>
  );
}
