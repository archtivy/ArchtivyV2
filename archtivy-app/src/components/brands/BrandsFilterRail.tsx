"use client";

import {
  FilterSection as Section,
  FilterCheckList as CheckList,
} from "@/components/directory/FilterPrimitives";
import type { BrandFacets } from "@/lib/db/brandsDirectory";

/**
 * Brands filter rail (brief §3). Shared primitives, no parallel implementation.
 *
 *   Category        real — 11 values, every product classified
 *   Origin          real — 12 countries, with the search-within-filter input
 *   Brand Type      real and FULLY populated (17/17). Values are the four the
 *                   records actually carry, not the reference's
 *                   Manufacturer / Studio-Design Brand / Craft-Artisan.
 *   Sustainability  ABSENT — 2 brands of 17 carry any sustainability facet, via
 *                   3 products. Rendering it would imply the other 15 are not
 *                   sustainable, which nothing in the data says.
 *   Projects        one checkbox, not a range: only 4 of 17 brands have a
 *                   product used in a project.
 */

export interface BrandFilterState {
  categories: string[];
  brandTypes: string[];
  countries: string[];
  withProjectsOnly: boolean;
}

export const EMPTY_BRAND_FILTERS: BrandFilterState = {
  categories: [],
  brandTypes: [],
  countries: [],
  withProjectsOnly: false,
};

export function BrandsFilterRail({
  facets,
  filters,
  onChange,
  onReset,
}: {
  facets: BrandFacets;
  filters: BrandFilterState;
  onChange: (next: BrandFilterState) => void;
  onReset: () => void;
}) {
  const toggle =
    (key: "categories" | "brandTypes" | "countries") =>
    (value: string) => {
      const list = filters[key];
      onChange({
        ...filters,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      });
    };

  const active =
    filters.categories.length +
    filters.brandTypes.length +
    filters.countries.length +
    (filters.withProjectsOnly ? 1 : 0);

  return (
    <div className="rounded-xl border border-hairline bg-cream p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-body text-[14px] text-ink">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          disabled={active === 0}
          className="font-body text-[12px] text-muted underline underline-offset-4 transition-colors hover:text-ink disabled:no-underline disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {facets.categories.length > 0 && (
        <Section label="Category" count={facets.categories.length} defaultOpen>
          <CheckList
            values={facets.categories}
            selected={filters.categories}
            onToggle={toggle("categories")}
          />
        </Section>
      )}

      {facets.countries.length > 0 && (
        <Section label="Origin" count={facets.countries.length} defaultOpen>
          <CheckList
            values={facets.countries}
            selected={filters.countries}
            onToggle={toggle("countries")}
            searchPlaceholder="Search countries"
          />
        </Section>
      )}

      {facets.brandTypes.length > 0 && (
        <Section label="Brand Type" count={facets.brandTypes.length} defaultOpen>
          <CheckList
            values={facets.brandTypes}
            selected={filters.brandTypes}
            onToggle={toggle("brandTypes")}
          />
        </Section>
      )}

      {facets.withProjectsCount > 0 && (
        <Section label="Projects" defaultOpen>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={filters.withProjectsOnly}
              onChange={() =>
                onChange({ ...filters, withProjectsOnly: !filters.withProjectsOnly })
              }
              className="h-3.5 w-3.5 shrink-0 accent-ink"
            />
            <span className="min-w-0 flex-1 font-body text-[13px] text-ink">
              Used in a project
            </span>
            <span className="font-body text-[12px] text-muted">{facets.withProjectsCount}</span>
          </label>
        </Section>
      )}
    </div>
  );
}
