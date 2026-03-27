"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CategoryMegaPanel } from "@/components/explore/filters/CategoryMegaPanel";
import { SearchableFilterPanel } from "@/components/explore/filters/SearchableFilterPanel";
import { FacetFilterPills } from "@/components/explore/filters/FacetFilterPills";
import { FollowFilterAction } from "@/components/follow/FollowFilterAction";
import type { ExploreFilters } from "@/lib/explore/filters/schema";
import { filtersToQueryString, buildExploreUrl } from "@/lib/explore/filters/query";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";

/** Facet slugs shown as inline pills alongside other primary filters. */
const PRIMARY_FACET_SLUGS = new Set(["design-style"]);

export interface ExploreFilterBarProps {
  type: "projects" | "products";
  currentFilters: ExploreFilters;
  options: ExploreFilterOptions;
  sort: string;
  hideSort?: boolean;
}

export function ExploreFilterBar({
  type,
  currentFilters,
  options,
}: ExploreFilterBarProps) {
  const router = useRouter();

  const navigate = useCallback(
    (filters: ExploreFilters) => {
      router.push(buildExploreUrl(type, filters.taxonomy, filters));
    },
    [type, router]
  );

  const update = useCallback(
    (patch: Partial<ExploreFilters>) => {
      navigate({ ...currentFilters, ...patch });
    },
    [currentFilters, navigate]
  );

  // Split facets
  const primaryFacets = options.facets.filter((f) => PRIMARY_FACET_SLUGS.has(f.slug));

  // Build query string for the taxonomy pill (filters minus taxonomy)
  const taxonomyPillQs = filtersToQueryString(currentFilters, type).toString();

  // Collect active filter tags for display below the bar
  const activeTags: { key: string; label: string; onRemove: () => void }[] = [];

  if (currentFilters.city || currentFilters.country) {
    const loc = [currentFilters.city, currentFilters.country].filter(Boolean).join(", ");
    activeTags.push({ key: "location", label: loc, onRemove: () => update({ city: null, country: null }) });
  }
  for (const d of currentFilters.designers) {
    const opt = options.designers.find((o) => o.value === d);
    activeTags.push({ key: `designer-${d}`, label: opt?.label ?? d, onRemove: () => update({ designers: currentFilters.designers.filter((v) => v !== d) }) });
  }
  for (const m of currentFilters.materials) {
    const opt = options.materials.find((o) => o.value === m);
    activeTags.push({ key: `material-${m}`, label: opt?.label ?? m, onRemove: () => update({ materials: currentFilters.materials.filter((v) => v !== m) }) });
  }
  if (currentFilters.year != null) {
    activeTags.push({ key: "year", label: String(currentFilters.year), onRemove: () => update({ year: null }) });
  }
  if (currentFilters.area_bucket) {
    const opt = options.areas.find((o) => o.value === currentFilters.area_bucket);
    activeTags.push({ key: "area", label: opt?.label ?? currentFilters.area_bucket, onRemove: () => update({ area_bucket: null }) });
  }
  for (const b of currentFilters.brands) {
    const opt = options.brands.find((o) => o.value === b);
    activeTags.push({ key: `brand-${b}`, label: opt?.label ?? b, onRemove: () => update({ brands: currentFilters.brands.filter((v) => v !== b) }) });
  }

  return (
    <div className="space-y-2">
      {/* Filter buttons row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Primary filters */}

        {/* Category — mega panel */}
        {options.taxonomyTree.length > 0 && (
          <CategoryMegaPanel
            type={type}
            tree={options.taxonomyTree}
            currentSlugPath={currentFilters.taxonomy}
            queryString={taxonomyPillQs}
          />
        )}

        {/* Location — searchable */}
        {options.locations.length > 0 && (
          <SearchableFilterPanel
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
            placeholder="Search city or country..."
          />
        )}

        {/* Professionals — searchable */}
        {options.designers.length > 0 && type === "projects" && (
          <SearchableFilterPanel
            label="Professionals"
            options={options.designers}
            selected={currentFilters.designers}
            onChange={(values) => update({ designers: values })}
            placeholder="Search professionals..."
          />
        )}

        {/* Materials — searchable + multi-select */}
        {options.materials.length > 0 && (
          <div className="flex items-center">
            <SearchableFilterPanel
              label="Materials"
              options={options.materials}
              selected={currentFilters.materials}
              onChange={(values) => update({ materials: values })}
              placeholder="Search materials..."
            />
            {currentFilters.materials.length === 1 && (
              <FollowFilterAction
                targetType="material"
                slugPath={currentFilters.materials[0]}
                domain="material"
              />
            )}
          </div>
        )}

        {/* Secondary filters — compact style */}

        {/* Year */}
        {options.years.length > 0 && (
          <SearchableFilterPanel
            label="Year"
            options={options.years}
            selected={currentFilters.year != null ? [String(currentFilters.year)] : []}
            onChange={(values) => {
              const v = values[0];
              if (!v) update({ year: null, year_min: null, year_max: null });
              else {
                const n = parseInt(v, 10);
                update({ year: Number.isNaN(n) ? null : n, year_min: null, year_max: null });
              }
            }}
            multi={false}
            placeholder="Search year..."
          />
        )}

        {/* Area */}
        {options.areas.length > 0 && type === "projects" && (
          <SearchableFilterPanel
            label="Area"
            options={options.areas}
            selected={currentFilters.area_bucket ? [currentFilters.area_bucket] : []}
            onChange={(values) => update({ area_bucket: values[0] ? (values[0] as ExploreFilters["area_bucket"]) : null })}
            multi={false}
            placeholder="Select area range..."
          />
        )}

        {/* Brands (products) */}
        {options.brands.length > 0 && (
          <SearchableFilterPanel
            label="Brands"
            options={options.brands}
            selected={currentFilters.brands}
            onChange={(values) => update({ brands: values })}
            placeholder="Search brands..."
          />
        )}

        {/* Color (products) */}
        {options.colors.length > 0 && type === "products" && (
          <SearchableFilterPanel
            label="Color"
            options={options.colors}
            selected={currentFilters.color}
            onChange={(values) => update({ color: values })}
            placeholder="Search colors..."
          />
        )}

        {/* Material type (products) */}
        {options.materialTypes.length > 0 && type === "products" && (
          <SearchableFilterPanel
            label="Material type"
            options={options.materialTypes}
            selected={currentFilters.material_type}
            onChange={(values) => update({ material_type: values })}
            placeholder="Search material types..."
          />
        )}

        {/* Primary facets (e.g. Design Style) */}
        <FacetFilterPills
          facets={primaryFacets}
          currentFacets={currentFilters.facets}
          onFacetChange={(facetSlug, values) => {
            update({ facets: { ...currentFilters.facets, [facetSlug]: values } });
          }}
        />
      </div>

      {/* Active filter tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              style={{ borderRadius: 3 }}
            >
              {tag.label}
              <button
                type="button"
                onClick={tag.onRemove}
                className="text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label={`Remove ${tag.label}`}
              >
                &times;
              </button>
            </span>
          ))}
          {activeTags.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const base = type === "products" ? "/explore/products" : "/explore/projects";
                router.push(base);
              }}
              className="text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
