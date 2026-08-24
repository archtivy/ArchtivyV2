import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type PhotoTagMarker = {
  x: number;
  y: number;
  product_id: string;
  product_title?: string;
  product_slug?: string;
  /** Product thumbnail: cover image or first gallery image. */
  product_thumbnail?: string;
  /** Display name of the user who shared the product. */
  product_owner_name?: string;
  /** Taxonomy slug path for canonical URL generation. */
  taxonomy_slug_path?: string | null;
};

/** AI-matched product for a specific gallery image (from photo_matches). */
export type MatchedProductMarker = {
  id: string;
  product_id: string;
  product_title?: string;
  product_slug?: string;
  product_thumbnail?: string;
  product_owner_name?: string;
  score: number;
  selected_mode: "manual" | "auto" | "keyword";
};

/** AI-detected product region in an image (from image_regions table). */
export type ImageRegionMarker = {
  id: string;
  label: string;
  object_type: string;
  keywords: string[];
  confidence: number;
  x: number;       // center x as % (0-100)
  y: number;       // center y as % (0-100)
  selected_mode: "matched" | "similar" | "none";
  matched_product?: {
    listing_id: string;
    title: string;
    slug: string | null;
    cover: string | null;
    brand: string | null;
    score: number;
  } | null;
  similar_products: {
    listing_id: string;
    title: string;
    slug: string | null;
    cover: string | null;
    brand: string | null;
    score: number;
  }[];
};

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  sort_order: number;
  /** Optional photo-level product tags for project gallery (0–1 normalized x/y). */
  photoTags?: PhotoTagMarker[];
  /** Optional AI-matched products for this image (from photo_matches, is_selected=true). */
  matchedProducts?: MatchedProductMarker[];
  /** AI-detected product regions / hotspots (from image_regions table). */
  regions?: ImageRegionMarker[];
};
export type ProjectRecord = { id: string; slug: string; title: string; description: string | null; created_at: string };
export type RelatedProject = { id: string; slug: string; title: string };

const supabase = () => getSupabaseServiceClient();

export async function getProjectBySlug(slug: string): Promise<ProjectRecord | null> {
  const { data, error } = await supabase().from("projects").select("id,slug,title,description,created_at").eq("slug", slug).single();
  if (error || !data) return null;
  return data as ProjectRecord;
}

export async function getProjectImages(projectId: string): Promise<GalleryImage[]> {
  const { data, error } = await supabase()
    .from("project_images")
    .select("id,src,alt,sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as GalleryImage[];
}

/*
 * ── REMOVED: getRelatedProducts, getProductBySlug, getProductImages ─────────
 *
 * All three read the `products` sidecar (or its images) without ever touching
 * `listings`, so they could return a row that is orphaned, soft-deleted, DRAFT
 * or PENDING and present it as a real product. getProductBySlug was the actual
 * entry point for that: it fed the /products/[slug] backfill that fabricated
 * ownerless APPROVED listings. With the backfill gone it had no callers left,
 * and getProductImages — its companion in that function — had none either.
 *
 * getRelatedProducts was already dead: zero consumers, and it resolves through
 * a `connections` table that holds 1 row in production. Project↔product links
 * live in project_product_links now.
 *
 * Anything that needs a product must go through listings (see
 * getProductCanonicalBySlug in lib/db/explore.ts), which filters type, status
 * and deleted_at. Reading the sidecar directly bypasses every one of those.
 */

export type ProductImageRow = {
  product_id: string;
  src: string;
  alt: string | null;
  sort_order: number;
};

/** Get all product_images for multiple product IDs, sorted by sort_order. */
export async function getProductImagesByProductIds(
  productIds: string[]
): Promise<ProductImageRow[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await supabase()
    .from("product_images")
    .select("product_id, src, alt, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as ProductImageRow[];
}

export async function getRelatedProjects(productId: string): Promise<RelatedProject[]> {
  const { data: conns, error: connError } = await supabase()
    .from("connections")
    .select("from_id")
    .eq("from_type", "project")
    .eq("to_type", "product")
    .eq("to_id", productId);
  if (connError || !conns?.length) return [];
  const ids = conns.map((c) => c.from_id);
  const { data: projects, error } = await supabase()
    .from("projects")
    .select("id,slug,title")
    .in("id", ids);
  if (error) return [];
  return (projects ?? []) as RelatedProject[];
}

export async function getFirstImageUrlByProjectIds(projectIds: string[]): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {};
  const { data } = await supabase()
    .from("project_images")
    .select("project_id, src")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const pid = (row as { project_id: string }).project_id;
    if (!(pid in map)) map[pid] = (row as { src: string }).src;
  }
  return map;
}

export async function getFirstImageUrlByProductIds(productIds: string[]): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};
  const { data } = await supabase()
    .from("product_images")
    .select("product_id, src")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const pid = (row as { product_id: string }).product_id;
    if (!(pid in map)) map[pid] = (row as { src: string }).src;
  }
  return map;
}

export async function getBookmarkState(
  userId: string | null,
  entityType: "project" | "product",
  entityId: string
): Promise<boolean> {
  if (!userId) return false;
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/** Featured projects for homepage/explore, newest first. */
export async function getFeaturedProjects(limit: number): Promise<ProjectRecord[]> {
  const { data, error } = await supabase()
    .from("projects")
    .select("id,slug,title,description,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ProjectRecord[];
}

/*
 * ── REMOVED: getFeaturedProducts ────────────────────────────────────────────
 *
 * Zero consumers, and the most dangerous shape of the lot: an unfiltered
 * `products` read ordered by created_at, with no join to listings. Wired to a
 * homepage rail it would have surfaced orphaned, soft-deleted, draft and
 * pending products side by side with live ones. The live rails read listings
 * with an explicit status = APPROVED filter.
 */

/**
 * Slugify a title for the public submission path.
 *
 * Exported so createProductCanonical() can reuse it verbatim. Note this differs
 * from the copies in _actions/listings.ts and createProject.ts: those convert
 * every non-alphanumeric run to a hyphen ("Serie 47.3" -> "serie-47-3"), while
 * this one strips them after collapsing whitespace ("Serie 47.3" -> "serie-473").
 * Existing public product slugs were generated with THIS variant, so it is kept
 * as-is to avoid changing slug shapes for future submissions.
 */
export function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

export async function ensureUniqueSlug(
  type: "project" | "product",
  baseSlug: string
): Promise<string> {
  const table = type === "project" ? "projects" : "products";
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await supabase().from(table).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${++n}`;
  }
}

export async function createProjectRow(input: {
  title: string;
  description: string | null;
}): Promise<{ id: string; slug: string } | null> {
  const baseSlug = slugFromTitle(input.title);
  const slug = await ensureUniqueSlug("project", baseSlug);
  const { data, error } = await supabase()
    .from("projects")
    .insert({ slug, title: input.title.trim(), description: input.description?.trim() || null })
    .select("id, slug")
    .single();
  if (error || !data) return null;
  return { id: (data as { id: string }).id, slug: (data as { slug: string }).slug };
}

export async function createProductRow(input: {
  title: string;
  subtitle: string | null;
}): Promise<{ id: string; slug: string } | null> {
  const baseSlug = slugFromTitle(input.title);
  const slug = await ensureUniqueSlug("product", baseSlug);
  const { data, error } = await supabase()
    .from("products")
    .insert({ slug, title: input.title.trim(), subtitle: input.subtitle?.trim() || null })
    .select("id, slug")
    .single();
  if (error || !data) return null;
  return { id: (data as { id: string }).id, slug: (data as { slug: string }).slug };
}

export async function addProjectImages(
  projectId: string,
  urls: { src: string; alt: string }[]
): Promise<{ error: string | null }> {
  if (urls.length === 0) return { error: null };
  const rows = urls.map((u, i) => ({
    project_id: projectId,
    src: u.src,
    alt: u.alt || "Image",
    sort_order: i,
  }));
  const { error } = await supabase().from("project_images").insert(rows);
  return { error: error?.message ?? null };
}

export async function addProductImages(
  productId: string,
  urls: { src: string; alt: string }[]
): Promise<{ error: string | null }> {
  if (urls.length === 0) return { error: null };
  const rows = urls.map((u, i) => ({
    product_id: productId,
    src: u.src,
    alt: u.alt || "Image",
    sort_order: i,
  }));
  const { error } = await supabase().from("product_images").insert(rows);
  return { error: error?.message ?? null };
}

export async function deleteProjectRow(projectId: string): Promise<void> {
  await supabase().from("projects").delete().eq("id", projectId);
}

export async function deleteProductRow(productId: string): Promise<void> {
  await supabase().from("products").delete().eq("id", productId);
}
