import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface ArchitectProjectItem {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  location_city: string | null;
  location_country: string | null;
  year: string | null;
}

/**
 * Fetch other projects by the same owner profile (for "More from this architect").
 * Excludes the current project. Returns up to `limit` APPROVED projects, newest first.
 */
export async function getOtherProjectsByOwner(
  ownerProfileId: string,
  excludeProjectId: string,
  limit = 6,
): Promise<DbResult<ArchitectProjectItem[]>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url, location_city, location_country, year")
    .eq("owner_profile_id", ownerProfileId)
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .neq("id", excludeProjectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ArchitectProjectItem[], error: null };
}

export interface TeamMemberProjectItem {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
}

export interface TeamMemberWithProjects {
  profile_id: string;
  display_name: string | null;
  title: string | null;
  username: string | null;
  avatar_url: string | null;
  projects: TeamMemberProjectItem[];
}

/**
 * For each team member profile on a listing, fetch their other projects
 * (listings where they appear as a team member, excluding the current one).
 * Returns up to 3 projects per member.
 */
export async function getTeamMemberOtherProjects(
  listingId: string,
  teamProfileIds: string[],
): Promise<DbResult<Record<string, TeamMemberProjectItem[]>>> {
  if (teamProfileIds.length === 0) return { data: {}, error: null };

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listing_team_members")
    .select("profile_id, listings!inner(id, slug, title, cover_image_url, type, status, deleted_at)")
    .in("profile_id", teamProfileIds)
    .neq("listing_id", listingId);

  if (error) return { data: null, error: error.message };

  type Row = {
    profile_id: string;
    listings: {
      id: string;
      slug: string | null;
      title: string;
      cover_image_url: string | null;
      type: string;
      status: string;
      deleted_at: string | null;
    } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const map: Record<string, TeamMemberProjectItem[]> = {};

  for (const r of rows) {
    const l = r.listings;
    if (!l || l.type !== "project" || l.status !== "APPROVED" || l.deleted_at) continue;
    if (!map[r.profile_id]) map[r.profile_id] = [];
    if (map[r.profile_id].length < 3) {
      map[r.profile_id].push({
        id: l.id,
        slug: l.slug,
        title: l.title,
        cover_image_url: l.cover_image_url,
      });
    }
  }

  return { data: map, error: null };
}

export interface BrandProductItem {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
}

/**
 * Fetch other products by the same brand profile (for "More from this brand").
 * Excludes the current product. Returns up to `limit` APPROVED products, newest first.
 */
export async function getOtherProductsByBrand(
  brandProfileId: string,
  excludeProductId: string,
  limit = 6,
): Promise<DbResult<BrandProductItem[]>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url")
    .eq("brand_profile_id", brandProfileId)
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as BrandProductItem[], error: null };
}

// ── Country-based discovery ──────────────────────────────────────────────────

export interface CountryProjectItem {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  location_city: string | null;
  location_country: string | null;
  year: number | string | null;
  owner_display_name: string | null;
  owner_username: string | null;
}

/**
 * Fetch recent APPROVED projects from the same country, excluding the current one.
 * Ordered by newest first for quality/recency bias.
 */
export async function getProjectsByCountry(
  country: string,
  excludeProjectId: string,
  limit = 8,
): Promise<DbResult<CountryProjectItem[]>> {
  const trimmed = country.trim();
  if (!trimmed) return { data: [], error: null };

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url, location_city, location_country, year, profiles!listings_owner_profile_id_fkey(display_name, username)")
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .eq("location_country", trimmed)
    .neq("id", excludeProjectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };

  type Row = {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
    location_city: string | null;
    location_country: string | null;
    year: number | string | null;
    profiles: { display_name: string | null; username: string | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  return {
    data: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      cover_image_url: r.cover_image_url,
      location_city: r.location_city,
      location_country: r.location_country,
      year: r.year,
      owner_display_name: r.profiles?.display_name ?? null,
      owner_username: r.profiles?.username ?? null,
    })),
    error: null,
  };
}

export interface CountryDesignerItem {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  designer_discipline: string | null;
  listing_count: number;
}

/**
 * Fetch designer profiles from the same country, ranked by listing count (quality proxy).
 */
export async function getDesignersByCountry(
  country: string,
  limit = 8,
): Promise<DbResult<CountryDesignerItem[]>> {
  const trimmed = country.trim();
  if (!trimmed) return { data: [], error: null };

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("profiles")
    .select("id, display_name, username, avatar_url, location_city, location_country, designer_discipline")
    .eq("role", "designer")
    .eq("location_country", trimmed)
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { data: null, error: error.message };

  type ProfileRow = {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    location_city: string | null;
    location_country: string | null;
    designer_discipline: string | null;
  };
  const profiles = (data ?? []) as ProfileRow[];
  if (profiles.length === 0) return { data: [], error: null };

  // Count listings per profile for quality ranking
  const profileIds = profiles.map((p) => p.id);
  const { data: countData } = await sup
    .from("listings")
    .select("owner_profile_id")
    .in("owner_profile_id", profileIds)
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  const counts: Record<string, number> = {};
  for (const row of (countData ?? []) as { owner_profile_id: string }[]) {
    counts[row.owner_profile_id] = (counts[row.owner_profile_id] ?? 0) + 1;
  }

  const ranked = profiles
    .map((p) => ({ ...p, listing_count: counts[p.id] ?? 0 }))
    .sort((a, b) => {
      // Prefer profiles with listings, then by listing count, then by having an avatar
      if (a.listing_count !== b.listing_count) return b.listing_count - a.listing_count;
      if (a.avatar_url && !b.avatar_url) return -1;
      if (!a.avatar_url && b.avatar_url) return 1;
      return 0;
    })
    .slice(0, limit);

  return { data: ranked, error: null };
}

export interface CollaborationPair {
  profileA: string;
  profileB: string;
  nameA: string;
  nameB: string;
  sharedCount: number;
}

/**
 * Find team members who have collaborated across multiple projects.
 * Returns pairs of profiles that co-appear in more than 1 project together.
 */
export async function getCollaborationPairs(
  teamProfileIds: string[],
): Promise<DbResult<CollaborationPair[]>> {
  if (teamProfileIds.length < 2) return { data: [], error: null };

  const sup = getSupabaseServiceClient();

  // Get all listing_team_members rows for these profiles
  const { data, error } = await sup
    .from("listing_team_members")
    .select("profile_id, listing_id, display_name")
    .in("profile_id", teamProfileIds);

  if (error) return { data: null, error: error.message };

  type Row = { profile_id: string; listing_id: string; display_name: string | null };
  const rows = (data ?? []) as Row[];

  // Group by listing_id
  const byListing: Record<string, Row[]> = {};
  for (const r of rows) {
    (byListing[r.listing_id] ||= []).push(r);
  }

  // Count co-occurrences between pairs
  const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const pairCounts: Record<string, { a: string; b: string; nameA: string; nameB: string; count: number }> = {};

  for (const members of Object.values(byListing)) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = pairKey(members[i].profile_id, members[j].profile_id);
        if (!pairCounts[key]) {
          pairCounts[key] = {
            a: members[i].profile_id,
            b: members[j].profile_id,
            nameA: members[i].display_name ?? "Unknown",
            nameB: members[j].display_name ?? "Unknown",
            count: 0,
          };
        }
        pairCounts[key].count++;
      }
    }
  }

  // Only return pairs with 2+ shared projects
  const pairs: CollaborationPair[] = Object.values(pairCounts)
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((p) => ({
      profileA: p.a,
      profileB: p.b,
      nameA: p.nameA,
      nameB: p.nameB,
      sharedCount: p.count,
    }));

  return { data: pairs, error: null };
}
