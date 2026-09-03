import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { BoardAffinity, InterestProfile, SignalStrength } from "./types";

/**
 * What we can infer about someone from what they have already done.
 *
 * ── INFERRED, NEVER CONFIGURED ──────────────────────────────────────────────
 * Nobody is asked to pick interests. Everything here is read from behaviour
 * that already exists for its own reasons: follows, boards, saved items, the
 * city on their profile, and pages they returned to. Nothing is invented, and
 * a signal that has no data simply contributes nothing.
 *
 * ── TWO IDENTITIES, BECAUSE THE SCHEMA HAS TWO ──────────────────────────────
 * `follows.follower_profile_id` is a profiles UUID; `folders.user_id` and
 * `folder_items.user_id` are Clerk user id TEXT. That split predates this
 * feature and is not worth a migration to unify, so the profile takes both
 * identifiers and each query uses the one its table actually keys on. Getting
 * this backwards silently returns zero rows rather than erroring, which is why
 * it is stated here rather than left to be rediscovered.
 *
 * ── WEIGHTS ARE DELIBERATE AND EXPLAINABLE ──────────────────────────────────
 * A follow or a save is worth far more than a view, and a board is worth more
 * than a loose save because putting something on a named board is the most
 * deliberate act the product offers. Every number below is a constant someone
 * can argue with — there is no model, and no opaque scoring.
 */

/** Affinity contributed by one piece of evidence. */
const EVIDENCE = {
  /** Saving anything credits its category. */
  SAVE_TAXONOMY: 10,
  SAVE_MATERIAL: 8,
  SAVE_OWNER: 12,
  /** A board is a deliberate grouping: the same evidence, weighted up. */
  BOARD_BONUS: 6,
  /** Returning to a listing is real but weak next to saving it. */
  VIEW_TAXONOMY: 2,
} as const;

/**
 * A parent category earns this fraction of its child's evidence.
 *
 * Saving an armchair says a lot about armchairs, something about seating, and
 * a little about furniture. Without the decay a single deep save would make
 * an entire root category look like a passion.
 */
const ANCESTOR_DECAY = 0.45;

/** Evidence beyond this adds nothing — one obsession should not crowd out all else. */
const AFFINITY_CEILING = 100;

const CACHE_TTL_SECONDS = 300;

function bump(map: Map<string, number>, key: string, amount: number) {
  if (!key) return;
  map.set(key, Math.min(AFFINITY_CEILING, (map.get(key) ?? 0) + amount));
}

/** Credit a slug path and every ancestor, with decay. */
function bumpTaxonomy(map: Map<string, number>, slugPath: string, amount: number) {
  const parts = slugPath.split("/").filter(Boolean);
  for (let depth = parts.length; depth >= 1; depth--) {
    const path = parts.slice(0, depth).join("/");
    const decayed = amount * Math.pow(ANCESTOR_DECAY, parts.length - depth);
    bump(map, path, decayed);
  }
}

/**
 * Confidence: how much evidence exists, on 0..1.
 *
 * Saturating rather than linear, and capped below 1, because the homepage must
 * never become entirely personalized however much someone does — the brief is
 * explicit about that, and an editorial platform that only shows you what you
 * already like stops being one.
 */
function computeConfidence(s: Omit<SignalStrength, "confidence">): number {
  const evidence =
    s.follows * 3 + s.savedItems * 2 + s.boards * 2 + s.views * 0.5 + (s.hasLocation ? 2 : 0);
  // 24 points of evidence ≈ 0.75; the curve approaches but never reaches 0.9.
  return Math.min(0.9, 1 - Math.exp(-evidence / 14));
}

/** The uncached builder. Exported for the same reason as buildCandidatePool. */
export async function buildInterestProfile(
  profileId: string,
  clerkUserId: string
): Promise<InterestProfile> {
  const sup = getSupabaseServiceClient();

  const [followRes, folderRes, itemRes, viewerRes, viewRes] = await Promise.all([
    sup.from("follows").select("target_type, target_id").eq("follower_profile_id", profileId),
    sup.from("folders").select("id, name").eq("user_id", clerkUserId),
    sup.from("folder_items").select("folder_id, entity_type, entity_id").eq("user_id", clerkUserId),
    sup
      .from("profiles")
      .select("location_city, location_country, location_lat, location_lng")
      .eq("id", profileId)
      .maybeSingle(),
    /* Views are a MEDIUM signal and are read shallowly on purpose: a 90-day
       window keeps a long-abandoned interest from outranking a current one. */
    sup
      .from("listing_views")
      .select("listing_id")
      .eq("clerk_user_id", clerkUserId)
      .gte("viewed_on", new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10))
      .limit(500),
  ]);

  const followedProfileIds = new Set<string>();
  const followedTaxonomyIds = new Set<string>();
  for (const f of (followRes.data ?? []) as { target_type: string; target_id: string }[]) {
    if (f.target_type === "designer" || f.target_type === "brand") followedProfileIds.add(f.target_id);
    else followedTaxonomyIds.add(f.target_id);
  }

  const savedListingIds = new Set<string>();
  const itemsByFolder = new Map<string, string[]>();
  for (const it of (itemRes.data ?? []) as {
    folder_id: string;
    entity_type: string;
    entity_id: string;
  }[]) {
    if (it.entity_type !== "project" && it.entity_type !== "product") continue;
    savedListingIds.add(it.entity_id);
    const arr = itemsByFolder.get(it.folder_id);
    if (arr) arr.push(it.entity_id);
    else itemsByFolder.set(it.folder_id, [it.entity_id]);
  }

  const viewedListingIds = new Map<string, number>();
  for (const v of (viewRes.data ?? []) as { listing_id: string }[]) {
    viewedListingIds.set(v.listing_id, (viewedListingIds.get(v.listing_id) ?? 0) + 1);
  }

  /* Everything the saved and viewed listings can tell us, in three queries
     rather than one per listing. Views are included as candidates for
     enrichment but weighted far lower when the affinity is accumulated. */
  const enrichIds = [...new Set([...savedListingIds, ...viewedListingIds.keys()])];
  const { taxonomyByListing, materialsByListing, ownersByListing, cityByListing } =
    await enrichListings(enrichIds);

  const taxonomyAffinity = new Map<string, number>();
  const materialAffinity = new Map<string, number>();
  const ownerAffinity = new Map<string, number>();

  for (const id of savedListingIds) {
    for (const path of taxonomyByListing.get(id) ?? []) {
      bumpTaxonomy(taxonomyAffinity, path, EVIDENCE.SAVE_TAXONOMY);
    }
    for (const m of materialsByListing.get(id) ?? []) bump(materialAffinity, m, EVIDENCE.SAVE_MATERIAL);
    for (const o of ownersByListing.get(id) ?? []) bump(ownerAffinity, o, EVIDENCE.SAVE_OWNER);
  }

  // Views credit only the category, and only faintly.
  for (const [id, count] of viewedListingIds) {
    if (savedListingIds.has(id)) continue; // already counted, and counted higher
    const weight = EVIDENCE.VIEW_TAXONOMY * Math.min(3, count);
    for (const path of taxonomyByListing.get(id) ?? []) {
      bumpTaxonomy(taxonomyAffinity, path, weight);
    }
  }

  /* ── BOARDS ──────────────────────────────────────────────────────────────
     A board is read as a whole. Four hospitality interiors, three pendants and
     a stone worktop on one board is a much clearer statement than the same
     eight items saved loose, so what recurs WITHIN a board is weighted up. */
  const boards: BoardAffinity[] = [];
  for (const folder of (folderRes.data ?? []) as { id: string; name: string }[]) {
    const ids = itemsByFolder.get(folder.id) ?? [];
    if (ids.length === 0) continue; // an empty board is not a signal

    const taxonomyPaths = new Map<string, number>();
    const materialIds = new Map<string, number>();
    const cities = new Map<string, number>();
    for (const id of ids) {
      for (const path of taxonomyByListing.get(id) ?? []) {
        taxonomyPaths.set(path, (taxonomyPaths.get(path) ?? 0) + 1);
      }
      for (const m of materialsByListing.get(id) ?? []) {
        materialIds.set(m, (materialIds.get(m) ?? 0) + 1);
      }
      const city = cityByListing.get(id);
      if (city) cities.set(city, (cities.get(city) ?? 0) + 1);
    }

    // Recurrence within a board is the deliberate part; credit it globally too.
    for (const [path, count] of taxonomyPaths) {
      if (count >= 2) bumpTaxonomy(taxonomyAffinity, path, EVIDENCE.BOARD_BONUS * count);
    }
    for (const [m, count] of materialIds) {
      if (count >= 2) bump(materialAffinity, m, EVIDENCE.BOARD_BONUS * count);
    }

    boards.push({ id: folder.id, name: folder.name, itemCount: ids.length, taxonomyPaths, materialIds, cities });
  }
  boards.sort((a, b) => b.itemCount - a.itemCount);

  const viewer = viewerRes.data as {
    location_city: string | null;
    location_country: string | null;
    location_lat: number | null;
    location_lng: number | null;
  } | null;

  const strengthBase = {
    follows: followedProfileIds.size + followedTaxonomyIds.size,
    savedItems: savedListingIds.size,
    boards: boards.length,
    views: viewedListingIds.size,
    hasLocation: Boolean(viewer?.location_city || viewer?.location_country),
  };

  return {
    profileId,
    clerkUserId,
    followedProfileIds,
    followedTaxonomyIds,
    savedListingIds,
    taxonomyAffinity,
    materialAffinity,
    ownerAffinity,
    boards,
    location: {
      city: viewer?.location_city ?? null,
      /*
       * ── NO REGION TIER ────────────────────────────────────────────────────
       * The brief asks for City → Region/State → Country → Global. `profiles`
       * and `listings` both store city and country and nothing between them,
       * so the region rung does not exist in the data. Inventing it — deriving
       * "California" from "Los Angeles" via a hardcoded table — would be
       * fabricated location data on a platform where 46 of 53 projects have no
       * city at all. The ladder is therefore City → Country → Global, and the
       * missing rung is a data gap, not a scoring decision.
       */
      country: viewer?.location_country ?? null,
      lat: viewer?.location_lat ?? null,
      lng: viewer?.location_lng ?? null,
    },
    viewedListingIds,
    strength: { ...strengthBase, confidence: computeConfidence(strengthBase) },
  };
}

/** Taxonomy, materials, credited profiles and city for a set of listings. */
async function enrichListings(ids: string[]) {
  const taxonomyByListing = new Map<string, string[]>();
  const materialsByListing = new Map<string, string[]>();
  const ownersByListing = new Map<string, string[]>();
  const cityByListing = new Map<string, string>();
  if (ids.length === 0) {
    return { taxonomyByListing, materialsByListing, ownersByListing, cityByListing };
  }

  const sup = getSupabaseServiceClient();
  const [taxRes, projMatRes, prodMatRes, listingRes, teamRes] = await Promise.all([
    sup
      .from("listing_taxonomy_node")
      .select("listing_id, taxonomy_nodes:taxonomy_node_id(slug_path)")
      .in("listing_id", ids),
    sup.from("project_material_links").select("project_id, material_id").in("project_id", ids),
    sup.from("product_material_links").select("product_id, material_id").in("product_id", ids),
    sup.from("listings").select("id, owner_profile_id, location_city").in("id", ids),
    sup.from("listing_team_members").select("listing_id, profile_id").in("listing_id", ids),
  ]);

  for (const r of (taxRes.data ?? []) as unknown as {
    listing_id: string;
    taxonomy_nodes: { slug_path: string } | { slug_path: string }[] | null;
  }[]) {
    const node = Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes;
    if (!node?.slug_path) continue;
    const arr = taxonomyByListing.get(r.listing_id);
    if (arr) arr.push(node.slug_path);
    else taxonomyByListing.set(r.listing_id, [node.slug_path]);
  }

  const addMaterial = (listingId: string, materialId: string) => {
    const arr = materialsByListing.get(listingId);
    if (arr) arr.push(materialId);
    else materialsByListing.set(listingId, [materialId]);
  };
  for (const r of (projMatRes.data ?? []) as { project_id: string; material_id: string }[]) {
    addMaterial(r.project_id, r.material_id);
  }
  for (const r of (prodMatRes.data ?? []) as { product_id: string; material_id: string }[]) {
    addMaterial(r.product_id, r.material_id);
  }

  const addOwner = (listingId: string, profileId: string | null) => {
    if (!profileId) return;
    const arr = ownersByListing.get(listingId);
    if (arr) {
      if (!arr.includes(profileId)) arr.push(profileId);
    } else ownersByListing.set(listingId, [profileId]);
  };
  for (const r of (listingRes.data ?? []) as {
    id: string;
    owner_profile_id: string | null;
    location_city: string | null;
  }[]) {
    addOwner(r.id, r.owner_profile_id);
    if (r.location_city) cityByListing.set(r.id, r.location_city);
  }
  for (const r of (teamRes.data ?? []) as { listing_id: string; profile_id: string | null }[]) {
    addOwner(r.listing_id, r.profile_id);
  }

  return { taxonomyByListing, materialsByListing, ownersByListing, cityByListing };
}

/**
 * ── THE CACHE STORES JSON, AND A Set IS NOT JSON ────────────────────────────
 * InterestProfile is built out of four Sets and six Maps because that is what
 * the scorer wants to read. unstable_cache SERIALISES whatever it is given, and
 * `JSON.stringify(new Set(["a"]))` is `{}` — so a cached profile came back with
 * every Set and Map replaced by an empty object, and the first `.has()` against
 * one threw.
 *
 * The shape of the failure is what made it survive review: the cache MISS path
 * returns the live object and works perfectly, so the first request after a
 * deploy — and every request in local testing, where unstable_cache refuses to
 * run at all outside a request context — behaved. Only the second request
 * inside the five-minute window failed. In production:
 *
 *   TypeError: e.followedProfileIds.has is not a function   /api/home/for-you
 *   TypeError: e.savedListingIds.has is not a function      /api/notifications
 *
 * So the cache boundary now carries a deliberately flat shape and the live
 * structures are rebuilt on the near side of it. The scorer's contract is
 * unchanged — it still receives real Sets and Maps — and nothing about the
 * profile's content, weights or caching policy moves.
 */
interface CacheableProfile {
  profileId: string;
  clerkUserId: string;
  followedProfileIds: string[];
  followedTaxonomyIds: string[];
  savedListingIds: string[];
  taxonomyAffinity: [string, number][];
  materialAffinity: [string, number][];
  ownerAffinity: [string, number][];
  boards: {
    id: string;
    name: string;
    itemCount: number;
    taxonomyPaths: [string, number][];
    materialIds: [string, number][];
    cities: [string, number][];
  }[];
  location: InterestProfile["location"];
  viewedListingIds: [string, number][];
  strength: SignalStrength;
}

function toCacheable(p: InterestProfile): CacheableProfile {
  return {
    profileId: p.profileId,
    clerkUserId: p.clerkUserId,
    followedProfileIds: [...p.followedProfileIds],
    followedTaxonomyIds: [...p.followedTaxonomyIds],
    savedListingIds: [...p.savedListingIds],
    taxonomyAffinity: [...p.taxonomyAffinity],
    materialAffinity: [...p.materialAffinity],
    ownerAffinity: [...p.ownerAffinity],
    boards: p.boards.map((b) => ({
      id: b.id,
      name: b.name,
      itemCount: b.itemCount,
      taxonomyPaths: [...b.taxonomyPaths],
      materialIds: [...b.materialIds],
      cities: [...b.cities],
    })),
    location: p.location,
    viewedListingIds: [...p.viewedListingIds],
    strength: p.strength,
  };
}

function fromCacheable(c: CacheableProfile): InterestProfile {
  return {
    profileId: c.profileId,
    clerkUserId: c.clerkUserId,
    followedProfileIds: new Set(c.followedProfileIds),
    followedTaxonomyIds: new Set(c.followedTaxonomyIds),
    savedListingIds: new Set(c.savedListingIds),
    taxonomyAffinity: new Map(c.taxonomyAffinity),
    materialAffinity: new Map(c.materialAffinity),
    ownerAffinity: new Map(c.ownerAffinity),
    boards: c.boards.map((b) => ({
      id: b.id,
      name: b.name,
      itemCount: b.itemCount,
      taxonomyPaths: new Map(b.taxonomyPaths),
      materialIds: new Map(b.materialIds),
      cities: new Map(b.cities),
    })),
    location: c.location,
    viewedListingIds: new Map(c.viewedListingIds),
    strength: c.strength,
  };
}

/**
 * The cached entry point.
 *
 * ── WHY CACHED, AND WHY ONLY BRIEFLY ────────────────────────────────────────
 * Rebuilding the profile costs about seven small indexed queries. That is
 * cheap once and wasteful on every scroll, so it is memoised per viewer for
 * five minutes — long enough to cover a browsing session's worth of feed
 * requests, short enough that a follow or a save is reflected almost at once
 * without any explicit invalidation to forget.
 *
 * Keyed by profile id, so one viewer's profile can never be served to another.
 */
export async function getInterestProfile(
  profileId: string,
  clerkUserId: string
): Promise<InterestProfile> {
  const cached = await unstable_cache(
    async () => toCacheable(await buildInterestProfile(profileId, clerkUserId)),
    ["interest-profile", profileId],
    { revalidate: CACHE_TTL_SECONDS, tags: [`interest-profile:${profileId}`] }
  )();
  return fromCacheable(cached);
}
