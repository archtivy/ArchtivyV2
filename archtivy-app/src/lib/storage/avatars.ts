import { getSupabaseServiceClient } from "@/lib/supabaseServer";

// Bucket must be created in Supabase Dashboard: Storage → New bucket → name "avatars"
const BUCKET = "avatars";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
 * Path: profiles/{profileId}/avatar.{ext}
 * Overwrite allowed (upsert: true).
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
    return { data: null, error: "Image must be under 5MB." };
  }

  const supabase = getSupabaseServiceClient();
  const ext = getExtension(file.type);
  const path = `profiles/${profileId}/avatar.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    const msg = error.message;
    if (/bucket/i.test(msg) && /not found|does not exist|not exist/i.test(msg)) {
      return { data: null, error: "Storage bucket 'avatars' not found in this Supabase project." };
    }
    return { data: null, error: msg };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { data: publicUrl, error: null };
}

/**
 * Delete avatar from Supabase Storage.
 * Removes profiles/{profileId}/avatar.* files (any extension).
 */
export async function deleteAvatar(
  profileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServiceClient();
  const prefix = `profiles/${profileId}/`;

  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(`profiles/${profileId}`);
  if (listError) {
    if (/bucket/i.test(listError.message) && /not found|does not exist|not exist/i.test(listError.message)) {
      return { ok: false, error: "Storage bucket 'avatars' not found in this Supabase project." };
    }
    return { ok: true };
  }
  if (files && files.length > 0) {
    const toDelete = files.map((f) => `${prefix}${f.name}`);
    const { error } = await supabase.storage.from(BUCKET).remove(toDelete);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
