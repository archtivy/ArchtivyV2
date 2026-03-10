/**
 * Serialize filters to URL and map to existing ProjectFilters/ProductFilters for DB layer.
 */

import type { ExploreFilters, ExploreType } from "./schema";
import type { ProjectFilters, ProductFilters } from "@/lib/exploreFilters";
import { PROJECT_AREA_BUCKETS } from "@/lib/exploreFilters";
import type { ProjectAreaBucket } from "@/lib/exploreFilters";

/**
 * Build URLSearchParams from ExploreFilters (only non-empty values).
 * NOTE: `taxonomy` is NOT serialized here — it lives in the route path.
 */
export function filtersToQueryString(filters: ExploreFilters, type: ExploreType): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.q?.trim()) p.set("q", filters.q.trim());
  if (filters.category.length) p.set("category", filters.category.join(","));
  if (filters.city) p.set("city", filters.city);
  if (filters.country) p.set("country", filters.country);
  if (filters.designers.length) p.set("designers", filters.designers.join(","));
  if (filters.brands.length) p.set("brands", filters.brands.join(","));
  if (filters.year != null) p.set("year", String(filters.year));
  if (filters.year_min != null) p.set("year_min", String(filters.year_min));
  if (filters.year_max != null) p.set("year_max", String(filters.year_max));
  if (filters.materials.length) p.set("materials", filters.materials.join(","));
  if (filters.taxonomy_materials.length) p.set("taxonomy_materials", filters.taxonomy_materials.join(","));
  if (filters.material_type.length) p.set("material_type", filters.material_type.join(","));
  if (filters.area_bucket) p.set("area_bucket", filters.area_bucket);
  if (filters.color.length) p.set("color", filters.color.join(","));
  if (filters.project_status.length) p.set("project_status", filters.project_status.join(","));
  if (filters.product_stage.length) p.set("product_stage", filters.product_stage.join(","));
  if (filters.collaboration) p.set("collaboration", "1");
  if (filters.sort && filters.sort !== "newest") p.set("sort", filters.sort);
  // Serialize each facet group as individual query param
  for (const [facetSlug, values] of Object.entries(filters.facets)) {
    if (values.length > 0) p.set(facetSlug, values.join(","));
  }
  return p;
}

/**
 * Build a full explore URL with taxonomy in the route path and filters as query params.
 */
export function buildExploreUrl(
  type: ExploreType,
  taxonomy: string | null,
  filters: ExploreFilters
): string {
  const base = type === "products" ? "/explore/products" : "/explore/projects";
  const path = taxonomy ? `${base}/${taxonomy}` : base;
  const qs = filtersToQueryString(filters, type);
  const search = qs.toString();
  return search ? `${path}?${search}` : path;
}

/**
 * Number of active filters (for "Filters (N)" label). Type-specific: only count filters that apply.
 */
export function countActiveFilters(filters: ExploreFilters, type: ExploreType): number {
  let n = 0;
  if (filters.q?.trim()) n += 1;
  if (filters.taxonomy) n += 1;
  if (filters.category.length) n += filters.category.length;
  if (filters.city || filters.country) n += 1;
  if (filters.designers.length && type === "projects") n += filters.designers.length;
  if (filters.brands.length) n += filters.brands.length;
  if (filters.year != null || filters.year_min != null || filters.year_max != null) n += 1;
  if (filters.materials.length) n += filters.materials.length;
  if (filters.taxonomy_materials.length) n += filters.taxonomy_materials.length;
  if (filters.material_type.length && type === "products") n += filters.material_type.length;
  if (filters.area_bucket && type === "projects") n += 1;
  if (filters.color.length && type === "products") n += filters.color.length;
  if (filters.project_status.length && type === "projects") n += filters.project_status.length;
  if (filters.product_stage.length && type === "products") n += filters.product_stage.length;
  if (filters.collaboration) n += 1;
  // Count individual facet values
  for (const values of Object.values(filters.facets)) {
    n += values.length;
  }
  return n;
}

/**
 * Map shared ExploreFilters to ProjectFilters for getProjectsCanonicalFiltered.
 */
export function exploreFiltersToProjectFilters(f: ExploreFilters): ProjectFilters {
  const area_bucket: ProjectAreaBucket | null =
    f.area_bucket && PROJECT_AREA_BUCKETS.includes(f.area_bucket as ProjectAreaBucket)
      ? (f.area_bucket as ProjectAreaBucket)
      : null;
  return {
    q: f.q?.trim() || undefined,
    category: f.category,
    taxonomy: f.taxonomy || undefined,
    year: f.year,
    year_min: f.year_min,
    year_max: f.year_max,
    country: f.country,
    city: f.city,
    area_bucket,
    materials: f.materials,
    taxonomy_materials: f.taxonomy_materials,
    designers: f.designers.length ? f.designers : undefined,
    brands: f.brands.length ? f.brands : undefined,
    facets: f.facets,
    project_status: f.project_status.length ? f.project_status : undefined,
    collaboration_only: f.collaboration || undefined,
  };
}

/**
 * Map shared ExploreFilters to ProductFilters for getProductsCanonicalFiltered.
 */
export function exploreFiltersToProductFilters(f: ExploreFilters): ProductFilters {
  return {
    q: f.q?.trim() || undefined,
    category: f.category,
    taxonomy: f.taxonomy || undefined,
    year: f.year,
    year_min: f.year_min,
    year_max: f.year_max,
    material_type: f.material_type,
    color: f.color,
    brand: f.brands.length > 0 ? f.brands[0] : null,
    materials: f.materials,
    taxonomy_materials: f.taxonomy_materials,
    product_type: f.product_type?.trim() || null,
    product_category: f.product_category?.trim() || null,
    product_subcategory: f.product_subcategory?.trim() || null,
    facets: f.facets,
    product_stage: f.product_stage.length ? f.product_stage : undefined,
    collaboration_only: f.collaboration || undefined,
  };
}
