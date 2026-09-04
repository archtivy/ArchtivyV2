import { supabase } from "@/lib/supabaseClient";
import type { UploadedGalleryItem } from "./types";

const BUCKET = "gallery";

/**
 * Upload a single image to Supabase Storage via signed URL.
 *
 * Flow:
 *  1. Request a signed upload URL from our API (tiny JSON, ~200 bytes)
 *  2. Upload the file directly to Supabase (bypasses Vercel's body limit)
 *  3. Return the metadata
 *
 * Throws a user-readable error string on failure.
 */
export async function uploadGalleryImageClient(
  file: File
): Promise<UploadedGalleryItem> {
  // 1. Get signed upload URL from our API
  const res = await fetch("/api/upload/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Upload request failed" }));
    throw new Error(body.error ?? `Upload request failed (${res.status})`);
  }

  const { token, path, publicUrl } = (await res.json()) as {
    token: string;
    path: string;
    fullUploadUrl: string;
    publicUrl: string;
  };

  // 2. Upload file directly to Supabase Storage using the signed token
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  // 3. Return metadata
  return { path, url: publicUrl };
}
