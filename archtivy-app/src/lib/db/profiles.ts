import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { Profile, ProfileCreateInput, ProfileUpdateInput } from "@/lib/types/profiles";

const TABLE = "profiles";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Generate a unique-ish username from display name (e.g. "Jane Doe" -> "jane-doe-a1b2").
 */
export function generateUsername(displayName: string | null): string {
  const base = displayName
    ? displayName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    : "user";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/**
 * Get profile by Clerk user id.
 */
export async function getProfileByClerkId(
  clerkUserId: string
): Promise<DbResult<Profile | null>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile | null, error: null };
}

/**
 * Get the default (visible) profile for the current user for /me and header "Profile" link.
 * Prefers owned non-hidden profiles with is_primary=true, else newest; fallback to signup profile (clerk_user_id) if non-hidden.
 */
export async function getDefaultProfileForClerkUserId(
  clerkUserId: string
): Promise<DbResult<Profile | null>> {
  const sup = getSupabaseServiceClient();
  const { data: ownedRows, error: ownedErr } = await sup
    .from(TABLE)
    .select("*")
    .eq("owner_user_id", clerkUserId)
    .eq("is_hidden", false)
    .order("is_primary", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (ownedErr) return { data: null, error: ownedErr.message };
  const owned = Array.isArray(ownedRows) ? ownedRows[0] : null;
  if (owned) return { data: owned as Profile, error: null };

  const { data: signupRows, error: signupErr } = await sup
    .from(TABLE)
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .eq("is_hidden", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (signupErr) return { data: null, error: signupErr.message };
  const signup = Array.isArray(signupRows) ? signupRows[0] : null;
  return { data: (signup as Profile) ?? null, error: null };
}

/**
 * Get profile by Clerk user id using service role (for admin guard; bypasses RLS).
 */
export async function getProfileByClerkIdForAdmin(
  clerkUserId: string
): Promise<DbResult<Profile | null>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from(TABLE)
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as Profile | null, error: null };
}

/**
 * Get profiles by multiple Clerk user ids. Returns array; order not guaranteed.
 * Excludes hidden profiles for public-facing use (e.g. explore owner resolution).
 */
export async function getProfilesByClerkIds(
  clerkUserIds: string[]
): Promise<DbResult<Profile[]>> {
  if (clerkUserIds.length === 0) return { data: [], error: null };
  const unique = Array.from(new Set(clerkUserIds));
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, clerk_user_id, display_name, username, avatar_url, role")
    .in("clerk_user_id", unique)
    .eq("is_hidden", false);
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Profile[], error: null };
}

/**
 * Get profile by id (e.g. for brand_profile_id on product).
 */
export async function getProfileById(
  id: string
): Promise<DbResult<Profile | null>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, display_name, username")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile | null, error: null };
}

/**
 * Get full profile by id for public profile page (/u/id/[profileId]).
 * Uses service client so unclaimed profiles (username NULL) are readable when RLS
 * would otherwise block anonymous access.
 */
export async function getProfileByIdForPublicPage(
  id: string
): Promise<DbResult<Profile | null>> {
  const supabaseService = getSupabaseServiceClient();
  const { data, error } = await supabaseService
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile | null, error: null };
}

/**
 * Get profile by username (for public profile page).
 */
export async function getProfileByUsername(
  username: string
): Promise<DbResult<Profile | null>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile | null, error: null };
}

/**
 * Search profiles for admin "Owner Profile" dropdown: non-hidden, designer/brand (project) or brand only (product).
 * Returns id, display_name, username; limit 100, ordered by display_name.
 */
export async function searchProfilesForOwner(
  q: string,
  type: "project" | "product"
): Promise<DbResult<{ id: string; display_name: string | null; username: string | null }[]>> {
  const sup = getSupabaseServiceClient();
  const term = typeof q === "string" ? q.trim() : "";
  let query = sup
    .from(TABLE)
    .select("id, display_name, username")
    .eq("is_hidden", false)
    .not("username", "is", null)
    .order("display_name", { ascending: true })
    .limit(100);
  if (type === "product") {
    query = query.eq("role", "brand");
  } else {
    query = query.in("role", ["designer", "brand"]);
  }
  if (term.length >= 1) {
    const escaped = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`display_name.ilike.%${escaped}%,username.ilike.%${escaped}%`);
  }
  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as { id: string; display_name: string | null; username: string | null }[], error: null };
}

/**
 * Get profiles by role (e.g. "brand" for brands_used selection in Add Project).
 * Excludes hidden profiles for public listings.
 */
export async function getProfilesByRole(
  role: Profile["role"]
): Promise<DbResult<Profile[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, display_name, username, avatar_url")
    .eq("role", role)
    .eq("is_hidden", false)
    .not("username", "is", null)
    .order("display_name");

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data ?? []) as Profile[], error: null };
}

/**
 * Check if username is taken (excluding optional current profile id).
 */
export async function isUsernameTaken(
  username: string,
  excludeProfileId?: string
): Promise<DbResult<boolean>> {
  let q = supabase.from(TABLE).select("id").eq("username", username);
  if (excludeProfileId) {
    q = q.neq("id", excludeProfileId);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: !!data, error: null };
}

/** Escape % and _ for use in Supabase .ilike() so the match is exact (case-insensitive). */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Check if username is taken case-insensitively (for claim flow). Uses service role.
 */
export async function isUsernameTakenCaseInsensitive(
  normalizedUsername: string,
  excludeProfileId?: string
): Promise<DbResult<boolean>> {
  const sup = getSupabaseServiceClient();
  let q = sup.from(TABLE).select("id").ilike("username", escapeIlike(normalizedUsername));
  if (excludeProfileId) {
    q = q.neq("id", excludeProfileId);
  }
  const { data, error } = await q.maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: !!data, error: null };
}

/**
 * Onboarding-only upsert: writes ONLY clerk_user_id, role, display_name, username,
 * one of designer_discipline | brand_type | reader_type (by role), and updated_at.
 * Other columns are not sent (left as default/null or unchanged).
 */
export type OnboardingProfileInput = {
  clerk_user_id: string;
  role: Profile["role"];
  display_name: string | null;
  username: string | null;
  designer_discipline: string | null;
  brand_type: string | null;
  reader_type: string | null;
};

export async function upsertProfileFromOnboarding(
  input: OnboardingProfileInput
): Promise<DbResult<Profile>> {
  const supabaseService = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const row = {
    clerk_user_id: input.clerk_user_id,
    role: input.role,
    display_name: input.display_name ?? null,
    username: input.username ?? null,
    designer_discipline: input.designer_discipline ?? null,
    brand_type: input.brand_type ?? null,
    reader_type: input.reader_type ?? null,
    updated_at: now,
  };

  const { data, error } = await supabaseService
    .from(TABLE)
    .upsert(row, {
      onConflict: "clerk_user_id",
      ignoreDuplicates: false,
    })
    .select()
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Upsert did not return a row." };
  return { data: data as Profile, error: null };
}

/**
 * Set profile claim_status (e.g. to 'pending' when first claim submitted). Service role.
 */
export async function setProfileClaimStatus(
  profileId: string,
  claimStatus: "unclaimed" | "pending" | "claimed"
): Promise<DbResult<void>> {
  const supabaseService = getSupabaseServiceClient();
  const { error } = await supabaseService
    .from(TABLE)
    .update({ claim_status: claimStatus, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Create or update profile. On conflict clerk_user_id, update.
 */
export async function upsertProfile(
  input: ProfileCreateInput & Partial<ProfileUpdateInput>
): Promise<DbResult<Profile>> {
  const now = new Date().toISOString();
  const row = {
    clerk_user_id: input.clerk_user_id,
    role: input.role,
    display_name: input.display_name ?? null,
    username: input.username ?? null,
    location_city: input.location_city ?? null,
    location_country: input.location_country ?? null,
    bio: input.bio ?? null,
    website: input.website ?? null,
    instagram: input.instagram ?? null,
    linkedin: input.linkedin ?? null,
    avatar_url: input.avatar_url ?? null,
    designer_discipline: input.designer_discipline ?? null,
    brand_type: input.brand_type ?? null,
    reader_type: input.reader_type ?? null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, {
      onConflict: "clerk_user_id",
      ignoreDuplicates: false,
    })
    .select()
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Upsert did not return a row." };
  return { data: data as Profile, error: null };
}

/**
 * Update profile by id (partial update). Uses service role so RLS does not block.
 */
export async function updateProfile(
  id: string,
  input: ProfileUpdateInput
): Promise<DbResult<Profile>> {
  const supabaseService = getSupabaseServiceClient();
  const { data, error } = await supabaseService
    .from(TABLE)
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Profile not found." };
  return { data: data as Profile, error: null };
}

/**
 * Claim an unclaimed profile by id (e.g. from /u/id/[profileId]/claim).
 * Sets claim_status, owner_user_id, claimed_at, clerk_user_id, username.
 * Does NOT change profile id or created_by. Uses service role.
 * Use only when the claimant has no existing profile (no clerk_user_id conflict).
 */
export async function claimProfileByIdInDb(
  profileId: string,
  clerkUserId: string,
  username: string
): Promise<DbResult<void>> {
  const sup = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await sup
    .from(TABLE)
    .update({
      claim_status: "claimed",
      owner_user_id: clerkUserId,
      claimed_at: now,
      clerk_user_id: clerkUserId,
      username: username.trim().toLowerCase(),
      updated_at: now,
    })
    .eq("id", profileId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Mark a placeholder profile as claimed and hidden after merging into existing profile.
 * Does NOT set clerk_user_id (avoids unique constraint). Uses service role.
 */
export async function markPlaceholderAsClaimedAndHidden(
  profileId: string
): Promise<DbResult<void>> {
  const sup = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    is_hidden: true,
    claim_status: "claimed",
    updated_at: now,
  };
  const { error } = await sup.from(TABLE).update(update).eq("id", profileId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
