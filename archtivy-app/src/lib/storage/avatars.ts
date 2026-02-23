import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const BUCKET = "avatars";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export type UploadAvatarResult =
  | { data: string; error: null }
  | { data: null; error: string };

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? "jpg";
}

/**
 * Upload an avatar image to Supabase Storage.
 * Path: users/{profileId}/avatar.{ext}
 * Returns public URL on success.
 */
export async function uploadAvatar(
  profileId: string,
  file: File
): Promise<UploadAvatarResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      data: null,
      error: `Invalid type: ${file.type}. Use JPEG, PNG, WebP or GIF.`,
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { data: null, error: "Image must be under 2MB." };
  }

  const supabase = getSupabaseServiceClient();
  const ext = getExtension(file.type);
  const path = `users/${profileId}/avatar.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { data: publicUrl, error: null };
}

/**
 * Delete avatar from Supabase Storage.
 * Removes users/{profileId}/avatar.* files (any extension).
 */
export async function deleteAvatar(
  profileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServiceClient();
  const prefix = `users/${profileId}/`;

  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(`users/${profileId}`);
  if (listError) {
    return { ok: true };
  }
  if (files && files.length > 0) {
    const toDelete = files.map((f) => `${prefix}${f.name}`);
    const { error } = await supabase.storage.from(BUCKET).remove(toDelete);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
