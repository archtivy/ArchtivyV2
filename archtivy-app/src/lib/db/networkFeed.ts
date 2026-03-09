/**
 * Network feed: personalized listings based on a user's follows.
 * Queries followed designers' projects, followed brands' products,
 * followed categories' listings, and followed materials' listings.
 * Server-only (uses service client).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getFollowingByProfile, type FollowRow } from "@/lib/db/follows";
import { getImagesByListingIds } from "@/lib/db/listingImages";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMaterialsByProjectIds, getMaterialsByProductIds } from "@/lib/db/materials";
import { projectListingSelect, productListingSelect } from "@/lib/db/selects";
import {
  isProjectListing,
  normalizeProject,
  normalizeProduct,
  type ProjectCanonical,
  type ProductCanonical,
  type RawListingRow,
  type RawProductRow,
  type ProjectOwner,
} from "@/lib/canonical-models";
import type { ProductImageRow } from "@/lib/db/gallery";

const PER_SOURCE_LIMIT = 6;
const TOTAL_LIMIT = 12;
/** Max items from any single source type in the final balanced feed. */
const MAX_PER_SOURCE = 4;

/** Reason source types, ordered by display priority (highest first). */
type ReasonSource = "designer" | "brand" | "category" | "material";

const REASON_PRIORITY: Record<ReasonSource, number> = {
  designer: 4,
  brand: 3,
  category: 2,
  material: 1,
};

export interface NetworkFeedItem {
  type: "project" | "product";
  project?: ProjectCanonical;
  product?: ProductCanonical;
  reason: string;
  reasonSource: ReasonSource;
  created_at: string;
}

export interface NetworkFeedResult {
  items: NetworkFeedItem[];
  followCount: number;
}

const supabase = () => getSupabaseServiceClient();

/** Map listing_images rows to ProductImageRow shape for normalizeProduct. */
function listingImagesToProductImageRows(
  listingId: string,
  rows: { listing_id: string; image_url: string; alt: string | null; sort_order: number }[]
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

export async function getNetworkFeed(profileId: string): Promise<NetworkFeedResult> {
  // 1. Get all follows
  const followResult = await getFollowingByProfile(profileId);
  const allFollows = followResult.data ?? [];
  const followCount = allFollows.length;

  if (followCount === 0) {
    return { items: [], followCount: 0 };
  }

  // 2. Split by target type
  const designerFollows = allFollows.filter((f) => f.target_type === "designer");
  const brandFollows = allFollows.filter((f) => f.target_type === "brand");
  const categoryFollows = allFollows.filter((f) => f.target_type === "category");
  const materialFollows = allFollows.filter((f) => f.target_type === "material");

  // 3. Resolve follow target names for reasons
  const profileTargetIds = [
    ...designerFollows.map((f) => f.target_id),
    ...brandFollows.map((f) => f.target_id),
  ];
  const taxonomyTargetIds = [
    ...categoryFollows.map((f) => f.target_id),
    ...materialFollows.map((f) => f.target_id),
  ];

  const [profileNames, taxonomyNames] = await Promise.all([
    resolveProfileNames(profileTargetIds),
    resolveTaxonomyNames(taxonomyTargetIds),
  ]);

  // 4. Fetch listings from each source in parallel
  const [designerItems, brandItems, categoryItems, materialItems] = await Promise.all([
    fetchDesignerProjects(designerFollows, profileNames),
    fetchBrandProducts(brandFollows, profileNames),
    fetchCategoryListings(categoryFollows, taxonomyNames),
    fetchMaterialListings(materialFollows, taxonomyNames),
  ]);

  // 5. Deduplicate: if an item appears from multiple sources, keep the highest-priority reason
  const allItems = [...designerItems, ...brandItems, ...categoryItems, ...materialItems];
  const bestByListingId = new Map<string, NetworkFeedItem>();
  for (const item of allItems) {
    const id = item.project?.id ?? item.product?.id ?? "";
    const existing = bestByListingId.get(id);
    if (!existing || REASON_PRIORITY[item.reasonSource] > REASON_PRIORITY[existing.reasonSource]) {
      bestByListingId.set(id, item);
    }
  }

  // 6. Source-balanced selection: round-robin across source types, then fill remaining slots
  const bySource: Record<ReasonSource, NetworkFeedItem[]> = {
    designer: [],
    brand: [],
    category: [],
    material: [],
  };
  for (const item of bestByListingId.values()) {
    bySource[item.reasonSource].push(item);
  }
  // Sort each source by newest first
  for (const key of Object.keys(bySource) as ReasonSource[]) {
    bySource[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const result: NetworkFeedItem[] = [];
  const seen = new Set<string>();
  const sourceCursors: Record<ReasonSource, number> = { designer: 0, brand: 0, category: 0, material: 0 };
  const sourceOrder: ReasonSource[] = ["designer", "brand", "category", "material"];

  // Round-robin: take up to MAX_PER_SOURCE from each source
  for (let round = 0; round < MAX_PER_SOURCE && result.length < TOTAL_LIMIT; round++) {
    for (const src of sourceOrder) {
      if (result.length >= TOTAL_LIMIT) break;
      const items = bySource[src];
      while (sourceCursors[src] < items.length) {
        const item = items[sourceCursors[src]];
        sourceCursors[src]++;
        const id = item.project?.id ?? item.product?.id ?? "";
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(item);
        break;
      }
    }
  }

  // Fill remaining slots from any source with leftover items (newest first)
  if (result.length < TOTAL_LIMIT) {
    const remaining: NetworkFeedItem[] = [];
    for (const src of sourceOrder) {
      for (let i = sourceCursors[src]; i < bySource[src].length; i++) {
        const item = bySource[src][i];
        const id = item.project?.id ?? item.product?.id ?? "";
        if (!seen.has(id)) remaining.push(item);
      }
    }
    remaining.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const item of remaining) {
      if (result.length >= TOTAL_LIMIT) break;
      const id = item.project?.id ?? item.product?.id ?? "";
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(item);
    }
  }

  return { items: result, followCount };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveProfileNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const result = await getProfilesByIds(ids);
  const map: Record<string, string> = {};
  for (const p of result.data ?? []) {
    map[p.id] = p.display_name?.trim() || p.username?.trim() || "Profile";
  }
  return map;
}

async function resolveTaxonomyNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const unique = Array.from(new Set(ids));
  const { data } = await supabase()
    .from("taxonomy_nodes")
    .select("id, label")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const n of (data ?? []) as { id: string; label: string }[]) {
    map[n.id] = n.label;
  }
  return map;
}

async function fetchDesignerProjects(
  follows: FollowRow[],
  profileNames: Record<string, string>
): Promise<NetworkFeedItem[]> {
  const designerIds = follows.map((f) => f.target_id);
  if (designerIds.length === 0) return [];

  const { data: rows } = await supabase()
    .from("listings")
    .select(projectListingSelect)
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .in("owner_profile_id", designerIds)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (!rows || rows.length === 0) return [];
  return hydrateProjects(rows as RawListingRow[], "designer", (row) => {
    const ownerId = (row as Record<string, unknown>).owner_profile_id as string | null;
    return ownerId ? `From ${profileNames[ownerId] ?? "a designer you follow"}` : "From your network";
  });
}

async function fetchBrandProducts(
  follows: FollowRow[],
  profileNames: Record<string, string>
): Promise<NetworkFeedItem[]> {
  const brandIds = follows.map((f) => f.target_id);
  if (brandIds.length === 0) return [];

  const { data: rows } = await supabase()
    .from("listings")
    .select(productListingSelect)
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .in("owner_profile_id", brandIds)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (!rows || rows.length === 0) return [];
  return hydrateProducts(rows as RawListingRow[], "brand", (row) => {
    const ownerId = (row as Record<string, unknown>).owner_profile_id as string | null;
    return ownerId ? `From ${profileNames[ownerId] ?? "a brand you follow"}` : "From your network";
  });
}

async function fetchCategoryListings(
  follows: FollowRow[],
  taxonomyNames: Record<string, string>
): Promise<NetworkFeedItem[]> {
  const nodeIds = follows.map((f) => f.target_id);
  if (nodeIds.length === 0) return [];

  // Get listing IDs from junction table
  const { data: links } = await supabase()
    .from("listing_taxonomy_node")
    .select("listing_id, taxonomy_node_id")
    .in("taxonomy_node_id", nodeIds);

  if (!links || links.length === 0) return [];

  // Build listing → reason map
  const listingReasonMap: Record<string, string> = {};
  for (const link of links as { listing_id: string; taxonomy_node_id: string }[]) {
    if (!listingReasonMap[link.listing_id]) {
      const label = taxonomyNames[link.taxonomy_node_id] ?? "a category you follow";
      listingReasonMap[link.listing_id] = `In ${label}`;
    }
  }

  const listingIds = Object.keys(listingReasonMap);

  // Fetch the actual listings (mixed projects and products)
  const { data: rows } = await supabase()
    .from("listings")
    .select(`${projectListingSelect}, ${productListingSelect}`)
    .in("id", listingIds)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (!rows || rows.length === 0) return [];
  return hydrateMixed(rows as RawListingRow[], "category", (row) => {
    return listingReasonMap[String(row.id)] ?? "In a category you follow";
  });
}

async function fetchMaterialListings(
  follows: FollowRow[],
  taxonomyNames: Record<string, string>
): Promise<NetworkFeedItem[]> {
  const nodeIds = follows.map((f) => f.target_id);
  if (nodeIds.length === 0) return [];

  // Material links use is_primary=false in listing_taxonomy_node
  const { data: links } = await supabase()
    .from("listing_taxonomy_node")
    .select("listing_id, taxonomy_node_id")
    .in("taxonomy_node_id", nodeIds)
    .eq("is_primary", false);

  if (!links || links.length === 0) return [];

  const listingReasonMap: Record<string, string> = {};
  for (const link of links as { listing_id: string; taxonomy_node_id: string }[]) {
    if (!listingReasonMap[link.listing_id]) {
      const label = taxonomyNames[link.taxonomy_node_id] ?? "a material you follow";
      listingReasonMap[link.listing_id] = `Using ${label}`;
    }
  }

  const listingIds = Object.keys(listingReasonMap);

  const { data: rows } = await supabase()
    .from("listings")
    .select(`${projectListingSelect}, ${productListingSelect}`)
    .in("id", listingIds)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (!rows || rows.length === 0) return [];
  return hydrateMixed(rows as RawListingRow[], "material", (row) => {
    return listingReasonMap[String(row.id)] ?? "Using a material you follow";
  });
}

// ─── Hydration helpers ──────────────────────────────────────────────────────

async function hydrateProjects(
  rows: RawListingRow[],
  reasonSource: ReasonSource,
  reasonFn: (row: RawListingRow) => string
): Promise<NetworkFeedItem[]> {
  const ids = rows.map((r) => String(r.id));
  const ownerProfileIds = Array.from(new Set(rows.map((r) => (r as Record<string, unknown>).owner_profile_id as string | null).filter(Boolean) as string[]));

  const [imageResult, profilesById, materialsMap] = await Promise.all([
    getImagesByListingIds(ids),
    ownerProfileIds.length > 0 ? getProfilesByIds(ownerProfileIds) : Promise.resolve({ data: [] }),
    getMaterialsByProjectIds(ids),
  ]);

  const byListingId: Record<string, { listing_id: string; image_url: string; alt: string | null; sort_order: number }[]> = {};
  for (const img of imageResult.data ?? []) {
    if (!byListingId[img.listing_id]) byListingId[img.listing_id] = [];
    byListingId[img.listing_id].push(img);
  }

  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }

  const items: NetworkFeedItem[] = [];
  for (const row of rows) {
    if (!isProjectListing(row)) continue;
    const listingImages = byListingId[String(row.id)] ?? [];
    const projectMaterials = materialsMap[String(row.id)] ?? [];
    const project = normalizeProject(row, listingImages, projectMaterials);
    const pid = (row as Record<string, unknown>).owner_profile_id as string | null;
    project.owner = pid ? ownerByProfileId[pid] ?? null : null;
    items.push({
      type: "project",
      project,
      reason: reasonFn(row),
      reasonSource,
      created_at: String(row.created_at ?? ""),
    });
  }
  return items;
}

async function hydrateProducts(
  rows: RawListingRow[],
  reasonSource: ReasonSource,
  reasonFn: (row: RawListingRow) => string
): Promise<NetworkFeedItem[]> {
  const ids = rows.map((r) => String(r.id));
  const ownerProfileIds = Array.from(new Set(rows.map((r) => (r as Record<string, unknown>).owner_profile_id as string | null).filter(Boolean) as string[]));

  const [imageResult, profilesById, materialsMap] = await Promise.all([
    getImagesByListingIds(ids),
    ownerProfileIds.length > 0 ? getProfilesByIds(ownerProfileIds) : Promise.resolve({ data: [] }),
    getMaterialsByProductIds(ids),
  ]);

  const byListingId: Record<string, { listing_id: string; image_url: string; alt: string | null; sort_order: number }[]> = {};
  for (const img of imageResult.data ?? []) {
    if (!byListingId[img.listing_id]) byListingId[img.listing_id] = [];
    byListingId[img.listing_id].push(img);
  }

  const ownerByProfileId: Record<string, ProjectOwner> = {};
  for (const p of profilesById.data ?? []) {
    const o = toProjectOwner(p);
    if (o.displayName) ownerByProfileId[p.id] = o;
  }

  const items: NetworkFeedItem[] = [];
  for (const row of rows) {
    const prodRow = listingRowToRawProductRow(row as Record<string, unknown>);
    const prodImages = listingImagesToProductImageRows(String(row.id), byListingId[String(row.id)] ?? []);
    const productMaterials = materialsMap[String(row.id)] ?? [];
    const product = normalizeProduct(prodRow, prodImages, productMaterials);
    const pid = (row as Record<string, unknown>).owner_profile_id as string | null;
    product.owner = pid ? ownerByProfileId[pid] ?? null : null;
    items.push({
      type: "product",
      product,
      reason: reasonFn(row),
      reasonSource,
      created_at: String(row.created_at ?? ""),
    });
  }
  return items;
}

async function hydrateMixed(
  rows: RawListingRow[],
  reasonSource: ReasonSource,
  reasonFn: (row: RawListingRow) => string
): Promise<NetworkFeedItem[]> {
  const projectRows = rows.filter((r) => isProjectListing(r));
  const productRows = rows.filter((r) => !isProjectListing(r));

  const [projectItems, productItems] = await Promise.all([
    projectRows.length > 0 ? hydrateProjects(projectRows, reasonSource, reasonFn) : Promise.resolve([]),
    productRows.length > 0 ? hydrateProducts(productRows, reasonSource, reasonFn) : Promise.resolve([]),
  ]);

  return [...projectItems, ...productItems];
}
