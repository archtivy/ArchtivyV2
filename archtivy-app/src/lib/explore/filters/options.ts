/**
 * Unified filter options for explore (projects and products). Sourced from DB.
 * NO CACHE: Admin can add categories/materials/colors at any time and users must
 * see them immediately. Pages already set force-dynamic + revalidate=0.
 */

import { getProjectFilterOptions, getProductFilterOptions } from "@/lib/db/explore";
import type { ExploreType } from "./schema";

export interface ExploreFilterOptions {
  categories: { value: string; label: string }[];
  locations: { value: string; label: string; city: string | null; country: string | null }[];
  designers: { value: string; label: string }[];
  brands: { value: string; label: string }[];
  years: { value: string; label: string }[];
  materials: { value: string; label: string }[];
  areas: { value: string; label: string }[];
  colors: { value: string; label: string }[];
  materialTypes: { value: string; label: string }[];
}

async function getProjectOptions(): Promise<ExploreFilterOptions> {
  const raw = await getProjectFilterOptions();
  const locations = raw.locations.map((loc) => {
    const label = [loc.city, loc.country].filter(Boolean).join(", ") || "Unknown";
    const value = JSON.stringify({ city: loc.city, country: loc.country });
    return { value, label, city: loc.city, country: loc.country };
  });
  return {
    categories: raw.categories.map((c) => ({ value: c, label: c })),
    locations,
    designers: raw.designers.map((d) => ({ value: d.id, label: d.name })),
    brands: raw.brands.map((b) => ({ value: b, label: b })),
    years: raw.years.map((y) => ({ value: String(y), label: String(y) })),
    materials: raw.materials.map((m) => ({ value: m.slug, label: m.display_name })),
    areas: raw.areas.map((a) => ({ value: a, label: a === "8000+" ? "8,000+" : a.replace("-", " – ") })),
    colors: [],
    materialTypes: [],
  };
}

async function getProductOptions(): Promise<ExploreFilterOptions> {
  const raw = await getProductFilterOptions();
  return {
    categories: raw.categories.map((c) => ({ value: c, label: c })),
    locations: [],
    designers: [],
    brands: raw.brands.map((b) => ({ value: b.id, label: b.name })),
    years: raw.years.map((y) => ({ value: String(y), label: String(y) })),
    materials: raw.materials.map((m) => ({ value: m.slug, label: m.display_name })),
    areas: [],
    colors: raw.colors.map((c) => ({ value: c, label: c })),
    materialTypes: raw.materialTypes.map((m) => ({ value: m, label: m })),
  };
}

/**
 * Get filter dropdown options for explore. Always fresh — no cache.
 * Called from force-dynamic pages; Supabase service client is server-only.
 */
export async function getExploreFilterOptions(type: ExploreType): Promise<ExploreFilterOptions> {
  return type === "projects" ? getProjectOptions() : getProductOptions();
}
