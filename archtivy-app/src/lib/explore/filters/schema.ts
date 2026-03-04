/**
 * Shared explore filter schema. Single source of truth for URL params and DB mapping.
 * Same keys for projects and products; mapping differs by type in query layer.
 */

import { z } from "zod";

export const EXPLORE_AREA_BUCKETS = [
  "<500",
  "500-1000",
  "1000-2000",
  "2000-4000",
  "4000-8000",
  "8000+",
] as const;

export type ExploreAreaBucket = (typeof EXPLORE_AREA_BUCKETS)[number];

export const EXPLORE_SORT_PROJECTS = ["newest", "year_desc", "area_desc"] as const;
export const EXPLORE_SORT_PRODUCTS = ["newest", "year_desc"] as const;

export type ExploreSortProject = (typeof EXPLORE_SORT_PROJECTS)[number];
export type ExploreSortProduct = (typeof EXPLORE_SORT_PRODUCTS)[number];

const commaList = z
  .string()
  .optional()
  .transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []));

const optionalNum = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  });

const optionalStr = z
  .string()
  .optional()
  .transform((s) => (s?.trim() || null));

const areaBucketSchema = z
  .string()
  .optional()
  .nullable()
  .transform((s) => {
    const t = s?.trim();
    if (!t) return null;
    return EXPLORE_AREA_BUCKETS.includes(t as ExploreAreaBucket) ? (t as ExploreAreaBucket) : null;
  });

// ─── Taxonomy tree types (used by filter options + UI) ─────────────────────
export interface TaxonomyTreeNode {
  id: string;
  slug: string;
  slug_path: string;
  label: string;
  depth: number;
  children: TaxonomyTreeNode[];
}

export interface FacetFilterGroup {
  slug: string;
  label: string;
  is_multi_select: boolean;
  values: { slug: string; label: string }[];
}

/** Reserved URL param names — facet slugs must not collide with these. */
export const RESERVED_PARAM_NAMES = new Set([
  "q", "category", "city", "country", "designers", "brands",
  "year", "year_min", "year_max", "materials", "material_type",
  "area_bucket", "color", "sort", "type", "product_category", "sub",
  "taxonomy", "taxonomy_materials", "page", "offset",
]);

/** URL search params schema (one-way: raw params -> typed filters). */
export const exploreFiltersSearchParamsSchema = z.object({
  q: optionalStr,
  category: commaList,
  city: optionalStr,
  country: optionalStr,
  designers: commaList,
  brands: commaList,
  year: optionalNum,
  year_min: optionalNum,
  year_max: optionalNum,
  materials: commaList,
  material_type: commaList,
  area_bucket: areaBucketSchema,
  color: commaList,
  sort: z.string().optional(),
  taxonomy_materials: commaList,
  /** @deprecated Legacy product taxonomy params — used for 301 redirect detection only. */
  type: optionalStr,
  product_category: optionalStr,
  sub: optionalStr,
});

export type ExploreFiltersRaw = z.infer<typeof exploreFiltersSearchParamsSchema>;

/** Normalized filters after parse (sort validated per type in parse layer). */
export interface ExploreFilters {
  q: string | null;
  /** @deprecated Use taxonomy instead. Kept for unmapped-listings fallback. */
  category: string[];
  /** Taxonomy slug_path from route segments (e.g. "furniture/seating"). Primary category filter. */
  taxonomy: string | null;
  city: string | null;
  country: string | null;
  designers: string[];
  brands: string[];
  year: number | null;
  year_min: number | null;
  year_max: number | null;
  /** Legacy material slugs (from materials table). */
  materials: string[];
  /** Material taxonomy node slug_paths (from listing_taxonomy_node, domain='material'). */
  taxonomy_materials: string[];
  material_type: string[];
  area_bucket: ExploreAreaBucket | null;
  color: string[];
  sort: string;
  /** Dynamic facet filters: { facetSlug: [valueSlug, ...] }. */
  facets: Record<string, string[]>;
  /** @deprecated Legacy product taxonomy filters. Used for 301 redirect detection only. */
  product_type: string | null;
  /** @deprecated */
  product_category: string | null;
  /** @deprecated */
  product_subcategory: string | null;
}

export type ExploreType = "projects" | "products";

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  q: null,
  category: [],
  taxonomy: null,
  city: null,
  country: null,
  designers: [],
  brands: [],
  year: null,
  year_min: null,
  year_max: null,
  materials: [],
  taxonomy_materials: [],
  material_type: [],
  area_bucket: null,
  color: [],
  sort: "newest",
  facets: {},
  product_type: null,
  product_category: null,
  product_subcategory: null,
};
