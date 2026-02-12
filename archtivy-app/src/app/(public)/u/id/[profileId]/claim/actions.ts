"use server";

import { auth } from "@clerk/nextjs/server";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { isUsernameTakenCaseInsensitive } from "@/lib/db/profiles";
import { getPendingRequestByProfileAndUser, createClaimRequestById } from "@/lib/db/profileClaimRequests";
import { validateUsername } from "@/lib/username";

export type ClaimProfileByIdResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Submit a claim request for an unclaimed profile. Does NOT grant ownership.
 * Creates a pending profile_claim_requests row for admin review.
 */
export async function claimProfileById(
  profileId: string,
  formData: FormData
): Promise<ClaimProfileByIdResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You must be signed in to request a claim." };
  }

  const rawUsername = (formData.get("username") as string)?.trim() ?? "";
  const validation = validateUsername(rawUsername);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  const { normalized } = validation;

  const message = (formData.get("message") as string)?.trim() ?? "";

  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data;
  if (!profile) {
    return { ok: false, error: "Profile not found." };
  }
  const row = profile as { claim_status?: string; is_hidden?: boolean; created_by?: string };
  if (row.is_hidden === true) {
    return { ok: false, error: "Profile not found." };
  }
  if (row.claim_status !== "unclaimed" && row.claim_status !== "pending") {
    return { ok: false, error: "This profile is already claimed." };
  }

  const pending = await getPendingRequestByProfileAndUser(profileId, userId);
  if (pending.data) {
    return { ok: false, error: "You already have a pending claim request for this profile." };
  }

  const takenResult = await isUsernameTakenCaseInsensitive(normalized);
  if (takenResult.error) {
    return { ok: false, error: takenResult.error };
  }
  if (takenResult.data === true) {
    return { ok: false, error: "This username is already taken. Please choose another." };
  }

  const insertResult = await createClaimRequestById({
    profile_id: profileId,
    requester_clerk_user_id: userId,
    requested_username: normalized,
    message: message || null,
  });
  if (insertResult.error) {
    return { ok: false, error: insertResult.error };
  }

  return { ok: true };
}
