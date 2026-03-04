/**
 * Parse URL searchParams into typed ExploreFilters. Validated, safe defaults.
 */

import type { ExploreFilters, ExploreFiltersRaw, ExploreType } from "./schema";
import {
  DEFAULT_EXPLORE_FILTERS,
  exploreFiltersSearchParamsSchema,
  EXPLORE_SORT_PROJECTS,
  EXPLORE_SORT_PRODUCTS,
  RESERVED_PARAM_NAMES,
} from "./schema";

type SearchParams = Record<string, string | string[] | undefined>;

function getFirst(key: string, params: SearchParams): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function parseCommaList(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

/**
 * Parse and validate searchParams into ExploreFilters.
 * Invalid values are dropped; sort is validated per type.
 *
 * @param taxonomySlug - Taxonomy slug_path from route segments (e.g. "furniture/seating"). Optional.
 * @param knownFacetSlugs - List of valid facet slugs to extract from searchParams as dynamic filters.
 */
export function parseExploreFilters(
  searchParams: SearchParams,
  type: ExploreType,
  taxonomySlug?: string | null,
  knownFacetSlugs?: string[]
): ExploreFilters {
  const flat: Record<string, string> = {};
  for (const key of [
    "q",
    "category",
    "city",
    "country",
    "designers",
    "brands",
    "year",
    "year_min",
    "year_max",
    "materials",
    "material_type",
    "area_bucket",
    "color",
    "sort",
    "taxonomy_materials",
    "type",
    "product_category",
    "sub",
  ]) {
    const v = getFirst(key, searchParams);
    if (v !== undefined) flat[key] = v;
  }

  const parsed = exploreFiltersSearchParamsSchema.safeParse(flat);
  const raw: ExploreFiltersRaw | Record<string, never> = parsed.success ? parsed.data : {};

  const sortOptions = type === "projects" ? EXPLORE_SORT_PROJECTS : EXPLORE_SORT_PRODUCTS;
  const sortRaw = getFirst("sort", searchParams)?.trim();
  const sort =
    sortRaw && (sortOptions as readonly string[]).includes(sortRaw)
      ? sortRaw
      : "newest";

  // Extract dynamic facet filters from searchParams
  const facets: Record<string, string[]> = {};
  if (knownFacetSlugs) {
    for (const slug of knownFacetSlugs) {
      if (RESERVED_PARAM_NAMES.has(slug)) continue;
      const v = getFirst(slug, searchParams);
      if (v) {
        const values = parseCommaList(v);
        if (values.length > 0) facets[slug] = values;
      }
    }
  }

  return {
    ...DEFAULT_EXPLORE_FILTERS,
    q: raw.q ?? null,
    category: raw.category ?? [],
    taxonomy: taxonomySlug?.trim() || null,
    city: raw.city ?? null,
    country: raw.country ?? null,
    designers: raw.designers ?? [],
    brands: raw.brands ?? [],
    year: raw.year ?? null,
    year_min: raw.year_min ?? null,
    year_max: raw.year_max ?? null,
    materials: raw.materials ?? [],
    taxonomy_materials: raw.taxonomy_materials ?? [],
    material_type: raw.material_type ?? [],
    area_bucket: raw.area_bucket ?? null,
    color: raw.color ?? [],
    sort,
    facets,
    product_type: raw.type ?? null,
    product_category: raw.product_category ?? null,
    product_subcategory: raw.sub ?? null,
  };
}
