"use server";

import { createHash } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function claimProfile(
  token: string
): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You must be signed in to claim a profile." };
  }

  const trimmed = (token ?? "").trim();
  if (!trimmed) return { ok: false, error: "Invalid or missing claim token." };

  const tokenHash = sha256Hex(trimmed);
  const supabase = getSupabaseServiceClient();

  const { data: rows, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("claim_token_hash", tokenHash)
    .eq("claim_status", "unclaimed")
    .or("claim_expires_at.is.null,claim_expires_at.gt." + new Date().toISOString())
    .limit(1);

  if (selectError) return { ok: false, error: selectError.message };
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) {
    return { ok: false, error: "This claim link is invalid, already used, or expired." };
  }

  const profileId = (row as { id: string }).id;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      owner_user_id: userId,
      claim_status: "claimed",
      claim_token_hash: null,
      claim_expires_at: null,
      claimed_at: now,
      is_primary: true,
      is_hidden: false,
      updated_at: now,
    })
    .eq("id", profileId)
    .eq("claim_token_hash", tokenHash)
    .eq("claim_status", "unclaimed");

  if (updateError) return { ok: false, error: updateError.message };

  const { data: otherRows } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", profileId)
    .or(`owner_user_id.eq.${userId},clerk_user_id.eq.${userId}`);
  const otherIds = (otherRows ?? []).map((r: { id: string }) => r.id);
  if (otherIds.length > 0) {
    await supabase
      .from("profiles")
      .update({ is_hidden: true, is_primary: false, updated_at: now })
      .in("id", otherIds);
  }

  return { ok: true, profileId };
}
