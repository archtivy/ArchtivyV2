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
