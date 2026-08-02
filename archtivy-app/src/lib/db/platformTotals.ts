/**
 * Aggregate platform totals for the homepage hero statistics rail.
 *
 * Distinct from getPlatformStats() in platformActivity.ts, which returns
 * *this-week* deltas (projectsThisWeek / productsThisWeek) for the explore
 * header. This module returns lifetime totals.
 *
 * All six queries run in one unstable_cache entry so a homepage render costs
 * zero DB round trips on a cache hit. Tagged with the listings + profiles
 * domain tags, so the existing admin mutation flow
 * (revalidateTag(CACHE_TAGS.listings) / (CACHE_TAGS.profiles)) already busts
 * this cache with no changes to those call sites.
 *
 * Counts use { count: "exact", head: true } — Postgres returns the count in the
 * Content-Range header with no row payload.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export interface PlatformTotals {
  projects: number;
  products: number;
  designers: number;
  brands: number;
  countries: number;
}

/** All-zero fallback so the hero degrades to "no rail" rather than throwing. */
const EMPTY_TOTALS: PlatformTotals = {
  projects: 0,
  products: 0,
  designers: 0,
  brands: 0,
  countries: 0,
};

async function fetchPlatformTotals(): Promise<PlatformTotals> {
  try {
    const sup = getSupabaseServiceClient();

    const [projectsRes, productsRes, designersRes, brandsRes, countriesRes] =
      await Promise.all([
        sup
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("type", "project")
          .eq("status", "APPROVED")
          .is("deleted_at", null),
        sup
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("type", "product")
          .eq("status", "APPROVED")
          .is("deleted_at", null),
        sup
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "designer")
          .eq("is_hidden", false),
        sup
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "brand")
          .eq("is_hidden", false),
        // Supabase JS has no SELECT DISTINCT COUNT; pull the column and reduce.
        // Same approach as getPlatformStats(). Bounded by approved project count.
        sup
          .from("listings")
          .select("location_country")
          .eq("type", "project")
          .eq("status", "APPROVED")
          .is("deleted_at", null)
          .not("location_country", "is", null),
      ]);

    const countryRows = (countriesRes.data ?? []) as {
      location_country: string | null;
    }[];
    const countries = new Set(
      countryRows
        .map((r) => r.location_country?.trim())
        .filter((c): c is string => Boolean(c))
    );

    return {
      projects: projectsRes.count ?? 0,
      products: productsRes.count ?? 0,
      designers: designersRes.count ?? 0,
      brands: brandsRes.count ?? 0,
      countries: countries.size,
    };
  } catch {
    return EMPTY_TOTALS;
  }
}

/**
 * Cached platform totals. 1 hour TTL, matching the homepage `revalidate = 3600`.
 * Uses only cache primitives (no dynamic APIs), so callers stay statically
 * renderable and the homepage keeps its ISR behaviour.
 */
export const getPlatformTotals = unstable_cache(
  fetchPlatformTotals,
  ["home:platform-totals:v1"],
  { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
);
