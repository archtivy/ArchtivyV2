import { supabase } from "@/lib/supabaseClient";
import { normalizeListingImage } from "./normalizeImage";
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
  /*
   * ── NORMALISE BEFORE THE BYTES LEAVE THE BROWSER ─────────────────────────
   * This is the only point where a listing photograph is still a File we can
   * touch: from here it goes straight to Supabase over a signed URL, never
   * passing through our server, so there is nowhere later to resize it.
   *
   * A 3200px, 1.9MB original costs the image optimiser 3.4–7.9s the first
   * time any visitor asks for it, and that lands on cold LCP. Doing the work
   * once, here, on the uploader's machine, spends a few hundred milliseconds
   * of theirs to save seconds for every reader afterwards.
   *
   * Files already inside budget are passed through untouched — see
   * normalizeImage.ts — so the usual upload is byte-identical to before.
   */
  const normalized = await normalizeListingImage(file);
  const upload = normalized.file;

  // 1. Get signed upload URL from our API
  const res = await fetch("/api/upload/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: upload.name, contentType: upload.type }),
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
    .uploadToSignedUrl(path, token, upload, {
      contentType: upload.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  // 3. Return metadata
  return { path, url: publicUrl };
}
