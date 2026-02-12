"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { createClaimRequest, getPendingRequestByProfileAndUser } from "@/lib/db/profileClaimRequests";
import { setProfileClaimStatus } from "@/lib/db/profiles";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export async function submitClaimRequest(
  profileId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in to submit a claim." };

  const requester_name = toText(formData.get("requester_name"));
  const requester_email = toText(formData.get("requester_email"));
  if (!requester_name || !requester_email)
    return { ok: false, error: "Name and email are required." };

  const existing = await getPendingRequestByProfileAndUser(profileId, userId);
  if (existing.data) return { ok: false, error: "You already have a pending claim for this profile." };

  const supabase = getSupabaseServiceClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, claim_status")
    .eq("id", profileId)
    .maybeSingle();
  if (!profileRow) return { ok: false, error: "Profile not found." };
  if ((profileRow as { claim_status: string }).claim_status === "claimed")
    return { ok: false, error: "This profile is already claimed." };

  const insert = await createClaimRequest({
    profile_id: profileId,
    requester_user_id: userId,
    requester_name,
    requester_email,
    requester_website: toText(formData.get("requester_website")) || null,
    proof_note: toText(formData.get("proof_note")) || null,
  });
  if (!insert.data) return { ok: false, error: insert.error ?? "Failed to create request." };

  await setProfileClaimStatus(profileId, "pending");

  revalidatePath("/u/[username]", "page");
  revalidatePath("/u/[username]/claim", "page");
  return { ok: true };
}
