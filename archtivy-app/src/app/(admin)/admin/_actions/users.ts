"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { createAuditLog } from "@/lib/db/audit";
import type { ProfileRole } from "@/lib/auth/config";

async function ensureAdmin(): Promise<{ ok: true; adminUserId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, error: "Profile not found" };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, error: "Forbidden" };
  return { ok: true, adminUserId: userId };
}

export async function updateUserRole(profileId: string, role: ProfileRole) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };

  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "user.role_update",
    entityType: "profile",
    entityId: profileId,
    metadata: { role },
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/profiles");
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath(`/admin/profiles/${profileId}`);
  return { ok: true as const };
}

export async function disableUser(profileId: string, disabled: boolean) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();
  const disabled_at = disabled ? new Date().toISOString() : null;
  const { error } = await supabase.from("profiles").update({ disabled_at, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };

  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "user.disable",
    entityType: "profile",
    entityId: profileId,
    metadata: { disabled },
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/profiles");
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath(`/admin/profiles/${profileId}`);
  return { ok: true as const };
}

/** Hard delete profile. Safe only if user has no listings (or we allow cascade). For now we require zero listings. */
export async function deleteUser(profileId: string) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();
  const { data: profile } = await supabase.from("profiles").select("clerk_user_id").eq("id", profileId).maybeSingle();
  if (!profile) return { ok: false as const, error: "Profile not found" };

  const clerkId = (profile as { clerk_user_id: string }).clerk_user_id;
  const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_clerk_user_id", clerkId);
  if ((count ?? 0) > 0) {
    return { ok: false as const, error: "Cannot delete user with listings. Remove or reassign listings first." };
  }

  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };

  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "user.delete",
    entityType: "profile",
    entityId: profileId,
    metadata: {},
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/profiles");
  return { ok: true as const };
}
