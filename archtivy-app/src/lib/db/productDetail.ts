/**
 * Data for the product detail page.
 *
 * Measured against production 2026-08-04 (76 approved products). What exists,
 * and what therefore cannot be rendered:
 *
 *   REVIEWS / RATINGS   no table of any kind        -> omitted platform-wide
 *   Q&A                 no table of any kind        -> omitted platform-wide
 *   VERIFIED PRODUCT    no verification column on
 *                       listings, products OR
 *                       profiles                    -> badge omitted entirely
 *   AFFILIATE           no affiliate table/column   -> disclosure omitted
 *                                                      (a false disclosure is
 *                                                      its own misstatement)
 *   DOWNLOADS           listing_documents, 49/76    -> per-product conditional
 *   PROJECTS FEATURING  project_product_links, 12   -> per-product conditional
 *   BRAND FOLLOWERS     follows.target_type='brand'
 *                       exists but max 1 per brand  -> omitted below 1; see note
 *   DESIGNER            listing_team_members, 38/80 -> per-product row, name
 *                                                    only (the role column is
 *                                                    unusable on products)
 *   COLLECTION          no column, no taxonomy
 *                       domain, no facet; the
 *                       `collections` table is the
 *                       Inspiration saved-query
 *                       construct (1 row), unrelated
 *                       to a brand's product line   -> omitted entirely
 *   MADE IN             no column. listings
 *                       .location_country is null on
 *                       all 80 products, and a
 *                       brand's HQ is not where a
 *                       thing is manufactured       -> omitted entirely
 *   BRAND FOUNDED       no founding-year column on
 *                       profiles at all             -> omitted entirely
 *   DIMENSIONS          listings.dimensions, 15/76  -> per-product row
 *   MATERIALS           18/76 via links             -> per-product row
 *   STYLE               8/76                        -> per-product row
 *   COLOR OPTIONS       only 2 products have >1     -> swatches per-product
 *
 * Brand profiles ARE reachable: every brand has a username and resolves at
 * /u/{username}, so "View Brand Profile" is a real link, not a stub.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getHotspotsForListing, type ImageHotspot } from "@/lib/db/imageHotspots";
import { documentFormat } from "@/lib/documents/format";

export interface ProductDetailDocument {
  id: string;
  name: string;
  url: string;
  /**
   * Short format label -- "PDF", "ZIP" -- derived from listing_documents
   * .file_type, which holds a MIME string. Null when the column is empty.
   *
   * This is the ONLY real attribute the documents carry beyond a name.
   * size_bytes is null on all 60 rows, and there is no colour, finish or
   * document-category column, so the list is flat and labelled by format
   * rather than sorted into folders that nothing backs.
   */
  format: string | null;
}

export interface ProductDetailProject {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  architect: string | null;
}

export interface ProductDetailRelated {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  brand: string | null;
}

/**
 * A design credit on the product, read from `listing_team_members` — the same
 * table and the same three columns Project Detail already reads for its
 * Credits block.
 *
 * NAME ONLY, NO ROLE. The table's `title` column is the role slot, and on
 * project rows it holds real roles (Architect x79, Photographer x29,
 * Structural Engineer x12). On PRODUCT rows the importer wrote the taxonomy
 * CATEGORY into it instead: Furniture x32, Lighting x4, Decorative Elements
 * x3, Textiles x1, and exactly one genuine "Furniture Designer". Rendering it
 * would print "Vincent Van Duysen - Furniture", which is both wrong and a
 * restatement of the Category row directly above. `title` is therefore not
 * selected here at all. Logged as its own data-quality item.
 *
 * `username` is null on 37 of the 38 credited profiles: they are unclaimed
 * credit stubs with no /u/ route, so the row links only where one resolves.
 */
export interface ProductDetailDesigner {
  name: string;
  username: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  images: { url: string; alt: string | null; hotspots?: ImageHotspot[] }[];
  categoryRoot: string | null;
  categoryLabel: string | null;
  typeLabel: string | null;
  styleLabel: string | null;
  materials: string[];
  /** Design credits. 38 of 80 live products carry at least one. */
  designers: ProductDetailDesigner[];
  dimensions: string | null;
  colorOptions: string[];
  year: number | null;
  documents: ProductDetailDocument[];
  projects: ProductDetailProject[];
  related: ProductDetailRelated[];
  /** Plain-language basis for `related`. No score, no AI. */
  relatedReason: string;
  /**
   * The product's OWN website — listings.website, what the publish wizard
   * writes ("https://example.com/products/nena").
   *
   * This column existed and was written on every publish, but was never
   * selected here, so the detail page had no access to it and fell back to
   * showing the brand's homepage under a label promising the product's page.
   */
  website: string | null;
  /** Lifecycle and collaboration — see the note in projectDetail.ts. */
  productStage: string | null;
  collaborationStatus: string | null;
  lookingFor: string[];
  brand: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    location: string | null;
    website: string | null;
    productCount: number;
    /**
     * Projects featuring ANY product by this brand.
     *
     * Was `detail.projects.length` at the call site — projects featuring THIS
     * PRODUCT — rendered under a panel headed "Brand" beside a brand-wide
     * product count. Two different scopes under one heading: Gillis Armchair
     * showed "12 Products / 1 Projects featuring" when the brand-wide figure
     * is 3. The product-scoped number is not lost; it is what the "Seen in
     * Projects" rail lower down the page already lists in full.
     */
    projectsFeaturingCount: number;
    /**
     * Other products by the same brand, for the "More from {brand}" rail.
     *
     * Was a single product, because the rail lived in a one-card-wide sidebar.
     * The rail is now a full-width row below the fold, where one lonely card
     * would read as a rendering failure, so it carries up to four. The ids come
     * from the list already fetched for productCount — no extra query.
     */
    otherProducts: ProductDetailRelated[];
  } | null;
}

function titleize(slug: string): string {
  return slug
    .split(/[-/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchProductDetail(listingId: string): Promise<ProductDetail | null> {
  const sup = getSupabaseServiceClient();

  const { data: row } = await sup
    .from("listings")
    .select(
      "id, slug, title, description, year, dimensions, cover_image_url, owner_profile_id, website, product_stage, product_collaboration_status, product_looking_for"
    )
    .eq("id", listingId)
    .maybeSingle();
  if (!row) return null;
  const l = row as Record<string, unknown>;

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const [imgRes, docRes, taxRes, matLinkRes, projLinkRes, sidecarRes, creditRes] = await Promise.all([
    sup
      .from("listing_images")
      .select("id, image_url, alt, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup
      .from("listing_documents")
      .select("id, file_name, file_url, file_type, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup
      .from("listing_taxonomy_node")
      .select("is_primary, taxonomy_nodes:taxonomy_node_id(id, domain, slug_path, label)")
      .eq("listing_id", listingId),
    sup.from("product_material_links").select("material_id").eq("product_id", listingId),
    sup.from("project_product_links").select("project_id").eq("product_id", listingId),
    // color_options lives on the products sidecar, NOT on listings — selecting
    // it off listings would 42703 and null the whole row.
    sup.from("products").select("subtitle, color_options").eq("id", listingId).maybeSingle(),
    // Design credits. Joins the existing fan-out rather than adding a round
    // trip; `title` is deliberately not selected -- see ProductDetailDesigner.
    sup
      .from("listing_team_members")
      .select("display_name, profile_id, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
  ]);

  // Symmetric with Project Detail. No product currently carries a pin — all 7
  // migrated pins are on projects — but a product photo can be tagged, and
  // wiring only one side would guarantee the other is forgotten.
  const hotspotsByImage = await getHotspotsForListing(listingId);

  const images: ProductDetail["images"] = ((imgRes.data ?? []) as {
    id: string;
    image_url: string;
    alt: string | null;
  }[])
    .filter((i) => i.image_url)
    .map((i) => ({ url: i.image_url, alt: i.alt, hotspots: hotspotsByImage[i.id] ?? undefined }));
  const cover = (l.cover_image_url as string | null) ?? null;
  if (cover && !images.some((i) => i.url === cover)) images.unshift({ url: cover, alt: null });

  const documents: ProductDetailDocument[] = (
    (docRes.data ?? []) as {
      id: string;
      file_name: string | null;
      file_url: string | null;
      file_type: string | null;
    }[]
  )
    .filter((d) => d.file_url)
    .map((d) => ({
      id: d.id,
      name: d.file_name ?? "Document",
      url: d.file_url as string,
      format: documentFormat(d.file_type),
    }));

  type TaxNode = { id: string; domain: string; slug_path: string; label: string };
  let categoryRoot: string | null = null;
  let categoryLabel: string | null = null;
  let typeLabel: string | null = null;
  let styleLabel: string | null = null;
  let primaryNodeId: string | null = null;

  for (const r of (taxRes.data ?? []) as unknown as {
    is_primary: boolean;
    taxonomy_nodes: TaxNode | TaxNode[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n) continue;
    if (n.domain === "product" && (r.is_primary || !categoryRoot)) {
      categoryRoot = n.slug_path.split("/")[0];
      typeLabel = n.label;
      primaryNodeId = n.id ?? null;
    } else if (n.domain === "style" && !styleLabel) {
      styleLabel = n.label;
    }
  }

  /*
   * ── THE ROOT'S REAL LABEL, NOT A TITLE-CASED SLUG ─────────────────────────
   * categoryLabel used to be titleize(categoryRoot) — the slug, word-cased. A
   * slug has no punctuation, so every root whose label carries any was
   * rendered wrong: "walls-ceilings-facades" displayed as
   * "Walls Ceilings Facades" instead of "Walls, Ceilings & Facades", and
   * "landscape-urban" as "Landscape Urban" rather than "Landscape / Urban".
   *
   * It also made the Category/Type duplication undetectable. Both rows are
   * strings, so telling "the same node rendered twice" apart from "a category
   * that happens to read like its type" meant comparing text. Resolving the
   * root node gives an id to compare instead — see rootNodeId below.
   */
  let rootNodeId: string | null = null;
  if (categoryRoot) {
    const { data: rootNode } = await sup
      .from("taxonomy_nodes")
      .select("id, label")
      .eq("domain", "product")
      .eq("slug_path", categoryRoot)
      .maybeSingle();
    const root = rootNode as { id: string; label: string } | null;
    if (root) {
      rootNodeId = root.id;
      categoryLabel = root.label;
    } else {
      // Root missing from the taxonomy (deactivated, or a stale slug_path).
      // Fall back to the old behaviour rather than dropping the row entirely.
      categoryLabel = titleize(categoryRoot);
    }
  }

  /*
   * When the primary node IS the root, "Category" and "Type" are the same node
   * and the detail page printed it twice. Comparing ids rather than labels, so
   * a genuine subcategory that happens to share wording with its parent still
   * shows both rows.
   */
  const typeDuplicatesCategory = Boolean(
    primaryNodeId && rootNodeId && primaryNodeId === rootNodeId
  );
  if (typeDuplicatesCategory) typeLabel = null;

  // Materials: explicit two-step, product_material_links has no FK.
  const materialIds = ((matLinkRes.data ?? []) as { material_id: string }[]).map(
    (r) => r.material_id
  );
  let materials: string[] = [];
  if (materialIds.length > 0) {
    const { data: mats } = await sup.from("materials").select("name").in("id", materialIds);
    materials = ((mats ?? []) as { name: string }[]).map((m) => m.name).filter(Boolean);
  }

  // ── Design credits ───────────────────────────────────────────────────────
  // Two steps rather than a PostgREST embed: the credit rows are the source of
  // truth for the NAME (display_name is set on every row, including for
  // profiles that are bare stubs), and profiles is consulted only to find out
  // whether that person has a reachable page.
  const creditRows = ((creditRes.data ?? []) as {
    display_name: string | null;
    profile_id: string | null;
  }[]).filter((r) => r.display_name?.trim());

  let designers: ProductDetailDesigner[] = [];
  if (creditRows.length > 0) {
    const creditProfileIds = Array.from(
      new Set(creditRows.map((r) => r.profile_id).filter(Boolean) as string[])
    );
    const usernames = new Map<string, string | null>();
    if (creditProfileIds.length > 0) {
      const { data: cps } = await sup
        .from("profiles")
        .select("id, username")
        .in("id", creditProfileIds);
      for (const cp of (cps ?? []) as { id: string; username: string | null }[]) {
        usernames.set(cp.id, cp.username);
      }
    }
    designers = creditRows.map((r) => ({
      name: (r.display_name as string).trim(),
      username: r.profile_id ? usernames.get(r.profile_id) ?? null : null,
    }));
  }

  const sidecar = (sidecarRes.data ?? null) as {
    subtitle: string | null;
    color_options: string[] | null;
  } | null;

  /*
   * products.subtitle is byte-identical to listings.description on ALL 76
   * approved products — it is a copy, not a short summary. Rendering it as the
   * reference's one-line intro would print the entire description twice on
   * every product page.
   *
   * Suppressed when it matches the description, rather than dropped outright,
   * so a genuine subtitle added later still shows. There is no real
   * short-description field, so the header simply has no intro line for now.
   */
  const rawSubtitle = sidecar?.subtitle?.trim() || null;
  const subtitle =
    rawSubtitle && rawSubtitle !== (l.description as string | null)?.trim() ? rawSubtitle : null;

  // ── Projects featuring this product ───────────────────────────────────────
  const projectIds = ((projLinkRes.data ?? []) as { project_id: string }[]).map(
    (r) => r.project_id
  );
  let projects: ProductDetailProject[] = [];
  if (projectIds.length > 0) {
    const { data: projRows } = await sup
      .from("listings")
      .select("id, slug, title, cover_image_url, owner_profile_id")
      .in("id", projectIds)
      .eq("status", "APPROVED")
      .is("deleted_at", null);
    const ownerIds = Array.from(
      new Set(
        ((projRows ?? []) as Record<string, unknown>[])
          .map((r) => r.owner_profile_id)
          .filter(Boolean) as string[]
      )
    );
    const owners = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: ps } = await sup.from("profiles").select("id, display_name").in("id", ownerIds);
      for (const pr of (ps ?? []) as { id: string; display_name: string | null }[]) {
        owners.set(pr.id, pr.display_name);
      }
    }
    projects = ((projRows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? "Untitled"),
      href: `/projects/${(r.slug as string) ?? String(r.id)}`,
      cover: (r.cover_image_url as string | null) ?? null,
      architect: r.owner_profile_id ? owners.get(String(r.owner_profile_id)) ?? null : null,
    }));
  }

  // ── Brand ─────────────────────────────────────────────────────────────────
  const ownerId = (l.owner_profile_id as string | null) ?? null;
  let brand: ProductDetail["brand"] = null;

  async function hydrateProducts(ids: string[]): Promise<ProductDetailRelated[]> {
    if (ids.length === 0) return [];
    const { data: rows } = await sup
      .from("listings")
      .select("id, slug, title, cover_image_url, owner_profile_id")
      .in("id", ids);
    const ownerIds = Array.from(
      new Set(
        ((rows ?? []) as Record<string, unknown>[])
          .map((r) => r.owner_profile_id)
          .filter(Boolean) as string[]
      )
    );
    const owners = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: ps } = await sup.from("profiles").select("id, display_name").in("id", ownerIds);
      for (const pr of (ps ?? []) as { id: string; display_name: string | null }[]) {
        owners.set(pr.id, pr.display_name);
      }
    }
    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? "Untitled"),
      href: `/products/${(r.slug as string) ?? String(r.id)}`,
      cover: (r.cover_image_url as string | null) ?? null,
      brand: r.owner_profile_id ? owners.get(String(r.owner_profile_id)) ?? null : null,
    }));
  }

  if (ownerId) {
    // followerCount was removed with the brand rail's Followers stat: the
    // `follows` table holds 9 rows platform-wide and none are product-related,
    // so this was a per-page count query feeding a number nothing renders.
    // One id list replaces the previous head-count plus limit(1) pair: the
    // brand-wide "projects featuring" figure needs the ids anyway, and no brand
    // has more than 12 live products.
    const [{ data: prof }, { data: brandProducts }] = await Promise.all([
      sup
        .from("profiles")
        .select("id, display_name, username, avatar_url, website, location_city, location_country")
        .eq("id", ownerId)
        .maybeSingle(),
      sup
        .from("listings")
        .select("id")
        .eq("owner_profile_id", ownerId)
        .eq("type", "product")
        .eq("status", "APPROVED")
        .is("deleted_at", null),
    ]);

    const brandProductIds = ((brandProducts ?? []) as { id: string }[]).map((r) => r.id);
    const productCount = brandProductIds.length;
    // Five, to fill the rail's five-column grid -- see the note on LIMIT in
    // lib/db/oftenSpecifiedWith.ts.
    const siblings = brandProductIds.filter((id) => id !== listingId).slice(0, 5);

    // Distinct live projects reached by ANY of this brand's products. Liveness
    // is enforced on the far end, exactly as the product-scoped `projects` list
    // above does, so a draft or soft-deleted project inflates neither number.
    let projectsFeaturingCount = 0;
    if (brandProductIds.length > 0) {
      const { data: brandLinks } = await sup
        .from("project_product_links")
        .select("project_id")
        .in("product_id", brandProductIds);
      const reachedProjectIds = Array.from(
        new Set(((brandLinks ?? []) as { project_id: string }[]).map((r) => r.project_id))
      );
      if (reachedProjectIds.length > 0) {
        const { count } = await sup
          .from("listings")
          .select("id", { count: "exact", head: true })
          .in("id", reachedProjectIds)
          .eq("type", "project")
          .eq("status", "APPROVED")
          .is("deleted_at", null);
        projectsFeaturingCount = count ?? 0;
      }
    }

    const pr = prof as Record<string, unknown> | null;
    if (pr) {
      const others = await hydrateProducts(siblings);
      const loc = [pr.location_city, pr.location_country].filter(Boolean).join(", ");
      brand = {
        id: String(pr.id),
        name: String(pr.display_name ?? "Brand"),
        username: (pr.username as string | null) ?? null,
        avatarUrl: (pr.avatar_url as string | null) ?? null,
        location: loc || null,
        website: (pr.website as string | null) ?? null,
        productCount,
        projectsFeaturingCount,
        otherProducts: others,
      };
    }
  }

  // ── Related ("You May Also Like") ─────────────────────────────────────────
  // Same real signal pattern as Project Detail: same category, brand fallback.
  // No similarity score and no AI, so neither is claimed.
  let related: ProductDetailRelated[] = [];
  let relatedReason = "Related products";

  if (categoryRoot) {
    const { data: sameCat } = await sup
      .from("listing_taxonomy_node")
      .select("listing_id, taxonomy_nodes:taxonomy_node_id(domain, slug_path)")
      .neq("listing_id", listingId)
      .limit(500);
    const ids = ((sameCat ?? []) as unknown as {
      listing_id: string;
      taxonomy_nodes:
        | { domain: string; slug_path: string }
        | { domain: string; slug_path: string }[]
        | null;
    }[])
      .filter((r) => {
        const n = one(r.taxonomy_nodes);
        return n?.domain === "product" && n.slug_path.split("/")[0] === categoryRoot;
      })
      .map((r) => r.listing_id)
      .slice(0, 12);
    const hydrated = await hydrateProducts(ids);
    related = hydrated.slice(0, 5);
    if (related.length > 0) {
      relatedReason = `More ${(categoryLabel ?? categoryRoot).toLowerCase()}`;
    }
  }

  /*
   * NO SAME-BRAND FALLBACK ANY MORE. `related` used to fall back to other
   * products by the same brand under the heading "More from {brand}" — which
   * is now a section of its own, built from brand.otherProducts and rendered
   * lower on the page. Keeping the fallback would have printed the same four
   * products twice under the same heading. When there is no category signal,
   * `related` is simply empty and the module suppresses itself.
   */

  return {
    id: String(l.id),
    slug: (l.slug as string | null) ?? null,
    title: String(l.title ?? "Untitled"),
    subtitle,
    description: (l.description as string | null) ?? null,
    images,
    categoryRoot,
    categoryLabel,
    typeLabel,
    styleLabel,
    materials,
    designers,
    dimensions: (l.dimensions as string | null) ?? null,
    colorOptions: (sidecar?.color_options ?? []).filter(Boolean),
    year: (l.year as number | null) ?? null,
    documents,
    projects,
    related,
    relatedReason,
    website: (l.website as string | null) ?? null,
    productStage: (l.product_stage as string | null) ?? null,
    collaborationStatus: (l.product_collaboration_status as string | null) ?? null,
    lookingFor: Array.isArray(l.product_looking_for) ? (l.product_looking_for as string[]) : [],
    brand,
  };
}

export const getProductDetail = (listingId: string) =>
  unstable_cache(
    () => fetchProductDetail(listingId),
    ["product:detail:v1", listingId],
    { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
  )();
