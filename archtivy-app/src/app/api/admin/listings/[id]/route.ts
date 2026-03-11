import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { createAuditLog } from "@/lib/db/audit";

async function ensureAdmin(): Promise<
  { ok: true; adminUserId: string } | { ok: false; status: number; body: { error: string } }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, body: { error: "Unauthorized" } };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, status: 401, body: { error: "Profile not found" } };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, status: 403, body: { error: "Forbidden" } };
  return { ok: true, adminUserId: userId };
}

/**
 * DELETE /api/admin/listings/[id]
 * Soft-deletes one listing (project or product): sets deleted_at = now().
 * Admin lists filter with deleted_at is null (see docs/listings-deleted-at-migration.sql).
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
    return Response.json({ error: "Missing listing id" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  try {
    const { error } = await supabase
      .from("listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/admin/listings]", error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.delete",
      entityType: "listing",
      entityId: id,
      metadata: { soft: true },
    });

    // Refresh public feeds that may be cached/ISR'd.
    revalidatePath("/");
    revalidatePath("/explore/projects");
    revalidatePath("/explore/products");
    revalidatePath("/sitemap.xml");

    // Recompute matches after soft-delete (non-blocking, invalidates caches on completion)
    const { data: listing } = await supabase.from("listings").select("type").eq("id", id).single();
    const softDelType = (listing as { type: string } | null)?.type;
    if (softDelType === "product" || softDelType === "project") {
      const { enqueueMatchRecomputation } = await import("@/lib/matches/recompute");
      enqueueMatchRecomputation({
        event: softDelType === "product" ? "product_deleted" : "project_deleted",
        listingId: id,
      });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/listings]", e);
    return Response.json({ error: "Delete failed." }, { status: 500 });
  }
}
