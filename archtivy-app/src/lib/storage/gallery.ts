import { supabase } from "@/lib/supabaseClient";

const BUCKET = "gallery";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type UploadResult =
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
 * Upload a single image to the gallery bucket.
 * Path: {listingId}/{uuid}.{ext}
 * Returns public URL on success.
 */
export async function uploadGalleryImage(
  listingId: string,
  file: File
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      data: null,
      error: `Invalid type: ${file.type}. Use JPEG, PNG, WebP or GIF.`,
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { data: null, error: "Image must be under 5MB." };
  }

  const ext = getExtension(file.type);
  const name = `${listingId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return { data: publicUrl, error: null };
}

/**
 * Upload multiple images. Returns array of public URLs in order, or first error.
 */
export async function uploadGalleryImages(
  listingId: string,
  files: File[]
): Promise<{ data: string[]; error: null } | { data: null; error: string }> {
  const urls: string[] = [];
  for (const file of files) {
    const result = await uploadGalleryImage(listingId, file);
    if (result.error || result.data == null) {
      return { data: null, error: result.error ?? "Upload failed" };
    }
    urls.push(result.data);
  }
  return { data: urls, error: null };
}

/**
 * Server-side upload using service role (for Server Actions).
 * Use this when uploadGalleryImages fails due to RLS/policy (e.g. from createProject).
 */
export async function uploadGalleryImagesServer(
  listingId: string,
  files: File[]
): Promise<{ data: string[]; error: null } | { data: null; error: string }> {
  const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
  const supabase = getSupabaseServiceClient();
  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { data: null, error: `Invalid type: ${file.type}. Use JPEG, PNG, WebP or GIF.` };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { data: null, error: "Image must be under 5MB." };
    }
    const ext = getExtension(file.type);
    const name = `${listingId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) return { data: null, error: error.message };
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(name);
    urls.push(publicUrl);
  }
  return { data: urls, error: null };
}

/**
 * Upload images for a project. Path: projects/{projectId}/{uuid}.{ext}
 */
export async function uploadGalleryImagesForProject(
  projectId: string,
  files: File[]
): Promise<{ data: string[]; error: null } | { data: null; error: string }> {
  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { data: null, error: `Invalid type: ${file.type}. Use JPEG, PNG, WebP or GIF.` };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { data: null, error: "Image must be under 5MB." };
    }
    const ext = getExtension(file.type);
    const name = `projects/${projectId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) return { data: null, error: error.message };
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(name);
    urls.push(publicUrl);
  }
  return { data: urls, error: null };
}

/**
 * Upload images for a product. Path: products/{productId}/{uuid}.{ext}
 */
export async function uploadGalleryImagesForProduct(
  productId: string,
  files: File[]
): Promise<{ data: string[]; error: null } | { data: null; error: string }> {
  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { data: null, error: `Invalid type: ${file.type}. Use JPEG, PNG, WebP or GIF.` };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { data: null, error: "Image must be under 5MB." };
    }
    const ext = getExtension(file.type);
    const name = `products/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) return { data: null, error: error.message };
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(name);
    urls.push(publicUrl);
  }
  return { data: urls, error: null };
}
