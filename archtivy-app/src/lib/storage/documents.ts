import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOCS_BUCKET?.trim() || "listing-documents";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
  "application/zip",
] as const;

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export type DocumentUploadResult =
  | { data: { url: string; fileName: string; fileType: string }; error: null }
  | { data: null; error: string };

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/zip": "zip",
  };
  return map[mime] ?? "bin";
}

/**
 * Upload a single document (PDF, DOCX, PPTX, ZIP) for a listing.
 * Path: {listingId}/{uuid}.{ext}
 * Returns public URL, original file name, and file type on success.
 */
export async function uploadListingDocument(
  listingId: string,
  file: File
): Promise<DocumentUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return {
      data: null,
      error: `Invalid type: ${file.type}. Use PDF, DOCX, PPTX or ZIP.`,
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { data: null, error: "File must be under 20MB." };
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
  return {
    data: {
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
    },
    error: null,
  };
}

/**
 * Upload multiple documents. Returns array of { url, fileName, fileType } in order, or first error.
 */
export async function uploadListingDocuments(
  listingId: string,
  files: File[]
): Promise<
  | { data: Array<{ url: string; fileName: string; fileType: string }>; error: null }
  | { data: null; error: string }
> {
  const results: Array<{ url: string; fileName: string; fileType: string }> = [];
  for (const file of files) {
    const result = await uploadListingDocument(listingId, file);
    if (result.error || result.data == null) {
      return { data: null, error: result.error ?? "Upload failed" };
    }
    results.push(result.data);
  }
  return { data: results, error: null };
}

/**
 * Upload multiple documents using the service client (server-only).
 * Use from server actions so uploads succeed regardless of bucket RLS.
 */
export async function uploadListingDocumentsServer(
  listingId: string,
  files: File[]
): Promise<
  | { data: Array<{ url: string; fileName: string; fileType: string; storagePath: string }>; error: null }
  | { data: null; error: string }
> {
  const client = getSupabaseServiceClient();
  const results: Array<{ url: string; fileName: string; fileType: string; storagePath: string }> = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return { data: null, error: `Invalid type: ${file.type}. Use PDF, DOCX, PPTX or ZIP.` };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { data: null, error: "File must be under 20MB." };
    }
    const ext = getExtension(file.type);
    const name = `${listingId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from(BUCKET).upload(name, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      const msg = error.message ?? "Upload failed";
      if (msg.toLowerCase().includes("bucket not found")) {
        return {
          data: null,
          error: `Bucket not found: ${BUCKET}. Create it in Supabase Storage.`,
        };
      }
      return { data: null, error: msg };
    }
    const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(name);
    // For private buckets, publicUrl is NOT a real access URL; keep it only for legacy display/back-compat.
    const url = publicUrl;
    results.push({ url, fileName: file.name, fileType: file.type, storagePath: name });
  }
  return { data: results, error: null };
}
