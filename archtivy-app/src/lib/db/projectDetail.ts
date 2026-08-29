/**
 * Data for the project detail page.
 *
 * Measured against production 2026-08-02 (50 approved projects), which is what
 * decided the tab set:
 *   team         189 rows / 51 projects / 16 roles / 186 profile-linked -> BUILT
 *   products       5 projects have any tagged products                  -> BUILT
 *   drawings      60 documents, ALL on products, 0 on projects          -> per-listing conditional
 *   collections    1 public folder, 5 public items; user save-folders    -> OMITTED
 *   activity      listing_views 0, listing_saves 0, no per-listing feed  -> OMITTED
 *
 * The Drawings tab is rendered only when THIS listing has >= 1 document, so it
 * is invisible today (0/50) and self-activates the moment one is uploaded.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getHotspotsForListing, type ImageHotspot } from "@/lib/db/imageHotspots";

export interface DetailTeamMember {
  id: string;
  name: string;
  role: string | null;
  profileUsername: string | null;
  profileId: string | null;
  avatarUrl: string | null;
}

export interface DetailProduct {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  category: string | null;
  brand: string | null;
}

export interface DetailDocument {
  id: string;
  name: string;
  url: string;
}

export interface DetailRelated {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  architect: string | null;
  imageCount: number;
}

export interface ProjectDetail {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  images: { url: string; alt: string | null; hotspots?: ImageHotspot[] }[];
  location: string | null;
  year: number | null;
  areaSqft: number | null;
  buildingTypeLabel: string | null;
  buildingTypeRoot: string | null;
  styleLabel: string | null;
  architect: string | null;
  architectUsername: string | null;
  architectAvatar: string | null;
  photographer: string | null;
  /** Profile href for the photographer, when that credit is a real profile. */
  photographerHref: string | null;
  /** Split location, for the two filter destinations the explore layer supports. */
  locationCity: string | null;
  locationCountry: string | null;
  /** Full taxonomy path of the building type, for the archive link. */
  buildingTypeSlugPath: string | null;
  /** listings.website — the project's own site. Real on 2 of 53. */
  website: string | null;
  /**
   * Owner profile claim state. Drives the "Claim this Project" card: a project
   * whose studio profile is already claimed has nothing to claim.
   */
  ownerClaimHref: string | null;
  /**
   * Name AND slug. The name is what the row prints; the slug is what
   * /explore/projects?materials= filters on (getProjectIdsByMaterialSlugs),
   * so without it the Materials row can be read but not navigated.
   */
  materials: { name: string; slug: string | null }[];
  team: DetailTeamMember[];
  products: DetailProduct[];
  documents: DetailDocument[];
  related: DetailRelated[];
  /** Plain-language basis for `related`. No similarity score, no AI. */
  relatedReason: string;
  /**
   * Lifecycle and collaboration. Columns existed and the admin form wrote
   * them, but no detail loader ever selected them — so nothing could be shown
   * even when an author had set it.
   */
  projectStatus: string | null;
  collaborationStatus: string | null;
  lookingFor: string[];
}

function titleize(slug: string): string {
  return slug
    .split(/[-/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchProjectDetail(listingId: string): Promise<ProjectDetail | null> {
  const sup = getSupabaseServiceClient();

  const { data: row } = await sup
    .from("listings")
    .select(
      "id, slug, title, description, location, location_city, location_country, year, area_sqft, cover_image_url, owner_profile_id, project_status, project_collaboration_status, project_looking_for, website"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!row) return null;
  const l = row as Record<string, unknown>;

  const [imgRes, teamRes, prodLinkRes, docRes, taxRes, matLinkRes] = await Promise.all([
    sup
      .from("listing_images")
      .select("id, image_url, alt, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup
      .from("listing_team_members")
      .select("id, display_name, title, profile_id, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup.from("project_product_links").select("product_id").eq("project_id", listingId),
    sup
      .from("listing_documents")
      .select("id, file_name, file_url, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup
      .from("listing_taxonomy_node")
      .select("is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path, label)")
      .eq("listing_id", listingId),
    // Explicit two-step: project_material_links has no FK, so PostgREST cannot
    // embed materials across it (see projectsDirectory.ts).
    sup.from("project_material_links").select("material_id").eq("project_id", listingId),
  ]);

  // Public product pins, keyed by listing_image_id. Filtered to
  // verified/official inside getHotspotsForListing — see the note there on why
  // the service-role client makes that filter load-bearing rather than
  // redundant with RLS.
  const hotspotsByImage = await getHotspotsForListing(listingId);

  const images: ProjectDetail["images"] = ((imgRes.data ?? []) as { id: string; image_url: string; alt: string | null }[])
    .filter((i) => i.image_url)
    .map((i) => ({
      url: i.image_url,
      alt: i.alt,
      hotspots: hotspotsByImage[i.id] ?? undefined,
    }));
  // Cover first when it is not already in the gallery. It carries no hotspots:
  // cover_image_url is a bare URL with no listing_images row, so there is no id
  // for a pin to hang off — pins only exist on real gallery rows.
  const cover = (l.cover_image_url as string | null) ?? null;
  if (cover && !images.some((i) => i.url === cover)) {
    images.unshift({ url: cover, alt: null });
  }

  // ── Team + profiles ───────────────────────────────────────────────────────
  const teamRows = (teamRes.data ?? []) as {
    id: string;
    display_name: string | null;
    title: string | null;
    profile_id: string | null;
  }[];

  const profileIds = Array.from(
    new Set(
      [...teamRows.map((t) => t.profile_id), l.owner_profile_id as string | null].filter(
        Boolean
      ) as string[]
    )
  );
  const profiles = new Map<
    string,
    {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      claim_status: string | null;
    }
  >();
  if (profileIds.length > 0) {
    const { data: profs } = await sup
      .from("profiles")
      .select("id, display_name, username, avatar_url, claim_status")
      .in("id", profileIds);
    for (const p of (profs ?? []) as {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      claim_status: string | null;
    }[]) {
      profiles.set(p.id, {
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        claim_status: p.claim_status,
      });
    }
  }

  const team: DetailTeamMember[] = teamRows.map((t) => {
    const prof = t.profile_id ? profiles.get(t.profile_id) : undefined;
    return {
      id: t.id,
      name: t.display_name ?? prof?.display_name ?? "Unnamed",
      role: t.title,
      // Only expose a profile link when a username actually resolves — a link
      // to /u/null would be a 404.
      profileUsername: prof?.username ?? null,
      profileId: t.profile_id,
      avatarUrl: prof?.avatar_url ?? null,
    };
  });

  /*
   * The photographer is a TEAM MEMBER, not a free-text column, so the credit
   * carries a profile id and often a username — which is what makes the row
   * linkable rather than decorative.
   */
  const photographerMember =
    team.find((t) => (t.role ?? "").toLowerCase() === "photographer") ?? null;
  const photographer = photographerMember?.name ?? null;
  const photographerHref = photographerMember
    ? photographerMember.profileUsername
      ? `/u/${photographerMember.profileUsername}`
      : photographerMember.profileId
        ? `/u/id/${photographerMember.profileId}`
        : null
    : null;

  // ── Products ──────────────────────────────────────────────────────────────
  const productIds = ((prodLinkRes.data ?? []) as { product_id: string }[]).map(
    (r) => r.product_id
  );
  let products: DetailProduct[] = [];
  if (productIds.length > 0) {
    // NOTE: brand_profile_id lives on the `products` sidecar, NOT on `listings`.
    // Selecting it here returns PostgREST 42703 and nulls the whole result —
    // which silently emptied this panel until it was caught by diffing the
    // rendered page against the measured data. Brand is read from the sidecar
    // below instead.
    const { data: prods, error: prodErr } = await sup
      .from("listings")
      .select("id, slug, title, cover_image_url, category")
      .in("id", productIds)
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    if (prodErr) {
      console.warn("[projectDetail] product lookup failed:", prodErr.message);
    }

    const brandIds = new Map<string, string | null>();
    const { data: sidecars } = await sup
      .from("products")
      .select("id, brand_profile_id")
      .in("id", productIds);
    const brandProfileIds = Array.from(
      new Set(
        ((sidecars ?? []) as { id: string; brand_profile_id: string | null }[])
          .map((s) => s.brand_profile_id)
          .filter(Boolean) as string[]
      )
    );
    const brandNames = new Map<string, string | null>();
    if (brandProfileIds.length > 0) {
      const { data: brands } = await sup
        .from("profiles")
        .select("id, display_name")
        .in("id", brandProfileIds);
      for (const b of (brands ?? []) as { id: string; display_name: string | null }[]) {
        brandNames.set(b.id, b.display_name);
      }
    }
    for (const s of (sidecars ?? []) as { id: string; brand_profile_id: string | null }[]) {
      brandIds.set(s.id, s.brand_profile_id ? brandNames.get(s.brand_profile_id) ?? null : null);
    }

    products = ((prods ?? []) as Record<string, unknown>[]).map((p) => ({
      id: String(p.id),
      title: String(p.title ?? "Untitled"),
      href: `/products/${(p.slug as string) ?? String(p.id)}`,
      cover: (p.cover_image_url as string | null) ?? null,
      category: (p.category as string | null) ?? null,
      brand: brandIds.get(String(p.id)) ?? null,
    }));
  }

  // ── Documents (Drawings tab gate) ─────────────────────────────────────────
  const documents: DetailDocument[] = (
    (docRes.data ?? []) as { id: string; file_name: string | null; file_url: string | null }[]
  )
    .filter((d) => d.file_url)
    .map((d) => ({ id: d.id, name: d.file_name ?? "Document", url: d.file_url as string }));

  // ── Taxonomy ──────────────────────────────────────────────────────────────
  type TaxNode = { domain: string; slug_path: string; label: string };
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  let buildingTypeRoot: string | null = null;
  let buildingTypeSlugPath: string | null = null;
  let buildingTypeLabel: string | null = null;
  let styleLabel: string | null = null;
  for (const r of (taxRes.data ?? []) as unknown as {
    is_primary: boolean;
    taxonomy_nodes: TaxNode | TaxNode[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n) continue;
    if (n.domain === "project" && (r.is_primary || !buildingTypeRoot)) {
      buildingTypeRoot = n.slug_path.split("/")[0];
      buildingTypeSlugPath = n.slug_path;
      buildingTypeLabel = n.label;
    } else if (n.domain === "style" && !styleLabel) {
      styleLabel = n.label;
    }
  }

  // ── Materials ─────────────────────────────────────────────────────────────
  const materialIds = ((matLinkRes.data ?? []) as { material_id: string }[]).map(
    (r) => r.material_id
  );
  let materials: { name: string; slug: string | null }[] = [];
  if (materialIds.length > 0) {
    const { data: mats } = await sup.from("materials").select("name, slug").in("id", materialIds);
    materials = ((mats ?? []) as { name: string; slug: string | null }[])
      .filter((m) => m.name)
      .map((m) => ({ name: m.name, slug: m.slug ?? null }));
  }

  const ownerProf = l.owner_profile_id
    ? profiles.get(String(l.owner_profile_id))
    : undefined;

  // ── Related ───────────────────────────────────────────────────────────────
  // Simplest REAL signal: same building type, falling back to same architect.
  // No similarity score and no AI is involved, so neither is claimed.
  let related: DetailRelated[] = [];
  let relatedReason = "Related Projects";

  async function hydrateRelated(ids: string[]): Promise<DetailRelated[]> {
    if (ids.length === 0) return [];
    const [{ data: rows }, { data: imgs }] = await Promise.all([
      sup
        .from("listings")
        .select("id, slug, title, cover_image_url, owner_profile_id")
        .in("id", ids),
      sup.from("listing_images").select("listing_id").in("listing_id", ids),
    ]);
    const counts = new Map<string, number>();
    for (const i of (imgs ?? []) as { listing_id: string }[]) {
      counts.set(i.listing_id, (counts.get(i.listing_id) ?? 0) + 1);
    }
    const ownerIds = Array.from(
      new Set(
        ((rows ?? []) as Record<string, unknown>[])
          .map((r) => r.owner_profile_id)
          .filter(Boolean) as string[]
      )
    );
    const owners = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: ps } = await sup
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      for (const p of (ps ?? []) as { id: string; display_name: string | null }[]) {
        owners.set(p.id, p.display_name);
      }
    }
    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? "Untitled"),
      href: `/projects/${(r.slug as string) ?? String(r.id)}`,
      cover: (r.cover_image_url as string | null) ?? null,
      architect: r.owner_profile_id ? owners.get(String(r.owner_profile_id)) ?? null : null,
      imageCount: counts.get(String(r.id)) ?? 0,
    }));
  }

  if (buildingTypeRoot) {
    const { data: sameType } = await sup
      .from("listing_taxonomy_node")
      .select("listing_id, taxonomy_nodes:taxonomy_node_id(domain, slug_path)")
      .neq("listing_id", listingId)
      .limit(400);
    const ids = ((sameType ?? []) as unknown as {
      listing_id: string;
      taxonomy_nodes: { domain: string; slug_path: string } | { domain: string; slug_path: string }[] | null;
    }[])
      .filter((r) => {
        const n = one(r.taxonomy_nodes);
        return n?.domain === "project" && n.slug_path.split("/")[0] === buildingTypeRoot;
      })
      .map((r) => r.listing_id)
      .slice(0, 12);

    const hydrated = await hydrateRelated(ids);
    related = hydrated.slice(0, 4);
    if (related.length > 0) {
      relatedReason = `More ${(buildingTypeLabel ?? buildingTypeRoot).toLowerCase()} projects`;
    }
  }

  if (related.length === 0 && l.owner_profile_id) {
    const { data: sameArchitect } = await sup
      .from("listings")
      .select("id")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .eq("owner_profile_id", l.owner_profile_id as string)
      .neq("id", listingId)
      .limit(4);
    related = await hydrateRelated(((sameArchitect ?? []) as { id: string }[]).map((r) => r.id));
    if (related.length > 0 && ownerProf?.display_name) {
      relatedReason = `More from ${ownerProf.display_name}`;
    }
  }

  return {
    id: String(l.id),
    slug: (l.slug as string | null) ?? null,
    title: String(l.title ?? "Untitled"),
    description: (l.description as string | null) ?? null,
    images,
    location: (l.location as string | null) ?? null,
    year: (l.year as number | null) ?? null,
    areaSqft: (l.area_sqft as number | null) ?? null,
    buildingTypeLabel,
    buildingTypeRoot,
    styleLabel,
    architect: ownerProf?.display_name ?? null,
    architectUsername: ownerProf?.username ?? null,
    architectAvatar: ownerProf?.avatar_url ?? null,
    photographer,
    photographerHref,
    locationCity: (l.location_city as string | null) ?? null,
    locationCountry: (l.location_country as string | null) ?? null,
    buildingTypeSlugPath,
    website: (l.website as string | null) ?? null,
    /*
     * A project is claimable when its studio profile still is. The claim
     * workflow is profile-level -- there is no listing-level claim table -- so
     * this points at the profile route rather than inventing one, and is null
     * once the studio has been claimed, which is when the card disappears.
     */
    ownerClaimHref:
      ownerProf?.claim_status === "unclaimed" && ownerProf?.username
        ? `/u/${ownerProf.username}/claim`
        : ownerProf?.claim_status === "unclaimed" && l.owner_profile_id
          ? `/u/id/${String(l.owner_profile_id)}/claim`
          : null,
    materials,
    team,
    products,
    documents,
    related,
    relatedReason,
    projectStatus: (l.project_status as string | null) ?? null,
    collaborationStatus: (l.project_collaboration_status as string | null) ?? null,
    lookingFor: Array.isArray(l.project_looking_for) ? (l.project_looking_for as string[]) : [],
  };
}

export const getProjectDetail = (listingId: string) =>
  unstable_cache(
    () => fetchProjectDetail(listingId),
    ["project:detail:v1", listingId],
    { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
  )();
