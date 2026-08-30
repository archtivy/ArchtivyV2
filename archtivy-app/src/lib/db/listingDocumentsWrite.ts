/**
 * Persist multi-file uploads to listing_documents.
 * Source of truth: listing_documents.
 * When files are provided: delete existing rows for listing_id, then insert new.
 * When files empty: do nothing (preserve existing).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "listing_documents";

export type FileToPersist = {
  url: string;
  name: string;
  mime?: string;
  size?: number;
  storage_path?: string | null;
};

export async function persistListingDocuments(
  listingId: string,
  files: FileToPersist[]
): Promise<{ error: string | null }> {
  if (files.length === 0) return { error: null };

  const client = getSupabaseServiceClient();

  const { error: delErr } = await client.from(TABLE).delete().eq("listing_id", listingId);
  if (delErr) return { error: delErr.message };

  const rows = files.map((f, i) => ({
    listing_id: listingId,
    file_url: f.url,
    file_name: f.name || (f.url ? f.url.split("/").pop() ?? "File" : "File"),
    file_type: f.mime ?? null,
    // size_bytes was in FileToPersist and passed by all three call sites, but
    // never made it into the INSERT — which is why the column is NULL on all
    // 61 existing rows and why a backfill from storage metadata was needed at
    // all. Writing it here stops the column going stale again.
    size_bytes: typeof f.size === "number" && f.size > 0 ? f.size : null,
    storage_path: f.storage_path ?? null,
    sort_order: i,
  }));

  const { error: insErr } = await client.from(TABLE).insert(rows);
  if (insErr) return { error: insErr.message };
  return { error: null };
}
