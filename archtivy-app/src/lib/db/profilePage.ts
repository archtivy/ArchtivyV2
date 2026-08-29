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

import { getCardBadgeCounts, getCreditCounts } from "@/lib/db/cardBadgeCounts";
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
  /* ── Card metadata line ────────────────────────────────────────────────
   * Measured coverage across the 128 approved listings, which is why each
   * piece is nullable and the card omits whatever is missing:
   *   projects  location 51/51 · year 51/51 · area 43/51 · views 11/51
   *   products  location  0/77 · year 26/77 · area  0/77 · views 13/77
   * A product card is therefore often title-only, and that is correct —
   * padding it with "—" would be inventing detail.
   *
   * saves_count is deliberately ABSENT from this type. The column exists but
   * is 0 on all 128 rows, so a save count on a card would be a fabricated
   * zero on every card on the platform. */
  locationText: string | null;
  year: number | null;
  areaSqft: number | null;
  categoryLabel: string | null;
  /** Second half of the taxonomy line, when the primary node has a parent. */
  typeLabel: string | null;
  views: number | null;
  /**
   * Shared-card badge — "Used in N projects / by N studios" on a product,
   * "Used N products / from N brands" on a project — and, for projects, the
   * profile-linked credit count behind the connections row.
   *
   * These are the canonical card's own fields. Without them the same
   * ListingCardShared draws a visibly poorer card here than it does on
   * /projects, which reads as a second card design; the relationship badge is
   * the platform's whole differentiator and is exactly what a profile page
   * should be showing off.
   */
  badge: { related: number; owners: number };
  creditCount: number;
  /** Owner avatar for the card's logo chip. */
  ownerAvatar: string | null;
  /** Archive route for the category, when the taxonomy resolves one. */
  categoryHref: string | null;
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
  /**
   * Hero cover. `profiles` has NO cover/banner column, so this is derived from
   * the profile's own work — first project cover, then first product cover.
   * Null when they have published nothing, and the hero renders flat.
   */
  coverImage: string | null;
}

export const EMPTY_PROFILE_PAGE_DATA: ProfilePageData = {
  projects: [], products: [], brandsUsed: [], seenInProjects: [],
  specifiedBy: [], collaborators: [], styleTags: [], locations: [], documents: [],
  coverImage: null,
};

type ListingRow = {
  id: string; type: string; title: string | null; slug: string | null;
  cover_image_url: string | null; owner_profile_id: string | null;
  location_city: string | null; location_country: string | null;
  location: string | null; year: number | null; area_sqft: number | null;
  views_count: number | null; taxonomy_slug_path?: string | null;
};

// One string literal, not a concatenation: supabase-js infers the row type from
// the literal, and a `+` expression degrades it to GenericStringError[].
const LISTING_COLS =
  "id, type, title, slug, cover_image_url, owner_profile_id, location_city, location_country, location, year, area_sqft, views_count";

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

function toCard(
  r: ListingRow,
  byline: string | null,
  category: { rootLabel: string | null; typeLabel: string } | null = null,
  extras: {
    badge?: { related: number; owners: number };
    credits?: number;
    ownerAvatar?: string | null;
  } = {}
): ProfileListingCard {
  // location_city is set on only 7 of 51 projects while `location` is set on
  // all of them, so the free-text field is the reliable one and the structured
  // pair is the fallback rather than the other way round.
  const structured = [r.location_city, r.location_country].filter(Boolean).join(", ");
  return {
    id: r.id,
    type: r.type === "product" ? "product" : "project",
    title: r.title ?? "Untitled",
    slug: r.slug,
    cover: r.cover_image_url,
    byline,
    taxonomySlugPath: r.taxonomy_slug_path ?? null,
    locationText: r.location?.trim() || structured || null,
    year: r.year ?? null,
    areaSqft: r.area_sqft && r.area_sqft > 0 ? r.area_sqft : null,
    // "Furniture · Bed frame" on a product; the type sits in metaLabel at the
    // render site, so both halves reach the card the way the directory sends
    // them. Falls back to the type alone when the node has no distinct root.
    categoryLabel: category?.rootLabel ?? category?.typeLabel ?? null,
    typeLabel: category?.rootLabel ? category.typeLabel : null,
    views: r.views_count && r.views_count > 0 ? r.views_count : null,
    badge: extras.badge ?? { related: 0, owners: 0 },
    creditCount: extras.credits ?? 0,
    ownerAvatar: extras.ownerAvatar ?? null,
    // Root of the taxonomy path — a link whose text says "Residential" must
    // not land on a narrower archive.
    categoryHref: r.taxonomy_slug_path
      ? `/${r.type === "product" ? "products" : "projects"}/${r.taxonomy_slug_path.split("/")[0]}`
      : null,
  };
}

/** Primary category label per listing, for the card metadata line. */
/**
 * Primary taxonomy label per listing, AND its root's label.
 *
 * The card's first line is "root · type" — "Furniture · Bed frame" — exactly as
 * the products directory renders it. Returning only the primary node's label
 * gave a profile card "Bed frame" with no parent above it, so the same
 * component read differently depending on which page you found the product on.
 * The root label comes from taxonomy_nodes rather than title-casing the slug,
 * because several roots carry punctuation a slug cannot ("Walls, Ceilings &
 * Facades", "Public / Civic").
 */
async function getCategoryLabels(
  listingIds: string[]
): Promise<Map<string, { rootLabel: string | null; typeLabel: string }>> {
  const out = new Map<string, { rootLabel: string | null; typeLabel: string }>();
  if (listingIds.length === 0) return out;
  const { data } = await supa()
    .from("listing_taxonomy_node")
    .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, label, slug_path)")
    .in("listing_id", listingIds);

  type Node = { domain: string; label: string; slug_path: string | null };
  const primary = new Map<string, Node>();
  for (const row of (data ?? []) as unknown as {
    listing_id: string; is_primary: boolean;
    taxonomy_nodes: Node | Node[] | null;
  }[]) {
    const n = Array.isArray(row.taxonomy_nodes) ? row.taxonomy_nodes[0] : row.taxonomy_nodes;
    if (!n?.label) continue;
    if (n.domain !== "project" && n.domain !== "product") continue;
    // First primary wins; otherwise the first node of the right domain.
    if (row.is_primary || !primary.has(row.listing_id)) primary.set(row.listing_id, n);
  }

  const rootPaths = [
    ...new Set(
      [...primary.values()]
        .map((n) => n.slug_path?.split("/")[0])
        .filter(Boolean) as string[]
    ),
  ];
  const rootLabels = new Map<string, string>();
  if (rootPaths.length > 0) {
    const { data: roots } = await supa()
      .from("taxonomy_nodes")
      .select("slug_path, label")
      .in("slug_path", rootPaths);
    for (const r of (roots ?? []) as { slug_path: string; label: string }[]) {
      rootLabels.set(r.slug_path, r.label);
    }
  }

  for (const [id, n] of primary) {
    const root = n.slug_path?.split("/")[0] ?? null;
    const rootLabel = root ? rootLabels.get(root) ?? null : null;
    out.set(id, {
      // When the primary node IS the root, there is no parent to state and the
      // line is the root alone — never "Furniture · Furniture".
      rootLabel: rootLabel && rootLabel !== n.label ? rootLabel : null,
      typeLabel: n.label,
    });
  }
  return out;
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

  /*
   * Batched once for the whole page, never per card: getCardBadgeCounts issues
   * two queries regardless of grid size, and getCreditCounts one. Resolving
   * these per card is the fan-out those helpers exist to prevent.
   */
  const [ownCategories, projectBadges, productBadges, projectCredits, ownerRow] =
    await Promise.all([
      getCategoryLabels(owned.map((l) => l.id)),
      getCardBadgeCounts(projectRows.map((r) => r.id), "project"),
      getCardBadgeCounts(productRows.map((r) => r.id), "product"),
      getCreditCounts(projectRows.map((r) => r.id)),
      supa().from("profiles").select("avatar_url").eq("id", profileId).maybeSingle(),
    ]);

  // Every listing here is owned by the profile being viewed, so the card's logo
  // chip is that profile's own avatar — no per-card owner lookup needed.
  const ownerAvatar = (ownerRow.data as { avatar_url: string | null } | null)?.avatar_url ?? null;

  const projects = projectRows.map((r) =>
    toCard(r, null, ownCategories.get(r.id) ?? null, {
      badge: projectBadges[r.id],
      credits: projectCredits[r.id],
      ownerAvatar,
    })
  );
  const products = productRows.map((r) =>
    toCard(r, null, ownCategories.get(r.id) ?? null, {
      badge: productBadges[r.id],
      ownerAvatar,
    })
  );

  // No cover column on `profiles` — the hero image is the profile's own first
  // piece of work, preferring a project because product shots are often
  // cut-outs on white and read poorly full-bleed.
  const coverImage =
    projectRows.find((r) => r.cover_image_url)?.cover_image_url ??
    productRows.find((r) => r.cover_image_url)?.cover_image_url ??
    null;

  const data: ProfilePageData = { ...EMPTY_PROFILE_PAGE_DATA, projects, products, coverImage };

  if (role === "brand") {
    // Aggregate "Seen in Projects" across the whole catalogue, plus who owns
    // those projects — the two brand-side reverse aggregates.
    const pairs = await getProjectProductPairs({ productIds: productRows.map((p) => p.id) });
    const projectIds = [...new Set(pairs.map((p) => p.projectId))];
    const listings = await getVisibleListings(projectIds);
    const ownerIds = [...listings.values()].map((l) => l.owner_profile_id).filter(Boolean) as string[];
    const owners = await getProfilesByIds(ownerIds);

    const seenCategories = await getCategoryLabels([...listings.keys()]);
    data.seenInProjects = [...listings.values()].map((l) =>
      toCard(
        l,
        l.owner_profile_id ? owners.get(l.owner_profile_id)?.displayName ?? null : null,
        seenCategories.get(l.id) ?? null
      )
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
