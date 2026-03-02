"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FilterPillDropdown } from "@/components/explore/filters/FilterPillDropdown";
import type { ExploreFilters, ExploreType } from "@/lib/explore/filters/schema";
import { DEFAULT_EXPLORE_FILTERS } from "@/lib/explore/filters/schema";
import { filtersToQueryString, countActiveFilters } from "@/lib/explore/filters/query";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";
import { EXPLORE_SORT_PROJECTS, EXPLORE_SORT_PRODUCTS } from "@/lib/explore/filters/schema";

const FILTERS_PANEL_Z = 1000;
const FILTERS_BACKDROP_Z = 999;

export interface ExploreFilterBarProps {
  type: "projects" | "products";
  currentFilters: ExploreFilters;
  options: ExploreFilterOptions;
  sort: string;
  /** When true, hides the sort control inside the Filters panel (sort is shown externally). */
  hideSort?: boolean;
}

export function ExploreFilterBar({
  type,
  currentFilters,
  options,
  sort,
  hideSort = false,
}: ExploreFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersPanelPos, setFiltersPanelPos] = useState({ top: 0, left: 0, right: 0 });
  const filtersTriggerRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const updateFiltersPanelPos = useCallback(() => {
    const el = filtersTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFiltersPanelPos({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right });
  }, []);

  const navigate = useCallback(
    (filters: ExploreFilters, newSort?: string) => {
      const qs = filtersToQueryString(filters, type);
      if (newSort && newSort !== "newest") qs.set("sort", newSort);
      const search = qs.toString();
      router.push(search ? `${pathname}?${search}` : pathname);
    },
    [type, pathname, router]
  );

  const update = useCallback(
    (patch: Partial<ExploreFilters>) => {
      navigate({ ...currentFilters, ...patch });
    },
    [currentFilters, navigate]
  );

  const clearAll = useCallback(() => {
    setFiltersOpen(false);
    navigate(DEFAULT_EXPLORE_FILTERS, "newest");
  }, [navigate]);

  useEffect(() => {
    if (!filtersOpen) return;
    updateFiltersPanelPos();
    const onScrollOrResize = () => updateFiltersPanelPos();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [filtersOpen, updateFiltersPanelPos]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filtersOpen &&
        filtersTriggerRef.current &&
        !filtersTriggerRef.current.contains(target) &&
        filtersPanelRef.current &&
        !filtersPanelRef.current.contains(target)
      ) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  const activeCount = countActiveFilters(currentFilters, type);
  const sortOptions = type === "projects" ? EXPLORE_SORT_PROJECTS : EXPLORE_SORT_PRODUCTS;

  const filtersPanelContent =
    filtersOpen && typeof document !== "undefined" ? (
      <>
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: FILTERS_BACKDROP_Z, backgroundColor: "rgba(0,0,0,0.3)" }}
          aria-hidden
          onClick={() => setFiltersOpen(false)}
        />
        <div
          ref={filtersPanelRef}
          className="w-56 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            position: "fixed",
            top: filtersPanelPos.top,
            right: filtersPanelPos.right,
            left: "auto",
            zIndex: FILTERS_PANEL_Z,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-700">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Active filters</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-medium text-[#002abf] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          {activeCount === 0 && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No filters applied</p>
          )}
          {!hideSort && sortOptions.length > 1 && (
            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Sort
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setFiltersOpen(false);
                  navigate(currentFilters, e.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {sortOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "newest"
                      ? "Newest"
                      : s === "year_desc"
                        ? "Year (newest first)"
                        : s === "area_desc"
                          ? "Largest area"
                          : s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible pb-2 scrollbar-thin md:flex-wrap">
        {options.categories.length > 0 && (
          <FilterPillDropdown
            label="Categories"
            options={options.categories}
            selected={currentFilters.category}
            onChange={(values) => update({ category: values })}
            data-testid="filter-categories"
          />
        )}
        {options.locations.length > 0 && (
          <FilterPillDropdown
            label="Location"
            options={options.locations}
            selected={
              currentFilters.city || currentFilters.country
                ? [
                    options.locations.find(
                      (l) => l.city === currentFilters.city && l.country === currentFilters.country
                    )?.value ?? JSON.stringify({ city: currentFilters.city, country: currentFilters.country }),
                  ]
                : []
            }
            onChange={(values) => {
              const v = values[0];
              if (!v) update({ city: null, country: null });
              else {
                try {
                  const { city, country } = JSON.parse(v) as { city: string | null; country: string | null };
                  update({ city: city ?? null, country: country ?? null });
                } catch {
                  update({ city: null, country: null });
                }
              }
            }}
            multi={false}
            data-testid="filter-location"
          />
        )}
        {options.designers.length > 0 && type === "projects" && (
          <FilterPillDropdown
            label="Designers"
            options={options.designers}
            selected={currentFilters.designers}
            onChange={(values) => update({ designers: values })}
            data-testid="filter-designers"
          />
        )}
        {options.brands.length > 0 && (
          <FilterPillDropdown
            label="Brands"
            options={options.brands}
            selected={currentFilters.brands}
            onChange={(values) => update({ brands: values })}
            data-testid="filter-brands"
          />
        )}
        {options.years.length > 0 && (
          <FilterPillDropdown
            label="Year"
            options={options.years}
            selected={
              currentFilters.year != null
                ? [String(currentFilters.year)]
                : currentFilters.year_min != null || currentFilters.year_max != null
                  ? []
                  : []
            }
            onChange={(values) => {
              const v = values[0];
              if (!v) update({ year: null, year_min: null, year_max: null });
              else {
                const n = parseInt(v, 10);
                update({ year: Number.isNaN(n) ? null : n, year_min: null, year_max: null });
              }
            }}
            multi={false}
            data-testid="filter-year"
          />
        )}
        {options.materials.length > 0 && (
          <FilterPillDropdown
            label="Materials"
            options={options.materials}
            selected={currentFilters.materials}
            onChange={(values) => update({ materials: values })}
            data-testid="filter-materials"
          />
        )}
        {options.areas.length > 0 && type === "projects" && (
          <FilterPillDropdown
            label="Area"
            options={options.areas}
            selected={currentFilters.area_bucket ? [currentFilters.area_bucket] : []}
            onChange={(values) => update({ area_bucket: values[0] ? (values[0] as ExploreFilters["area_bucket"]) : null })}
            multi={false}
            data-testid="filter-area"
          />
        )}
        {options.colors.length > 0 && type === "products" && (
          <FilterPillDropdown
            label="Color"
            options={options.colors}
            selected={currentFilters.color}
            onChange={(values) => update({ color: values })}
            data-testid="filter-color"
          />
        )}
        {options.materialTypes.length > 0 && type === "products" && (
          <FilterPillDropdown
            label="Material type"
            options={options.materialTypes}
            selected={currentFilters.material_type}
            onChange={(values) => update({ material_type: values })}
            data-testid="filter-material-type"
          />
        )}

        <div className="relative shrink-0">
          <button
            ref={filtersTriggerRef}
            type="button"
            onClick={() => {
              setFiltersOpen((prev) => !prev);
              if (!filtersOpen) setTimeout(updateFiltersPanelPos, 0);
            }}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeCount > 0
                ? "border-[#002abf] bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
            aria-expanded={filtersOpen}
            aria-label={`Filters, ${activeCount} active`}
          >
            Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </button>
          {filtersPanelContent && createPortal(filtersPanelContent, document.body)}
        </div>
      </div>
    </div>
  );
}
