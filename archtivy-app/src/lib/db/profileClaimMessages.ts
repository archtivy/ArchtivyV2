import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Insert an optional message when a user claims a profile by id.
 * Call only when message is non-empty (trimmed).
 */
export async function insertProfileClaimMessage(
  profileId: string,
  clerkUserId: string,
  message: string
): Promise<DbResult<void>> {
  const trimmed = (message ?? "").trim();
  if (!trimmed) return { data: undefined, error: null };
  const sup = getSupabaseServiceClient();
  const { error } = await sup.from("profile_claim_messages").insert({
    profile_id: profileId,
    clerk_user_id: clerkUserId,
    message: trimmed,
  });
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
