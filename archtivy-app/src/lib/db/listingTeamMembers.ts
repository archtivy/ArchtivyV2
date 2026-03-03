import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface TaggedListingRow {
  id: string;
  type: "project" | "product";
  slug: string | null;
  title: string;
  cover_image_url: string | null;
}

/**
 * Listings where this profile is a team member (listing_team_members join listings).
 * Ordered by newest first.
 */
export async function getTaggedListingsForProfile(
  profileId: string
): Promise<DbResult<TaggedListingRow[]>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listing_team_members")
    .select("listings(id, type, slug, title, cover_image_url, created_at)")
    .eq("profile_id", profileId);

  if (error) {
    return { data: null, error: error.message };
  }

  type Row = { listings: { id: string; type: string; slug: string | null; title: string; cover_image_url: string | null; created_at: string } | null };
  const rows: Row[] = (data ?? []) as unknown as Row[];
  const withDate: { row: TaggedListingRow; created_at: string }[] = [];
  for (const r of rows) {
    const l = r.listings;
    const t = l?.type ?? (l as { listing_type?: string })?.listing_type;
    if (l && (t === "project" || t === "product")) {
      withDate.push({
        row: {
          id: l.id,
          type: t as "project" | "product",
          slug: l.slug ?? null,
          title: l.title ?? "",
          cover_image_url: l.cover_image_url ?? null,
        },
        created_at: l.created_at ?? "",
      });
    }
  }
  withDate.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { data: withDate.map((x) => x.row), error: null };
}

export interface ListingTeamMemberWithProfile {
  profile_id: string;
  display_name: string | null;
  title: string | null;
  username: string | null;
}

/**
 * Team members for a listing from listing_team_members with profile username for links.
 * If RLS blocks anon read on profiles, use service client (already used here).
 */
export async function getListingTeamMembersWithProfiles(
  listingId: string
): Promise<DbResult<ListingTeamMemberWithProfile[]>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listing_team_members")
    .select("profile_id, display_name, title, sort_order, profiles(username)")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  type TeamRow = {
    profile_id: string;
    display_name: string | null;
    title: string | null;
    sort_order: number;
    profiles: { username: string | null } | { username: string | null }[] | null;
  };
  const rows: TeamRow[] = (data ?? []) as unknown as TeamRow[];
  const list: ListingTeamMemberWithProfile[] = rows.map((r) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      profile_id: r.profile_id,
      display_name: r.display_name ?? null,
      title: r.title ?? null,
      username: prof?.username ?? null,
    };
  });
  return { data: list, error: null };
}

export interface CollaboratorItem {
  profile_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  title: string | null;
  count: number;
}

/**
 * Top collaborators for a profile: other team members on their listings, ranked by
 * number of shared listings. Used for "Frequently Collaborated With" on profile pages.
 */
export async function getCollaboratorsForListings(
  profileId: string,
  listingIds: string[]
): Promise<DbResult<CollaboratorItem[]>> {
  if (listingIds.length === 0) return { data: [], error: null };
  const sup = getSupabaseServiceClient();

  type TeamRow = {
    profile_id: string;
    display_name: string | null;
    title: string | null;
    profiles: { username: string | null; avatar_url: string | null } | { username: string | null; avatar_url: string | null }[] | null;
  };

  const { data, error } = await sup
    .from("listing_team_members")
    .select("profile_id, display_name, title, profiles(username, avatar_url)")
    .in("listing_id", listingIds)
    .neq("profile_id", profileId);

  if (error) return { data: null, error: error.message };

  const countMap: Record<string, CollaboratorItem> = {};
  for (const row of (data ?? []) as unknown as TeamRow[]) {
    if (!row.profile_id) continue;
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (countMap[row.profile_id]) {
      countMap[row.profile_id].count++;
    } else {
      countMap[row.profile_id] = {
        profile_id: row.profile_id,
        display_name: row.display_name ?? null,
        username: prof?.username ?? null,
        avatar_url: prof?.avatar_url ?? null,
        title: row.title ?? null,
        count: 1,
      };
    }
  }

  const sorted = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { data: sorted, error: null };
}

export type DbResultVoid = { data: undefined; error: null } | { data: null; error: string };

/**
 * Transfer all listing_team_members rows from one profile to another (for claim merge).
 * Use when merging a placeholder profile into the claimant's existing profile.
 */
export async function transferListingTeamMembers(
  fromProfileId: string,
  toProfileId: string
): Promise<DbResultVoid> {
  if (fromProfileId === toProfileId) return { data: undefined, error: null };
  const sup = getSupabaseServiceClient();
  const { error } = await sup
    .from("listing_team_members")
    .update({ profile_id: toProfileId })
    .eq("profile_id", fromProfileId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
