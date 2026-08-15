"use client";

import {
  FilterSection as Section,
  FilterCheckList as CheckList,
} from "@/components/directory/FilterPrimitives";
import type { ProductFacets } from "@/lib/db/productsDirectory";

/**
 * Products filter rail (brief §2, left column).
 *
 * Uses the same accordion/checkbox primitives as the Projects rail — only the
 * facet semantics differ. Sections render only where real data exists:
 *
 *   Location       OMITTED — 0 of 76 products carry any location
 *   Certifications OMITTED — no field exists; the one certification value
 *                  (fsc-certified) lives inside the Sustainability facet
 *
 * See the measurement table in lib/db/productsDirectory.ts.
 */

export interface ProductFilterState {
  categories: string[];
  brands: string[];
  colors: string[];
  materials: string[];
  finishes: string[];
  sustainability: string[];
  usedInProjectsOnly: boolean;
}

export const EMPTY_PRODUCT_FILTERS: ProductFilterState = {
  categories: [],
  brands: [],
  colors: [],
  materials: [],
  finishes: [],
  sustainability: [],
  usedInProjectsOnly: false,
};

export function ProductsFilterRail({
  facets,
  filters,
  onChange,
  onReset,
  usedInProjectsCount,
}: {
  facets: ProductFacets;
  filters: ProductFilterState;
  onChange: (next: ProductFilterState) => void;
  onReset: () => void;
  usedInProjectsCount: number;
}) {
  const toggle =
    (
      key: keyof Omit<ProductFilterState, "usedInProjectsOnly">
    ) =>
    (value: string) => {
      const list = filters[key];
      onChange({
        ...filters,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      });
    };

  return (
    <div className="rounded-xl border border-hairline bg-cream p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-body text-[12px] font-medium uppercase tracking-[0.08em] text-ink">
          Filters
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Reset all filters
        </button>
      </div>

      {/* Categories lead the rail and open by default, matching the reference. */}
      {facets.categories.length > 0 && (
        <Section label="Categories" count={facets.categories.length} defaultOpen>
          <CheckList
            values={facets.categories}
            selected={filters.categories}
            onToggle={toggle("categories")}
          />
        </Section>
      )}

      {facets.brands.length > 0 && (
        <Section label="Brands" count={facets.brands.length}>
          <CheckList values={facets.brands} selected={filters.brands} onToggle={toggle("brands")} />
        </Section>
      )}

      {facets.materials.length > 0 && (
        <Section label="Materials" count={facets.materials.length}>
          <CheckList
            values={facets.materials}
            selected={filters.materials}
            onToggle={toggle("materials")}
          />
        </Section>
      )}

      {facets.colors.length > 0 && (
        <Section label="Color" count={facets.colors.length}>
          <CheckList values={facets.colors} selected={filters.colors} onToggle={toggle("colors")} />
        </Section>
      )}

      {/* Not in the reference's list, but 14 products carry a real finish
          value — rendering it follows the same "data decides" rule that
          removes Location and Certifications. */}
      {facets.finishes.length > 0 && (
        <Section label="Finish" count={facets.finishes.length}>
          <CheckList
            values={facets.finishes}
            selected={filters.finishes}
            onToggle={toggle("finishes")}
          />
        </Section>
      )}

      {facets.sustainability.length > 0 && (
        <Section label="Sustainability" count={facets.sustainability.length}>
          <CheckList
            values={facets.sustainability}
            selected={filters.sustainability}
            onToggle={toggle("sustainability")}
          />
          <p className="mt-2 font-body text-[11px] text-muted">
            Recorded on a small number of products so far.
          </p>
        </Section>
      )}

      <div className="pt-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-body text-[13px] text-ink">Used in projects</span>
          <input
            type="checkbox"
            role="switch"
            checked={filters.usedInProjectsOnly}
            onChange={(e) => onChange({ ...filters, usedInProjectsOnly: e.target.checked })}
            className="h-4 w-4 accent-ink"
          />
        </label>
        <p className="mt-1 font-body text-[12px] text-muted">
          {usedInProjectsCount} products tagged in a project
        </p>
      </div>
    </div>
  );
}
