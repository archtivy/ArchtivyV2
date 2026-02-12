"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  type ProductFilters,
  DEFAULT_PRODUCT_FILTERS,
  productFiltersToSearchParams,
  SORT_OPTIONS_PRODUCTS,
  type ProductSortOption,
} from "@/lib/exploreFilters";
import { MaterialsFilterMultiSelect } from "@/components/explore/MaterialsFilterMultiSelect";

function buildQueryString(params: Record<string, string>, sort?: string): string {
  const search = new URLSearchParams(params);
  if (sort && sort !== "newest") search.set("sort", sort);
  const q = search.toString();
  return q ? `?${q}` : "";
}

export interface ExploreFilterPanelProductsProps {
  currentFilters: ProductFilters;
  sort: ProductSortOption;
  categories: string[];
  materialTypes: string[];
  colors: string[];
  brands: { id: string; name: string }[];
  materials: { slug: string; display_name: string }[];
}

export function ExploreFilterPanelProducts({
  currentFilters,
  sort,
  categories,
  materialTypes,
  colors,
  brands,
  materials = [],
}: ExploreFilterPanelProductsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (filters: ProductFilters, newSort?: ProductSortOption) => {
    const params = productFiltersToSearchParams(filters);
    const qs = buildQueryString(params, newSort ?? sort);
    router.push(`${pathname}${qs}`);
  };

  const clearAll = () => navigate(DEFAULT_PRODUCT_FILTERS, "newest");

  const hasActiveFilters =
    currentFilters.category.length > 0 ||
    currentFilters.year != null ||
    currentFilters.year_min != null ||
    currentFilters.year_max != null ||
    currentFilters.material_type.length > 0 ||
    currentFilters.color.length > 0 ||
    currentFilters.materials.length > 0 ||
    currentFilters.brand != null;

  const toggleCategory = (c: string) => {
    const next = currentFilters.category.includes(c)
      ? currentFilters.category.filter((x) => x !== c)
      : [...currentFilters.category, c];
    navigate({ ...currentFilters, category: next });
  };

  const toggleMaterialType = (m: string) => {
    const next = currentFilters.material_type.includes(m)
      ? currentFilters.material_type.filter((x) => x !== m)
      : [...currentFilters.material_type, m];
    navigate({ ...currentFilters, material_type: next });
  };

  const toggleColor = (c: string) => {
    const next = currentFilters.color.includes(c)
      ? currentFilters.color.filter((x) => x !== c)
      : [...currentFilters.color, c];
    navigate({ ...currentFilters, color: next });
  };

  const setSort = (newSort: ProductSortOption) => {
    navigate(currentFilters, newSort);
  };

  return (
    <aside
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Filter products"
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
            onChange={(e) => setSort(e.target.value as ProductSortOption)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {SORT_OPTIONS_PRODUCTS.map((opt) => (
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

        {/* Year */}
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

        {/* Material type */}
        {materialTypes.length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Material type
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {materialTypes.map((m) => {
                const active = currentFilters.material_type.includes(m);
                return (
                  <li key={m}>
                    <button
                      type="button"
                      onClick={() => toggleMaterialType(m)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-archtivy-primary text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {m}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Color */}
        {colors.length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Color
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {colors.map((c) => {
                const active = currentFilters.color.includes(c);
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => toggleColor(c)}
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

        {/* Brand */}
        {brands.length > 0 && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Brand
            </span>
            <select
              value={currentFilters.brand ?? ""}
              onChange={(e) =>
                navigate({
                  ...currentFilters,
                  brand: e.target.value.trim() || null,
                })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Product materials */}
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
