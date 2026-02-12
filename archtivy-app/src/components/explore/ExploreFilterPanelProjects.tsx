"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  type ProjectFilters,
  DEFAULT_PROJECT_FILTERS,
  projectFiltersToSearchParams,
  PROJECT_AREA_BUCKETS,
  SORT_OPTIONS_PROJECTS,
  type ProjectSortOption,
} from "@/lib/exploreFilters";
import { MaterialsFilterMultiSelect } from "@/components/explore/MaterialsFilterMultiSelect";

function buildQueryString(params: Record<string, string>, sort?: string): string {
  const search = new URLSearchParams(params);
  if (sort && sort !== "newest") search.set("sort", sort);
  const q = search.toString();
  return q ? `?${q}` : "";
}

export interface ExploreFilterPanelProjectsProps {
  currentFilters: ProjectFilters;
  sort: ProjectSortOption;
  categories: string[];
  materials: { slug: string; display_name: string }[];
}

export function ExploreFilterPanelProjects({
  currentFilters,
  sort,
  categories,
  materials = [],
}: ExploreFilterPanelProjectsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (filters: ProjectFilters, newSort?: ProjectSortOption) => {
    const params = projectFiltersToSearchParams(filters);
    const qs = buildQueryString(params, newSort ?? sort);
    router.push(`${pathname}${qs}`);
  };

  const clearAll = () => navigate(DEFAULT_PROJECT_FILTERS, "newest");

  const hasActiveFilters =
    currentFilters.category.length > 0 ||
    currentFilters.year != null ||
    currentFilters.year_min != null ||
    currentFilters.year_max != null ||
    currentFilters.country != null ||
    currentFilters.city != null ||
    currentFilters.area_bucket != null ||
    currentFilters.materials.length > 0;

  const toggleCategory = (c: string) => {
    const next = currentFilters.category.includes(c)
      ? currentFilters.category.filter((x) => x !== c)
      : [...currentFilters.category, c];
    navigate({ ...currentFilters, category: next });
  };

  const setAreaBucket = (bucket: string | null) => {
    navigate({
      ...currentFilters,
      area_bucket: bucket as ProjectFilters["area_bucket"],
    });
  };

  const setSort = (newSort: ProjectSortOption) => {
    navigate(currentFilters, newSort);
  };

  return (
    <aside
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Filter projects"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-archtivy-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 space-y-5">
        {/* Sort */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Sort
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProjectSortOption)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {SORT_OPTIONS_PROJECTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Category
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const active = currentFilters.category.includes(c);
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-archtivy-primary text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {c}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Year range */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Year
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              min={1900}
              max={2100}
              value={currentFilters.year_min ?? currentFilters.year ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : null;
                navigate({
                  ...currentFilters,
                  year: null,
                  year_min: Number.isNaN(v as number) ? null : (v as number),
                  year_max: currentFilters.year_max,
                });
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="number"
              placeholder="Max"
              min={1900}
              max={2100}
              value={currentFilters.year_max ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : null;
                navigate({
                  ...currentFilters,
                  year: null,
                  year_max: Number.isNaN(v as number) ? null : (v as number),
                });
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Location
          </span>
          <input
            type="text"
            placeholder="Country"
            value={currentFilters.country ?? ""}
            onChange={(e) =>
              navigate({ ...currentFilters, country: e.target.value.trim() || null })
            }
            className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            placeholder="City"
            value={currentFilters.city ?? ""}
            onChange={(e) =>
              navigate({ ...currentFilters, city: e.target.value.trim() || null })
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Area bucket */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Area (sqft)
          </span>
          <ul className="space-y-1">
            {PROJECT_AREA_BUCKETS.map((bucket) => {
              const active = currentFilters.area_bucket === bucket;
              const label = bucket === "8000+" ? "8,000+" : bucket.replace("-", " – ");
              return (
                <li key={bucket}>
                  <button
                    type="button"
                    onClick={() => setAreaBucket(active ? null : bucket)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      active
                        ? "bg-archtivy-primary/10 text-archtivy-primary dark:bg-archtivy-primary/20"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Materials */}
        {materials.length > 0 && (
          <MaterialsFilterMultiSelect
            options={materials}
            selectedSlugs={currentFilters.materials}
            onChange={(next) => navigate({ ...currentFilters, materials: next })}
          />
        )}
      </div>
    </aside>
  );
}
