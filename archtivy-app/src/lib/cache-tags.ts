/**
 * Cache tag constants for unstable_cache and revalidateTag.
 *
 * Domain tags invalidate all cached queries in that domain:
 *   revalidateTag(CACHE_TAGS.listings) → busts every listing-keyed cache entry
 *   revalidateTag(CACHE_TAGS.profiles) → busts every profile-keyed cache entry
 *   revalidateTag(CACHE_TAGS.explore)  → busts all explore intelligence caches
 *
 * Rule: after any mutation, call revalidateTag for every domain the mutation touches.
 * Also call revalidatePath for the affected routes to purge the client-side Router Cache.
 */
export const CACHE_TAGS = {
  explore: "explore",
  listings: "listings",
  profiles: "profiles",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
