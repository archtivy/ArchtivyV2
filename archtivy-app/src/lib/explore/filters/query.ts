/**
 * Serialize filters to URL and map to existing ProjectFilters/ProductFilters for DB layer.
 */

import type { ExploreFilters, ExploreType } from "./schema";
import type { ProjectFilters, ProductFilters } from "@/lib/exploreFilters";
import { PROJECT_AREA_BUCKETS } from "@/lib/exploreFilters";
import type { ProjectAreaBucket } from "@/lib/exploreFilters";

/**
 * Build URLSearchParams from ExploreFilters (only non-empty values).
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
  if (filters.material_type.length) p.set("material_type", filters.material_type.join(","));
  if (filters.area_bucket) p.set("area_bucket", filters.area_bucket);
  if (filters.color.length) p.set("color", filters.color.join(","));
  if (filters.sort && filters.sort !== "newest") p.set("sort", filters.sort);
  if (type === "products") {
    if (filters.product_type?.trim()) p.set("type", filters.product_type.trim());
    if (filters.product_category?.trim()) p.set("product_category", filters.product_category.trim());
    if (filters.product_subcategory?.trim()) p.set("sub", filters.product_subcategory.trim());
  }
  return p;
}

/**
 * Number of active filters (for "Filters (N)" label). Type-specific: only count filters that apply.
 */
export function countActiveFilters(filters: ExploreFilters, type: ExploreType): number {
  let n = 0;
  if (filters.q?.trim()) n += 1;
  if (filters.category.length) n += filters.category.length;
  if (filters.city || filters.country) n += 1;
  if (filters.designers.length && type === "projects") n += filters.designers.length;
  if (filters.brands.length) n += filters.brands.length;
  if (filters.year != null || filters.year_min != null || filters.year_max != null) n += 1;
  if (filters.materials.length) n += filters.materials.length;
  if (filters.material_type.length && type === "products") n += filters.material_type.length;
  if (filters.area_bucket && type === "projects") n += 1;
  if (filters.color.length && type === "products") n += filters.color.length;
  if (type === "products") {
    if (filters.product_type?.trim()) n += 1;
    if (filters.product_category?.trim()) n += 1;
    if (filters.product_subcategory?.trim()) n += 1;
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
    year: f.year,
    year_min: f.year_min,
    year_max: f.year_max,
    country: f.country,
    city: f.city,
    area_bucket,
    materials: f.materials,
    designers: f.designers.length ? f.designers : undefined,
    brands: f.brands.length ? f.brands : undefined,
  };
}

/**
 * Map shared ExploreFilters to ProductFilters for getProductsCanonicalFiltered.
 */
export function exploreFiltersToProductFilters(f: ExploreFilters): ProductFilters {
  return {
    q: f.q?.trim() || undefined,
    category: f.category,
    year: f.year,
    year_min: f.year_min,
    year_max: f.year_max,
    material_type: f.material_type,
    color: f.color,
    brand: f.brands.length > 0 ? f.brands[0] : null,
    materials: f.materials,
    product_type: f.product_type?.trim() || null,
    product_category: f.product_category?.trim() || null,
    product_subcategory: f.product_subcategory?.trim() || null,
  };
}
