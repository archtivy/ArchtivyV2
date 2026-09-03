/**
 * Visual discovery — what the lightbox's right-hand feed is made of.
 *
 * ── NO FOURTH MATCH STORE ───────────────────────────────────────────────────
 * This codebase already holds three overlapping answers to "which products go
 * with this image": `matches` (project↔product, 513 rows), `photo_matches`
 * (image↔product, 612 rows, every embedding_score 0 and every selected_mode
 * "keyword"), and `image_regions.match_candidates` (designed for it, 0 rows).
 * Adding a fourth table was the obvious move and it is the wrong one — the
 * near-duplicate-path failure is the single most repeated bug in this
 * repository. So nothing here writes a new store:
 *
 *   whole-room feed   computed live from the HNSW index, ~1ms, no AI call
 *   object feed       read from image_regions.match_candidates, precomputed
 *   exact products    read from product_tags / project_product_links, untouched
 *
 * "Precomputed" in the cost constraint means no MODEL is invoked when someone
 * opens a lightbox. An indexed vector lookup is a database query, and keeping
 * the room feed live means a newly published product appears in it without a
 * rebuild. Regions are precomputed because a click must feel instant and
 * because a region's vector is not stored anywhere to query with.
 *
 * ── EXACT AND SIMILAR NEVER MIX ─────────────────────────────────────────────
 * Everything this module returns is split into `exact` and `similar`, and the
 * two are carried in separate fields all the way to the UI. A suggestion can
 * never be rendered where a confirmed product goes, because it never arrives
 * in the same array. `exact` comes only from human-entered data: product_tags
 * pins at verified/official, and project_product_links.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";
import { sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { PUBLIC_STATUSES } from "@/lib/db/productTags";
import { EMBEDDING_DIM } from "@/lib/matches/types";
import { parseVector, toVectorLiteral } from "@/lib/db/imageAi";
import type { MatchCandidate } from "@/lib/db/imageRegions";

export interface FeedProduct {
  id: string;
  title: string;
  /** Canonical taxonomy URL. Never the flat form, which 308s. */
  href: string;
  cover: string | null;
  brandName: string | null;
}

/** A clickable object in the photograph. Geometry only — no label reaches the UI. */
export interface DiscoveryRegion {
  id: string;
  /** Centre and box, percentages of the painted photograph, 0–100. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Products confirmed for THIS object: a public pin inside the box. */
  exact: FeedProduct[];
  /** Visually similar suggestions. Never presented as used. */
  similar: FeedProduct[];
}

export interface ImageDiscovery {
  imageId: string;
  listingType: "project" | "product";
  /** Whole-room / whole-product feed, shown when nothing is selected. */
  room: { exact: FeedProduct[]; similar: FeedProduct[] };
  regions: DiscoveryRegion[];
}

/**
 * object_type → the taxonomy paths that could plausibly satisfy it.
 *
 * ── PREFIXES, NOT ROOTS ─────────────────────────────────────────────────────
 * This was keyed on the top-level root, and root is too coarse for the half of
 * the catalogue that lives under `furniture`. Clicking the coffee table in
 * Istanbul House Design returned Blevio Table first and then a run of
 * armchairs, because `furniture` covers seating (24 products) and tables (7)
 * equally. Second-level paths exist and are populated, so they are what the
 * preference is expressed in.
 *
 * Still a PREFERENCE, never a filter, and applied in three tiers: the matching
 * path first, then anything sharing its root, then everything else — each tier
 * still ordered by embedding distance. Nothing is discarded, so a clicked rug
 * still fills a feed from a catalogue holding exactly one rug, which is what
 * the spec's "no empty state" requires.
 */
const TYPE_TO_PATHS: Record<string, string[]> = {
  /* `outdoor/outdoor-furniture` is named one level deeper than the rest,
     because it mixes seating, daybeds and tables under one node: matching the
     whole branch put an outdoor armchair and a daybed at the top of a clicked
     coffee table's feed. */
  seating: ["furniture/seating", "outdoor/outdoor-furniture/outdoor-seating"],
  table: ["furniture/tables", "outdoor/outdoor-furniture/outdoor-table"],
  bed: ["furniture/beds-bedroom", "outdoor/outdoor-furniture/daybed"],
  shelving: ["furniture/storage", "furniture/other-furniture"],
  lighting: ["lighting"],
  rug: ["textiles/rugs-carpets", "textiles"],
  sink: ["bathroom", "kitchen"],
  faucet: ["bathroom/bathroom-faucets", "kitchen/kitchen-faucets"],
};

const MAX_NN = 200;

type ProductRow = {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  owner_profile_id: string | null;
};

/**
 * Turn product listing ids into feed items: approved only, canonical href,
 * brand name, sanitised cover. Preserves the order it was given.
 */
export async function hydrateProducts(ids: string[]): Promise<FeedProduct[]> {
  if (ids.length === 0) return [];
  const sup = getSupabaseServiceClient();

  const [listingRes, taxRes] = await Promise.all([
    sup
      .from("listings")
      .select("id, title, slug, cover_image_url, owner_profile_id")
      .in("id", ids)
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null),
    sup
      .from("listing_taxonomy_node")
      .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path)")
      .in("listing_id", ids),
  ]);

  const rows = (listingRes.data ?? []) as ProductRow[];
  if (rows.length === 0) return [];

  /* The canonical URL needs the product-domain slug path. Without it
     getListingUrl returns the flat form, which the archive route 308s — the
     exact bug fixed in the directory layer, not to be reintroduced here. */
  const taxPath = new Map<string, string>();
  for (const r of (taxRes.data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: { domain: string; slug_path: string } | { domain: string; slug_path: string }[] | null;
  }[]) {
    const node = Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes;
    if (!node || node.domain !== "product") continue;
    if (r.is_primary || !taxPath.has(r.listing_id)) taxPath.set(r.listing_id, node.slug_path);
  }

  const ownerIds = [...new Set(rows.map((r) => r.owner_profile_id).filter(Boolean) as string[])];
  const brands = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data } = await sup.from("profiles").select("id, display_name").in("id", ownerIds);
    for (const p of (data ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) brands.set(p.id, p.display_name);
    }
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: FeedProduct[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) continue; // unpublished or deleted: dropped, never rendered dead
    out.push({
      id: r.id,
      title: r.title ?? "Product",
      href: getListingUrl({
        id: r.id,
        type: "product",
        slug: r.slug,
        taxonomySlugPath: taxPath.get(r.id) ?? null,
      }),
      cover: sanitizeListingImageUrl(r.cover_image_url),
      brandName: r.owner_profile_id ? brands.get(r.owner_profile_id) ?? null : null,
    });
  }
  return out;
}

/** Product-domain taxonomy slug_path per product id, for category preference. */
async function pathsFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("listing_taxonomy_node")
    .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path)")
    .in("listing_id", ids);
  for (const r of (data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: { domain: string; slug_path: string } | { domain: string; slug_path: string }[] | null;
  }[]) {
    const node = Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes;
    if (!node || node.domain !== "product") continue;
    if (r.is_primary || !out.has(r.listing_id)) out.set(r.listing_id, node.slug_path);
  }
  return out;
}

export interface SimilarOptions {
  limit: number;
  /** The listing the query image belongs to, so a product never matches itself. */
  excludeListingId?: string | null;
  /** Prefer this object type's taxonomy paths. */
  objectType?: string | null;
  /**
   * Prefer these taxonomy path prefixes directly. Used for a product feed,
   * where the thing to stay close to is the subject product's own category
   * rather than a detected object's.
   */
  preferPaths?: string[];
  /** Already shown elsewhere in the same feed. */
  excludeProductIds?: string[];
  /** Spread results across taxonomy roots instead of returning twelve sofas. */
  diversify?: boolean;
}

/**
 * Nearest product images by cosine distance, collapsed to distinct products.
 *
 * Uses match_listing_images_by_embedding — the RPC that works. Its sibling
 * match_product_images_by_embedding joins `product_images`, a table this
 * schema no longer populates, and returns zero rows for every query; it is
 * left alone here rather than fixed, because nothing should call it.
 */
export async function findSimilarProducts(
  embedding: number[],
  opts: SimilarOptions
): Promise<FeedProduct[]> {
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) return [];
  const sup = getSupabaseServiceClient();

  const { data, error } = await sup.rpc("match_listing_images_by_embedding", {
    query_embedding: toVectorLiteral(embedding),
    match_count: Math.min(MAX_NN, Math.max(24, opts.limit * 10)),
    filter_listing_type: "product",
    exclude_listing_id: opts.excludeListingId ?? null,
  });

  if (error) {
    console.error("[visualDiscovery] NN query failed:", error.code, error.message);
    return [];
  }

  const excluded = new Set(opts.excludeProductIds ?? []);
  const bestByProduct = new Map<string, number>();
  for (const r of (data ?? []) as { listing_id: string; distance: number }[]) {
    if (!r.listing_id || excluded.has(r.listing_id)) continue;
    const d = Number(r.distance);
    const prev = bestByProduct.get(r.listing_id);
    if (prev === undefined || d < prev) bestByProduct.set(r.listing_id, d);
  }
  if (bestByProduct.size === 0) return [];

  const ranked = [...bestByProduct.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const paths = await pathsFor(ranked);

  let ordered = ranked;

  const wanted = opts.preferPaths ?? (opts.objectType ? TYPE_TO_PATHS[opts.objectType] ?? [] : []);

  if (wanted.length > 0) {
    const roots = new Set(wanted.map((w) => w.split("/")[0]));
      const tier = (id: string): 0 | 1 | 2 => {
        const path = paths.get(id) ?? "";
        if (wanted.some((w) => path === w || path.startsWith(`${w}/`))) return 0;
        return roots.has(path.split("/")[0]) ? 1 : 2;
      };
      // Stable within each tier, so distance order survives the regrouping.
    ordered = [
      ...ranked.filter((id) => tier(id) === 0),
      ...ranked.filter((id) => tier(id) === 1),
      ...ranked.filter((id) => tier(id) === 2),
    ];
  } else if (opts.diversify) {
    /* Round-robin across taxonomy roots. A room's nearest neighbours skew hard
       towards whatever the catalogue has most of — 35 of 80 products are
       furniture — and a feed meant to suggest "what fits this space" reads as
       broken when it is nine sofas. Order within each root is unchanged, so
       the closest match still leads. */
    const buckets = new Map<string, string[]>();
    for (const id of ranked) {
      const root = (paths.get(id) ?? "other").split("/")[0];
      const b = buckets.get(root);
      if (b) b.push(id);
      else buckets.set(root, [id]);
    }
    const queues = [...buckets.values()];
    const out: string[] = [];
    for (let i = 0; out.length < ranked.length; i++) {
      let moved = false;
      for (const q of queues) {
        if (i < q.length) {
          out.push(q[i]);
          moved = true;
        }
      }
      if (!moved) break;
    }
    ordered = out;
  }

  return hydrateProducts(ordered.slice(0, opts.limit));
}

/** Products the project itself declares — project_product_links. Human-entered. */
export async function getProjectProducts(projectId: string, limit = 24): Promise<FeedProduct[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("project_product_links")
    .select("product_id")
    .eq("project_id", projectId)
    .limit(limit);
  if (error) return [];
  return hydrateProducts((data ?? []).map((r: { product_id: string }) => r.product_id));
}

/** Public pins on one image: id + position + tagged product. */
export async function getPinsForImage(
  imageId: string
): Promise<{ x: number; y: number; productId: string }[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("product_tags")
    .select("tagged_listing_id, x_percent, y_percent")
    .eq("listing_image_id", imageId)
    .in("verification_status", PUBLIC_STATUSES);
  if (error) return [];
  return (data ?? []).map((t: { tagged_listing_id: string; x_percent: number | string; y_percent: number | string }) => ({
    x: Number(t.x_percent),
    y: Number(t.y_percent),
    productId: t.tagged_listing_id,
  }));
}

/**
 * The product's own category, as a path prefix one level above its leaf.
 *
 * An armchair sits at `furniture/seating/armchair`; the useful neighbourhood is
 * `furniture/seating`, not `armchair` alone — ten armchairs would exhaust the
 * catalogue and a sofa is a fair suggestion beside a lounge chair. Returns
 * empty for a product with no product-domain node, which leaves the feed in
 * pure distance order rather than in an invented category.
 */
async function preferredPathsForProduct(productId: string): Promise<string[]> {
  const paths = await pathsFor([productId]);
  const path = paths.get(productId);
  if (!path) return [];
  const parts = path.split("/");
  return parts.length >= 2 ? [parts.slice(0, 2).join("/")] : [path];
}

type RawRegion = { id: string; x: number; y: number; width: number | null; height: number | null };

/**
 * Which region owns a pin when several padded boxes contain it: the smallest.
 *
 * Without this a pin on a lamp standing inside the bounds of the table it sits
 * on would be claimed by both, and the same confirmed product would appear
 * under "Used here" for two different objects.
 */
function smallestRegionFor(
  pin: { x: number; y: number },
  regions: RawRegion[]
): string | null {
  let best: { id: string; area: number } | null = null;
  for (const r of regions) {
    const w = Number(r.width ?? 0);
    const h = Number(r.height ?? 0);
    if (w <= 0 || h <= 0) continue;
    const halfW = w / 2 + Math.max(2, w / 8);
    const halfH = h / 2 + Math.max(2, h / 8);
    if (pin.x < r.x - halfW || pin.x > r.x + halfW) continue;
    if (pin.y < r.y - halfH || pin.y > r.y + halfH) continue;
    const area = w * h;
    if (!best || area < best.area) best = { id: r.id, area };
  }
  return best?.id ?? null;
}

function candidateToFeed(c: MatchCandidate): FeedProduct | null {
  if (!c?.listing_id) return null;
  return {
    id: c.listing_id,
    title: c.title || "Product",
    href: getListingUrl({
      id: c.listing_id,
      type: "product",
      slug: c.slug ?? null,
      taxonomySlugPath: c.taxonomy_slug_path ?? null,
    }),
    cover: sanitizeListingImageUrl(c.cover),
    brandName: c.brand ?? null,
  };
}

const ROOM_LIMIT = 24;
const REGION_LIMIT = 12;

/**
 * Everything the lightbox needs for one photograph, in one round trip.
 *
 * Fetched when a slide is shown, so a click on an object costs no network at
 * all — the regions and their candidates are already in the browser.
 */
export async function getImageDiscovery(imageId: string): Promise<ImageDiscovery | null> {
  const sup = getSupabaseServiceClient();

  const { data: imgRow } = await sup
    .from("listing_images")
    .select("id, listing_id, listings:listing_id(id, type, status, deleted_at)")
    .eq("id", imageId)
    .maybeSingle();
  if (!imgRow) return null;

  const listing = (Array.isArray((imgRow as Record<string, unknown>).listings)
    ? ((imgRow as Record<string, unknown>).listings as unknown[])[0]
    : (imgRow as Record<string, unknown>).listings) as
    | { id: string; type: string; status: string; deleted_at: string | null }
    | null;

  // Only ever serve discovery for a publicly visible listing.
  if (!listing || listing.deleted_at || listing.status !== "APPROVED") return null;
  if (listing.type !== "project" && listing.type !== "product") return null;
  const listingType = listing.type as "project" | "product";

  const [aiRes, regionRes] = await Promise.all([
    sup.from("image_ai").select("embedding").eq("image_id", imageId).limit(1).maybeSingle(),
    listingType === "project"
      ? sup
          .from("image_regions")
          .select("id, x, y, width, height, object_type, match_candidates, confidence")
          .eq("listing_image_id", imageId)
          .order("region_index", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const embedding = parseVector((aiRes.data as { embedding: unknown } | null)?.embedding);

  // ── Exact, human-entered products ────────────────────────────────────────
  const exactRoom =
    listingType === "project" ? await getProjectProducts(listing.id, ROOM_LIMIT) : [];
  const exactRoomIds = new Set(exactRoom.map((p) => p.id));

  /*
   * ── A ROOM AND A PRODUCT WANT OPPOSITE THINGS ──────────────────────────────
   * Both were diversified at first, and on a product that is plainly wrong.
   * Opening the Nena Armchair returned an armchair, then a wood-burning
   * fireplace, a pendant lamp, a bath mixer and a rug: the round-robin was
   * doing its job, and its job is not what "visually similar" means when the
   * reader is looking at one chair.
   *
   *   project   spread across categories — a room is furnished from several
   *   product   stay in the subject's own category, closest first
   */
  const ownPaths =
    listingType === "product" ? await preferredPathsForProduct(listing.id) : [];

  const similarRoom = embedding
    ? await findSimilarProducts(embedding, {
        limit: ROOM_LIMIT,
        excludeListingId: listing.id,
        excludeProductIds: [...exactRoomIds],
        diversify: listingType === "project",
        preferPaths: listingType === "product" ? ownPaths : undefined,
      })
    : [];

  // ── Regions ──────────────────────────────────────────────────────────────
  const rawRegions = ((regionRes as { data: unknown[] }).data ?? []) as {
    id: string;
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    object_type: string;
    match_candidates: MatchCandidate[] | null;
    confidence: number;
  }[];

  const pins = rawRegions.length > 0 ? await getPinsForImage(imageId) : [];

  const regions: DiscoveryRegion[] = [];
  for (const r of rawRegions) {
    const width = Number(r.width ?? 0);
    const height = Number(r.height ?? 0);
    if (width <= 0 || height <= 0) continue; // nothing a click could land inside

    /*
     * ── A PIN INSIDE THIS BOX IS THIS OBJECT ───────────────────────────────
     * This is the whole join between the human tagging system and the machine
     * one, and it is computed at read time rather than stored: no row anywhere
     * claims that an AI region and an owner's pin are the same thing. Delete
     * every region tomorrow and the pins are untouched.
     *
     * The box is padded before the test. A pin is a point a person dropped on
     * what they judged the middle of a product; the box is a model's estimate
     * of that product's extent. Measured on the one project carrying public
     * pins, the two disagreed by about a percent and the link was lost: a pin
     * at (60.21, 81) fell just outside a seating box spanning x 40–60, y 70–80
     * — off by 0.21 and 1.0 — so a product the owner had confirmed did not
     * appear on the object it was confirmed on.
     *
     * A quarter of each half-extent, floored at 2 points, is enough to absorb
     * that without becoming loose: the box above widens to x 37.5–62.5,
     * y 68.75–81.25, still nowhere near the next object in the frame. When
     * more than one padded box catches the same pin the SMALLEST wins, on the
     * same reasoning as the click test — the tighter box is the more specific
     * claim about what that pin is on.
     */
    const halfW = width / 2 + Math.max(2, width / 8);
    const halfH = height / 2 + Math.max(2, height / 8);

    const pinnedIds = pins
      .filter(
        (p) =>
          p.x >= r.x - halfW && p.x <= r.x + halfW && p.y >= r.y - halfH && p.y <= r.y + halfH
      )
      .filter((p) => smallestRegionFor(p, rawRegions) === r.id)
      .map((p) => p.productId);

    const exact = pinnedIds.length > 0 ? await hydrateProducts([...new Set(pinnedIds)]) : [];
    const exactIds = new Set(exact.map((p) => p.id));

    const similar = ((r.match_candidates ?? []) as MatchCandidate[])
      .map(candidateToFeed)
      .filter((p): p is FeedProduct => p !== null && !exactIds.has(p.id))
      .slice(0, REGION_LIMIT);

    regions.push({
      id: r.id,
      x: Number(r.x),
      y: Number(r.y),
      width,
      height,
      exact,
      similar,
    });
  }

  return {
    imageId,
    listingType,
    room: { exact: exactRoom, similar: similarRoom },
    regions,
  };
}
