/**
 * The one way to build a document download link.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * listing_documents.file_url is stored in the PUBLIC object form:
 *
 *   https://<project>.supabase.co/storage/v1/object/public/listing-documents/<path>
 *
 * but the `listing-documents` bucket is PRIVATE (public: false). Requesting a
 * /object/public/ URL for a private bucket returns, verbatim:
 *
 *   {"statusCode":"404","error":"Bucket not found","message":"Bucket not found",
 *    "code":"NoSuchBucket"}
 *
 * which is confusing, because the bucket exists and is fine — it is the URL
 * SHAPE that is wrong. Every component that linked straight to file_url was
 * therefore broken, while /api/documents/download worked correctly the whole
 * time (it signs a short-lived URL instead).
 *
 * ── WHY NOT JUST MAKE THE BUCKET PUBLIC ─────────────────────────────────────
 * That would clear the error and silently remove the access gate from all 60
 * documents. The download route requires a signed-in user by design; a public
 * bucket makes every spec sheet, catalogue and CAD file fetchable by anyone
 * with the URL, forever, with no auth and no record. The URLs are guessable
 * from the listing id. Not a fix — a data exposure wearing one.
 *
 * ── WHY NOT REPAIR file_url IN THE DATABASE ─────────────────────────────────
 * Rewriting 60 rows to the /object/sign/ form would not help either: signed
 * URLs expire, so a stored one is dead within a minute. The correct address for
 * a private document is the route that mints a fresh signature per request,
 * which is exactly what this helper points at.
 */

export interface DownloadableDoc {
  id?: string | null;
  listing_id?: string | null;
}

/**
 * API href for a document, or null when it cannot be built.
 *
 * Returns null rather than falling back to file_url. A dead link that reports
 * "Bucket not found" is worse than no link: it looks like the platform is
 * broken rather than like the file is unavailable. Callers render a disabled
 * state instead.
 */
export function documentDownloadHref(
  doc: DownloadableDoc | null | undefined,
  listingIdOverride?: string | null
): string | null {
  const docId = doc?.id?.trim();
  const listingId = (listingIdOverride ?? doc?.listing_id)?.trim();
  if (!docId || !listingId) return null;
  return `/api/documents/download?docId=${encodeURIComponent(
    docId
  )}&listingId=${encodeURIComponent(listingId)}`;
}
