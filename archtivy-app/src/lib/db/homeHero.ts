import { unstable_noStore } from "next/cache";
import { getListingUrl } from "@/lib/canonical";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { sanitizeListingImageUrl } from "@/lib/db/listingImages";

export type HeroGridItem = {
  id: string;
  type: "project" | "product";
  title: string;
  href: string;
  imageUrl: string;
};

const POOL_SIZE = 48;
const PROJECT_SLOTS = 3;
const PRODUCT_SLOTS = 2;

type ListingRow = {
  id: string;
  type: "project" | "product";
  slug: string | null;
  title: string;
  cover_image_url: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getTaxonomySlugPaths(listingIds: string[]): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("listing_taxonomy_node")
    .select("listing_id, taxonomy_node:taxonomy_nodes(slug_path)")
    .eq("is_primary", true)
    .in("listing_id", listingIds);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const id = r.listing_id as string | undefined;
    const node = r.taxonomy_node as { slug_path?: string } | { slug_path?: string }[] | null;
    const slugPath = Array.isArray(node) ? node[0]?.slug_path : node?.slug_path;
    if (id && slugPath) map.set(id, slugPath);
  }
  return map;
}

function toHeroItem(row: ListingRow, taxMap: Map<string, string>): HeroGridItem | null {
  const imageUrl = sanitizeListingImageUrl(row.cover_image_url);
  if (!imageUrl) return null;
  const slug = row.slug?.trim() || row.id;
  const taxPath = taxMap.get(row.id) ?? null;
  return {
    id: row.id,
    type: row.type,
    title: row.title?.trim() || (row.type === "project" ? "Project" : "Product"),
    href: getListingUrl({
      id: row.id,
      type: row.type,
      slug,
      taxonomySlugPath: taxPath,
    }),
    imageUrl,
  };
}

async function fetchPool(type: "project" | "product"): Promise<ListingRow[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, type, slug, title, cover_image_url")
    .eq("type", type)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .not("cover_image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(POOL_SIZE);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[homeHero] fetch ${type} pool:`, error.message);
    }
    return [];
  }
  return (data ?? []) as ListingRow[];
}

/**
 * Latest approved projects/products with cover images, shuffled per request (3 + 2 for the hero grid).
 */
export async function getHomeHeroGridItems(): Promise<HeroGridItem[]> {
  unstable_noStore();

  const [projectRows, productRows] = await Promise.all([
    fetchPool("project"),
    fetchPool("product"),
  ]);

  const shuffledProjects = shuffle(projectRows);
  const shuffledProducts = shuffle(productRows);

  const pickedProjects = shuffledProjects.slice(0, PROJECT_SLOTS);
  const pickedProducts = shuffledProducts.slice(0, PRODUCT_SLOTS);
  const picked = [...pickedProjects, ...pickedProducts];

  if (picked.length === 0) return [];

  const taxMap = await getTaxonomySlugPaths(picked.map((r) => r.id));
  const items: HeroGridItem[] = [];
  for (const row of picked) {
    const item = toHeroItem(row, taxMap);
    if (item) items.push(item);
  }

  // Tall cell first (project), then remaining slots: project, product, project, product
  const projects = items.filter((i) => i.type === "project");
  const products = items.filter((i) => i.type === "product");
  const ordered: HeroGridItem[] = [];
  if (projects[0]) ordered.push(projects[0]);
  if (projects[1]) ordered.push(projects[1]);
  if (products[0]) ordered.push(products[0]);
  if (projects[2]) ordered.push(projects[2]);
  if (products[1]) ordered.push(products[1]);
  return ordered;
}
