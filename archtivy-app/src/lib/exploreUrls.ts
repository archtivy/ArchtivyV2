/**
 * Build explore filter URLs for sidebar facet links.
 * Same listing type: projects → /explore/projects, products → /explore/products.
 * Supports query param standard: category (comma-separated), year or year_min/year_max,
 * area_bucket (projects), material, city, country, brand (products).
 */

const PROJECTS = "/explore/projects";
const PRODUCTS = "/explore/products";

export function projectExploreUrl(params: {
  year?: number | null;
  year_min?: number | null;
  year_max?: number | null;
  category?: string | string[] | null;
  city?: string | null;
  country?: string | null;
  area_bucket?: string | null;
  materials?: string | string[] | null;
}): string {
  const search = new URLSearchParams();
  if (params.year != null && !Number.isNaN(params.year)) search.set("year", String(params.year));
  if (params.year_min != null && !Number.isNaN(params.year_min)) search.set("year_min", String(params.year_min));
  if (params.year_max != null && !Number.isNaN(params.year_max)) search.set("year_max", String(params.year_max));
  if (params.category != null) {
    const cat = Array.isArray(params.category) ? params.category.join(",") : params.category;
    if (cat.trim()) search.set("category", cat.trim());
  }
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.country?.trim()) search.set("country", params.country.trim());
  if (params.area_bucket?.trim()) search.set("area_bucket", params.area_bucket.trim());
  if (params.materials != null) {
    const mat = Array.isArray(params.materials)
      ? params.materials.join(",")
      : params.materials;
    if (mat.trim()) search.set("materials", mat.trim());
  }
  const q = search.toString();
  return q ? `${PROJECTS}?${q}` : PROJECTS;
}

export function productExploreUrl(params: {
  year?: number | null;
  year_min?: number | null;
  year_max?: number | null;
  category?: string | string[] | null;
  material_type?: string | string[] | null;
  color?: string | string[] | null;
  brand?: string | null;
  materials?: string | string[] | null;
}): string {
  const search = new URLSearchParams();
  if (params.year != null && !Number.isNaN(params.year)) search.set("year", String(params.year));
  if (params.year_min != null && !Number.isNaN(params.year_min)) search.set("year_min", String(params.year_min));
  if (params.year_max != null && !Number.isNaN(params.year_max)) search.set("year_max", String(params.year_max));
  if (params.category != null) {
    const cat = Array.isArray(params.category) ? params.category.join(",") : params.category;
    if (cat.trim()) search.set("category", cat.trim());
  }
  if (params.material_type != null) {
    const mt = Array.isArray(params.material_type) ? params.material_type.join(",") : params.material_type;
    if (mt.trim()) search.set("material_type", mt.trim());
  }
  if (params.color != null) {
    const c = Array.isArray(params.color) ? params.color.join(",") : params.color;
    if (c.trim()) search.set("color", c.trim());
  }
  if (params.brand?.trim()) search.set("brand", params.brand.trim());
  if (params.materials != null) {
    const mats = Array.isArray(params.materials)
      ? params.materials.join(",")
      : params.materials;
    if (mats.trim()) search.set("materials", mats.trim());
  }
  const q = search.toString();
  return q ? `${PRODUCTS}?${q}` : PRODUCTS;
}
