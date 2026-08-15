/**
 * Hero background imagery for the homepage (HeroV2).
 *
 * Deliberately separate from homeHero.ts, which powers the previous 5-cell hero
 * grid and remains available as a backup. That module calls unstable_noStore()
 * to reshuffle on every request, which opts the *entire homepage* out of its
 * `revalidate = 3600` ISR — the homepage currently builds as `ƒ (Dynamic)`.
 *
 * This module uses cache primitives only:
 *   - the candidate pool is wrapped in unstable_cache (1h, listings-tagged)
 *   - rotation is a deterministic hour-bucket index, not Math.random()
 *
 * Net effect: the hero still rotates, but the page stays statically renderable.
 * Reading Date.now() is not a dynamic API in Next.js — the value is captured at
 * (re)generation time, which is exactly the rotation cadence we want.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getListingUrl } from "@/lib/canonical";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";

export interface HeroFeature {
  id: string;
  title: string;
  href: string;
  imageUrl: string;
  /** "City, Country" — empty string when the listing has no location. */
  location: string;
}

/** Candidate pool size. Larger pool = more variety across regenerations. */
const POOL_SIZE = 24;

/** Rotation cadence. Matches the homepage revalidate window. */
const ROTATION_MS = 60 * 60 * 1000;

type HeroRow = {
  id: string;
  slug: string | null;
  title: string | null;
  cover_image_url: string | null;
  location_city: string | null;
  location_country: string | null;
};

async function fetchHeroPool(): Promise<HeroFeature[]> {
  try {
    const sup = getSupabaseServiceClient();
    const { data, error } = await sup
      .from("listings")
      .select("id, slug, title, cover_image_url, location_city, location_country")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .not("cover_image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(POOL_SIZE);

    if (error || !data) return [];

    const rows = data as HeroRow[];
    const usable = rows.filter((r) => sanitizeListingImageUrl(r.cover_image_url));
    if (usable.length === 0) return [];

    const taxMap = await batchResolveTaxonomySlugPaths(usable.map((r) => r.id));

    return usable.map((row) => {
      const slug = row.slug?.trim() || row.id;
      return {
        id: row.id,
        title: row.title?.trim() || "Project",
        href: getListingUrl({
          id: row.id,
          type: "project",
          slug,
          taxonomySlugPath: taxMap.get(row.id) ?? null,
        }),
        imageUrl: sanitizeListingImageUrl(row.cover_image_url) as string,
        location: [row.location_city, row.location_country]
          .map((v) => v?.trim())
          .filter(Boolean)
          .join(", "),
      };
    });
  } catch {
    return [];
  }
}

const getHeroPool = unstable_cache(fetchHeroPool, ["home:hero-pool:v1"], {
  tags: [CACHE_TAGS.listings],
  revalidate: 3600,
});

/**
 * One approved project to use as the hero background, rotating hourly.
 * Returns null when no approved project has a usable cover image, in which case
 * HeroV2 falls back to a flat dark background (no layout shift either way).
 */
export async function getHeroFeature(): Promise<HeroFeature | null> {
  const pool = await getHeroPool();
  if (pool.length === 0) return null;
  const bucket = Math.floor(Date.now() / ROTATION_MS);
  return pool[bucket % pool.length] ?? pool[0];
}
