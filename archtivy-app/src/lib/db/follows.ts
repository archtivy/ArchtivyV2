import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * SERVICE-ROLE, NOT ANON — and this module is server-only.
 *
 * `follows` has RLS enabled with no policy that the anon role can satisfy, and
 * this app authenticates with Clerk, so the Supabase client never carries a
 * user JWT — it is always the anon role. Every call here therefore failed
 * silently against the anon client:
 *
 *   select -> []                (reads always looked like "not following")
 *   insert -> 42501 "new row violates row-level security policy"
 *
 * which made isFollowing() permanently false, so follow buttons showed
 * "Follow" even to users who already followed, and toggling could never write.
 *
 * Bypassing RLS is safe here and matches the pattern used for
 * document_downloads: every function takes an explicit follower_profile_id,
 * and every caller derives it from the authenticated Clerk session, so access
 * is gated in the application layer rather than by a policy the anon role
 * could never satisfy anyway.
 *
 * SAFETY: the two client components that reference this module
 * (FollowButton, FollowingList) use `import type` only, which is erased at
 * compile time — no service key reaches the browser bundle.
 */
const supabase = () => getSupabaseServiceClient();

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
  const { count, error } = await supabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Which of the given targets this profile already follows — ONE query.
 *
 * isFollowing() is a head-count per target, so checking N filter chips cost N
 * round trips. This asks the same question once and returns a set the caller
 * indexes into.
 *
 * Keyed `${target_type}:${target_id}` because the same node id can in principle
 * be followed under two target types, and collapsing them would report a
 * category follow as a material follow.
 *
 * Fails closed: on error the set is empty, so the UI shows "Follow" rather than
 * a wrong "Following". Toggling then upserts, which is idempotent either way.
 */
export async function getFollowedTargetKeys(
  profileId: string,
  targets: { targetType: FollowTargetType; targetId: string }[]
): Promise<Set<string>> {
  if (targets.length === 0) return new Set();

  const targetIds = [...new Set(targets.map((t) => t.targetId))];
  const targetTypes = [...new Set(targets.map((t) => t.targetType))];

  const { data, error } = await supabase()
    .from(TABLE)
    .select("target_type, target_id")
    .eq("follower_profile_id", profileId)
    .in("target_type", targetTypes)
    .in("target_id", targetIds);

  if (error) return new Set();

  // The two IN lists over-select the same way the taxonomy pair lookup does;
  // intersecting with what was actually asked for keeps that from leaking.
  const wanted = new Set(targets.map((t) => `${t.targetType}:${t.targetId}`));
  const out = new Set<string>();
  for (const row of (data ?? []) as { target_type: string; target_id: string }[]) {
    const key = `${row.target_type}:${row.target_id}`;
    if (wanted.has(key)) out.add(key);
  }
  return out;
}

/**
 * Get all follows for a profile, optionally filtered by target type.
 */
export async function getFollowingByProfile(
  profileId: string,
  targetType?: FollowTargetType
): Promise<DbResult<FollowRow[]>> {
  let query = supabase()
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
  const { error } = await supabase().from(TABLE).upsert(
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
  const { error } = await supabase()
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
  const { count, error } = await supabase()
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
  const { count, error } = await supabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileId);

  if (error) return 0;
  return count ?? 0;
}
