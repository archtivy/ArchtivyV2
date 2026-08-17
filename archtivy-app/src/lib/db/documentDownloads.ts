import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Download history — the ledger behind /me/files.
 *
 * Records WHAT was downloaded, never a URL. Signed storage URLs expire in 60
 * seconds, so a stored link would be dead almost immediately; /me/files
 * re-authorises through /api/documents/download on every click, which also
 * means access is re-checked at click time rather than inherited from a past
 * download.
 */

export interface DownloadedFile {
  /** Null once the source document has been deleted. */
  listingDocumentId: string | null;
  listingId: string | null;
  fileName: string;
  listingTitle: string | null;
  downloadedAt: string;
  /** Most recent download of this file, when it has been fetched more than once. */
  downloadCount: number;
  /**
   * False when the document no longer exists, or its listing is gone or no
   * longer public. Drives the "no longer available" state rather than a 404.
   */
  stillAvailable: boolean;
}

/**
 * Record a download. Fire-and-forget from the route's perspective: a failure
 * to log must never block the file itself, so this never throws.
 */
export async function recordDocumentDownload(input: {
  profileId: string;
  listingDocumentId: string;
  listingId: string;
  fileName: string | null;
  listingTitle: string | null;
}): Promise<void> {
  try {
    const sup = getSupabaseServiceClient();
    const { error } = await sup.from("document_downloads").insert({
      profile_id: input.profileId,
      listing_document_id: input.listingDocumentId,
      listing_id: input.listingId,
      file_name: input.fileName,
      listing_title: input.listingTitle,
    });
    if (error) {
      // 42P01 = table missing, i.e. the migration has not been applied yet.
      // Expected until it is, and not worth shouting about on every download.
      if (error.code !== "42P01") {
        console.error("[recordDocumentDownload] insert failed:", error.message);
      }
    }
  } catch (err) {
    console.error("[recordDocumentDownload] threw:", err);
  }
}

/**
 * A profile's downloads, most recent first, collapsed to one row per document.
 *
 * Repeat downloads are kept in the table — they are how you tell a returning
 * user from a one-off — and collapsed here at read time.
 */
export async function getDownloadsForProfile(
  profileId: string,
  limit = 100
): Promise<{ data: DownloadedFile[]; error: string | null; tableMissing: boolean }> {
  const sup = getSupabaseServiceClient();

  const { data, error } = await sup
    .from("document_downloads")
    .select("listing_document_id, listing_id, file_name, listing_title, downloaded_at")
    .eq("profile_id", profileId)
    .order("downloaded_at", { ascending: false })
    .limit(limit * 3); // headroom for collapsing repeats

  if (error) {
    if (error.code === "42P01") {
      return { data: [], error: null, tableMissing: true };
    }
    return { data: [], error: error.message, tableMissing: false };
  }

  type Row = {
    listing_document_id: string | null;
    listing_id: string | null;
    file_name: string | null;
    listing_title: string | null;
    downloaded_at: string;
  };
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return { data: [], error: null, tableMissing: false };

  // Which documents still exist AND still belong to a visible listing.
  const docIds = Array.from(
    new Set(rows.map((r) => r.listing_document_id).filter((v): v is string => !!v))
  );

  const liveDocIds = new Set<string>();
  if (docIds.length > 0) {
    const { data: docs } = await sup
      .from("listing_documents")
      .select("id, listing_id")
      .in("id", docIds);

    const found = (docs ?? []) as { id: string; listing_id: string }[];
    const listingIds = Array.from(new Set(found.map((d) => d.listing_id)));

    // A document whose listing was deleted or unpublished is not re-downloadable
    // either — checking the document alone would show a live link to a file the
    // route will refuse.
    const visibleListings = new Set<string>();
    if (listingIds.length > 0) {
      const { data: listings } = await sup
        .from("listings")
        .select("id")
        .in("id", listingIds)
        .eq("status", "APPROVED")
        .is("deleted_at", null);
      for (const l of (listings ?? []) as { id: string }[]) visibleListings.add(l.id);
    }

    for (const d of found) {
      if (visibleListings.has(d.listing_id)) liveDocIds.add(d.id);
    }
  }

  // Collapse to one entry per document, keeping the newest timestamp.
  const byDoc = new Map<string, DownloadedFile>();
  for (const r of rows) {
    // Deleted documents have a null id and cannot be grouped by it; the
    // denormalised name keeps them distinguishable.
    const key = r.listing_document_id ?? `deleted:${r.file_name ?? "unknown"}`;
    const existing = byDoc.get(key);
    if (existing) {
      existing.downloadCount += 1;
      continue;
    }
    byDoc.set(key, {
      listingDocumentId: r.listing_document_id,
      listingId: r.listing_id,
      fileName: r.file_name?.trim() || "Untitled file",
      listingTitle: r.listing_title,
      downloadedAt: r.downloaded_at,
      downloadCount: 1,
      stillAvailable: !!r.listing_document_id && liveDocIds.has(r.listing_document_id),
    });
  }

  return {
    data: Array.from(byDoc.values()).slice(0, limit),
    error: null,
    tableMissing: false,
  };
}
