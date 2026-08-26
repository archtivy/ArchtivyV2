/**
 * Popular brands and designers — the section replacing "Deeper Content".
 *
 * The mockup's fifth band was editorial: interviews, features, a magazine.
 * There is no CMS behind any of that (see the note at the top of the homepage),
 * so it is replaced with the two entity types the platform actually has depth
 * in, ranked from existing signals. No new column, no featured flag.
 *
 * ── WHAT "POPULAR" MEANS HERE, AND WHY NOT VIEWS ────────────────────────────
 * Engagement data does not exist: listing_views, listing_saves and bookmarks
 * are all empty, and saves_count is 0 on every listing. Ranking by views would
 * also have put OUR OWN house account first — the `archtivy` profile carries
 * the highest view rollup on the platform (30) purely from internal traffic,
 * with no avatar to show. It is excluded by name below regardless of the sort.
 *
 * So "popular" is derived from contribution and specification instead:
 *
 *   brands    → how many projects specify their products, then catalogue size
 *   designers → how many published projects, then how often they are credited
 *
 * For a brand, being specified in built work is the strongest available signal
 * and the one the product is organised around. Catalogue size alone would rank
 * a large unused catalogue above a small, widely-specified one.
 *
 * ── AVATAR REQUIRED ────────────────────────────────────────────────────────
 * Both rails are visual — a brand logo wall and a designer row. A profile with
 * no avatar renders as an initials block, which is fine inline but leaves a
 * visible hole in a logo wall. Requiring a non-empty avatar_url is a rendering
 * constraint, not a judgement: 14 of the 15 brands that own listings have one,
 * so the filter costs almost nothing.
 *
 * Profiles must also be publicly reachable — username present, not hidden, not
 * deleted — matching the rule getPlatformTotals uses so the homepage never
 * links to a profile the directory will not list.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export interface PopularProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  location: string | null;
  /** Projects specifying this brand's products, or projects published by this designer. */
  primaryCount: number;
  /** Products in catalogue (brands) or credits received (designers). */
  secondaryCount: number;
}

export interface PopularProfiles {
  brands: PopularProfile[];
  designers: PopularProfile[];
}

const EMPTY: PopularProfiles = { brands: [], designers: [] };

/** Our own house account. Not a designer anyone is looking for. */
const EXCLUDED_USERNAMES = new Set(["archtivy"]);

const LIMIT = 12;

async function fetchPopularProfiles(): Promise<PopularProfiles> {
  try {
    const sup = getSupabaseServiceClient();

    const [profilesRes, listingsRes, linksRes, creditsRes] = await Promise.all([
      sup
        .from("profiles")
        .select("id, display_name, username, avatar_url, role, location_city, location_country")
        .in("role", ["brand", "designer"])
        .eq("is_hidden", false)
        .is("deleted_at", null)
        .not("username", "is", null)
        .not("avatar_url", "is", null),
      sup
        .from("listings")
        .select("id, type, owner_profile_id")
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("project_product_links").select("project_id, product_id"),
      sup.from("listing_team_members").select("profile_id").not("profile_id", "is", null),
    ]);
    if (profilesRes.error || listingsRes.error || linksRes.error || creditsRes.error) {
      console.error(
        "[popularProfiles] query failed:",
        profilesRes.error?.message ??
          listingsRes.error?.message ??
          linksRes.error?.message ??
          creditsRes.error?.message
      );
      return EMPTY;
    }

    type ListingRow = { id: string; type: string; owner_profile_id: string | null };
    const listings = (listingsRes.data ?? []) as ListingRow[];
    const listingById = new Map(listings.map((l) => [l.id, l]));

    const productsOwned = new Map<string, number>();
    const projectsOwned = new Map<string, number>();
    for (const l of listings) {
      if (!l.owner_profile_id) continue;
      const target = l.type === "product" ? productsOwned : projectsOwned;
      target.set(l.owner_profile_id, (target.get(l.owner_profile_id) ?? 0) + 1);
    }

    // Brand reach: distinct live projects specifying any product this brand owns.
    // Distinct, so two products from one brand in one project is one project.
    const projectsByBrand = new Map<string, Set<string>>();
    for (const link of (linksRes.data ?? []) as { project_id: string; product_id: string }[]) {
      const product = listingById.get(link.product_id);
      const project = listingById.get(link.project_id);
      if (!product || !project || product.type !== "product" || project.type !== "project") continue;
      if (!product.owner_profile_id) continue;
      const set = projectsByBrand.get(product.owner_profile_id);
      if (set) set.add(link.project_id);
      else projectsByBrand.set(product.owner_profile_id, new Set([link.project_id]));
    }

    const creditsByProfile = new Map<string, number>();
    for (const c of (creditsRes.data ?? []) as { profile_id: string | null }[]) {
      if (!c.profile_id) continue;
      creditsByProfile.set(c.profile_id, (creditsByProfile.get(c.profile_id) ?? 0) + 1);
    }

    type ProfileRow = {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      role: string;
      location_city: string | null;
      location_country: string | null;
    };
    const profiles = ((profilesRes.data ?? []) as ProfileRow[]).filter(
      (p) =>
        p.username &&
        !EXCLUDED_USERNAMES.has(p.username) &&
        // `.not("avatar_url","is",null)` does not exclude the empty string.
        (p.avatar_url ?? "").trim().length > 0
    );

    const shape = (p: ProfileRow, primary: number, secondary: number): PopularProfile => ({
      id: p.id,
      displayName: p.display_name ?? p.username!,
      username: p.username!,
      avatarUrl: p.avatar_url!,
      location: [p.location_city, p.location_country].filter(Boolean).join(", ") || null,
      primaryCount: primary,
      secondaryCount: secondary,
    });

    const brands = profiles
      .filter((p) => p.role === "brand")
      .map((p) => shape(p, projectsByBrand.get(p.id)?.size ?? 0, productsOwned.get(p.id) ?? 0))
      // A brand with no products has nothing to show behind the logo.
      .filter((b) => b.secondaryCount > 0)
      .sort(
        (a, b) =>
          b.primaryCount - a.primaryCount ||
          b.secondaryCount - a.secondaryCount ||
          a.displayName.localeCompare(b.displayName)
      )
      .slice(0, LIMIT);

    const designers = profiles
      .filter((p) => p.role === "designer")
      .map((p) => shape(p, projectsOwned.get(p.id) ?? 0, creditsByProfile.get(p.id) ?? 0))
      // Same rule: a designer rail is a rail of published work.
      .filter((d) => d.primaryCount > 0)
      .sort(
        (a, b) =>
          b.primaryCount - a.primaryCount ||
          b.secondaryCount - a.secondaryCount ||
          a.displayName.localeCompare(b.displayName)
      )
      .slice(0, LIMIT);

    return { brands, designers };
  } catch (err) {
    console.error("[popularProfiles] unexpected failure:", err);
    return EMPTY;
  }
}

export const getPopularProfiles = unstable_cache(
  fetchPopularProfiles,
  ["home:popular-profiles:v1"],
  { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
);
