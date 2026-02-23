import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { ListingDocument } from "@/lib/types/listings";

const TABLE = "listing_documents";
const DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOCS_BUCKET?.trim() || "listing-documents";
const LEGACY_BUCKET = "documents";

/** Derive storage path from public file_url (e.g. .../object/public/documents/listingId/uuid.pdf -> listingId/uuid.pdf). */
export function storagePathFromFileUrl(fileUrl: string): string | null {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bucket = esc(DOCUMENTS_BUCKET);
  const legacy = esc(LEGACY_BUCKET);
  const match =
    fileUrl.match(new RegExp(`/object/public/${bucket}/(.+)$`)) ??
    fileUrl.match(new RegExp(`/object/public/${legacy}/(.+)$`));
  return match ? match[1] : null;
}

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface DocumentInsert {
  file_url: string;
  file_name: string;
  file_type: string;
  storage_path?: string | null;
}

/**
 * Add document records for a listing. sort_order 0, 1, 2, ...
 * Uses service client so inserts work from server actions (e.g. admin upload).
 */
export async function addDocuments(
  listingId: string,
  docs: DocumentInsert[]
): Promise<DbResult<number>> {
  if (docs.length === 0) {
    return { data: 0, error: null };
  }
  const rows = docs.map((d, i) => ({
    listing_id: listingId,
    file_name: d.file_name,
    file_url: d.file_url,
    file_type: d.file_type ?? null,
    storage_path: d.storage_path ?? null,
    sort_order: i,
  }));
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from(TABLE)
    .insert(rows)
    .select("id");

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data?.length ?? 0, error: null };
}

/**
 * Get all documents for a listing, ordered by sort_order.
 * Includes storage_path and preview_image_path when present.
 */
export async function getDocumentsByListingId(
  listingId: string
): Promise<DbResult<ListingDocument[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, listing_id, file_url, file_name, file_type, sort_order, created_at, storage_path")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data ?? []) as ListingDocument[], error: null };
}

/** Alias for getDocumentsByListingId. */
export const getListingDocuments = getDocumentsByListingId;

/**
 * Get a single document by id and optional listingId (for ownership check).
 * Uses service client for use in API routes.
 */
export async function getDocumentById(
  docId: string,
  listingId?: string
): Promise<DbResult<ListingDocument | null>> {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from(TABLE)
    .select("id, listing_id, file_url, file_name, file_type, sort_order, created_at, storage_path, mime_type, size_bytes, preview_image_path")
    .eq("id", docId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  const doc = data as ListingDocument | null;
  if (!doc) {
    return { data: null, error: null };
  }
  if (listingId != null && doc.listing_id !== listingId) {
    return { data: null, error: "Document does not belong to this listing." };
  }
  return { data: doc, error: null };
}

/** Resolve storage path for a document (storage_path column or derived from file_url). */
export function getDocumentStoragePath(doc: ListingDocument): string | null {
  if (doc.storage_path?.trim()) {
    return doc.storage_path.trim();
  }
  return storagePathFromFileUrl(doc.file_url);
}

/**
 * Get all documents for a listing (server-side). Use in RSC/API.
 * Uses service client so it works without RLS.
 * Order: sort_order asc, then created_at desc for stable ordering.
 */
export async function getListingDocumentsServer(
  listingId: string
): Promise<DbResult<ListingDocument[]>> {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from(TABLE)
    .select("id, listing_id, file_url, file_name, file_type, sort_order, created_at, storage_path, mime_type, size_bytes, preview_image_path")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data ?? []) as ListingDocument[], error: null };
}
