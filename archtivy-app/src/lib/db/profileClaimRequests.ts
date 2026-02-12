import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { transferListingTeamMembers } from "@/lib/db/listingTeamMembers";
import type { ProfileClaimRequest } from "@/lib/types/profiles";

const TABLE = "profile_claim_requests";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

function toRequest(row: Record<string, unknown>): ProfileClaimRequest {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    requester_user_id: row.requester_user_id as string,
    requester_name: (row.requester_name as string | null) ?? null,
    requester_email: (row.requester_email as string | null) ?? null,
    requester_website: (row.requester_website as string | null) ?? null,
    proof_note: (row.proof_note as string | null) ?? null,
    requested_username: (row.requested_username as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    status: row.status as ProfileClaimRequest["status"],
    admin_note: (row.admin_note as string | null) ?? null,
    decision_note: (row.decision_note as string | null) ?? null,
    reviewed_by_admin_id: (row.reviewed_by_admin_id as string | null) ?? null,
    reviewed_by_clerk_user_id: (row.reviewed_by_clerk_user_id as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function createClaimRequest(input: {
  profile_id: string;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  requester_website?: string | null;
  proof_note?: string | null;
}): Promise<DbResult<ProfileClaimRequest>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      profile_id: input.profile_id,
      requester_user_id: input.requester_user_id,
      requester_name: input.requester_name.trim(),
      requester_email: input.requester_email.trim(),
      requester_website: input.requester_website?.trim() || null,
      proof_note: input.proof_note?.trim() || null,
      status: "pending",
    })
    .select()
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Insert did not return a row." };
  return { data: toRequest(data as Record<string, unknown>), error: null };
}

/** Create a claim request from /u/id/[profileId]/claim (username + optional message only). Does NOT update profiles. */
export async function createClaimRequestById(input: {
  profile_id: string;
  requester_clerk_user_id: string;
  requested_username: string;
  message?: string | null;
}): Promise<DbResult<ProfileClaimRequest>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      profile_id: input.profile_id,
      requester_user_id: input.requester_clerk_user_id,
      requester_name: null,
      requester_email: null,
      requested_username: input.requested_username.trim().toLowerCase(),
      message: input.message?.trim() || null,
      status: "pending",
    })
    .select()
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Insert did not return a row." };
  return { data: toRequest(data as Record<string, unknown>), error: null };
}

export async function getPendingRequestByProfileAndUser(
  profileId: string,
  requesterUserId: string
): Promise<DbResult<ProfileClaimRequest | null>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("profile_id", profileId)
    .eq("requester_user_id", requesterUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data ? toRequest(data as Record<string, unknown>) : null, error: null };
}

export async function getClaimRequests(filters: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}): Promise<DbResult<ProfileClaimRequest[]>> {
  const supabase = getSupabaseServiceClient();
  let q = supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  const rows = (data ?? []).map((r) => toRequest(r as Record<string, unknown>));
  return { data: rows, error: null };
}

export async function getClaimRequestById(id: string): Promise<DbResult<ProfileClaimRequest | null>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data ? toRequest(data as Record<string, unknown>) : null, error: null };
}

export async function countPendingRequestsForProfile(profileId: string): Promise<DbResult<number>> {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "pending");
  if (error) return { data: null, error: error.message };
  return { data: count ?? 0, error: null };
}

/**
 * Approve a claim request. Placeholder (created_by=archtivy) becomes the user's primary profile.
 * If requester already has a profile: hide it, detach clerk_user_id, assign placeholder to user,
 * transfer listing_team_members from old profile to placeholder. Otherwise just assign placeholder.
 */
export async function approveClaimRequest(
  requestId: string,
  adminUserId: string
): Promise<DbResult<void>> {
  const supabase = getSupabaseServiceClient();
  const { data: req, error: fetchErr } = await supabase
    .from(TABLE)
    .select("profile_id, requester_user_id, requested_username")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr) return { data: null, error: fetchErr.message };
  if (!req) return { data: null, error: "Request not found or already reviewed." };

  const requesterUserId = (req as { requester_user_id: string }).requester_user_id;
  const placeholderId = (req as { profile_id: string }).profile_id;
  const requestedUsername = (req as { requested_username: string | null }).requested_username?.trim() ?? null;

  const { data: placeholderRow, error: placeErr } = await supabase
    .from("profiles")
    .select("id, created_by, claim_status")
    .eq("id", placeholderId)
    .single();
  if (placeErr || !placeholderRow) return { data: null, error: "Placeholder profile not found." };
  const createdBy = (placeholderRow as { created_by?: string }).created_by;
  const claimStatus = (placeholderRow as { claim_status?: string }).claim_status;
  if (createdBy !== "archtivy" || (claimStatus !== "unclaimed" && claimStatus !== "pending")) {
    return { data: null, error: "Profile is not an unclaimed archtivy placeholder." };
  }

  const { data: existingRows } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", requesterUserId)
    .limit(1);
  const existingProfile = Array.isArray(existingRows) && existingRows.length > 0 ? (existingRows[0] as { id: string }) : null;
  const existingId = existingProfile?.id ?? null;

  const now = new Date().toISOString();

  if (existingId && existingId !== placeholderId) {
    await supabase
      .from("profiles")
      .update({ is_hidden: true, is_primary: false, updated_at: now })
      .eq("id", existingId);
    await supabase
      .from("profiles")
      .update({ clerk_user_id: null, updated_at: now })
      .eq("id", existingId);
    const transferResult = await transferListingTeamMembers(existingId, placeholderId);
    if (transferResult.error) return { data: null, error: transferResult.error };
  }

  const placeholderUpdate: Record<string, unknown> = {
    clerk_user_id: requesterUserId,
    owner_user_id: requesterUserId,
    claim_status: "claimed",
    claimed_at: now,
    is_hidden: false,
    is_primary: true,
    updated_at: now,
  };
  if (requestedUsername) placeholderUpdate.username = requestedUsername;
  const { error: profileErr } = await supabase
    .from("profiles")
    .update(placeholderUpdate)
    .eq("id", placeholderId);
  if (profileErr) return { data: null, error: profileErr.message };

  const { error: updateReqErr } = await supabase
    .from(TABLE)
    .update({
      status: "approved",
      reviewed_by_admin_id: adminUserId,
      reviewed_by_clerk_user_id: adminUserId,
      reviewed_at: now,
    })
    .eq("id", requestId);
  if (updateReqErr) return { data: null, error: updateReqErr.message };

  return { data: undefined, error: null };
}

export async function rejectClaimRequest(
  requestId: string,
  adminUserId: string,
  adminNote: string | null
): Promise<DbResult<void>> {
  const supabase = getSupabaseServiceClient();
  const { data: req, error: fetchErr } = await supabase
    .from(TABLE)
    .select("profile_id")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr) return { data: null, error: fetchErr.message };
  if (!req) return { data: null, error: "Request not found or already reviewed." };

  const now = new Date().toISOString();
  const { error: updateReqErr } = await supabase
    .from(TABLE)
    .update({
      status: "rejected",
      admin_note: adminNote?.trim() || null,
      decision_note: adminNote?.trim() || null,
      reviewed_by_admin_id: adminUserId,
      reviewed_by_clerk_user_id: adminUserId,
      reviewed_at: now,
    })
    .eq("id", requestId);
  if (updateReqErr) return { data: null, error: updateReqErr.message };

  const profileId = (req as { profile_id: string }).profile_id;
  const { data: pendingCount } = await countPendingRequestsForProfile(profileId);
  if (pendingCount === 0) {
    await supabase
      .from("profiles")
      .update({ claim_status: "unclaimed", updated_at: now })
      .eq("id", profileId);
  }

  return { data: undefined, error: null };
}
