import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "photo_product_tags";
const PPL = "project_product_links";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface PhotoProductTag {
  id: string;
  listing_image_id: string;
  product_id: string | null;
  x: number;
  y: number;
  created_at: string;
  /** Admin-only metadata */
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  category_text?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
  created_by_clerk_id?: string | null;
}

/** Product listing + product table data for a tag. product_id on tag = listings.id (product listing) = products.id. */
export interface PhotoTagProduct {
  id: string;
  slug: string;
  title: string | null;
  brand?: string | null;
  color_options?: string[] | null;
  thumbnail?: string | null;
}

/** Tag with joined product (listings + products + brand from profiles). For lightbox and public pages. */
export interface PhotoProductTagWithProduct {
  id: string;
  listing_image_id: string;
  product_id: string | null;
  x: number;
  y: number;
  /** Joined: product listing (listings.id = product_id) + products (color_options) + brand from profiles. */
  product: PhotoTagProduct | null;
  created_at?: string;
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  category_text?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
  created_by_clerk_id?: string | null;
}

/** Get all photo product tags for the given listing image ids, with product joined.
 * Joins: listings as product listing (listings.id = photo_product_tags.product_id), left join products (products.id = product_listing.id) for color_options, profiles for brand.
 * Returns tag.id, listing_image_id, product: { id, slug, title, brand, color_options, thumbnail }, x, y.
 */
export async function getPhotoProductTagsByImageIds(
  listingImageIds: string[]
): Promise<DbResult<PhotoProductTagWithProduct[]>> {
  if (listingImageIds.length === 0) return { data: [], error: null };
  const supabase = getSupabaseServiceClient();
  const cols = "id, listing_image_id, product_id, x, y, created_at";
  const { data: tagRows, error } = await supabase
    .from(TABLE)
    .select(cols)
    .in("listing_image_id", listingImageIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getPhotoProductTagsByImageIds] error", error?.message);
    return { data: null, error: error.message };
  }
  const tags = (tagRows ?? []) as PhotoProductTag[];
  const productIds = Array.from(new Set(tags.map((t) => t.product_id).filter(Boolean))) as string[];
  if (productIds.length === 0) {
    return {
      data: tags.map((t) => ({
        ...t,
        product: null,
      })) as PhotoProductTagWithProduct[],
      error: null,
    };
  }

  const [listingsRes, productsRes] = await Promise.all([
    supabase.from("listings").select("id, title, slug, cover_image_url, owner_profile_id").in("id", productIds),
    supabase.from("products").select("id, color_options").in("id", productIds),
  ]);
  const listingRows = (listingsRes.data ?? []) as {
    id: string;
    title: string | null;
    slug: string | null;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }[];
  const productRows = (productsRes.data ?? []) as { id: string; color_options?: string[] | null }[];
  const ownerIds = Array.from(new Set(listingRows.map((r) => r.owner_profile_id).filter(Boolean))) as string[];
  let brandByProfileId: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select("id, display_name, username").in("id", ownerIds);
    for (const p of profileRows ?? []) {
      const row = p as { id: string; display_name: string | null; username: string | null };
      brandByProfileId[row.id] = (row.display_name ?? row.username ?? "").trim() || "";
    }
  }
  const listingById: Record<string, (typeof listingRows)[0]> = {};
  for (const r of listingRows) listingById[r.id] = r;
  const productById: Record<string, { color_options?: string[] | null }> = {};
  for (const r of productRows) productById[r.id] = { color_options: r.color_options ?? null };

  const productMap: Record<string, PhotoTagProduct> = {};
  for (const id of productIds) {
    const list = listingById[id];
    if (!list) continue;
    const prod = productById[id];
    productMap[id] = {
      id,
      slug: list.slug?.trim() ?? id,
      title: list.title?.trim() ?? null,
      brand: list.owner_profile_id ? (brandByProfileId[list.owner_profile_id] || null) : null,
      color_options: prod?.color_options ?? null,
      thumbnail: list.cover_image_url?.trim() || null,
    };
  }

  const result: PhotoProductTagWithProduct[] = tags.map((t) => ({
    ...t,
    product: t.product_id ? productMap[t.product_id] ?? null : null,
  }));
  return { data: result, error: null };
}

/** Get the listing (project) id for a tag, via listing_images.listing_id. Used for revalidation. */
export async function getListingIdByTagId(tagId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data: tag, error: tagErr } = await supabase
    .from(TABLE)
    .select("listing_image_id")
    .eq("id", tagId)
    .maybeSingle();
  if (tagErr || !tag) return null;
  const listingImageId = (tag as { listing_image_id: string }).listing_image_id;
  const { data: row, error: imgErr } = await supabase
    .from("listing_images")
    .select("listing_id")
    .eq("id", listingImageId)
    .maybeSingle();
  if (imgErr || !row) return null;
  return (row as { listing_id: string }).listing_id;
}

/**
 * Add a photo product tag and optionally upsert project_product_links with source='photo_tag'.
 * Manual links take priority: if a project_product_links row already exists with source='manual',
 * it is left unchanged (manual > photo_tag).
 * x/y are clamped to 0..1 (normalized).
 */
export async function addPhotoProductTag(
  listingImageId: string,
  listingId: string,
  productId: string,
  x: number,
  y: number
): Promise<DbResult<PhotoProductTag>> {
  const supabase = getSupabaseServiceClient();
  const xNorm = Math.max(0, Math.min(1, Number(x)));
  const yNorm = Math.max(0, Math.min(1, Number(y)));
  const insertPayload: Record<string, unknown> = {
    listing_image_id: listingImageId,
    product_id: productId,
    x: xNorm,
    y: yNorm,
  };
  console.log("[addPhotoProductTag] insert payload", insertPayload);

  const { data: tag, error: tagError } = await supabase
    .from(TABLE)
    .insert(insertPayload)
    .select("*")
    .single();

  console.log("[addPhotoProductTag] Supabase insert result", {
    hasData: !!tag,
    tagId: tag?.id,
    created_at: tag?.created_at,
    error: tagError?.message ?? null,
  });
  if (tagError) return { data: null, error: tagError.message };
  if (!tag) return { data: null, error: "Insert returned no row" };

  const { data: existing } = await supabase
    .from(PPL)
    .select("source")
    .eq("project_id", listingId)
    .eq("product_id", productId)
    .maybeSingle();

  if ((existing as { source?: string } | null)?.source === "manual") {
    return { data: tag as PhotoProductTag, error: null };
  }

  await supabase
    .from(PPL)
    .upsert(
      { project_id: listingId, product_id: productId, source: "photo_tag" },
      { onConflict: "project_id,product_id" }
    );

  return { data: tag as PhotoProductTag, error: null };
}

/**
 * Create a placeholder tag (no product yet). Admin places hotspot then fills editor and picks product.
 * listingId is used to resolve listing_image -> listing for project_id when we later set product_id.
 */
export async function createPhotoProductTagPlaceholder(
  listingImageId: string,
  listingId: string,
  x: number,
  y: number,
  createdByClerkId: string
): Promise<DbResult<PhotoProductTag>> {
  const supabase = getSupabaseServiceClient();
  const xNorm = Math.max(0, Math.min(1, Number(x)));
  const yNorm = Math.max(0, Math.min(1, Number(y)));

  const { data: tag, error } = await supabase
    .from(TABLE)
    .insert({
      listing_image_id: listingImageId,
      product_id: null,
      x: xNorm,
      y: yNorm,
      created_by_clerk_id: createdByClerkId,
    })
    .select("id, listing_image_id, product_id, x, y, created_at, product_type_id, product_category_id, product_subcategory_id, category_text, color_text, material_id, feature_text, created_by_clerk_id")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: tag as PhotoProductTag, error: null };
}

export interface UpdatePhotoProductTagInput {
  product_id?: string | null;
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  category_text?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
}

const TAG_SELECT_COLS = "id, listing_image_id, product_id, x, y, created_at, product_type_id, product_category_id, product_subcategory_id, category_text, color_text, material_id, feature_text, created_by_clerk_id";

/** Update a photo product tag (admin metadata and/or product_id). */
export async function updatePhotoProductTag(
  tagId: string,
  input: UpdatePhotoProductTagInput
): Promise<DbResult<PhotoProductTag>> {
  const supabase = getSupabaseServiceClient();
  const payload: Record<string, unknown> = {};
  if (input.product_id !== undefined) payload.product_id = input.product_id;
  if (input.product_type_id !== undefined) payload.product_type_id = input.product_type_id;
  if (input.product_category_id !== undefined) payload.product_category_id = input.product_category_id;
  if (input.product_subcategory_id !== undefined) payload.product_subcategory_id = input.product_subcategory_id;
  if (input.category_text !== undefined) payload.category_text = input.category_text;
  if (input.color_text !== undefined) payload.color_text = input.color_text;
  if (input.material_id !== undefined) payload.material_id = input.material_id;
  if (input.feature_text !== undefined) payload.feature_text = input.feature_text;
  if (Object.keys(payload).length === 0) {
    const { data } = await supabase.from(TABLE).select(TAG_SELECT_COLS).eq("id", tagId).single();
    return { data: data as PhotoProductTag, error: null };
  }
  const { data: tag, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", tagId)
    .select(TAG_SELECT_COLS)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: tag as PhotoProductTag, error: null };
}

/** Remove a photo product tag by id. Does not remove project_product_links (product may still be linked manually). */
export async function removePhotoProductTag(
  tagId: string
): Promise<DbResult<void>> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", tagId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

export interface TagSuggestionProduct {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  brand_name: string | null;
}

export interface SearchSuggestedProductsFilters {
  typeId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  colorText?: string | null;
  materialId?: string | null;
  featureText?: string | null;
  /** Search by product title or brand/owner name (ILIKE). Optional; when set, other filters are optional refinements. */
  queryText?: string | null;
}

const SUGGESTION_LIMIT = 25;

type ListingRow = { id: string; title: string | null; slug: string | null; cover_image_url: string | null; owner_profile_id: string | null; product_type: string | null; product_category: string | null; product_subcategory: string | null; description: string | null; feature_highlight: string | null };

/**
 * Search products for admin tag suggestions.
 * - queryText: ILIKE on title or brand/owner (optional).
 * - typeId, categoryId, subcategoryId, colorText, materialId: optional refinements.
 */
export async function searchSuggestedProducts(
  filters: SearchSuggestedProductsFilters,
  limit: number = SUGGESTION_LIMIT
): Promise<DbResult<TagSuggestionProduct[]>> {
  const supabase = getSupabaseServiceClient();
  const q = filters.queryText?.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
  let query = supabase
    .from("listings")
    .select("id, title, slug, cover_image_url, owner_profile_id, product_type, product_category, product_subcategory, description, feature_highlight")
    .eq("type", "product")
    .is("deleted_at", null)
    .limit(limit * 4);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,feature_highlight.ilike.%${q}%`);
  }
  if (filters.typeId?.trim()) {
    query = query.eq("product_type", filters.typeId.trim());
  }
  if (filters.categoryId?.trim()) {
    query = query.eq("product_category", filters.categoryId.trim());
  }
  if (filters.subcategoryId?.trim()) {
    query = query.eq("product_subcategory", filters.subcategoryId.trim());
  }

  const { data: rows, error } = await query;
  if (error) return { data: null, error: error.message };
  let list = (rows ?? []) as ListingRow[];

  if (q && list.length < limit * 2) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(50);
    const profileIds = (profiles ?? []).map((p: { id: string }) => p.id);
    if (profileIds.length > 0) {
      let byOwnerQuery = supabase
        .from("listings")
        .select("id, title, slug, cover_image_url, owner_profile_id, product_type, product_category, product_subcategory, description, feature_highlight")
        .eq("type", "product")
        .is("deleted_at", null)
        .in("owner_profile_id", profileIds)
        .limit(limit * 2);
      if (filters.typeId?.trim()) byOwnerQuery = byOwnerQuery.eq("product_type", filters.typeId.trim());
      if (filters.categoryId?.trim()) byOwnerQuery = byOwnerQuery.eq("product_category", filters.categoryId.trim());
      if (filters.subcategoryId?.trim()) byOwnerQuery = byOwnerQuery.eq("product_subcategory", filters.subcategoryId.trim());
      const { data: byOwner } = await byOwnerQuery;
      const byOwnerList = (byOwner ?? []) as ListingRow[];
      const seen = new Set(list.map((r) => r.id));
      for (const r of byOwnerList) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          list.push(r);
        }
      }
    }
  }

  const typeIdTrim = filters.typeId?.trim() ?? "";
  const categoryIdTrim = filters.categoryId?.trim() ?? "";
  const subcategoryIdTrim = filters.subcategoryId?.trim() ?? "";
  if (typeIdTrim) list = list.filter((r) => (r.product_type ?? "").trim() === typeIdTrim);
  if (categoryIdTrim) list = list.filter((r) => (r.product_category ?? "").trim() === categoryIdTrim);
  if (subcategoryIdTrim) list = list.filter((r) => (r.product_subcategory ?? "").trim() === subcategoryIdTrim);

  if (filters.colorText?.trim()) {
    const c = filters.colorText.trim().toLowerCase();
    list = list.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(c)) ||
        (r.description && r.description?.toLowerCase().includes(c)) ||
        (r.feature_highlight && r.feature_highlight.toLowerCase().includes(c))
    );
  }

  if (filters.materialId?.trim()) {
    const { data: links } = await supabase
      .from("product_material_links")
      .select("product_id")
      .eq("material_id", filters.materialId.trim());
    const withMaterial = new Set((links ?? []).map((l: { product_id: string }) => l.product_id));
    list = list.filter((r) => withMaterial.has(r.id));
  }

  if (filters.featureText?.trim()) {
    const fq = filters.featureText.trim().toLowerCase();
    list = list
      .map((r) => {
        const inTitle = r.title?.toLowerCase().includes(fq);
        const inDesc = r.description?.toLowerCase().includes(fq);
        const inFeature = r.feature_highlight?.toLowerCase().includes(fq);
        const score = (inTitle ? 3 : 0) + (inDesc ? 1 : 0) + (inFeature ? 2 : 0);
        return { ...r, _score: score };
      })
      .sort((a, b) => (b as { _score: number })._score - (a as { _score: number })._score);
  }

  const ordered = list.slice(0, limit);
  if (process.env.NODE_ENV === "development" && ordered.length > 0) {
    console.debug("[searchSuggestedProducts] filters:", {
      typeId: typeIdTrim || null,
      categoryId: categoryIdTrim || null,
      subcategoryId: subcategoryIdTrim || null,
      queryText: filters.queryText?.trim() || null,
    });
    console.debug("[searchSuggestedProducts] sample rows:", ordered.slice(0, 5).map((r) => ({
      id: r.id,
      product_type: r.product_type,
      product_category: r.product_category,
      product_subcategory: r.product_subcategory,
    })));
  }
  const profileIds = Array.from(new Set(ordered.map((r) => r.owner_profile_id).filter(Boolean))) as string[];
  let brandByProfileId: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const pr = p as { id: string; display_name: string | null; username: string | null };
      brandByProfileId[pr.id] = (pr.display_name ?? pr.username ?? "").trim() || pr.id;
    }
  }
  const result: TagSuggestionProduct[] = ordered.map((r) => ({
    id: r.id,
    title: r.title ?? null,
    slug: r.slug ?? null,
    cover_image_url: r.cover_image_url ?? null,
    brand_name: r.owner_profile_id ? (brandByProfileId[r.owner_profile_id] ?? null) : null,
  }));
  return { data: result, error: null };
}

/** Distinct product_category values from listings (type=product) for tag editor dropdown. */
export async function getTagCategoryOptions(): Promise<DbResult<string[]>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .select("product_category, category")
    .eq("type", "product")
    .is("deleted_at", null);
  if (error) return { data: null, error: error.message };
  const set = new Set<string>();
  for (const row of data ?? []) {
    const r = row as { product_category?: string | null; category?: string | null };
    if (r.product_category?.trim()) set.add(r.product_category.trim());
    if (r.category?.trim()) set.add(r.category.trim());
  }
  return { data: Array.from(set).sort(), error: null };
}

/** Distinct product_subcategory values from listings (type=product) for tag editor dropdown. */
export async function getTagSubcategoryOptions(): Promise<DbResult<string[]>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .select("product_subcategory")
    .eq("type", "product")
    .is("deleted_at", null);
  if (error) return { data: null, error: error.message };
  const set = new Set<string>();
  for (const row of data ?? []) {
    const r = row as { product_subcategory?: string | null };
    if (r.product_subcategory?.trim()) set.add(r.product_subcategory.trim());
  }
  return { data: Array.from(set).sort(), error: null };
}

export interface WorkstationSuggestedProduct {
  id: string;
  /** Product listing id (listings.id for type=product). Same as id when from listings table; use for photo_product_tags.product_id. */
  listing_id?: string | null;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  brand_name: string | null;
  product_type: string | null;
  product_category: string | null;
  product_subcategory: string | null;
  color_options: string[];
  updated_at: string | null;
  score: number;
}

export interface WorkstationSuggestedFilters {
  typeId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  materialId?: string | null;
  colorOptions?: string[];
  searchQuery?: string | null;
}

/**
 * Fetch products for tagging workstation with scoring.
 * Score: +3 type, +3 category, +3 subcategory, +2 material, +2 color overlap, +1 search in title/brand.
 * Returns bestMatch (score > 0, max 6) and allResults (all, sorted by score desc, updated_at desc).
 */
export async function getSuggestedProductsForWorkstation(
  filters: WorkstationSuggestedFilters,
  limit: number = 50
): Promise<DbResult<{ bestMatch: WorkstationSuggestedProduct[]; allResults: WorkstationSuggestedProduct[] }>> {
  const supabase = getSupabaseServiceClient();
  type Row = {
    id: string;
    title: string | null;
    slug: string | null;
    cover_image_url: string | null;
    owner_profile_id: string | null;
    product_type: string | null;
    product_category: string | null;
    product_subcategory: string | null;
    updated_at: string | null;
    color_options?: string[] | null;
  };
  const hasTaxonomyFilters = !!(filters.typeId?.trim() || filters.categoryId?.trim() || filters.subcategoryId?.trim());
  const queryLimit = hasTaxonomyFilters ? limit * 6 : limit * 2;
  let query = supabase
    .from("listings")
    .select("id, title, slug, cover_image_url, owner_profile_id, product_type, product_category, product_subcategory, updated_at")
    .eq("type", "product")
    .is("deleted_at", null)
    .limit(queryLimit);

  if (filters.typeId?.trim()) {
    query = query.eq("product_type", filters.typeId.trim());
  }
  if (filters.categoryId?.trim()) {
    query = query.eq("product_category", filters.categoryId.trim());
  }
  if (filters.subcategoryId?.trim()) {
    query = query.eq("product_subcategory", filters.subcategoryId.trim());
  }
  const searchQ = filters.searchQuery?.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
  if (searchQ) {
    query = query.or(`title.ilike.%${searchQ}%,description.ilike.%${searchQ}%`);
  }

  const { data: rows, error } = await query;
  if (error) return { data: null, error: error.message };
  let list = (rows ?? []) as Row[];

  const typeIdTrim = filters.typeId?.trim() ?? "";
  const categoryIdTrim = filters.categoryId?.trim() ?? "";
  const subcategoryIdTrim = filters.subcategoryId?.trim() ?? "";

  // Hard constraints: only keep rows that match selected type/category/subcategory (required when selected)
  if (typeIdTrim) {
    list = list.filter((r) => (r.product_type ?? "").trim() === typeIdTrim);
  }
  if (categoryIdTrim) {
    list = list.filter((r) => (r.product_category ?? "").trim() === categoryIdTrim);
  }
  if (subcategoryIdTrim) {
    list = list.filter((r) => (r.product_subcategory ?? "").trim() === subcategoryIdTrim);
  }

  const listingIds = list.map((r) => r.id);
  let colorOptionsByProductId: Record<string, string[]> = {};
  if (listingIds.length > 0) {
    const { data: productRows } = await supabase
      .from("products")
      .select("id, color_options")
      .in("id", listingIds);
    for (const row of productRows ?? []) {
      const r = row as { id: string; color_options?: string[] | null };
      colorOptionsByProductId[r.id] = Array.isArray(r.color_options) ? r.color_options : [];
    }
  }
  list = list.map((r) => ({ ...r, color_options: colorOptionsByProductId[r.id] ?? [] }));

  // Hard filter: when color options are selected, only keep products with at least one matching color
  const colorOptionsFilter = (filters.colorOptions ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (colorOptionsFilter.length > 0) {
    const colorSet = new Set(colorOptionsFilter);
    list = list.filter((r) => {
      const productColors = (r.color_options ?? []).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
      return productColors.some((c) => colorSet.has(c));
    });
  }

  if (filters.materialId?.trim()) {
    const { data: links } = await supabase
      .from("product_material_links")
      .select("product_id")
      .eq("material_id", filters.materialId.trim());
    const withMaterial = new Set((links ?? []).map((l: { product_id: string }) => l.product_id));
    list = list.filter((r) => withMaterial.has(r.id));
  }

  // Temporary: log first 5 rows to verify columns and filter ID match (id, title, product_type, category, subcategory, material)
  if (list.length > 0) {
    const firstFiveIds = list.slice(0, 5).map((r) => r.id);
    let materialByProductId: Record<string, string[]> = {};
    if (firstFiveIds.length > 0) {
      const { data: materialLinks } = await supabase
        .from("product_material_links")
        .select("product_id, material_id")
        .in("product_id", firstFiveIds);
      for (const row of materialLinks ?? []) {
        const r = row as { product_id: string; material_id: string };
        if (!materialByProductId[r.product_id]) materialByProductId[r.product_id] = [];
        materialByProductId[r.product_id].push(r.material_id);
      }
    }
    const sampleRows = list.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title ?? null,
      product_type: r.product_type ?? null,
      product_category: r.product_category ?? null,
      product_subcategory: r.product_subcategory ?? null,
      material_ids: materialByProductId[r.id] ?? [],
    }));
    console.log("[getSuggestedProductsForWorkstation] first 5 rows (verify columns vs filter IDs):", JSON.stringify(sampleRows, null, 2));
  }

  const profileIds = Array.from(new Set(list.map((r) => r.owner_profile_id).filter(Boolean))) as string[];
  let brandByProfileId: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const pr = p as { id: string; display_name: string | null; username: string | null };
      brandByProfileId[pr.id] = (pr.display_name ?? pr.username ?? "").trim() || pr.id;
    }
  }

  const materialIdFilter = filters.materialId?.trim();
  let productIdsWithMaterial = new Set<string>();
  if (materialIdFilter) {
    const { data: links } = await supabase
      .from("product_material_links")
      .select("product_id")
      .eq("material_id", materialIdFilter);
    productIdsWithMaterial = new Set((links ?? []).map((l: { product_id: string }) => l.product_id));
  }
  const colorOptionsSet = new Set((filters.colorOptions ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean));
  const searchLower = filters.searchQuery?.trim().toLowerCase() ?? "";

  const withScore: WorkstationSuggestedProduct[] = list.map((r) => {
    let score = 0;
    if (typeIdTrim && r.product_type?.trim() === typeIdTrim) score += 3;
    if (categoryIdTrim && r.product_category?.trim() === categoryIdTrim) score += 3;
    if (subcategoryIdTrim && r.product_subcategory?.trim() === subcategoryIdTrim) score += 3;
    if (materialIdFilter && productIdsWithMaterial.has(r.id)) score += 2;
    const productColors = (r.color_options ?? []).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
    if (colorOptionsSet.size > 0 && productColors.some((c) => colorOptionsSet.has(c))) score += 2;
    if (searchLower) {
      const titleMatch = r.title?.toLowerCase().includes(searchLower);
      const brandMatch = brandByProfileId[r.owner_profile_id ?? ""]?.toLowerCase().includes(searchLower);
      if (titleMatch || brandMatch) score += 1;
    }
    return {
      id: r.id,
      listing_id: r.id,
      title: r.title ?? null,
      slug: r.slug ?? null,
      cover_image_url: r.cover_image_url ?? null,
      brand_name: r.owner_profile_id ? (brandByProfileId[r.owner_profile_id] ?? null) : null,
      product_type: r.product_type ?? null,
      product_category: r.product_category ?? null,
      product_subcategory: r.product_subcategory ?? null,
      color_options: Array.isArray(r.color_options) ? r.color_options : [],
      updated_at: r.updated_at ?? null,
      score,
    };
  });

  withScore.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aAt = a.updated_at ?? "";
    const bAt = b.updated_at ?? "";
    return bAt.localeCompare(aAt);
  });

  const bestMatch = withScore.filter((p) => p.score > 0).slice(0, 6);
  const allResults = withScore.slice(0, limit);
  return { data: { bestMatch, allResults }, error: null };
}
