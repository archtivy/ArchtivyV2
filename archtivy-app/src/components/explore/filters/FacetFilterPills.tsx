"use client";

import { SearchableFilterPanel } from "./SearchableFilterPanel";
import type { FacetFilterGroup } from "@/lib/explore/filters/schema";

interface FacetFilterPillsProps {
  facets: FacetFilterGroup[];
  currentFacets: Record<string, string[]>;
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
        <SearchableFilterPanel
          key={facet.slug}
          label={facet.label}
          options={facet.values.map((v) => ({ value: v.slug, label: v.label }))}
          selected={currentFacets[facet.slug] ?? []}
          onChange={(values) => onFacetChange(facet.slug, values)}
          multi={facet.is_multi_select}
          placeholder={`Search ${facet.label.toLowerCase()}...`}
        />
      ))}
    </>
  );
}
