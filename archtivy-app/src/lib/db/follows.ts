import { supabase } from "@/lib/supabaseClient";

const TABLE = "follows";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type FollowTargetType = "designer" | "brand" | "category" | "material";

export interface FollowRow {
  id: string;
  follower_profile_id: string;
  target_type: FollowTargetType;
  target_id: string;
  created_at: string;
}

/**
 * Check whether a profile is following a given target.
 */
export async function isFollowing(
  profileId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Get all follows for a profile, optionally filtered by target type.
 */
export async function getFollowingByProfile(
  profileId: string,
  targetType?: FollowTargetType
): Promise<DbResult<FollowRow[]>> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("follower_profile_id", profileId)
    .order("created_at", { ascending: false });

  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as FollowRow[], error: null };
}

/**
 * Add a follow relationship.
 */
export async function addFollow(
  profileId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<DbResult<void>> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      follower_profile_id: profileId,
      target_type: targetType,
      target_id: targetId,
    },
    { onConflict: "follower_profile_id,target_type,target_id" }
  );
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Remove a follow relationship.
 */
export async function removeFollow(
  profileId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("follower_profile_id", profileId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Count how many users follow a given target.
 */
export async function getFollowerCount(
  targetType: FollowTargetType,
  targetId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Count how many targets a profile is following.
 */
export async function getFollowingCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileId);

  if (error) return 0;
  return count ?? 0;
}
