"use client";

import {
  FilterSection as Section,
  FilterCheckList as CheckList,
} from "@/components/directory/FilterPrimitives";
import type { DesignerFacets } from "@/lib/db/designersDirectory";

/**
 * Designers filter rail (brief §3).
 *
 * Imports the shared primitives rather than growing a third copy of the
 * accordion/checkbox behaviour — the same rule the Products rail follows.
 *
 * SECTIONS THE BRIEF ASKS FOR AND WHY THIS RENDERS THREE, NOT FOUR:
 *   Specialty      real (designer_discipline)
 *   Location       real, with the search-within-filter input the reference shows
 *   Practice Type  ABSENT — no Studio/Individual/Firm field exists on profiles.
 *                  brand_type and reader_type are null for every designer row,
 *                  so three checkboxes here would be decorative.
 *   Projects       reduced to one checkbox. The real distribution is 17
 *                  designers holding 1-8 projects and 7 holding none, so a
 *                  range control over that span would imply precision the data
 *                  does not have. The meaningful cut is "has any", and the
 *                  "Most Projects" sort covers ordering.
 */

export interface DesignerFilterState {
  specialties: string[];
  countries: string[];
  withProjectsOnly: boolean;
}

export const EMPTY_DESIGNER_FILTERS: DesignerFilterState = {
  specialties: [],
  countries: [],
  withProjectsOnly: false,
};

export function DesignersFilterRail({
  facets,
  filters,
  onChange,
  onReset,
}: {
  facets: DesignerFacets;
  filters: DesignerFilterState;
  onChange: (next: DesignerFilterState) => void;
  onReset: () => void;
}) {
  const toggle =
    (key: "specialties" | "countries") =>
    (value: string) => {
      const list = filters[key];
      onChange({
        ...filters,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      });
    };

  const active =
    filters.specialties.length + filters.countries.length + (filters.withProjectsOnly ? 1 : 0);

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

      {facets.specialties.length > 0 && (
        <Section label="Specialty" count={facets.specialties.length} defaultOpen>
          <CheckList
            values={facets.specialties}
            selected={filters.specialties}
            onToggle={toggle("specialties")}
          />
        </Section>
      )}

      {facets.countries.length > 0 && (
        <Section label="Location" count={facets.countries.length} defaultOpen>
          <CheckList
            values={facets.countries}
            selected={filters.countries}
            onToggle={toggle("countries")}
            searchPlaceholder="Search countries"
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
              Has published projects
            </span>
            <span className="font-body text-[12px] text-muted">{facets.withProjectsCount}</span>
          </label>
        </Section>
      )}
    </div>
  );
}
