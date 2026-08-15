import { supabase } from "@/lib/supabaseClient";

/**
 * Article cover upload.
 *
 * Same shape and conventions as lib/storage/documents.ts and avatars.ts —
 * anon client, public bucket, uuid filename, publicUrl returned. The `gallery`
 * bucket is reused rather than adding an eleventh bucket for one entity type;
 * article covers are the same kind of asset as listing gallery images.
 *
 * The URL is stored on articles.cover_image_url as text. There is no `media`
 * table in this database — covers are text URLs everywhere else (listings,
 * profiles), so introducing a Media entity for articles alone would create a
 * second convention rather than follow the existing one. Noted as a deliberate
 * deviation from the technical spec's `coverMediaId`.
 */

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_GALLERY_BUCKET?.trim() || "gallery";
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export type CoverUploadResult = { url: string; error: null } | { url: null; error: string };

export async function uploadArticleCover(file: File): Promise<CoverUploadResult> {
  if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
    return { url: null, error: "Use a JPG, PNG, WebP or AVIF image." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { url: null, error: "Image must be under 8MB." };
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const name = `articles/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, file, { cacheControl: "3600", upsert: false });
  if (error) return { url: null, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return { url: publicUrl, error: null };
}
