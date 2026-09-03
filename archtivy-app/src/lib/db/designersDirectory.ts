/**
 * Designers Index data layer.
 *
 * MEASURED AGAINST PRODUCTION (2026-08-04) — what is real, and what the brief
 * asked for that is not:
 *
 *   role='designer' rows                                          154
 *     - no username (auto-created credit stubs)                   126  EXCLUDED
 *     - is_hidden                                                   1  EXCLUDED
 *     - deleted_at set                                              3  EXCLUDED
 *     = listable                                                   24
 *
 * The 126 username-less rows are stubs auto-created from
 * listing_team_members credits. They carry a display_name and nothing else:
 * 0 locations, 0 bios, 0 websites, 1 discipline, 2 avatars — and their credit
 * titles show most are not designers (Furniture x40, Photographer x29,
 * Structural Engineer x12, General Contractor x9). They are reachable at
 * /u/id/{uuid} but that route is deliberately `noindex` as auto-generated thin
 * content (TECHNICAL_SEO_AUDIT C-7 / P-1), so listing them on a public index
 * would contradict that decision. Hence: excluded, and the header count is 24,
 * not the 153 that getPlatformTotals() used to report.
 *
 *   FACETS
 *   specialty      designer_discipline, 24/27 populated, 3 DISTINCT VALUES
 *                  (Architect, Interior Designer, Product Designer)   -> BUILT
 *   location       17 countries / 24 cities, 1-2 designers each       -> BUILT
 *   practice type  NO FIELD EXISTS. brand_type and reader_type are
 *                  null for every designer row                        -> OMITTED
 *   project count  real and queryable, but the distribution is
 *                  17 designers at 1-8 projects and 7 at zero. A range
 *                  slider over 0-8 is false precision, so this is a
 *                  single "has published projects" checkbox plus a
 *                  "Most Projects" sort                               -> BUILT (reduced)
 *
 *   SORTS  no relevance signal exists — listing_views is empty,
 *          profile_views does not exist, and `follows` has 8 rows platform-wide.
 *          So no "Most Relevant" option. Real sorts only: projects, A-Z, recent.
 *
 *   CARD IMAGE  no portrait photography exists, so each card uses a real cover
 *               image from one of that designer's own real projects. 17 of 24
 *               have one; the other 7 render on the flat stone block already
 *               built into EntityCard — no placeholder graphic, no stock photo.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { FacetValue } from "@/components/directory/FilterPrimitives";
import { renderableImageUrl } from "@/lib/images/remoteAllowed";

export interface DirectoryDesigner {
  id: string;
  href: string;
  name: string;
  /** Raw designer_discipline — doubles as the Specialty filter value. */
  discipline: string | null;
  city: string | null;
  country: string | null;
  /** "Copenhagen, Denmark" — whichever parts exist. */
  locationText: string | null;
  /** Cover of one of this designer's own projects. Null for the 7 with none. */
  cover: string | null;
  /** Title of the project the cover came from, for the image alt/credit. */
  coverProject: string | null;
  avatarUrl: string | null;
  projectCount: number;
  createdAt: string;
}

export interface DesignerFacets {
  specialties: FacetValue[];
  countries: FacetValue[];
  /** Designers with >= 1 approved project. Backs the single count filter. */
  withProjectsCount: number;
}

export interface DesignersDirectory {
  designers: DirectoryDesigner[];
  facets: DesignerFacets;
  total: number;
}

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  designer_discipline: string | null;
  location_city: string | null;
  location_country: string | null;
  avatar_url: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  title: string | null;
  owner_profile_id: string | null;
  cover_image_url: string | null;
  created_at: string;
};

type TeamRow = { listing_id: string; profile_id: string | null };

function byCountDesc(a: FacetValue, b: FacetValue) {
  return b.count - a.count || a.label.localeCompare(b.label);
}

async function fetchDesignersDirectory(): Promise<DesignersDirectory> {
  const sup = getSupabaseServiceClient();

  // ── 1. Listable designers ────────────────────────────────────────────────
  // deleted_at IS NULL matters: three soft-deleted profiles are live in the old
  // /explore/designers today because getProfileDirectoryByRole omits this
  // predicate. One of them (faulkner-architects) still owns 7 approved projects.
  const { data: profileData, error: profileErr } = await sup
    .from("profiles")
    .select(
      "id, username, display_name, designer_discipline, location_city, location_country, avatar_url, created_at"
    )
    .eq("role", "designer")
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .not("username", "is", null);

  if (profileErr) {
    console.error("[designersDirectory] profiles query failed:", profileErr.message);
    return { designers: [], facets: { specialties: [], countries: [], withProjectsCount: 0 }, total: 0 };
  }

  const profiles = (profileData ?? []) as ProfileRow[];
  if (profiles.length === 0) {
    return { designers: [], facets: { specialties: [], countries: [], withProjectsCount: 0 }, total: 0 };
  }

  // ── 2. Approved projects + the team join ────────────────────────────────
  // Two paths to "this designer's project": they own the listing, or they are
  // credited on it via listing_team_members — the same join Project Detail's
  // Team tab reads. Owner-only accounts for every designer today (team-only: 0),
  // but the union means a credited-but-not-owning studio appears the moment one
  // exists, with no code change.
  const { data: projectData, error: projectErr } = await sup
    .from("listings")
    .select("id, title, owner_profile_id, cover_image_url, created_at")
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (projectErr) {
    console.error("[designersDirectory] listings query failed:", projectErr.message);
  }

  const projects = (projectData ?? []) as ProjectRow[];
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const profileIds = new Set(profiles.map((p) => p.id));

  const { data: teamData, error: teamErr } = await sup
    .from("listing_team_members")
    .select("listing_id, profile_id")
    .not("profile_id", "is", null);

  if (teamErr) {
    console.error("[designersDirectory] team query failed:", teamErr.message);
  }

  // profileId -> ordered, de-duplicated project ids
  const byProfile = new Map<string, string[]>();
  const seen = new Map<string, Set<string>>();
  const push = (pid: string, listingId: string) => {
    if (!profileIds.has(pid) || !projectById.has(listingId)) return;
    if (!seen.has(pid)) {
      seen.set(pid, new Set());
      byProfile.set(pid, []);
    }
    if (seen.get(pid)!.has(listingId)) return;
    seen.get(pid)!.add(listingId);
    byProfile.get(pid)!.push(listingId);
  };

  // Owned first, so the newest owned project wins the card image over a
  // project the designer was merely credited on.
  for (const p of projects) if (p.owner_profile_id) push(p.owner_profile_id, p.id);
  for (const t of (teamData ?? []) as TeamRow[]) if (t.profile_id) push(t.profile_id, t.listing_id);

  // ── 3. Assemble ─────────────────────────────────────────────────────────
  const designers: DirectoryDesigner[] = profiles
    .filter((p): p is ProfileRow & { username: string } => Boolean(p.username))
    .map((p) => {
      const ids = byProfile.get(p.id) ?? [];
      const withCover = ids.map((id) => projectById.get(id)).find((l) => l?.cover_image_url);
      const locationText =
        [p.location_city, p.location_country].filter(Boolean).join(", ") || null;

      return {
        id: p.id,
        href: `/u/${encodeURIComponent(p.username)}`,
        name: p.display_name?.trim() || p.username,
        discipline: p.designer_discipline,
        city: p.location_city,
        country: p.location_country,
        locationText,
        /*
         * Guarded at the source. next/image does not degrade on a host that
         * is missing from next.config's remotePatterns — it throws, and in a
         * server component that throw takes the whole route down. Two
         * designer avatars scraped from studio websites (images.squarespace-
         * cdn.com and www.woodsdangaran.com) were doing exactly that, which
         * is why this route returned 500 rather than a page with two blank
         * avatars on it.
         */
        cover: renderableImageUrl(withCover?.cover_image_url),
        coverProject: withCover?.title ?? null,
        avatarUrl: renderableImageUrl(p.avatar_url),
        projectCount: ids.length,
        createdAt: p.created_at,
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));

  // ── 4. Facets, counted off the listable set only ────────────────────────
  const specialtyCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const d of designers) {
    if (d.discipline) specialtyCounts.set(d.discipline, (specialtyCounts.get(d.discipline) ?? 0) + 1);
    if (d.country) countryCounts.set(d.country, (countryCounts.get(d.country) ?? 0) + 1);
  }

  return {
    designers,
    total: designers.length,
    facets: {
      specialties: [...specialtyCounts.entries()]
        .map(([value, count]) => ({ value, label: value, count }))
        .sort(byCountDesc),
      countries: [...countryCounts.entries()]
        .map(([value, count]) => ({ value, label: value, count }))
        .sort(byCountDesc),
      withProjectsCount: designers.filter((d) => d.projectCount > 0).length,
    },
  };
}

export const getDesignersDirectory = unstable_cache(
  fetchDesignersDirectory,
  ["designers:directory:v1"],
  { tags: [CACHE_TAGS.profiles, CACHE_TAGS.listings], revalidate: 3600 }
);
