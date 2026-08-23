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

export interface ProductDetailDocument {
  id: string;
  name: string;
  url: string;
}

export interface ProductDetailProject {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  architect: string | null;
  imageCount: number;
}

export interface ProductDetailRelated {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  brand: string | null;
  imageCount: number;
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
    followerCount: number;
    /** One other product by the same brand, for the rail. */
    otherProduct: ProductDetailRelated | null;
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

  const [imgRes, docRes, taxRes, matLinkRes, projLinkRes, sidecarRes] = await Promise.all([
    sup
      .from("listing_images")
      .select("id, image_url, alt, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    sup
      .from("listing_documents")
      .select("id, file_name, file_url, sort_order")
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
    (docRes.data ?? []) as { id: string; file_name: string | null; file_url: string | null }[]
  )
    .filter((d) => d.file_url)
    .map((d) => ({ id: d.id, name: d.file_name ?? "Document", url: d.file_url as string }));

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
    const [{ data: projRows }, { data: projImgs }] = await Promise.all([
      sup
        .from("listings")
        .select("id, slug, title, cover_image_url, owner_profile_id")
        .in("id", projectIds)
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("listing_images").select("listing_id").in("listing_id", projectIds),
    ]);
    const counts = new Map<string, number>();
    for (const i of (projImgs ?? []) as { listing_id: string }[]) {
      counts.set(i.listing_id, (counts.get(i.listing_id) ?? 0) + 1);
    }
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
      imageCount: counts.get(String(r.id)) ?? 0,
    }));
  }

  // ── Brand ─────────────────────────────────────────────────────────────────
  const ownerId = (l.owner_profile_id as string | null) ?? null;
  let brand: ProductDetail["brand"] = null;

  async function hydrateProducts(ids: string[]): Promise<ProductDetailRelated[]> {
    if (ids.length === 0) return [];
    const [{ data: rows }, { data: imgs }] = await Promise.all([
      sup.from("listings").select("id, slug, title, cover_image_url, owner_profile_id").in("id", ids),
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
      imageCount: counts.get(String(r.id)) ?? 0,
    }));
  }

  if (ownerId) {
    const [{ data: prof }, { count: productCount }, { count: followerCount }, { data: siblings }] =
      await Promise.all([
        sup
          .from("profiles")
          .select("id, display_name, username, avatar_url, website, location_city, location_country")
          .eq("id", ownerId)
          .maybeSingle(),
        sup
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("owner_profile_id", ownerId)
          .eq("type", "product")
          .eq("status", "APPROVED")
          .is("deleted_at", null),
        sup
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("target_type", "brand")
          .eq("target_id", ownerId),
        sup
          .from("listings")
          .select("id")
          .eq("owner_profile_id", ownerId)
          .eq("type", "product")
          .eq("status", "APPROVED")
          .is("deleted_at", null)
          .neq("id", listingId)
          .limit(1),
      ]);

    const pr = prof as Record<string, unknown> | null;
    if (pr) {
      const others = await hydrateProducts(
        ((siblings ?? []) as { id: string }[]).map((s) => s.id)
      );
      const loc = [pr.location_city, pr.location_country].filter(Boolean).join(", ");
      brand = {
        id: String(pr.id),
        name: String(pr.display_name ?? "Brand"),
        username: (pr.username as string | null) ?? null,
        avatarUrl: (pr.avatar_url as string | null) ?? null,
        location: loc || null,
        website: (pr.website as string | null) ?? null,
        productCount: productCount ?? 0,
        followerCount: followerCount ?? 0,
        otherProduct: others[0] ?? null,
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
    related = hydrated.slice(0, 4);
    if (related.length > 0) {
      relatedReason = `More ${(categoryLabel ?? categoryRoot).toLowerCase()}`;
    }
  }

  if (related.length === 0 && brand) {
    const { data: sameBrand } = await sup
      .from("listings")
      .select("id")
      .eq("owner_profile_id", brand.id)
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .neq("id", listingId)
      .limit(4);
    related = await hydrateProducts(((sameBrand ?? []) as { id: string }[]).map((r) => r.id));
    if (related.length > 0) relatedReason = `More from ${brand.name}`;
  }

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
