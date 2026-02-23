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
};
export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  sort_order: number;
  /** Optional photo-level product tags for project gallery (0–1 normalized x/y). */
  photoTags?: PhotoTagMarker[];
};
export type ProjectRecord = { id: string; slug: string; title: string; description: string | null; created_at: string };
export type ProductRecord = { id: string; slug: string; title: string; subtitle: string | null; created_at: string };
export type RelatedProduct = { id: string; slug: string; title: string; subtitle: string | null };
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

export async function getRelatedProducts(projectId: string): Promise<RelatedProduct[]> {
  const { data: conns, error: connError } = await supabase()
    .from("connections")
    .select("to_id")
    .eq("from_type", "project")
    .eq("from_id", projectId)
    .eq("to_type", "product");
  if (connError || !conns?.length) return [];
  const ids = conns.map((c) => c.to_id);
  const { data: products, error } = await supabase()
    .from("products")
    .select("id,slug,title,subtitle")
    .in("id", ids);
  if (error) return [];
  return (products ?? []) as RelatedProduct[];
}

export async function getProductBySlug(slug: string): Promise<ProductRecord | null> {
  const { data, error } = await supabase().from("products").select("id,slug,title,subtitle,created_at").eq("slug", slug).single();
  if (error || !data) return null;
  return data as ProductRecord;
}

export async function getProductImages(productId: string): Promise<GalleryImage[]> {
  const { data, error } = await supabase()
    .from("product_images")
    .select("id,src,alt,sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as GalleryImage[];
}

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

/** Featured products for homepage/explore, newest first. */
export async function getFeaturedProducts(limit: number): Promise<ProductRecord[]> {
  const { data, error } = await supabase()
    .from("products")
    .select("id,slug,title,subtitle,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ProductRecord[];
}

function slugFromTitle(title: string): string {
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
