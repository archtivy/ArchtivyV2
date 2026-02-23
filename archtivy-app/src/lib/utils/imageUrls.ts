/**
 * Image URL helpers for responsive loading and Supabase storage transforms.
 * TODO: When Supabase Image Transformation is enabled, use transform params for cards.
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

/** Card thumbnail width for explore/list views. Never load full-res in cards. */
export const CARD_IMAGE_WIDTH = 400;

/** Detail/hero width for above-the-fold. */
export const HERO_IMAGE_WIDTH = 800;

/**
 * Returns a transformed URL for Supabase storage when transforms are enabled.
 * Currently a no-op; add ?width=N when Supabase Image Transformation is configured.
 */
export function listingImageUrl(
  url: string | null | undefined,
  _options?: { width?: number; quality?: number }
): string | null {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  // TODO: If Supabase Image Transformation is enabled:
  // const separator = url.includes("?") ? "&" : "?";
  // return `${url}${separator}width=${options?.width ?? CARD_IMAGE_WIDTH}`;
  return url.trim();
}
