"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CategoryMegaPanel } from "@/components/explore/filters/CategoryMegaPanel";
import { SearchableFilterPanel } from "@/components/explore/filters/SearchableFilterPanel";
import { RangeFilterPanel } from "@/components/explore/filters/RangeFilterPanel";
import { FacetFilterPills } from "@/components/explore/filters/FacetFilterPills";
import { FollowFilterAction } from "@/components/follow/FollowFilterAction";
import type { ExploreFilters } from "@/lib/explore/filters/schema";
import { filtersToQueryString, buildExploreUrl } from "@/lib/explore/filters/query";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";

const STYLE_FACET_SLUGS = new Set(["design-style"]);

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

  const clearAll = useCallback(() => {
    router.push(type === "products" ? "/explore/products" : "/explore/projects");
  }, [type, router]);

  const styleFacets = options.facets.filter((f) => STYLE_FACET_SLUGS.has(f.slug));
  const taxonomyPillQs = filtersToQueryString(currentFilters, type).toString();

  // Derive popular locations (top 6 by frequency — they appear first in the sorted options array)
  const popularLocationValues = options.locations.slice(0, 6).map((l) => l.value);

  // ── Active filter tags ─────────────────────────────────────────────────────

  const activeTags: { key: string; label: string; onRemove: () => void }[] = [];

  if (currentFilters.taxonomy) {
    const label = currentFilters.taxonomy.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? currentFilters.taxonomy;
    activeTags.push({ key: "taxonomy", label, onRemove: () => {
      const base = type === "products" ? "/explore/products" : "/explore/projects";
      const qs = taxonomyPillQs ? `?${taxonomyPillQs}` : "";
      router.push(`${base}${qs}`);
    }});
  }
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
  if (currentFilters.area_bucket) {
    const opt = options.areas.find((o) => o.value === currentFilters.area_bucket);
    activeTags.push({ key: "area", label: `Area: ${opt?.label ?? currentFilters.area_bucket}`, onRemove: () => update({ area_bucket: null }) });
  }
  if (currentFilters.year != null) {
    activeTags.push({ key: "year", label: `${currentFilters.year}`, onRemove: () => update({ year: null, year_min: null, year_max: null }) });
  } else if (currentFilters.year_min != null || currentFilters.year_max != null) {
    const parts = [];
    if (currentFilters.year_min != null) parts.push(`From ${currentFilters.year_min}`);
    if (currentFilters.year_max != null) parts.push(`To ${currentFilters.year_max}`);
    activeTags.push({ key: "year-range", label: parts.join(" – "), onRemove: () => update({ year: null, year_min: null, year_max: null }) });
  }
  for (const facet of styleFacets) {
    const selected = currentFilters.facets[facet.slug] ?? [];
    for (const val of selected) {
      const fv = facet.values.find((v) => v.slug === val);
      activeTags.push({
        key: `facet-${facet.slug}-${val}`,
        label: fv?.label ?? val,
        onRemove: () => update({ facets: { ...currentFilters.facets, [facet.slug]: selected.filter((v) => v !== val) } }),
      });
    }
  }
  for (const b of currentFilters.brands) {
    const opt = options.brands.find((o) => o.value === b);
    activeTags.push({ key: `brand-${b}`, label: opt?.label ?? b, onRemove: () => update({ brands: currentFilters.brands.filter((v) => v !== b) }) });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2.5">
      {/* Filter row — exact order: Category, Location, Professional, Materials, Area, Year, Design Style */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* 1. Category */}
        {options.taxonomyTree.length > 0 && (
          <div className="flex items-center">
            <CategoryMegaPanel
              type={type}
              tree={options.taxonomyTree}
              currentSlugPath={currentFilters.taxonomy}
              queryString={taxonomyPillQs}
            />
            {/* Category follow, matching the materials control below it. The
                domain differs by explore type: a project category is a node in
                the "project" domain, a product category in "product". */}
            {currentFilters.taxonomy && (
              <FollowFilterAction
                targetType="category"
                slugPath={currentFilters.taxonomy}
                domain={type === "projects" ? "project" : "product"}
              />
            )}
          </div>
        )}

        {/* 2. Location — wide panel with popular suggestions */}
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
            wide
            popularValues={popularLocationValues}
          />
        )}

        {/* 3. Professional — wide searchable panel */}
        {options.designers.length > 0 && type === "projects" && (
          <SearchableFilterPanel
            label="Professional"
            options={options.designers}
            selected={currentFilters.designers}
            onChange={(values) => update({ designers: values })}
            placeholder="Search professionals..."
            wide
          />
        )}

        {/* 4. Materials — searchable multi-select */}
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

        {/* 5. Area — range input */}
        {options.areas.length > 0 && type === "projects" && (
          <RangeFilterPanel
            label="Area"
            minLabel="Min sqft"
            maxLabel="Max sqft"
            minValue={currentFilters.area_bucket === "<500" ? "" : currentFilters.area_bucket?.split("-")[0] ?? ""}
            maxValue={currentFilters.area_bucket === "8000+" ? "" : currentFilters.area_bucket?.split("-")[1] ?? ""}
            onChange={(min, max) => {
              // Map back to the closest area bucket
              if (!min && !max) { update({ area_bucket: null }); return; }
              const minN = parseInt(min, 10) || 0;
              const maxN = parseInt(max, 10) || 999999;
              const buckets = ["<500", "500-1000", "1000-2000", "2000-4000", "4000-8000", "8000+"] as const;
              const match = buckets.find((b) => {
                if (b === "<500") return maxN <= 500;
                if (b === "8000+") return minN >= 8000;
                const [lo, hi] = b.split("-").map(Number);
                return minN >= lo && maxN <= hi;
              });
              update({ area_bucket: (match as ExploreFilters["area_bucket"]) ?? null });
            }}
            placeholder={["0", "10000"]}
          />
        )}

        {/* 6. Year — range input */}
        {options.years.length > 0 && (
          <RangeFilterPanel
            label="Year"
            minLabel="From"
            maxLabel="To"
            minValue={currentFilters.year_min != null ? String(currentFilters.year_min) : currentFilters.year != null ? String(currentFilters.year) : ""}
            maxValue={currentFilters.year_max != null ? String(currentFilters.year_max) : currentFilters.year != null ? String(currentFilters.year) : ""}
            onChange={(min, max) => {
              const minN = parseInt(min, 10);
              const maxN = parseInt(max, 10);
              if (!min && !max) {
                update({ year: null, year_min: null, year_max: null });
              } else if (min === max && !Number.isNaN(minN)) {
                update({ year: minN, year_min: null, year_max: null });
              } else {
                update({
                  year: null,
                  year_min: Number.isNaN(minN) ? null : minN,
                  year_max: Number.isNaN(maxN) ? null : maxN,
                });
              }
            }}
            placeholder={["2000", "2026"]}
          />
        )}

        {/* 7. Design Style — compact facet */}
        <FacetFilterPills
          facets={styleFacets}
          currentFacets={currentFilters.facets}
          onFacetChange={(facetSlug, values) => {
            update({ facets: { ...currentFilters.facets, [facetSlug]: values } });
          }}
        />

        {/* Brands — products only */}
        {options.brands.length > 0 && type === "products" && (
          <SearchableFilterPanel
            label="Brands"
            options={options.brands}
            selected={currentFilters.brands}
            onChange={(values) => update({ brands: values })}
            placeholder="Search brands..."
          />
        )}

        {/* Color — products only */}
        {options.colors.length > 0 && type === "products" && (
          <SearchableFilterPanel
            label="Color"
            options={options.colors}
            selected={currentFilters.color}
            onChange={(values) => update({ color: values })}
          />
        )}

        {/* Material type — products only */}
        {options.materialTypes.length > 0 && type === "products" && (
          <SearchableFilterPanel
            label="Material type"
            options={options.materialTypes}
            selected={currentFilters.material_type}
            onChange={(values) => update({ material_type: values })}
          />
        )}
      </div>

      {/* Active filter tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              style={{ borderRadius: 3 }}
            >
              {tag.label}
              <button
                type="button"
                onClick={tag.onRemove}
                className="ml-0.5 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-100"
                aria-label={`Remove ${tag.label}`}
              >
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </span>
          ))}
          {activeTags.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
