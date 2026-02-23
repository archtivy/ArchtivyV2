import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { uploadAvatar, deleteAvatar } from "@/lib/storage/avatars";

async function ensureAdmin(): Promise<
  { ok: true } | { ok: false; status: number; body: { error: string } }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, body: { error: "Unauthorized" } };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, status: 403, body: { error: "Forbidden" } };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, status: 403, body: { error: "Forbidden" } };
  return { ok: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return Response.json(admin.body, { status: admin.status });
  }

  const { id: profileId } = await params;
  if (!profileId) {
    return Response.json({ error: "Missing profile id" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Missing file in multipart form-data" }, { status: 400 });
  }

  const result = await uploadAvatar(profileId, file);
  if (result.error || result.data == null) {
    return Response.json({ error: result.error ?? "Upload failed" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: result.data })
    .eq("id", profileId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ url: result.data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return Response.json(admin.body, { status: admin.status });
  }

  const { id: profileId } = await params;
  if (!profileId) {
    return Response.json({ error: "Missing profile id" }, { status: 400 });
  }

  const result = await deleteAvatar(profileId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", profileId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
