"use client";

import {
  FilterSection as Section,
  FilterCheckList as CheckList,
} from "@/components/directory/FilterPrimitives";
import type { DirectoryFacets } from "@/lib/db/projectsDirectory";

/**
 * Filter rail (Projects Index brief §3, left column).
 *
 * Sections are rendered ONLY when the facet has values, so a category with no
 * real data cannot appear as an empty accordion. Brands Used, Sustainability
 * and Awards are absent from production data and therefore never reach this
 * component — see the measurement table in lib/db/projectsDirectory.ts.
 *
 * Every filter is reversible: each active value has its own removable chip in
 * the results header, and "Reset" clears everything (UX Guidelines).
 */

export interface FilterState {
  locations: string[];
  buildingTypes: string[];
  projectTypes: string[];
  styles: string[];
  materials: string[];
  yearMin: number | null;
  yearMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  withProductsOnly: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  locations: [],
  buildingTypes: [],
  projectTypes: [],
  styles: [],
  materials: [],
  yearMin: null,
  yearMax: null,
  areaMin: null,
  areaMax: null,
  withProductsOnly: false,
};

export function ProjectsFilterRail({
  facets,
  filters,
  onChange,
  onReset,
}: {
  facets: DirectoryFacets;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}) {
  const toggle = (key: keyof Pick<
    FilterState,
    "locations" | "buildingTypes" | "projectTypes" | "styles" | "materials"
  >) => (value: string) => {
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
          Reset
        </button>
      </div>

      {facets.locations.length > 0 && (
        <Section label="Location" count={facets.locations.length}>
          <CheckList
            values={facets.locations}
            selected={filters.locations}
            onToggle={toggle("locations")}
          />
        </Section>
      )}

      {facets.buildingTypes.length > 0 && (
        <Section label="Building Type" count={facets.buildingTypes.length} defaultOpen>
          <CheckList
            values={facets.buildingTypes}
            selected={filters.buildingTypes}
            onToggle={toggle("buildingTypes")}
          />
        </Section>
      )}

      {/* "Project Type" is sourced from the intervention_type dimension —
          new build / renovation / adaptive reuse — which is what the reference's
          Project Type section means. Building Type above is the project
          taxonomy root. Phase 6 §E draws exactly this distinction. */}
      {facets.projectTypes.length > 0 && (
        <Section label="Project Type" count={facets.projectTypes.length}>
          <CheckList
            values={facets.projectTypes}
            selected={filters.projectTypes}
            onToggle={toggle("projectTypes")}
          />
        </Section>
      )}

      {facets.styles.length > 0 && (
        <Section label="Architectural Style" count={facets.styles.length}>
          <CheckList
            values={facets.styles}
            selected={filters.styles}
            onToggle={toggle("styles")}
          />
        </Section>
      )}

      {facets.yearRange && (
        <Section label="Year" defaultOpen>
          <YearRange
            range={facets.yearRange}
            min={filters.yearMin}
            max={filters.yearMax}
            onChange={(yearMin, yearMax) => onChange({ ...filters, yearMin, yearMax })}
          />
        </Section>
      )}

      {facets.areaRange && (
        <Section label="Area">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(facets.areaRange.min)}
              value={filters.areaMin ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  areaMin: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              aria-label="Minimum area in square feet"
              className="w-full rounded border border-hairline bg-cream px-2 py-1.5 font-body text-[13px] text-ink"
            />
            <span className="font-body text-[12px] text-muted">to</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(facets.areaRange.max)}
              value={filters.areaMax ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  areaMax: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              aria-label="Maximum area in square feet"
              className="w-full rounded border border-hairline bg-cream px-2 py-1.5 font-body text-[13px] text-ink"
            />
          </div>
          <p className="mt-2 font-body text-[11px] text-muted">
            Square feet. Area is recorded on {""}
            {facets.areaRange ? "most" : "some"} projects only.
          </p>
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

      <div className="pt-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-body text-[13px] text-ink">Projects with Products</span>
          <input
            type="checkbox"
            role="switch"
            checked={filters.withProductsOnly}
            onChange={(e) => onChange({ ...filters, withProductsOnly: e.target.checked })}
            className="h-4 w-4 accent-ink"
          />
        </label>
        <p className="mt-1 font-body text-[12px] text-muted">
          {facets.projectsWithProducts} projects have tagged products
        </p>
      </div>
    </div>
  );
}

/**
 * Year range with a REAL histogram.
 *
 * 50 projects across 18 years produces a sparse, uneven chart — that is what
 * the data looks like and it is left uneven on purpose. The reference's dense
 * 1900–2024 distribution was fabricated.
 */
function YearRange({
  range,
  min,
  max,
  onChange,
}: {
  range: { min: number; max: number; histogram: { year: number; count: number }[] };
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const peak = Math.max(...range.histogram.map((h) => h.count), 1);
  const lo = min ?? range.min;
  const hi = max ?? range.max;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-body text-[12px] text-muted">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>

      <div
        className="flex h-12 items-end gap-[3px]"
        role="img"
        aria-label={`Projects by year, ${range.min} to ${range.max}`}
      >
        {range.histogram.map((h) => {
          const inRange = h.year >= lo && h.year <= hi;
          return (
            <span
              key={h.year}
              title={`${h.year}: ${h.count}`}
              className={inRange ? "flex-1 bg-ink/70" : "flex-1 bg-ink/20"}
              style={{ height: `${Math.max(12, (h.count / peak) * 100)}%` }}
            />
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          value={min ?? ""}
          placeholder={String(range.min)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value), max)}
          aria-label="Earliest year"
          className="w-full rounded border border-hairline bg-cream px-2 py-1.5 font-body text-[13px] text-ink"
        />
        <span className="font-body text-[12px] text-muted">to</span>
        <input
          type="number"
          value={max ?? ""}
          placeholder={String(range.max)}
          onChange={(e) => onChange(min, e.target.value === "" ? null : Number(e.target.value))}
          aria-label="Latest year"
          className="w-full rounded border border-hairline bg-cream px-2 py-1.5 font-body text-[13px] text-ink"
        />
      </div>
    </div>
  );
}
