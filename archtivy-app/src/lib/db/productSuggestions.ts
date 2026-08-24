/**
 * Product SUGGESTION helpers for the admin editorial workstation.
 *
 * ── THIS FILE WAS photoProductTags.ts ───────────────────────────────────────
 * It held two unrelated things: CRUD against the photo_product_tags table, and
 * a set of product search / alt-text scoring helpers that never touched that
 * table at all. The table is retired — every row it held was already mirrored
 * into product_tags, and its write paths had been broken since March, writing
 * six columns the table never had.
 *
 * The CRUD is gone; pins now live in lib/db/productTags.ts and
 * app/actions/productTags.ts. What remains is the half that was always about
 * finding candidate products, so the file is named for that. Leaving it called
 * photoProductTags.ts would have been the same claimed-vs-actual mismatch this
 * change exists to remove.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";

const PPL = "project_product_links";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };





const TAG_SELECT_COLS = "id, listing_image_id, product_id, x, y, created_at, product_type_id, product_category_id, product_subcategory_id, category_text, color_text, material_id, feature_text, created_by_clerk_id";

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
  /** Product listing id (listings.id for type=product). Same as id when the row came from the listings table. */
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

// ─── Alt-Text–based candidate retrieval ─────────────────────────────────────

import type { CandidateProduct } from "@/lib/scoring/productAltScore";

export interface AltTextCandidateFilters {
  /** Postgres tsquery string (terms joined with " | "). */
  ftsQuery: string;
  /** Raw alt text for trigram / ILIKE fallback. */
  altTextRaw: string;
  /** Material names (lowercased) extracted from alt text. */
  materials: string[];
}

/**
 * 2-phase candidate retrieval for alt-text–based product suggestions.
 *
 * Phase 1 — Fetch up to ~80 candidates via parallel queries:
 *   A) Full-text search on listings.search_vector
 *   B) Material join on product_material_links
 *   C) Trigram / ILIKE title match
 *
 * Phase 2 — Deduplicate and enrich with colors + materials + brand names.
 *
 * @param filters.ftsQuery  Postgres tsquery string.
 * @param filters.altTextRaw  Raw alt text for trigram matching.
 * @param filters.materials  Material names to match via product_material_links.
 */
export async function getAltTextCandidates(
  filters: AltTextCandidateFilters
): Promise<DbResult<CandidateProduct[]>> {
  const supabase = getSupabaseServiceClient();

  type RawRow = {
    id: string;
    title: string | null;
    slug: string | null;
    cover_image_url: string | null;
    feature_highlight: string | null;
    product_type: string | null;
    product_category: string | null;
    owner_profile_id: string | null;
  };

  const SELECT = "id, title, slug, cover_image_url, feature_highlight, product_type, product_category, owner_profile_id";

  // ── Phase 1: Parallel candidate fetching ──────────────────────────────

  const promises: Promise<RawRow[]>[] = [];

  // A) Full-text search on search_vector (if ftsQuery is non-empty)
  if (filters.ftsQuery) {
    promises.push(
      (async () => {
        const { data, error } = await supabase
          .from("listings")
          .select(SELECT)
          .eq("type", "product")
          .is("deleted_at", null)
          .textSearch("search_vector", filters.ftsQuery, { type: "websearch" })
          .limit(50);
        if (error) {
          // Fallback: textSearch can fail if tsquery is malformed.
          // Try plain websearch which is more forgiving.
          console.warn("[getAltTextCandidates] FTS failed, trying websearch fallback:", error.message);
          const { data: d2 } = await supabase
            .from("listings")
            .select(SELECT)
            .eq("type", "product")
            .is("deleted_at", null)
            .textSearch("search_vector", filters.altTextRaw, { type: "websearch" })
            .limit(50);
          return (d2 ?? []) as RawRow[];
        }
        return (data ?? []) as RawRow[];
      })()
    );
  }

  // B) Material join — find products that share materials with the alt text
  //
  // ── VARIANT A (actual schema): product_material_links uses material_id → join materials table for name ──
  if (filters.materials.length > 0) {
    promises.push(
      (async () => {
        // Resolve material names to IDs first
        const { data: matRows } = await supabase
          .from("materials")
          .select("id, name")
          .in("name", filters.materials);

        // Also try slug match in case names are stored as slugs
        const { data: matRowsBySlug } = await supabase
          .from("materials")
          .select("id, name")
          .in("slug", filters.materials);

        const allMatRows = [...(matRows ?? []), ...(matRowsBySlug ?? [])];
        const materialIds = [...new Set(allMatRows.map((r: { id: string }) => r.id))];

        if (materialIds.length === 0) return [];

        const { data: links } = await supabase
          .from("product_material_links")
          .select("product_id")
          .in("material_id", materialIds);

        const productIds = [...new Set((links ?? []).map((l: { product_id: string }) => l.product_id))];
        if (productIds.length === 0) return [];

        const { data } = await supabase
          .from("listings")
          .select(SELECT)
          .in("id", productIds.slice(0, 30))
          .eq("type", "product")
          .is("deleted_at", null);
        return (data ?? []) as RawRow[];
      })()
    );
  }

  // ── VARIANT B (alternative schema): product_material_links has material_name column directly ──
  // Uncomment this block and comment out Variant A if your schema uses a denormalized material_name column.
  /*
  if (filters.materials.length > 0) {
    promises.push(
      (async () => {
        const { data: links } = await supabase
          .from("product_material_links")
          .select("product_id")
          .in("material_name", filters.materials);

        const productIds = [...new Set((links ?? []).map((l: { product_id: string }) => l.product_id))];
        if (productIds.length === 0) return [];

        const { data } = await supabase
          .from("listings")
          .select(SELECT)
          .in("id", productIds.slice(0, 30))
          .eq("type", "product")
          .is("deleted_at", null);
        return (data ?? []) as RawRow[];
      })()
    );
  }
  */

  // C) Trigram / ILIKE title match
  //    Uses ILIKE with first few meaningful words from alt text for broad recall.
  if (filters.altTextRaw) {
    promises.push(
      (async () => {
        // Extract first 3 meaningful words (skip very short ones)
        const words = filters.altTextRaw
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3)
          .slice(0, 3);

        if (words.length === 0) return [];

        // Build OR filter: title.ilike.%word1%,title.ilike.%word2%,...
        const escaped = words.map((w) => w.replace(/%/g, "\\%").replace(/_/g, "\\_"));
        const orFilter = escaped.map((w) => `title.ilike.%${w}%`).join(",");

        const { data } = await supabase
          .from("listings")
          .select(SELECT)
          .eq("type", "product")
          .is("deleted_at", null)
          .or(orFilter)
          .limit(20);
        return (data ?? []) as RawRow[];
      })()
    );
  }

  // Wait for all parallel queries
  const results = await Promise.all(promises);

  // ── Deduplicate by product ID ─────────────────────────────────────────

  const seen = new Set<string>();
  const deduplicated: RawRow[] = [];
  for (const batch of results) {
    for (const row of batch) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        deduplicated.push(row);
      }
    }
  }

  if (deduplicated.length === 0) {
    return { data: [], error: null };
  }

  // ── Phase 2: Enrich with colors, materials, brand names ───────────────

  const candidateIds = deduplicated.map((r) => r.id);

  // Fetch colors from products table (products.id = listings.id for product listings)
  const { data: productColorRows } = await supabase
    .from("products")
    .select("id, color_options")
    .in("id", candidateIds);

  const colorsByProductId: Record<string, string[]> = {};
  for (const row of productColorRows ?? []) {
    const r = row as { id: string; color_options?: string[] | null };
    colorsByProductId[r.id] = Array.isArray(r.color_options)
      ? r.color_options.map((c) => String(c).toLowerCase())
      : [];
  }

  // Fetch materials via product_material_links → materials (Variant A)
  const { data: materialLinks } = await supabase
    .from("product_material_links")
    .select("product_id, material_id")
    .in("product_id", candidateIds);

  const materialIdsByProduct: Record<string, string[]> = {};
  for (const row of materialLinks ?? []) {
    const r = row as { product_id: string; material_id: string };
    if (!materialIdsByProduct[r.product_id]) materialIdsByProduct[r.product_id] = [];
    materialIdsByProduct[r.product_id].push(r.material_id);
  }

  // Resolve material IDs to names
  const allMaterialIds = [...new Set(Object.values(materialIdsByProduct).flat())];
  let materialNameById: Record<string, string> = {};
  if (allMaterialIds.length > 0) {
    const { data: matRows } = await supabase
      .from("materials")
      .select("id, name")
      .in("id", allMaterialIds);
    for (const row of matRows ?? []) {
      const r = row as { id: string; name: string };
      materialNameById[r.id] = r.name.toLowerCase();
    }
  }

  const materialsByProductId: Record<string, string[]> = {};
  for (const [productId, matIds] of Object.entries(materialIdsByProduct)) {
    materialsByProductId[productId] = matIds
      .map((mid) => materialNameById[mid])
      .filter(Boolean);
  }

  // Fetch brand names for owner profiles
  const profileIds = [...new Set(
    deduplicated.map((r) => r.owner_profile_id).filter(Boolean) as string[]
  )];

  let brandByProfileId: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const pr = p as { id: string; display_name: string | null; username: string | null };
      brandByProfileId[pr.id] = (pr.display_name ?? pr.username ?? "").trim();
    }
  }

  // ── Assemble enriched candidates ──────────────────────────────────────

  const candidates: CandidateProduct[] = deduplicated.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    cover_image_url: row.cover_image_url,
    feature_highlight: row.feature_highlight,
    product_type: row.product_type,
    product_category: row.product_category,
    owner_profile_id: row.owner_profile_id,
    brandName: row.owner_profile_id ? (brandByProfileId[row.owner_profile_id] ?? null) : null,
    materials: materialsByProductId[row.id] ?? [],
    colors: colorsByProductId[row.id] ?? [],
  }));

  return { data: candidates, error: null };
}
