/**
 * Canonical data for Explore and Home: projects and products from listings + listing_images.
 * Single source of truth: listings (type=project | type=product).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { projectListingSelect, productListingSelect } from "@/lib/db/selects";
import { getImagesByListingIds, type ListingImageRow } from "@/lib/db/listingImages";
import type { ProductImageRow } from "@/lib/db/gallery";
import { getProfilesByClerkIds, getProfilesByIds } from "@/lib/db/profiles";
import {
  isProjectListing,
  normalizeProject,
  normalizeProduct,
  type ProjectCanonical,
  type ProjectOwner,
  type ProductCanonical,
  type RawListingRow,
  type RawProductRow,
} from "@/lib/canonical-models";
import type { ProjectFilters, ProductFilters } from "@/lib/exploreFilters";
import { areaBucketToRange } from "@/lib/exploreFilters";
import type { ProjectSortOption, ProductSortOption } from "@/lib/exploreFilters";
import { getMaterialsByProjectIds, getMaterialsByProductIds } from "@/lib/db/materials";

const supabase = () => getSupabaseServiceClient();

/** Map listing_images rows to ProductImageRow shape for normalizeProduct (listing_id = product_id, image_url = src). */
function listingImagesToProductImageRows(
  listingId: string,
  rows: ListingImageRow[]
): ProductImageRow[] {
  return rows
    .filter((r) => r.listing_id === listingId)
    .map((r) => ({
      product_id: r.listing_id,
      src: r.image_url,
      alt: r.alt,
      sort_order: r.sort_order,
    }));
}

/** Build RawProductRow from a listing row (type=product) for normalizeProduct. */
function listingRowToRawProductRow(row: Record<string, unknown>): RawProductRow {
  return {
    ...row,
    brand_profile_id: row.owner_profile_id ?? null,
    material_type: null,
    color: null,
    subtitle: null,
  } as RawProductRow;
}

/** Count of projects per product (project_product_links). Returns productId -> count. */
async function getUsedInProjectsCountByProductIds(
  productIds: string[]
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  const { data, error } = await supabase()
    .from("project_product_links")
    .select("product_id")
    .in("product_id", productIds);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] getUsedInProjectsCountByProductIds error:", error.message);
    }
    return {};
  }
  const rows = (data ?? []) as { product_id: string }[];
  const map: Record<string, number> = {};
  for (const id of productIds) {
    map[id] = 0;
  }
  for (const r of rows) {
    if (r.product_id && map[r.product_id] !== undefined) {
      map[r.product_id]++;
    }
  }
  return map;
}

/** Fetch project listings (listings.type = 'project') with canonical select. Public: only APPROVED. */
async function getProjectListingRows(limit: number): Promise<RawListingRow[]> {
  const { data, error } = await supabase()
    .from("listings")
    .select(projectListingSelect)
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] getProjectListingRows error:", error.message);
    }
    return [];
  }
  return (data ?? []) as RawListingRow[];
}

/** Project sort: orderBy + ascending. */
function projectOrder(sort: ProjectSortOption) {
  switch (sort) {
    case "year_desc":
      return { column: "year", ascending: false };
    case "area_desc":
      return { column: "area_sqft", ascending: false };
    default:
      return { column: "created_at", ascending: false };
  }
}

/** Escape % and _ for safe use in Supabase .ilike() pattern. */
function escapeIlike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Get project listing ids that match search query q (title, description, location, designer, material). */
async function getProjectIdsBySearch(q: string): Promise<string[]> {
  const sup = supabase();
  const pattern = `%${escapeIlike(q)}%`;
  const ids = new Set<string>();

  const [t, d, loc, locCity, locCountry] = await Promise.all([
    sup.from("listings").select("id").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).ilike("title", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).ilike("description", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).ilike("location", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).ilike("location_city", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).ilike("location_country", pattern).limit(300),
  ]);
  for (const res of [t, d, loc, locCity, locCountry])
    for (const r of res.data ?? []) ids.add((r as { id: string }).id);

  const { data: profiles } = await sup
    .from("profiles")
    .select("clerk_user_id")
    .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
    .limit(100);
  const clerkIds = (profiles ?? []).map((p: { clerk_user_id: string }) => p.clerk_user_id).filter(Boolean);
  if (clerkIds.length > 0) {
    const { data: ownerRows } = await sup
      .from("listings")
      .select("id")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .in("owner_clerk_user_id", clerkIds)
      .limit(500);
    for (const r of ownerRows ?? []) ids.add((r as { id: string }).id);
  }

  const { data: materialRows } = await sup
    .from("materials")
    .select("id")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(50);
  const materialIds = (materialRows ?? []).map((m: { id: string }) => m.id).filter(Boolean);
  if (materialIds.length > 0) {
    const { data: linkRows } = await sup
      .from("project_material_links")
      .select("project_id")
      .in("material_id", materialIds);
    for (const r of linkRows ?? []) ids.add((r as { project_id: string }).project_id);
  }

  return Array.from(ids);
}

/** Get product listing ids that match search query q (title, description, category, brand via owner_profile_id). */
async function getProductIdsBySearch(q: string): Promise<string[]> {
  const sup = supabase();
  const pattern = `%${escapeIlike(q)}%`;
  const ids = new Set<string>();

  const [t, d, cat] = await Promise.all([
    sup.from("listings").select("id").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).ilike("title", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).ilike("description", pattern).limit(300),
    sup.from("listings").select("id").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).ilike("category", pattern).limit(300),
  ]);
  for (const res of [t, d, cat])
    for (const r of res.data ?? []) ids.add((r as { id: string }).id);

  const { data: brandProfiles } = await sup
    .from("profiles")
    .select("id")
    .eq("role", "brand")
    .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
    .limit(50);
  const brandIds = (brandProfiles ?? []).map((b: { id: string }) => b.id).filter(Boolean);
  if (brandIds.length > 0) {
    const { data: byBrand } = await sup
      .from("listings")
      .select("id")
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .in("owner_profile_id", brandIds)
      .limit(500);
    for (const r of byBrand ?? []) ids.add((r as { id: string }).id);
  }

  const { data: materialRows } = await sup
    .from("materials")
    .select("id")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(50);
  const materialIds = (materialRows ?? []).map((m: { id: string }) => m.id).filter(Boolean);
  if (materialIds.length > 0) {
    const { data: linkRows } = await sup
      .from("product_material_links")
      .select("product_id")
      .in("material_id", materialIds);
    for (const r of linkRows ?? []) ids.add((r as { product_id: string }).product_id);
  }

  return Array.from(ids);
}

/** Two-step material filter: slugs -> material ids -> project/product ids, then .in("id", matchedIds). */
async function getProjectIdsByMaterialSlugs(selectedSlugs: string[]): Promise<string[]> {
  if (selectedSlugs.length === 0) return [];
  const { data: materialRows, error: matErr } = await supabase()
    .from("materials")
    .select("id")
    .in("slug", selectedSlugs);
  if (matErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] materials lookup error:", matErr.message);
    }
    return [];
  }
  const materialIds = (materialRows ?? []).map((r: { id: string }) => r.id).filter(Boolean);
  if (materialIds.length === 0) return [];
  const { data: linkRows, error: linkErr } = await supabase()
    .from("project_material_links")
    .select("project_id")
    .in("material_id", materialIds);
  if (linkErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] project_material_links error:", linkErr.message);
    }
    return [];
  }
  const matchedIds = Array.from(
    new Set((linkRows ?? []).map((r: { project_id: string }) => r.project_id).filter(Boolean))
  );
  return matchedIds;
}

async function getProductIdsByMaterialSlugs(selectedSlugs: string[]): Promise<string[]> {
  if (selectedSlugs.length === 0) return [];
  const { data: materialRows, error: matErr } = await supabase()
    .from("materials")
    .select("id")
    .in("slug", selectedSlugs);
  if (matErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] materials lookup error:", matErr.message);
    }
    return [];
  }
  const materialIds = (materialRows ?? []).map((r: { id: string }) => r.id).filter(Boolean);
  if (materialIds.length === 0) return [];
  const { data: linkRows, error: linkErr } = await supabase()
    .from("product_material_links")
    .select("product_id")
    .in("material_id", materialIds);
  if (linkErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] product_material_links error:", linkErr.message);
    }
    return [];
  }
  const matchedIds = Array.from(
    new Set((linkRows ?? []).map((r: { product_id: string }) => r.product_id).filter(Boolean))
  );
  return matchedIds;
}

/** Fetch project listing rows with filters, sort, limit, offset. Returns rows and total count. */
async function getProjectListingRowsFiltered(
  filters: ProjectFilters,
  limit: number,
  offset: number,
  sort: ProjectSortOption
): Promise<{ rows: RawListingRow[]; total: number }> {
  // Parse material slugs: comma-separated -> trim -> filter(Boolean)
  const selectedSlugs = (filters.materials ?? [])
    .flatMap((s) => s.split(",").map((x) => x.trim()))
    .filter(Boolean);
  if (process.env.NODE_ENV === "development") {
    console.info("[explore] project filters.materials (from URL param materials):", filters.materials);
    console.info("[explore] project selectedSlugs:", selectedSlugs);
  }

  let projectIdConstraint: string[] | undefined;
  if (selectedSlugs.length > 0) {
    const matchedIds = await getProjectIdsByMaterialSlugs(selectedSlugs);
    if (process.env.NODE_ENV === "development") {
      console.info("[explore] project matchedIds.length:", matchedIds.length);
    }
    if (matchedIds.length === 0) return { rows: [], total: 0 };
    projectIdConstraint = matchedIds;
  }

  if (filters.brands && filters.brands.length > 0) {
    const sup = supabase();
    const perBrand = await Promise.all(
      filters.brands.map((name) =>
        sup
          .from("listings")
          .select("id")
          .eq("type", "project")
          .is("deleted_at", null)
          .contains("brands_used", [{ name }])
      )
    );
    const brandIds = Array.from(
      new Set(
        perBrand.flatMap((r) => (r.data ?? []).map((d: { id: string }) => d.id))
      )
    );
    if (brandIds.length === 0) return { rows: [], total: 0 };
    projectIdConstraint = projectIdConstraint
      ? projectIdConstraint.filter((id) => brandIds.includes(id))
      : brandIds;
    if (projectIdConstraint.length === 0) return { rows: [], total: 0 };
  }

  if (filters.q?.trim()) {
    const searchIds = await getProjectIdsBySearch(filters.q.trim());
    if (searchIds.length === 0) return { rows: [], total: 0 };
    projectIdConstraint = projectIdConstraint
      ? projectIdConstraint.filter((id) => searchIds.includes(id))
      : searchIds;
    if (projectIdConstraint.length === 0) return { rows: [], total: 0 };
  }

  let query = supabase()
    .from("listings")
    .select(projectListingSelect, { count: "exact" })
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  if (projectIdConstraint !== undefined) {
    query = query.in("id", projectIdConstraint);
  }
  if (filters.designers && filters.designers.length > 0) {
    query = query.in("owner_clerk_user_id", filters.designers);
  }
  if (filters.category.length > 0) {
    query = query.in("category", filters.category);
  }
  if (filters.year != null) {
    query = query.eq("year", filters.year);
  } else {
    if (filters.year_min != null) query = query.gte("year", filters.year_min);
    if (filters.year_max != null) query = query.lte("year", filters.year_max);
  }
  if (filters.country?.trim()) {
    query = query.eq("location_country", filters.country.trim());
  }
  if (filters.city?.trim()) {
    query = query.eq("location_city", filters.city.trim());
  }
  if (filters.area_bucket) {
    query = query.not("area_sqft", "is", null);
    const range = areaBucketToRange(filters.area_bucket);
    if ("gte" in range && range.gte != null) query = query.gte("area_sqft", range.gte);
    if ("lt" in range && range.lt != null) query = query.lt("area_sqft", range.lt);
  }

  const order = projectOrder(sort);
  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending })
    .range(offset, offset + limit - 1);
  if (error) {
    console.warn("[explore] getProjectListingRowsFiltered error:", error.message);
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []) as RawListingRow[], total: count ?? 0 };
}

function productOrder(sort: ProductSortOption) {
  switch (sort) {
    case "year_desc":
      return { column: "year", ascending: false };
    default:
      return { column: "created_at", ascending: false };
  }
}

/** Fetch product listing rows with filters, sort, limit, offset. Source: listings (type=product). */
async function getProductRowsFiltered(
  filters: ProductFilters,
  limit: number,
  offset: number,
  sort: ProductSortOption
): Promise<{ rows: RawProductRow[]; total: number }> {
  const selectedSlugs = (filters.materials ?? [])
    .flatMap((s) => s.split(",").map((x) => x.trim()))
    .filter(Boolean);
  if (process.env.NODE_ENV === "development") {
    console.info("[explore] product filters.materials (from URL param materials):", filters.materials);
    console.info("[explore] product selectedSlugs:", selectedSlugs);
  }

  let productIdConstraint: string[] | undefined;
  if (selectedSlugs.length > 0) {
    const matchedIds = await getProductIdsByMaterialSlugs(selectedSlugs);
    if (process.env.NODE_ENV === "development") {
      console.info("[explore] product matchedIds.length:", matchedIds.length);
    }
    if (matchedIds.length === 0) return { rows: [], total: 0 };
    productIdConstraint = matchedIds;
  }

  if (filters.q?.trim()) {
    const searchIds = await getProductIdsBySearch(filters.q.trim());
    if (searchIds.length === 0) return { rows: [], total: 0 };
    productIdConstraint = productIdConstraint
      ? productIdConstraint.filter((id) => searchIds.includes(id))
      : searchIds;
    if (productIdConstraint.length === 0) return { rows: [], total: 0 };
  }

  let query = supabase()
    .from("listings")
    .select(productListingSelect, { count: "exact" })
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  if (productIdConstraint !== undefined) {
    query = query.in("id", productIdConstraint);
  }

  if (filters.category.length > 0) {
    query = query.in("category", filters.category);
  }
  if (filters.product_type?.trim()) {
    query = query.eq("product_type", filters.product_type.trim());
  }
  if (filters.product_category?.trim()) {
    query = query.eq("product_category", filters.product_category.trim());
  }
  if (filters.product_subcategory?.trim()) {
    query = query.eq("product_subcategory", filters.product_subcategory.trim());
  }
  if (filters.year != null) {
    query = query.eq("year", filters.year);
  } else {
    if (filters.year_min != null) query = query.gte("year", filters.year_min);
    if (filters.year_max != null) query = query.lte("year", filters.year_max);
  }
  if (filters.brand?.trim()) {
    query = query.eq("owner_profile_id", filters.brand.trim());
  }

  const order = productOrder(sort);
  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending })
    .range(offset, offset + limit - 1);
  if (error) {
    console.warn("[explore] getProductRowsFiltered error:", error.message);
    return { rows: [], total: 0 };
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return { rows: rows.map(listingRowToRawProductRow), total: count ?? 0 };
}

/** Fetch all product listings with canonical columns. Source: listings (type=product). Public: only APPROVED. */
async function getProductRows(limit: number): Promise<RawProductRow[]> {
  const { data, error } = await supabase()
    .from("listings")
    .select(productListingSelect)
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explore] getProductRows error:", error.message);
    }
    return [];
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(listingRowToRawProductRow);
}

/**
 * Get projects for Explore/Home: from public.listings (type=project) + listing_images.
 * Returns ProjectCanonical[]; gallery from listing_images only, cover from cover_image_url or first image.
 * Also fetches owner profiles and connection counts; sets owner and connectionCount on each project.
 */
export async function getProjectsCanonical(
  limit: number = 200
): Promise<ProjectCanonical[]> {
  const rows = await getProjectListingRows(limit);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const clerkIds = Array.from(new Set(rows.map((r) => r.owner_clerk_user_id as string | null).filter(Boolean) as string[]));
  const ownerProfileIds = Array.from(new Set(rows.map((r) => (r as RawListingRow & { owner_profile_id?: string | null }).owner_profile_id).filter(Boolean) as string[]));
  const [imageResult, profilesByClerk, profilesById, materialsMap] = await Promise.all([
    getImagesByListingIds(ids),
    clerkIds.length > 0 ? getProfilesByClerkIds(clerkIds) : Promise.resolve({ data: [] }),
    ownerProfileIds.length > 0 ? getProfilesByIds(ownerProfileIds) : Promise.resolve({ data: [] }),
    getMaterialsByProjectIds(ids),
  ]);
  const { data: imageRows, error: imgError } = imageResult;
  if (imgError && process.env.NODE_ENV === "development") {
    console.warn("[explore] getImagesByListingIds error:", imgError);
  }
  const byListingId: Record<string, { listing_id: string; image_url: string; alt: string | null; sort_order: number }[]> = {};
  for (const img of imageRows ?? []) {
    if (!byListingId[img.listing_id]) byListingId[img.listing_id] = [];
    byListingId[img.listing_id].push(img);
  }
  const ownerByClerkId: Record<string, ProjectOwner> = {};
  for (const p of profilesByClerk.data ?? []) {
    const displayName = (p.display_name && p.display_name.trim()) || (p.username && p.username.trim()) || "";
    if (!displayName) continue;
    ownerByClerkId[p.clerk_user_id] = {
      displayName,
      avatarUrl: p.avatar_url ?? null,
      profileId: p.id,
      username: (p as { username?: string | null }).username ?? null,
    };
  }
  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }
  const result: ProjectCanonical[] = [];
  for (const row of rows) {
    if (!isProjectListing(row)) continue;
    const listingImages = byListingId[String(row.id)] ?? [];
    const projectMaterials = materialsMap[String(row.id)] ?? [];
    const project = normalizeProject(row, listingImages, projectMaterials);
    const profileId = (row as RawListingRow & { owner_profile_id?: string | null }).owner_profile_id ?? null;
    const clerkId = (row.owner_clerk_user_id as string) ?? null;
    project.owner = profileId ? ownerByProfileId[profileId] ?? null : (clerkId ? ownerByClerkId[clerkId] ?? null : null);
    result.push(project);
  }
  return result;
}

/**
 * Get products for Explore/Home: from public.listings (type=product) + listing_images.
 * Returns ProductCanonical[]; gallery from listing_images only.
 */
export async function getProductsCanonical(
  limit: number = 200
): Promise<ProductCanonical[]> {
  const rows = await getProductRows(limit);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const clerkIds = Array.from(new Set(rows.map((r) => (r as RawProductRow & { owner_clerk_user_id?: string | null }).owner_clerk_user_id).filter(Boolean) as string[]));
  const brandProfileIds = Array.from(new Set(rows.map((r) => (r as RawProductRow & { brand_profile_id?: string | null }).brand_profile_id).filter(Boolean) as string[]));
  const [imageResult, usedCounts, materialMap, profilesByClerk, profilesById] = await Promise.all([
    getImagesByListingIds(ids),
    getUsedInProjectsCountByProductIds(ids),
    getMaterialsByProductIds(ids),
    clerkIds.length > 0 ? getProfilesByClerkIds(clerkIds) : Promise.resolve({ data: [] }),
    brandProfileIds.length > 0 ? getProfilesByIds(brandProfileIds) : Promise.resolve({ data: [] }),
  ]);
  const imageRows = imageResult.data ?? [];
  const ownerByClerkId: Record<string, ProjectOwner> = {};
  for (const p of profilesByClerk.data ?? []) {
    const displayName = (p.display_name && p.display_name.trim()) || (p.username && p.username.trim()) || "";
    if (!displayName) continue;
    ownerByClerkId[p.clerk_user_id] = {
      displayName,
      avatarUrl: p.avatar_url ?? null,
      profileId: p.id,
      username: (p as { username?: string | null }).username ?? null,
    };
  }
  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }
  return rows.map((row) => {
    const productImages = listingImagesToProductImageRows(String(row.id), imageRows);
    const productMaterials = materialMap[String(row.id)] ?? [];
    const product = normalizeProduct(row, productImages, productMaterials);
    product.connectionCount += usedCounts[String(row.id)] ?? 0;
    const brandId = (row as RawProductRow & { brand_profile_id?: string | null }).brand_profile_id ?? null;
    const clerkId = (row as RawProductRow & { owner_clerk_user_id?: string | null }).owner_clerk_user_id ?? null;
    product.owner = brandId ? ownerByProfileId[brandId] ?? null : (clerkId ? ownerByClerkId[clerkId] ?? null : null);
    return product;
  });
}

const DEFAULT_PAGE_SIZE = 24;

/**
 * Get projects with filters, sort, pagination. Returns canonical list and total count.
 */
export async function getProjectsCanonicalFiltered({
  filters,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  sort = "newest",
}: {
  filters: ProjectFilters;
  limit?: number;
  offset?: number;
  sort?: ProjectSortOption;
}): Promise<{ data: ProjectCanonical[]; total: number }> {
  const { rows, total } = await getProjectListingRowsFiltered(
    filters,
    limit,
    offset,
    sort
  );
  if (rows.length === 0) return { data: [], total };

  const ids = rows.map((r) => String(r.id));
  const clerkIds = Array.from(new Set(rows.map((r) => r.owner_clerk_user_id as string | null).filter(Boolean) as string[]));
  const ownerProfileIds = Array.from(new Set(rows.map((r) => (r as RawListingRow & { owner_profile_id?: string | null }).owner_profile_id).filter(Boolean) as string[]));
  const [imageResult, profilesByClerk, profilesById, materialsMap] = await Promise.all([
    getImagesByListingIds(ids),
    clerkIds.length > 0 ? getProfilesByClerkIds(clerkIds) : Promise.resolve({ data: [] }),
    ownerProfileIds.length > 0 ? getProfilesByIds(ownerProfileIds) : Promise.resolve({ data: [] }),
    getMaterialsByProjectIds(ids),
  ]);
  const { data: imageRows } = imageResult;
  const byListingId: Record<string, { listing_id: string; image_url: string; alt: string | null; sort_order: number }[]> = {};
  for (const img of imageRows ?? []) {
    if (!byListingId[img.listing_id]) byListingId[img.listing_id] = [];
    byListingId[img.listing_id].push(img);
  }
  const ownerByClerkId: Record<string, ProjectOwner> = {};
  for (const p of profilesByClerk.data ?? []) {
    const displayName = (p.display_name && p.display_name.trim()) || (p.username && p.username.trim()) || "";
    if (!displayName) continue;
    ownerByClerkId[p.clerk_user_id] = {
      displayName,
      avatarUrl: p.avatar_url ?? null,
      profileId: p.id,
      username: (p as { username?: string | null }).username ?? null,
    };
  }
  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }
  const data: ProjectCanonical[] = [];
  for (const row of rows) {
    if (!isProjectListing(row)) continue;
    const listingImages = byListingId[String(row.id)] ?? [];
    const projectMaterials = materialsMap[String(row.id)] ?? [];
    const project = normalizeProject(row, listingImages, projectMaterials);
    const profileId = (row as RawListingRow & { owner_profile_id?: string | null }).owner_profile_id ?? null;
    const clerkId = (row.owner_clerk_user_id as string) ?? null;
    project.owner = profileId ? ownerByProfileId[profileId] ?? null : (clerkId ? ownerByClerkId[clerkId] ?? null : null);
    data.push(project);
  }
  return { data, total };
}

/** Build ProjectOwner from profile row (id, display_name, username). */
function toProjectOwner(p: { id: string; display_name: string | null; username: string | null }): ProjectOwner {
  const displayName =
    (p.display_name && p.display_name.trim()) ||
    (p.username && p.username.trim()) ||
    "";
  return {
    displayName,
    avatarUrl: null,
    profileId: p.id,
    username: p.username?.trim() || null,
  };
}

/**
 * Get products with filters, sort, pagination. Returns canonical list and total count.
 */
export async function getProductsCanonicalFiltered({
  filters,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  sort = "newest",
}: {
  filters: ProductFilters;
  limit?: number;
  offset?: number;
  sort?: ProductSortOption;
}): Promise<{ data: ProductCanonical[]; total: number }> {
  const { rows, total } = await getProductRowsFiltered(
    filters,
    limit,
    offset,
    sort
  );
  if (rows.length === 0) return { data: [], total };

  const ids = rows.map((r) => String(r.id));
  const clerkIds = Array.from(
    new Set(
      rows
        .map((r) => (r as RawProductRow & { owner_clerk_user_id?: string | null }).owner_clerk_user_id)
        .filter(Boolean) as string[]
    )
  );
  const brandProfileIds = Array.from(
    new Set(
      rows
        .map((r) => (r as RawProductRow & { brand_profile_id?: string | null }).brand_profile_id)
        .filter(Boolean) as string[]
    )
  );
  const [imageResult, usedCounts, materialMap, profilesByClerk, profilesById] = await Promise.all([
    getImagesByListingIds(ids),
    getUsedInProjectsCountByProductIds(ids),
    getMaterialsByProductIds(ids),
    clerkIds.length > 0 ? getProfilesByClerkIds(clerkIds) : Promise.resolve({ data: [] }),
    brandProfileIds.length > 0 ? getProfilesByIds(brandProfileIds) : Promise.resolve({ data: [] }),
  ]);
  const imageRows = imageResult.data ?? [];
  const ownerByClerkId: Record<string, ProjectOwner> = {};
  for (const p of profilesByClerk.data ?? []) {
    const displayName = (p.display_name && p.display_name.trim()) || (p.username && p.username.trim()) || "";
    if (!displayName) continue;
    ownerByClerkId[p.clerk_user_id] = {
      displayName,
      avatarUrl: (p as { avatar_url?: string | null }).avatar_url ?? null,
      profileId: p.id,
      username: (p as { username?: string | null }).username ?? null,
    };
  }
  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }
  const data = rows.map((row) => {
    const productImages = listingImagesToProductImageRows(String(row.id), imageRows);
    const productMaterials = materialMap[String(row.id)] ?? [];
    const product = normalizeProduct(row, productImages, productMaterials);
    product.connectionCount += usedCounts[String(row.id)] ?? 0;
    const brandId = (row as RawProductRow & { brand_profile_id?: string | null }).brand_profile_id ?? null;
    const clerkId = (row as RawProductRow & { owner_clerk_user_id?: string | null }).owner_clerk_user_id ?? null;
    product.owner = brandId
      ? ownerByProfileId[brandId] ?? null
      : clerkId
        ? ownerByClerkId[clerkId] ?? null
        : null;
    return product;
  });
  return { data, total };
}

export const EXPLORE_PAGE_SIZE = DEFAULT_PAGE_SIZE;

/** Distinct values for project filter dropdowns (categories, materials, locations, designers, brands, years). */
export async function getProjectFilterOptions(): Promise<{
  categories: string[];
  materials: { slug: string; display_name: string }[];
  locations: { city: string | null; country: string | null }[];
  designers: { id: string; name: string }[];
  brands: string[];
  years: number[];
  areas: string[];
}> {
  const sup = supabase();
  const [catRes, matRes, listingRes, profilesRes] = await Promise.all([
    sup.from("listings").select("category").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).not("category", "is", null),
    sup.from("materials").select("name, slug").order("name", { ascending: true }),
    sup
      .from("listings")
      .select("location_city, location_country, owner_clerk_user_id, year, brands_used")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .limit(2000),
    sup.from("profiles").select("clerk_user_id, display_name, username").eq("is_hidden", false).not("username", "is", null),
  ]);
  const categories = Array.from(
    new Set(
      (catRes.data ?? [])
        .map((r) => (r as { category: string | null }).category?.trim())
        .filter(Boolean) as string[]
    )
  ).sort();
  const materials =
    matRes.error
      ? []
      : ((matRes.data ?? []) as { name: string; slug: string }[]).map((m) => ({
          display_name: m.name,
          slug: m.slug,
        }));

  const listings = (listingRes.data ?? []) as {
    location_city: string | null;
    location_country: string | null;
    owner_clerk_user_id: string | null;
    year: number | null;
    brands_used: { name?: string }[] | null;
  }[];
  const locationSet = new Set<string>();
  const ownerIds = new Set<string>();
  const yearsSet = new Set<number>();
  const brandNames = new Set<string>();
  for (const row of listings) {
    if (row.location_city?.trim() || row.location_country?.trim()) {
      locationSet.add(JSON.stringify({ city: row.location_city?.trim() ?? null, country: row.location_country?.trim() ?? null }));
    }
    if (row.owner_clerk_user_id?.trim()) ownerIds.add(row.owner_clerk_user_id.trim());
    if (row.year != null && !Number.isNaN(row.year)) yearsSet.add(Number(row.year));
    const bu = row.brands_used;
    if (Array.isArray(bu)) for (const b of bu) if (b?.name?.trim()) brandNames.add(b.name.trim());
  }
  const locations = Array.from(locationSet)
    .map((s) => JSON.parse(s) as { city: string | null; country: string | null })
    .sort((a, b) => {
      const ac = (a.country ?? "") + (a.city ?? "");
      const bc = (b.country ?? "") + (b.city ?? "");
      return ac.localeCompare(bc);
    });
  const profiles = (profilesRes.data ?? []) as { clerk_user_id: string; display_name: string | null; username: string | null }[];
  const profileByClerk = new Map(profiles.map((p) => [p.clerk_user_id, p]));
  const designers = Array.from(ownerIds)
    .filter((id) => profileByClerk.has(id))
    .map((id) => {
      const p = profileByClerk.get(id)!;
      const name = (p.display_name?.trim() || p.username?.trim() || id) as string;
      return { id, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const brands = Array.from(brandNames).sort();
  const years = Array.from(yearsSet).filter((y) => y >= 1900 && y <= 2100).sort((a, b) => b - a);
  const areas = ["<500", "500-1000", "1000-2000", "2000-4000", "4000-8000", "8000+"];

  return { categories, materials, locations, designers, brands, years, areas };
}

/** Distinct values for product filter dropdowns + brands. Source: listings (type=product). */
export async function getProductFilterOptions(): Promise<{
  categories: string[];
  materialTypes: string[];
  colors: string[];
  brands: { id: string; name: string }[];
  materials: { slug: string; display_name: string }[];
  years: number[];
}> {
  const sup = supabase();
  const [catRes, brandProfiles, materialRes, yearRes] = await Promise.all([
    sup.from("listings").select("category").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).not("category", "is", null),
    sup.from("profiles").select("id, display_name, username").eq("role", "brand").eq("is_hidden", false).not("username", "is", null),
    sup.from("materials").select("name, slug").order("name", { ascending: true }),
    sup.from("listings").select("year").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).not("year", "is", null),
  ]);
  const categories = Array.from(new Set((catRes.data ?? []).map((r) => (r as { category: string | null }).category?.trim()).filter(Boolean) as string[])).sort();
  const materialTypes: string[] = [];
  const colors: string[] = [];
  const brands = (brandProfiles.data ?? []).map((r) => {
    const row = r as { id: string; display_name: string | null; username: string | null };
    const name = (row.display_name?.trim() || row.username?.trim() || row.id) as string;
    return { id: row.id, name };
  });
  const materials = materialRes.error
    ? []
    : ((materialRes.data ?? []) as { name: string; slug: string }[]).map((m) => ({
        display_name: m.name,
        slug: m.slug,
      }));
  const years = Array.from(
    new Set(
      (yearRes.data ?? [])
        .map((r) => (r as { year: number | null }).year)
        .filter((y): y is number => y != null && !Number.isNaN(y) && y >= 1900 && y <= 2100)
    )
  ).sort((a, b) => b - a);
  return { categories, materialTypes, colors, brands, materials, years };
}

/** Safe length of jsonb array or object. */
function safeJsonbLength(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v != null && typeof v === "object") return Object.keys(v).length;
  return 0;
}

export type ExploreStatsType = "projects" | "products";

export interface ExploreStats {
  totalListings: number;
  totalConnections: number;
}

/**
 * Get explore CTA stats: total listings and total connections.
 * Projects: listings (type=project) + connections = sum(team_members + brands_used per project) + project_product_links count.
 * Products: listings (type=product) + connections = sum(team_members per product) + project_product_links count + owner_profile_id set.
 * Returns null on error so the CTA strip can be hidden.
 */
export async function getExploreStats(type: ExploreStatsType): Promise<ExploreStats | null> {
  try {
    const sup = supabase();

    if (type === "projects") {
      const [listingsCountRes, pplRes, listingRowsRes] = await Promise.all([
        sup.from("listings").select("id", { count: "exact", head: true }).eq("type", "project").eq("status", "APPROVED").is("deleted_at", null),
        sup.from("project_product_links").select("project_id", { count: "exact", head: true }),
        sup.from("listings").select("team_members, brands_used").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).range(0, 9999),
      ]);
      const totalListings = listingsCountRes.count ?? 0;
      const pplCount = pplRes.error ? 0 : pplRes.count ?? 0;
      const rows = (listingRowsRes.data ?? []) as { team_members?: unknown; brands_used?: unknown }[];
      let projectSideSum = 0;
      for (const r of rows) {
        projectSideSum += safeJsonbLength(r.team_members) + safeJsonbLength(r.brands_used);
      }
      const totalConnections = projectSideSum + pplCount;
      return { totalListings, totalConnections };
    }

    // products (listings type=product)
    const [productsCountRes, pplRes, productRowsRes] = await Promise.all([
      sup.from("listings").select("id", { count: "exact", head: true }).eq("type", "product").eq("status", "APPROVED").is("deleted_at", null),
      sup.from("project_product_links").select("product_id", { count: "exact", head: true }),
      sup.from("listings").select("team_members, owner_profile_id").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).range(0, 9999),
    ]);
    const totalListings = productsCountRes.count ?? 0;
    const pplCount = pplRes.error ? 0 : pplRes.count ?? 0;
    const rows = (productRowsRes.data ?? []) as { team_members?: unknown; owner_profile_id?: string | null }[];
    let teamSum = 0;
    let brandCount = 0;
    for (const r of rows) {
      teamSum += safeJsonbLength(r.team_members);
      if (r.owner_profile_id != null && String(r.owner_profile_id).trim() !== "") brandCount += 1;
    }
    const totalConnections = teamSum + pplCount + brandCount;
    return { totalListings, totalConnections };
  } catch {
    return null;
  }
}

export interface ExploreNetworkCounts {
  projectCount: number;
  productCount: number;
  connectionCount: number | null;
}

/**
 * Read-only counts for Explore header: projects, products, and total connections (project_product_links).
 * Returns null on error; connectionCount may be null if that query fails.
 */
export async function getExploreNetworkCounts(): Promise<ExploreNetworkCounts | null> {
  try {
    const sup = supabase();
    const [projectsRes, productsRes, pplRes] = await Promise.all([
      sup.from("listings").select("id", { count: "exact", head: true }).eq("type", "project").eq("status", "APPROVED").is("deleted_at", null),
      sup.from("listings").select("id", { count: "exact", head: true }).eq("type", "product").eq("status", "APPROVED").is("deleted_at", null),
      sup.from("project_product_links").select("id", { count: "exact", head: true }),
    ]);
    const projectCount = projectsRes.count ?? 0;
    const productCount = productsRes.count ?? 0;
    const connectionCount = pplRes.error ? null : (pplRes.count ?? 0);
    return { projectCount, productCount, connectionCount };
  } catch {
    return null;
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fetch one project listing by slug or id (UUID). Returns null if not found or not type=project. */
export async function getProjectListingBySlugOrId(
  slugOrId: string
): Promise<RawListingRow | null> {
  const isId = UUID_REGEX.test(slugOrId.trim());
  const q = supabase()
    .from("listings")
    .select(projectListingSelect)
    .eq("type", "project")
    .is("deleted_at", null);
  const { data, error } = isId
    ? await q.eq("id", slugOrId.trim()).maybeSingle()
    : await q.eq("slug", slugOrId.trim()).maybeSingle();
  if (error || !data) return null;
  return data as RawListingRow;
}

/** Get one project in canonical form for detail page. */
export async function getProjectCanonicalBySlugOrId(
  slugOrId: string
): Promise<ProjectCanonical | null> {
  const row = await getProjectListingBySlugOrId(slugOrId);
  if (!row || !isProjectListing(row)) return null;
  const id = String(row.id);
  const [imageResult, profilesResult, materialsMap] = await Promise.all([
    getImagesByListingIds([id]),
    (row.owner_clerk_user_id as string)
      ? getProfilesByClerkIds([row.owner_clerk_user_id as string])
      : Promise.resolve({ data: [], error: null }),
    getMaterialsByProjectIds([id]),
  ]);
  const { data: imageRows } = imageResult;
  const listingImages = (imageRows ?? []).map((img) => ({
    listing_id: img.listing_id,
    image_url: img.image_url,
    alt: img.alt,
    sort_order: img.sort_order,
  }));
  const projectMaterials = materialsMap[id] ?? [];
  const project = normalizeProject(row, listingImages, projectMaterials);
  const profiles = profilesResult.data ?? [];
  const ownerProfile = profiles[0];
  if (ownerProfile) {
    project.owner = {
      displayName:
        (ownerProfile.display_name && ownerProfile.display_name.trim()) ||
        (ownerProfile.username && ownerProfile.username.trim()) ||
        "",
      avatarUrl: ownerProfile.avatar_url ?? null,
      profileId: ownerProfile.id,
    };
  } else {
    project.owner = null;
  }
  return project;
}

/** Fetch one product listing by slug or id (UUID). Source: listings (type=product). */
export async function getProductListingBySlugOrId(
  slugOrId: string
): Promise<RawProductRow | null> {
  const isId = UUID_REGEX.test(slugOrId.trim());
  const q = supabase()
    .from("listings")
    .select(productListingSelect)
    .eq("type", "product")
    .is("deleted_at", null);
  const { data, error } = isId
    ? await q.eq("id", slugOrId.trim()).maybeSingle()
    : await q.eq("slug", slugOrId.trim()).maybeSingle();
  if (error || !data) return null;
  return listingRowToRawProductRow(data as Record<string, unknown>);
}

/** Get one product in canonical form for detail page. Source: listings + listing_images. */
export async function getProductCanonicalBySlug(
  slug: string
): Promise<ProductCanonical | null> {
  const row = await getProductListingBySlugOrId(slug);
  if (!row) return null;
  const id = String(row.id);
  const [imageResult, usedCounts, materialMap] = await Promise.all([
    getImagesByListingIds([id]),
    getUsedInProjectsCountByProductIds([id]),
    getMaterialsByProductIds([id]),
  ]);
  const imageRows = imageResult.data ?? [];
  const productImages = listingImagesToProductImageRows(id, imageRows);
  const product = normalizeProduct(row, productImages, materialMap[id] ?? []);
  product.connectionCount += usedCounts[id] ?? 0;
  return product;
}
