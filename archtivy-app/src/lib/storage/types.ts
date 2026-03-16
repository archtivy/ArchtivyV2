/** Metadata for a gallery image that has been uploaded to Supabase Storage. */
export interface UploadedGalleryItem {
  /** Storage path within the bucket (e.g. "gallery/abc-123.jpg"). */
  path: string;
  /** Public URL for the image. */
  url: string;
  /** Alt text (editable by user). */
  alt?: string;
  /** Caption (editable by user). */
  caption?: string;
}

/** Validates that an unknown value is a well-formed UploadedGalleryItem[]. */
export function parseGalleryJson(raw: unknown): UploadedGalleryItem[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is UploadedGalleryItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as UploadedGalleryItem).path === "string" &&
      typeof (item as UploadedGalleryItem).url === "string" &&
      (item as UploadedGalleryItem).url.trim().length > 0
  );
}
