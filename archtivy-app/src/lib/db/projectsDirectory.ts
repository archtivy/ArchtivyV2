/**
 * Data layer for the /projects directory.
 *
 * Everything the page needs in ONE cached entry: the project rows plus the
 * facet vocabularies derived from them. Facets are computed from the real rows
 * rather than declared up front, which is what makes the "omit rather than
 * fabricate" rule enforceable — a facet with no data cannot appear, because
 * nothing generates it.
 *
 * Measured against production 2026-08-02 (50 approved projects):
 *   location        20 countries          -> rendered
 *   building type    8 taxonomy roots     -> rendered
 *   project type     4 intervention types -> rendered (5 projects)
 *   style            3 values             -> rendered (15 projects)
 *   year        2009-2030, 50/50          -> rendered
 *   area        42/50 populated, ft²      -> rendered
 *   materials        8 values             -> rendered (7 projects)
 *   brands used      0                    -> OMITTED
 *   sustainability   0 project facets     -> OMITTED
 *   awards           no column exists     -> OMITTED
 */

import { unstable_cache } from "next/cache";
import { getCardBadgeCounts, getCreditCounts } from "@/lib/db/cardBadgeCounts";
import { toOwner, type OwnerProfileRow } from "@/lib/db/toOwner";
import { getOwnerProfileHref } from "@/lib/cardUtils";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export interface DirectoryProject {
  id: string;
  slug: string | null;
  title: string;
  href: string;
  cover: string | null;
  imageCount: number;
  locationText: string | null;
  country: string | null;
  architect: string | null;
  architectAvatar: string | null;
  /** Profile URL for the owning studio, or null when it has no public page. */
  architectHref: string | null;
  /** Shared-card badge: linked products and the distinct brands behind them. */
  badge: { related: number; owners: number };
  /** Profile-linked credits, for the card's connections row. */
  creditCount: number;
  /** Primary project-taxonomy root, e.g. "residential". */
  buildingType: string | null;
  buildingTypeLabel: string | null;
  /** intervention_type slugs, e.g. ["renovation","restoration"]. */
  projectTypes: string[];
  /** style slugs, e.g. ["contemporary"]. */
  styles: string[];
  materials: string[];
  year: number | null;
  areaSqft: number | null;
  productCount: number;
  /**
   * listings.views_count, written by ListingViewTracker on the detail page.
   * Real and non-zero on 21 of 53 projects, which is what makes the
   * "Most Viewed" tab a ranking rather than a column of zeroes.
   */
  viewsCount: number;
  createdAt: string;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface DirectoryFacets {
  locations: FacetValue[];
  buildingTypes: FacetValue[];
  projectTypes: FacetValue[];
  styles: FacetValue[];
  materials: FacetValue[];
  /** null when no project carries a year. */
  yearRange: { min: number; max: number; histogram: { year: number; count: number }[] } | null;
  /** null when no project carries a usable area. */
  areaRange: { min: number; max: number } | null;
  projectsWithProducts: number;
}

export interface ProjectsDirectoryData {
  projects: DirectoryProject[];
  facets: DirectoryFacets;
  total: number;
}

function titleize(slug: string): string {
  return slug
    .split(/[-/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tally(values: (string | null)[], labels?: Record<string, string>): FacetValue[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labels?.[value] ?? titleize(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function fetchProjectsDirectory(): Promise<ProjectsDirectoryData> {
  const sup = getSupabaseServiceClient();

  const { data: rows } = await sup
    .from("listings")
    .select(
      "id, slug, title, cover_image_url, location, location_country, location_city, year, area_sqft, views_count, created_at, taxonomy_node_id, owner_profile_id, owner_clerk_user_id"
    )
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const listings = (rows ?? []) as Record<string, unknown>[];
  if (listings.length === 0) {
    return {
      projects: [],
      facets: {
        locations: [],
        buildingTypes: [],
        projectTypes: [],
        styles: [],
        materials: [],
        yearRange: null,
        areaRange: null,
        projectsWithProducts: 0,
      },
      total: 0,
    };
  }

  const ids = listings.map((l) => String(l.id));

  const [imagesRes, taxRes, matRes, prodRes, badgeCounts, creditCounts, profRes] = await Promise.all([
    sup.from("listing_images").select("listing_id").in("listing_id", ids),
    sup
      .from("listing_taxonomy_node")
      .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path, label)")
      .in("listing_id", ids),
    // NOT an embedded select. project_material_links has NO foreign key
    // constraints (verified against production), and PostgREST can only embed
    // across a declared FK — `materials:material_id(name)` returns rows with no
    // embedded object and no error, so the Materials facet silently vanishes.
    // Resolved with an explicit second lookup below instead.
    sup.from("project_material_links").select("project_id, material_id").in("project_id", ids),
    sup.from("project_product_links").select("project_id").in("project_id", ids),
    // Badge and credit counts, batched exactly as the canonical fetchers do —
    // two queries for the whole page, never one per card. This directory has
    // its own fetcher rather than going through getProjectsCanonical, which is
    // why the shared card rendered here without a badge until now.
    getCardBadgeCounts(ids, "project"),
    getCreditCounts(ids),
    sup
      .from("profiles")
      // username so the card can link to /u/{username}; without it
      // getOwnerProfileHref falls back to the noindexed /u/id/{uuid} form.
      .select("id, display_name, username, avatar_url")
      .in(
        "id",
        Array.from(
          new Set(listings.map((l) => l.owner_profile_id).filter(Boolean) as string[])
        )
      ),
  ]);

  const imageCounts = new Map<string, number>();
  for (const r of (imagesRes.data ?? []) as { listing_id: string }[]) {
    imageCounts.set(r.listing_id, (imageCounts.get(r.listing_id) ?? 0) + 1);
  }

  const productCounts = new Map<string, number>();
  for (const r of (prodRes.data ?? []) as { project_id: string }[]) {
    productCounts.set(r.project_id, (productCounts.get(r.project_id) ?? 0) + 1);
  }

  // PostgREST types an embedded to-one relation as an array even though the
  // runtime value is a single object. Normalise rather than cast, so this keeps
  // working whichever shape supabase-js hands back.
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const matLinks = (matRes.data ?? []) as { project_id: string; material_id: string }[];
  const materialNames = new Map<string, string>();
  const materialIds = Array.from(new Set(matLinks.map((r) => r.material_id).filter(Boolean)));
  if (materialIds.length > 0) {
    const { data: mats } = await sup
      .from("materials")
      .select("id, name")
      .in("id", materialIds);
    for (const m of (mats ?? []) as { id: string; name: string }[]) {
      materialNames.set(m.id, m.name);
    }
  }

  const materialsBy = new Map<string, string[]>();
  for (const r of matLinks) {
    const name = materialNames.get(r.material_id);
    if (!name) continue;
    const list = materialsBy.get(r.project_id) ?? [];
    list.push(name);
    materialsBy.set(r.project_id, list);
  }

  const buildingBy = new Map<string, { root: string; label: string }>();
  const stylesBy = new Map<string, string[]>();
  const interventionsBy = new Map<string, string[]>();
  type TaxNode = { domain: string; slug_path: string; label: string };
  for (const r of (taxRes.data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: TaxNode | TaxNode[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n) continue;
    if (n.domain === "project") {
      const root = n.slug_path.split("/")[0];
      // Primary wins; otherwise first seen.
      if (r.is_primary || !buildingBy.has(r.listing_id)) {
        buildingBy.set(r.listing_id, { root, label: titleize(root) });
      }
    } else if (n.domain === "style") {
      const list = stylesBy.get(r.listing_id) ?? [];
      list.push(n.slug_path);
      stylesBy.set(r.listing_id, list);
    } else if (n.domain === "intervention_type") {
      const list = interventionsBy.get(r.listing_id) ?? [];
      list.push(n.slug_path);
      interventionsBy.set(r.listing_id, list);
    }
  }

  const profiles = new Map<string, OwnerProfileRow>();
  for (const p of (profRes.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[]) {
    profiles.set(p.id, {
      id: p.id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
    });
  }

  const projects: DirectoryProject[] = listings.map((l) => {
    const id = String(l.id);
    const owner = l.owner_profile_id ? profiles.get(String(l.owner_profile_id)) : undefined;
    const building = buildingBy.get(id) ?? null;
    const slug = (l.slug as string | null) ?? null;
    return {
      id,
      slug,
      title: String(l.title ?? "Untitled"),
      // Taxonomy-aware URL is resolved by the caller via getListingUrl; the
      // simple form is enough here because the archive route 308s to canonical.
      href: `/projects/${slug ?? id}`,
      cover: (l.cover_image_url as string | null) ?? null,
      imageCount: imageCounts.get(id) ?? 0,
      // City when we have one, else country alone — never the raw free-text
      // address, which rendered as "Residential · London, Greater London,
      // England, United Kingdom" and was cut off by CSS. Same rule as
      // getCityLabel so the directory and the canonical card paths agree.
      locationText:
        ((l.location_city as string | null)?.trim() ||
          (l.location_country as string | null)?.trim() ||
          null),
      country: (l.location_country as string | null) ?? null,
      architect: owner?.display_name ?? null,
      architectAvatar: owner?.avatar_url ?? null,
      // Same resolver the canonical layer uses, so the directory and explore
      // agree on what an owner is and where it links.
      architectHref: getOwnerProfileHref(toOwner(owner ?? null)),
      badge: badgeCounts[id] ?? { related: 0, owners: 0 },
      creditCount: creditCounts[id] ?? 0,
      buildingType: building?.root ?? null,
      buildingTypeLabel: building?.label ?? null,
      projectTypes: interventionsBy.get(id) ?? [],
      styles: stylesBy.get(id) ?? [],
      materials: materialsBy.get(id) ?? [],
      year: (l.year as number | null) ?? null,
      areaSqft: (l.area_sqft as number | null) ?? null,
      productCount: productCounts.get(id) ?? 0,
      viewsCount: (l.views_count as number | null) ?? 0,
      createdAt: String(l.created_at),
    };
  });

  // ── Facets, derived strictly from the rows above ──────────────────────────
  const years = projects.map((p) => p.year).filter((y): y is number => typeof y === "number");
  const histMap = new Map<number, number>();
  for (const y of years) histMap.set(y, (histMap.get(y) ?? 0) + 1);

  // Areas: 4 rows carry a placeholder value of 1 and 2 more are under 100.
  // The range is computed from plausible values only so the min/max inputs are
  // not anchored to junk; the junk rows are still filterable, just not
  // range-defining.
  const areas = projects
    .map((p) => p.areaSqft)
    .filter((a): a is number => typeof a === "number" && a > 100);

  const facets: DirectoryFacets = {
    locations: tally(projects.map((p) => p.country)),
    buildingTypes: tally(projects.map((p) => p.buildingType)),
    projectTypes: tally(projects.flatMap((p) => p.projectTypes)),
    styles: tally(projects.flatMap((p) => p.styles)),
    materials: tally(projects.flatMap((p) => p.materials), Object.create(null)),
    yearRange:
      years.length > 0
        ? {
            min: Math.min(...years),
            max: Math.max(...years),
            histogram: [...histMap.entries()]
              .map(([year, count]) => ({ year, count }))
              .sort((a, b) => a.year - b.year),
          }
        : null,
    areaRange:
      areas.length > 0 ? { min: Math.min(...areas), max: Math.max(...areas) } : null,
    projectsWithProducts: projects.filter((p) => p.productCount > 0).length,
  };

  return { projects, facets, total: projects.length };
}

export const getProjectsDirectory = unstable_cache(
  fetchProjectsDirectory,
  ["projects:directory:v1"],
  { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
);
