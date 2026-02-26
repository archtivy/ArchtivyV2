/**
 * Profile Directory: fetches profiles + their listing cover images + connection counts
 * in 3 sequential round trips (no N+1).
 *
 * Round trip 1: profiles by role
 * Round trip 2: approved listing covers for those profile IDs
 * Round trip 3 (parallel pair): project_product_links — project side + product side
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export interface ProfileDirectoryItem {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "designer" | "brand";
  designer_discipline: string | null;
  brand_type: string | null;
  location_city: string | null;
  location_country: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  created_at: string;
  /** 0–2 cover image URLs for the card collage */
  cover_images: string[];
  /** Total approved listings owned by this profile */
  listings_count: number;
  /**
   * project_product_links count for this profile's listings.
   * Designers: their projects linked to products.
   * Brands: their products linked from projects.
   */
  connections_count: number;
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  designer_discipline: string | null;
  brand_type: string | null;
  location_city: string | null;
  location_country: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  created_at: string;
};

type ListingCoverRow = {
  id: string;
  owner_profile_id: string | null;
  cover_image_url: string | null;
};

type LinkProjectRow = { project_id: string };
type LinkProductRow = { product_id: string };

export async function getProfileDirectoryByRole(
  role: "designer" | "brand"
): Promise<ProfileDirectoryItem[]> {
  const sup = getSupabaseServiceClient();

  // ── Round trip 1: profiles ──────────────────────────────────────────────
  const { data: profileData } = await sup
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, role, designer_discipline, brand_type, location_city, location_country, website, instagram, linkedin, created_at"
    )
    .eq("role", role)
    .eq("is_hidden", false)
    .not("username", "is", null)
    .order("display_name");

  const profiles = (profileData ?? []) as ProfileRow[];
  const profileIds = profiles.map((p) => p.id);

  if (profileIds.length === 0) return [];

  // ── Round trip 2: approved listing covers ───────────────────────────────
  const { data: listingData } = await sup
    .from("listings")
    .select("id, owner_profile_id, cover_image_url")
    .in("owner_profile_id", profileIds)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const listingRows = (listingData ?? []) as ListingCoverRow[];

  // Build per-profile cover array (max 2) and listings count
  const coverMap: Record<string, string[]> = {};
  const listingsCountMap: Record<string, number> = {};
  // Also build listing-id → profile-id lookup for connections step
  const listingIdToProfileId: Record<string, string> = {};

  for (const l of listingRows) {
    const pid = l.owner_profile_id;
    if (!pid) continue;
    listingIdToProfileId[l.id] = pid;
    listingsCountMap[pid] = (listingsCountMap[pid] ?? 0) + 1;
    if (l.cover_image_url) {
      if (!coverMap[pid]) coverMap[pid] = [];
      if (coverMap[pid].length < 2) coverMap[pid].push(l.cover_image_url);
    }
  }

  // ── Round trip 3 (parallel): project_product_links ─────────────────────
  const listingIds = listingRows.map((l) => l.id);
  const connectionsCountMap: Record<string, number> = {};

  if (listingIds.length > 0) {
    const [projLinksResult, prodLinksResult] = await Promise.all([
      sup
        .from("project_product_links")
        .select("project_id")
        .in("project_id", listingIds),
      sup
        .from("project_product_links")
        .select("product_id")
        .in("product_id", listingIds),
    ]);

    for (const r of (projLinksResult.data ?? []) as LinkProjectRow[]) {
      const pid = listingIdToProfileId[r.project_id];
      if (pid) connectionsCountMap[pid] = (connectionsCountMap[pid] ?? 0) + 1;
    }
    for (const r of (prodLinksResult.data ?? []) as LinkProductRow[]) {
      const pid = listingIdToProfileId[r.product_id];
      if (pid) connectionsCountMap[pid] = (connectionsCountMap[pid] ?? 0) + 1;
    }
  }

  // ── Combine ─────────────────────────────────────────────────────────────
  return profiles
    .filter((p): p is ProfileRow & { username: string } => p.username !== null)
    .map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      role: p.role as "designer" | "brand",
      designer_discipline: p.designer_discipline,
      brand_type: p.brand_type,
      location_city: p.location_city,
      location_country: p.location_country,
      website: p.website,
      instagram: p.instagram,
      linkedin: p.linkedin,
      created_at: p.created_at,
      cover_images: coverMap[p.id] ?? [],
      listings_count: listingsCountMap[p.id] ?? 0,
      connections_count: connectionsCountMap[p.id] ?? 0,
    }));
}

export const getProfileDirectoryByRoleCached = unstable_cache(
  getProfileDirectoryByRole,
  ["profile-directory"],
  {
    tags: [CACHE_TAGS.profiles, CACHE_TAGS.listings, CACHE_TAGS.explore],
    revalidate: 60,
  }
);
