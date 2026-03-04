"use client";

import { FilterPillDropdown } from "./FilterPillDropdown";
import type { FacetFilterGroup } from "@/lib/explore/filters/schema";

interface FacetFilterPillsProps {
  facets: FacetFilterGroup[];
  /** Current facet filter state: { facetSlug: [valueSlug, ...] }. */
  currentFacets: Record<string, string[]>;
  /** Called when a facet group selection changes. */
  onFacetChange: (facetSlug: string, values: string[]) => void;
}

export function FacetFilterPills({
  facets,
  currentFacets,
  onFacetChange,
}: FacetFilterPillsProps) {
  if (facets.length === 0) return null;

  return (
    <>
      {facets.map((facet) => (
        <FilterPillDropdown
          key={facet.slug}
          label={facet.label}
          options={facet.values.map((v) => ({ value: v.slug, label: v.label }))}
          selected={currentFacets[facet.slug] ?? []}
          onChange={(values) => onFacetChange(facet.slug, values)}
          multi={facet.is_multi_select}
          data-testid={`filter-facet-${facet.slug}`}
        />
      ))}
    </>
  );
}
