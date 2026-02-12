import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; status: number; body: { error: string } }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, body: { error: "Unauthorized" } };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, status: 401, body: { error: "Profile not found" } };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, status: 403, body: { error: "Forbidden" } };
  return { ok: true };
}

const FK_CODES = ["23503", "23502"]; // foreign key violation, not null

/**
 * DELETE /api/admin/profiles/[id]
 * Hard delete profile, or soft delete (set deleted_at) if FK constraints prevent hard delete.
 * Requires profiles.deleted_at column for soft delete (see docs/profiles-deleted-at-migration.sql).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return Response.json(admin.body, { status: admin.status });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return Response.json({ error: "Missing profile id" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // 1) Try hard delete
  const { error: deleteError } = await supabase.from("profiles").delete().eq("id", id);

  if (!deleteError) {
    return Response.json({ success: true });
  }

  // 2) If FK/constraint, try soft delete (requires profiles.deleted_at column)
  console.error("[DELETE /api/admin/profiles] hard delete failed:", deleteError);
  const code = (deleteError as { code?: string }).code ?? "";
  if (!FK_CODES.includes(code) && !deleteError.message?.toLowerCase().includes("foreign")) {
    return Response.json(
      { error: "Cannot delete because there are related records. Remove/reassign them first." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[DELETE /api/admin/profiles] soft delete failed:", updateError);
    return Response.json(
      { error: "Cannot delete because there are related records. Remove/reassign them first." },
      { status: 400 }
    );
  }

  return Response.json({ success: true });
}
