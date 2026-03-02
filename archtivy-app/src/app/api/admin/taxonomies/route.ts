export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { PRODUCT_TAXONOMY } from "@/lib/taxonomy/productTaxonomy";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();

  // Fetch usage stats from DB
  const [
    categoriesUsage,
    productTypesUsage,
    materialsUsage,
    citiesUsage,
    countriesUsage,
    colorsUsage,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("category")
      .not("category", "is", null)
      .is("deleted_at", null),
    supabase
      .from("listings")
      .select("product_type")
      .not("product_type", "is", null)
      .is("deleted_at", null),
    supabase
      .from("listing_materials")
      .select("material_id, material_display_name")
      .limit(2000),
    supabase
      .from("listings")
      .select("location_city")
      .not("location_city", "is", null)
      .is("deleted_at", null),
    supabase
      .from("listings")
      .select("location_country")
      .not("location_country", "is", null)
      .is("deleted_at", null),
    supabase
      .from("listing_materials")
      .select("color_id, color_display_name")
      .not("color_id" as never, "is", null)
      .limit(2000),
  ]);

  // Aggregate
  const countBy = <T extends Record<string, unknown>>(arr: T[], key: string) => {
    const map: Record<string, number> = {};
    for (const item of arr ?? []) {
      const v = String(item[key] ?? "").trim();
      if (v) map[v] = (map[v] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  const categories = countBy(categoriesUsage.data ?? [], "category");
  const productTypes = countBy(productTypesUsage.data ?? [], "product_type");
  const cities = countBy(citiesUsage.data ?? [], "location_city");
  const countries = countBy(countriesUsage.data ?? [], "location_country");

  // Materials from listing_materials join table
  const materialsMap: Record<string, number> = {};
  for (const r of (materialsUsage.data ?? []) as Array<{ material_id?: string; material_display_name?: string }>) {
    const k = r.material_display_name ?? r.material_id ?? "";
    if (k) materialsMap[k] = (materialsMap[k] ?? 0) + 1;
  }
  const materials = Object.entries(materialsMap)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const colorsMap: Record<string, number> = {};
  for (const r of (colorsUsage.data ?? []) as Array<{ color_id?: string; color_display_name?: string }>) {
    const k = r.color_display_name ?? r.color_id ?? "";
    if (k) colorsMap[k] = (colorsMap[k] ?? 0) + 1;
  }
  const colors = Object.entries(colorsMap)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    categories,
    productTypes,
    materials,
    colors,
    cities,
    countries,
    // Full taxonomy tree (frontend-controlled, read-only)
    taxonomyTree: PRODUCT_TAXONOMY.map((t) => ({
      id: t.id,
      label: t.label,
      categoryCount: t.categories.length,
    })),
  });
}
