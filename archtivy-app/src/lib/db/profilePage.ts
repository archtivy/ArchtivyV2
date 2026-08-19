/**
 * Data for the public profile page — both role variants, one loader.
 *
 * ── WHY ONE LOADER FOR TWO PAGE TYPES ───────────────────────────────────────
 * Designers and brands get genuinely different pages, but they resolve from the
 * same three joins (owned listings, product<->project links, team members). A
 * loader per role would duplicate those joins and let them drift; the ROLE
 * decides which parts of the result get rendered, not which queries run.
 *
 * ── THE REVERSE AGGREGATE ───────────────────────────────────────────────────
 * "Seen in Projects" (shipped on the product page) answers: which projects use
 * THIS product. Both profile modules are that same relation read the other way:
 *
 *   brand    -> every project that uses ANY of this brand's products,
 *               plus the designers who own those projects
 *   designer -> every brand whose products appear in THIS designer's projects
 *
 * TWO SOURCES, UNIONED. A project can reference a product two ways:
 *   project_product_links  explicit link           (13 rows)
 *   product_tags           image hotspot pin       (10 rows)
 * Both mean "this project uses this product". Reading only one would silently
 * under-report, so they are unioned and de-duplicated on (project, product).
 * product_tags stores the project as `listing_id` and the product as
 * `tagged_listing_id`; it has no brand column, so the brand is resolved through
 * the product listing's owner_profile_id.
 *
 * ── ZERO-STATE RULE ─────────────────────────────────────────────────────────
 * Every module returns an empty array rather than a placeholder, and the view
 * omits the whole section when empty — the same rule SeenInProjects uses. With
 * 23 link rows platform-wide these modules are empty on almost every profile
 * today, which is expected and is why the empty state matters more than they do.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const supa = () => getSupabaseServiceClient();

export interface ProfileListingCard {
  id: string;
  type: "project" | "product";
  title: string;
  slug: string | null;
  cover: string | null;
  /** Owner display name — the architect on a project, the brand on a product. */
  byline: string | null;
  taxonomySlugPath: string | null;
}

export interface ProfileMiniProfile {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  /** designer_discipline or brand_type, whichever the role implies. */
  label: string | null;
}

export interface ProfileDocument {
  id: string;
  listingId: string;
  fileName: string;
  listingTitle: string;
}

export interface ProfilePageData {
  /** Owned, APPROVED, not deleted. */
  projects: ProfileListingCard[];
  products: ProfileListingCard[];
  /** Designer: brands whose products appear in their projects. */
  brandsUsed: ProfileMiniProfile[];
  /** Brand: projects that use any of their products (aggregate Seen in Projects). */
  seenInProjects: ProfileListingCard[];
  /** Brand: owners of those projects — who specifies this brand. */
  specifiedBy: ProfileMiniProfile[];
  /** Designer: people credited on their listings. */
  collaborators: ProfileMiniProfile[];
  /** Designer: style/discipline nodes across their projects, most frequent first. */
  styleTags: string[];
  /** Designer: distinct cities across their projects. */
  locations: string[];
  /** Brand: downloadable documents across their catalogue. */
  documents: ProfileDocument[];
}

export const EMPTY_PROFILE_PAGE_DATA: ProfilePageData = {
  projects: [], products: [], brandsUsed: [], seenInProjects: [],
  specifiedBy: [], collaborators: [], styleTags: [], locations: [], documents: [],
};

type ListingRow = {
  id: string; type: string; title: string | null; slug: string | null;
  cover_image_url: string | null; owner_profile_id: string | null;
  location_city: string | null; taxonomy_slug_path?: string | null;
};

const LISTING_COLS =
  "id, type, title, slug, cover_image_url, owner_profile_id, location_city";

/** Every (projectId, productId) pair, from both sources, de-duplicated. */
async function getProjectProductPairs(opts: {
  productIds?: string[];
  projectIds?: string[];
}): Promise<{ projectId: string; productId: string }[]> {
  const { productIds, projectIds } = opts;
  if ((productIds && productIds.length === 0) || (projectIds && projectIds.length === 0)) {
    return [];
  }

  let linkQ = supa().from("project_product_links").select("project_id, product_id");
  let tagQ = supa().from("product_tags").select("listing_id, tagged_listing_id");
  if (productIds) {
    linkQ = linkQ.in("product_id", productIds);
    tagQ = tagQ.in("tagged_listing_id", productIds);
  }
  if (projectIds) {
    linkQ = linkQ.in("project_id", projectIds);
    tagQ = tagQ.in("listing_id", projectIds);
  }

  const [links, tags] = await Promise.all([linkQ, tagQ]);

  const seen = new Set<string>();
  const out: { projectId: string; productId: string }[] = [];
  const push = (projectId?: string | null, productId?: string | null) => {
    if (!projectId || !productId) return;
    const k = `${projectId}|${productId}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ projectId, productId });
  };

  for (const r of (links.data ?? []) as { project_id: string; product_id: string }[]) {
    push(r.project_id, r.product_id);
  }
  for (const r of (tags.data ?? []) as { listing_id: string; tagged_listing_id: string }[]) {
    push(r.listing_id, r.tagged_listing_id);
  }
  return out;
}

/** Visible listings by id, keyed by id. Hides drafts and deleted rows. */
async function getVisibleListings(ids: string[]): Promise<Map<string, ListingRow>> {
  const map = new Map<string, ListingRow>();
  if (ids.length === 0) return map;
  const { data } = await supa()
    .from("listings")
    .select(LISTING_COLS)
    .in("id", [...new Set(ids)])
    .eq("status", "APPROVED")
    .is("deleted_at", null);
  for (const r of (data ?? []) as ListingRow[]) map.set(r.id, r);
  return map;
}

async function getProfilesByIds(ids: string[]): Promise<Map<string, ProfileMiniProfile>> {
  const map = new Map<string, ProfileMiniProfile>();
  if (ids.length === 0) return map;
  const { data } = await supa()
    .from("profiles")
    .select("id, display_name, username, avatar_url, role, designer_discipline, brand_type")
    .in("id", [...new Set(ids)])
    .is("deleted_at", null)
    .eq("is_hidden", false);
  for (const p of (data ?? []) as Record<string, unknown>[]) {
    map.set(String(p.id), {
      id: String(p.id),
      displayName: (p.display_name as string) ?? (p.username as string) ?? "Unnamed",
      username: (p.username as string) ?? null,
      avatarUrl: (p.avatar_url as string) ?? null,
      label:
        p.role === "brand"
          ? ((p.brand_type as string) ?? null)
          : ((p.designer_discipline as string) ?? null),
    });
  }
  return map;
}

function toCard(r: ListingRow, byline: string | null): ProfileListingCard {
  return {
    id: r.id,
    type: r.type === "product" ? "product" : "project",
    title: r.title ?? "Untitled",
    slug: r.slug,
    cover: r.cover_image_url,
    byline,
    taxonomySlugPath: r.taxonomy_slug_path ?? null,
  };
}

export async function getProfilePageData(
  profileId: string,
  role: string
): Promise<ProfilePageData> {
  // Owned listings. Drives every other module, so nothing else runs when empty.
  const { data: ownedRaw } = await supa()
    .from("listings")
    .select(LISTING_COLS)
    .eq("owner_profile_id", profileId)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const owned = (ownedRaw ?? []) as ListingRow[];
  const projectRows = owned.filter((l) => l.type === "project");
  const productRows = owned.filter((l) => l.type === "product");

  const projects = projectRows.map((r) => toCard(r, null));
  const products = productRows.map((r) => toCard(r, null));

  const data: ProfilePageData = { ...EMPTY_PROFILE_PAGE_DATA, projects, products };

  if (role === "brand") {
    // Aggregate "Seen in Projects" across the whole catalogue, plus who owns
    // those projects — the two brand-side reverse aggregates.
    const pairs = await getProjectProductPairs({ productIds: productRows.map((p) => p.id) });
    const projectIds = [...new Set(pairs.map((p) => p.projectId))];
    const listings = await getVisibleListings(projectIds);
    const ownerIds = [...listings.values()].map((l) => l.owner_profile_id).filter(Boolean) as string[];
    const owners = await getProfilesByIds(ownerIds);

    data.seenInProjects = [...listings.values()].map((l) =>
      toCard(l, l.owner_profile_id ? owners.get(l.owner_profile_id)?.displayName ?? null : null)
    );
    // A designer appears once however many of this brand's products they used.
    data.specifiedBy = [...new Map(
      ownerIds.map((id) => [id, owners.get(id)]).filter((e): e is [string, ProfileMiniProfile] => !!e[1])
    ).values()];

    if (productRows.length > 0) {
      const { data: docs } = await supa()
        .from("listing_documents")
        .select("id, listing_id, file_name")
        .in("listing_id", productRows.map((p) => p.id))
        .order("sort_order", { ascending: true });
      const titleById = new Map(productRows.map((p) => [p.id, p.title ?? "Untitled"]));
      data.documents = ((docs ?? []) as { id: string; listing_id: string; file_name: string | null }[])
        .map((d) => ({
          id: d.id,
          listingId: d.listing_id,
          fileName: d.file_name ?? "Document",
          listingTitle: titleById.get(d.listing_id) ?? "Untitled",
        }));
    }
    return data;
  }

  if (role === "designer") {
    const projectIds = projectRows.map((p) => p.id);

    // Brands whose products appear in these projects.
    const pairs = await getProjectProductPairs({ projectIds });
    const productListings = await getVisibleListings(pairs.map((p) => p.productId));
    const brandIds = [...productListings.values()]
      .map((l) => l.owner_profile_id)
      .filter(Boolean) as string[];
    const brands = await getProfilesByIds(brandIds);
    data.brandsUsed = [...new Map(
      brandIds.map((id) => [id, brands.get(id)]).filter((e): e is [string, ProfileMiniProfile] => !!e[1])
    ).values()];

    // Cities this practice has built in.
    data.locations = [...new Set(projectRows.map((r) => r.location_city).filter(Boolean) as string[])];

    if (projectIds.length > 0) {
      // Collaborators credited on their listings.
      const { data: team } = await supa()
        .from("listing_team_members")
        .select("profile_id")
        .in("listing_id", [...projectIds, ...productRows.map((p) => p.id)])
        .not("profile_id", "is", null);
      const collabIds = [...new Set(
        ((team ?? []) as { profile_id: string | null }[]).map((t) => t.profile_id).filter(Boolean) as string[]
      )].filter((id) => id !== profileId);
      const collabs = await getProfilesByIds(collabIds);
      data.collaborators = [...collabs.values()];

      // Style/discipline vocabulary, most used first. Style domain only —
      // the project-type domain is the category, not a specialisation.
      const { data: tax } = await supa()
        .from("listing_taxonomy_node")
        .select("taxonomy_node_id, taxonomy_nodes:taxonomy_node_id(domain, label)")
        .in("listing_id", projectIds);
      const counts = new Map<string, number>();
      for (const row of (tax ?? []) as unknown as {
        taxonomy_nodes: { domain: string; label: string } | { domain: string; label: string }[] | null;
      }[]) {
        const n = Array.isArray(row.taxonomy_nodes) ? row.taxonomy_nodes[0] : row.taxonomy_nodes;
        if (!n || n.domain !== "style" || !n.label) continue;
        counts.set(n.label, (counts.get(n.label) ?? 0) + 1);
      }
      data.styleTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
    }
    return data;
  }

  // reader, or any future role: shared skeleton only.
  return { ...EMPTY_PROFILE_PAGE_DATA };
}
