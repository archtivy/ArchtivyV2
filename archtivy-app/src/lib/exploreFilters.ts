/**
 * Explore filter types and parsing from URL searchParams.
 * Used by explore pages (server) and filter UI (client).
 */

export const PROJECT_AREA_BUCKETS = [
  "<500",
  "500-1000",
  "1000-2000",
  "2000-4000",
  "4000-8000",
  "8000+",
] as const;

export type ProjectAreaBucket = (typeof PROJECT_AREA_BUCKETS)[number];

export const SORT_OPTIONS_PROJECTS = [
  { value: "newest", label: "Newest" },
  { value: "year_desc", label: "Year (newest first)" },
  { value: "area_desc", label: "Largest area" },
] as const;

export const SORT_OPTIONS_PRODUCTS = [
  { value: "newest", label: "Newest" },
  { value: "year_desc", label: "Year (newest first)" },
] as const;

export type ProjectSortOption = (typeof SORT_OPTIONS_PROJECTS)[number]["value"];
export type ProductSortOption = (typeof SORT_OPTIONS_PRODUCTS)[number]["value"];

export interface ProjectFilters {
  /** Search query (title, description, location, designer, brand, material). */
  q?: string | null;
  category: string[];
  year: number | null;
  year_min: number | null;
  year_max: number | null;
  country: string | null;
  city: string | null;
  area_bucket: ProjectAreaBucket | null;
  /** Material slugs (URL param: `materials=slug1,slug2`) */
  materials: string[];
  /** Owner clerk_user_ids (designers/studios). */
  designers?: string[];
  /** Brand names from brands_used (projects). */
  brands?: string[];
  /** @deprecated legacy key (merged into `materials`) */
  project_materials?: string[];
}

export interface ProductFilters {
  /** Search query (title, description, brand, material, color). */
  q?: string | null;
  category: string[];
  year: number | null;
  year_min: number | null;
  year_max: number | null;
  material_type: string[];
  color: string[];
  brand: string | null;
  /** Material slugs (URL param: `materials=slug1,slug2`) */
  materials: string[];
  /** @deprecated legacy key (merged into `materials`) */
  product_materials?: string[];
  /** Taxonomy filters (?type=&product_category=&sub=). Filter values only; no static routes. */
  product_type?: string | null;
  product_category?: string | null;
  product_subcategory?: string | null;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  category: [],
  year: null,
  year_min: null,
  year_max: null,
  country: null,
  city: null,
  area_bucket: null,
  materials: [],
};

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  category: [],
  year: null,
  year_min: null,
  year_max: null,
  material_type: [],
  color: [],
  brand: null,
  materials: [],
  product_type: null,
  product_category: null,
  product_subcategory: null,
};

function parseNum(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseStringList(s: string | null | undefined): string[] {
  if (s == null || s === "") return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseStringOne(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

export function parseProjectSort(searchParams: Record<string, string | string[] | undefined>): ProjectSortOption {
  const v = searchParams.sort;
  const s = Array.isArray(v) ? v[0] : v;
  if (s && SORT_OPTIONS_PROJECTS.some((o) => o.value === s)) return s as ProjectSortOption;
  return "newest";
}

export function parseProductSort(searchParams: Record<string, string | string[] | undefined>): ProductSortOption {
  const v = searchParams.sort;
  const s = Array.isArray(v) ? v[0] : v;
  if (s && SORT_OPTIONS_PRODUCTS.some((o) => o.value === s)) return s as ProductSortOption;
  return "newest";
}

export function parseProjectFilters(searchParams: Record<string, string | string[] | undefined>): ProjectFilters {
  const get = (k: string): string | undefined => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const category = parseStringList(get("category"));
  const year = parseNum(get("year"));
  const year_min = parseNum(get("year_min"));
  const year_max = parseNum(get("year_max"));
  const country = parseStringOne(get("country"));
  const city = parseStringOne(get("city"));
  const materialsFromParam = parseStringList(get("materials"));
  // Back-compat: accept legacy params if any exist
  const materialsLegacy = parseStringList(get("project_materials"));
  const materials = Array.from(new Set([...materialsFromParam, ...materialsLegacy]));
  const areaBucketRaw = parseStringOne(get("area_bucket"));
  const area_bucket =
    areaBucketRaw && PROJECT_AREA_BUCKETS.includes(areaBucketRaw as ProjectAreaBucket)
      ? (areaBucketRaw as ProjectAreaBucket)
      : null;

  return {
    category,
    year,
    year_min,
    year_max,
    country,
    city,
    area_bucket,
    materials,
    project_materials: materialsLegacy.length ? materialsLegacy : undefined,
  };
}

export function parseProductFilters(searchParams: Record<string, string | string[] | undefined>): ProductFilters {
  const get = (k: string): string | undefined => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const category = parseStringList(get("category"));
  const year = parseNum(get("year"));
  const year_min = parseNum(get("year_min"));
  const year_max = parseNum(get("year_max"));
  const material_type = parseStringList(get("material_type"));
  const color = parseStringList(get("color"));
  const brand = parseStringOne(get("brand"));
  const materialsFromParam = parseStringList(get("materials"));
  const materialsLegacy = parseStringList(get("product_materials"));
  const materials = Array.from(new Set([...materialsFromParam, ...materialsLegacy]));

  return {
    category,
    year,
    year_min,
    year_max,
    material_type,
    color,
    brand,
    materials,
    product_materials: materialsLegacy.length ? materialsLegacy : undefined,
  };
}

export function projectFiltersToSearchParams(f: ProjectFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.category.length) params.category = f.category.join(",");
  if (f.year != null) params.year = String(f.year);
  if (f.year_min != null) params.year_min = String(f.year_min);
  if (f.year_max != null) params.year_max = String(f.year_max);
  if (f.country) params.country = f.country;
  if (f.city) params.city = f.city;
  if (f.area_bucket) params.area_bucket = f.area_bucket;
  if (f.materials.length) params.materials = f.materials.join(",");
  return params;
}

export function productFiltersToSearchParams(f: ProductFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.category.length) params.category = f.category.join(",");
  if (f.year != null) params.year = String(f.year);
  if (f.year_min != null) params.year_min = String(f.year_min);
  if (f.year_max != null) params.year_max = String(f.year_max);
  if (f.material_type.length) params.material_type = f.material_type.join(",");
  if (f.color.length) params.color = f.color.join(",");
  if (f.brand) params.brand = f.brand;
  if (f.materials.length) params.materials = f.materials.join(",");
  return params;
}

/** Area bucket to numeric range for Supabase (area_sqft). */
export function areaBucketToRange(
  bucket: ProjectAreaBucket
): { gte?: number; lt?: number } | { gte: number } {
  switch (bucket) {
    case "<500":
      return { lt: 500 };
    case "500-1000":
      return { gte: 500, lt: 1000 };
    case "1000-2000":
      return { gte: 1000, lt: 2000 };
    case "2000-4000":
      return { gte: 2000, lt: 4000 };
    case "4000-8000":
      return { gte: 4000, lt: 8000 };
    case "8000+":
      return { gte: 8000 };
    default:
      return { lt: 0 };
  }
}

/** Map area_sqft to area_bucket for explore link. */
export function areaSqftToBucket(sqft: number): ProjectAreaBucket {
  if (sqft < 500) return "<500";
  if (sqft < 1000) return "500-1000";
  if (sqft < 2000) return "1000-2000";
  if (sqft < 4000) return "2000-4000";
  if (sqft < 8000) return "4000-8000";
  return "8000+";
}
