/**
 * MIME string -> the short word people recognise.
 *
 * Lifted verbatim out of lib/db/productDetail.ts, where it was private, so the
 * profile Files view and the product Downloads list cannot drift into two
 * labelling rules for one column. `listing_documents.file_type` holds a MIME
 * string on all 61 rows; `mime_type` and `size_bytes` are NULL on all 61, so
 * format is the only real attribute a document carries beyond its name.
 *
 * Returns null rather than echoing an unrecognised MIME type at the reader:
 * "application/octet-stream" on a button is worse than no label.
 */
export function documentFormat(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const known: Record<string, string> = {
    "application/pdf": "PDF",
    "application/zip": "ZIP",
    "application/x-zip-compressed": "ZIP",
    "image/jpeg": "JPG",
    "image/png": "PNG",
  };
  if (known[mime]) return known[mime];
  const tail = mime.split("/")[1];
  // Only echo a subtype when it is short and wordlike -- never a vendor tree.
  return tail && /^[a-z0-9]{2,4}$/.test(tail) ? tail.toUpperCase() : null;
}
