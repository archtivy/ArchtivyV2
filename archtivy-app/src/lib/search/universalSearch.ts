import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";
import { renderableImageUrl } from "@/lib/images/remoteAllowed";
import { resolveQueryIntent, type QueryIntent } from "@/lib/search/queryIntent";
import type {
  MatchReason,
  SearchCounts,
  SearchEntity,
  SearchHit,
  SearchResult,
} from "@/lib/search/types";

export type { SearchHit, SearchResult, SearchCounts, SearchEntity };
export type { QueryIntent };

/**
 * The one universal search implementation.
 *
 * ── WHAT IT REPLACES ────────────────────────────────────────────────────────
 * The global header used to decide, from the page you happened to be reading,
 * that your query was about projects — or, on two paths, about products — and
 * send you to that directory with `?q=` appended. Every search for "chair" from
 * anywhere on the site landed in Projects. There was no cross-entity search at
 * all; the directories filter a set they have already fetched, and designers
 * and brands were unreachable by search entirely.
 *
 * ── HOW IT WORKS ────────────────────────────────────────────────────────────
 * Three stages, all on the server.
 *
 * 1. UNDERSTAND. `resolveQueryIntent` turns the sentence into probe terms, a
 *    place, materials, and a list of taxonomy nodes read from the live table.
 *    It produces weights, never a destination — see queryIntent.ts.
 *
 * 2. RETRIEVE. A bounded, indexed candidate query per entity type. Postgres
 *    does the matching: the GIN index over `listings.search_vector` (a stored
 *    generated tsvector of title·A, description·B, feature_highlight·B) for
 *    stemmed full text, the pg_trgm index over `listings.title` for substrings,
 *    and equality on the taxonomy and location columns. Nothing fetches a
 *    table and filters it afterwards, and no candidate set is unbounded.
 *
 * 3. RANK. One score per hit on one scale, so a chair can be compared with a
 *    studio. Field tier is the base; intent applies multipliers on top.
 *
 * The reason ranking is not also SQL is that it spans two tables with different
 * shapes, and PostgREST cannot return `ts_rank` as a computed column. Doing it
 * in one RPC would mean a migration; this reaches the same ranking over
 * candidate sets that Postgres has already cut down to tens of rows. The seam
 * is `SearchHit`, so moving stage 3 into an RPC later changes nothing above it.
 */

/*
 * ── FIELD TIERS ─────────────────────────────────────────────────────────────
 * The brief's ranking principle, as numbers. The gaps are wide on purpose: no
 * quantity of weak matches should outrank one strong one, so a row that merely
 * mentions a word in its description can never climb past a row named after it.
 */
const TIER = {
  exactTitle: 1000,
  prefixTitle: 700,
  titleWord: 550,
  titleSubstring: 380,
  category: 300,
  taxonomy: 280,
  material: 200,
  location: 180,
  owner: 150,
  description: 90,
} as const;

/** Preference multipliers, by position in `preferredEntities`. */
const PREFERENCE_MULTIPLIER = [1.4, 1.2, 1.08];
const NEUTRAL_MULTIPLIER = 1;

/**
 * Applied when the query named a place and this row is somewhere else.
 * "residential projects in Los Angeles" must not lead with a house in Oslo,
 * however good its title match — but the Oslo house is still a result, because
 * suppressing it entirely would turn a search into a filter.
 */
const LOCATION_MISMATCH_MULTIPLIER = 0.4;

/** Bonus for satisfying a named place or category outright. */
const LOCATION_MATCH_BONUS = 260;
const CATEGORY_INTENT_BONUS = 220;

/**
 * Per-entity candidate ceiling.
 *
 * Comfortably above the whole corpus today — 53 projects, 80 products, 167
 * designers, 52 brands — so for this data it is not a ceiling at all and the
 * counts on the tabs are exact. It exists to keep a pathological query bounded
 * as the corpus grows; when a set does hit it, the cap falls on the rows
 * Postgres already ranked worst.
 */
const CANDIDATE_LIMIT = 300;

/** Probe terms per query. More than this and the OR string stops paying. */
const MAX_PROBES = 6;

const DEFAULT_PER_PAGE = 24;

/* ═══════════════════════════════════════════════════════════════════════════
   Escaping
   ═══════════════════════════════════════════════════════════════════════════ */

/** ilike wildcards are data here, not syntax. */
function escapeLike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * One `field.ilike.<value>` clause for a PostgREST `or=(…)` list.
 *
 * The value is double-quoted because the list is comma-separated and
 * parenthesis-delimited: an unquoted term containing either would be read as
 * structure. `queryIntent` has already stripped punctuation, so this guards the
 * boundary rather than fixing a known break.
 */
function orClause(field: string, term: string): string {
  const safe = escapeLike(term).replace(/"/g, "");
  return `${field}.ilike."%${safe}%"`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Scoring primitives
   ═══════════════════════════════════════════════════════════════════════════ */

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-word containment — "chair" matches "Otoo Chair", not "chairman". */
function hasWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return new RegExp(`(^|\\s|-)${escapeRegExp(needle)}($|\\s|-)`, "u").test(haystack);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ScoreParts {
  score: number;
  matchedOn: MatchReason[];
}

/**
 * Score one row's text fields against the query.
 *
 * Only the STRONGEST title tier counts — an exact title match does not also
 * collect the substring points for the same word. Different field families do
 * stack, because matching on both name and place really is better evidence
 * than matching on either.
 */
function scoreFields(
  intent: QueryIntent,
  fields: {
    title: string;
    categories: string[];
    materials: string[];
    location: string;
    owner: string;
    description: string;
  }
): ScoreParts {
  const q = norm(intent.query);
  const title = norm(fields.title);
  const matchedOn: MatchReason[] = [];
  let score = 0;

  // ── Title, strongest tier only ──
  if (title && title === q) {
    score += TIER.exactTitle;
    matchedOn.push("exact-title");
  } else if (title && q && title.startsWith(q)) {
    score += TIER.prefixTitle;
    matchedOn.push("prefix-title");
  } else {
    let best = 0;
    for (const probe of intent.probes) {
      const p = norm(probe);
      if (!p || !title) continue;
      if (title === p) best = Math.max(best, TIER.exactTitle);
      else if (title.startsWith(p)) best = Math.max(best, TIER.prefixTitle);
      else if (hasWord(title, p)) best = Math.max(best, TIER.titleWord);
      else if (title.includes(p)) best = Math.max(best, TIER.titleSubstring);
    }
    if (best > 0) {
      score += best;
      matchedOn.push(best >= TIER.exactTitle ? "exact-title" : best >= TIER.titleWord ? "title" : "title");
    }
  }

  // ── Category / type ──
  const cats = fields.categories.map(norm).filter(Boolean);
  if (cats.length > 0 && intent.probes.some((p) => cats.some((c) => c === norm(p) || hasWord(c, norm(p))))) {
    score += TIER.category;
    matchedOn.push("category");
  }

  // ── Materials ──
  const mats = fields.materials.map(norm).filter(Boolean);
  if (
    mats.length > 0 &&
    (intent.materials.some((m) => mats.includes(norm(m))) ||
      intent.probes.some((p) => mats.some((m) => m === norm(p) || hasWord(m, norm(p)))))
  ) {
    score += TIER.material;
    matchedOn.push("material");
  }

  // ── Location ──
  const loc = norm(fields.location);
  if (loc && intent.probes.some((p) => norm(p).length >= 3 && loc.includes(norm(p)))) {
    score += TIER.location;
    matchedOn.push("location");
  }

  // ── Owning studio or brand ──
  const owner = norm(fields.owner);
  if (owner && intent.probes.some((p) => norm(p).length >= 3 && hasWord(owner, norm(p)))) {
    score += TIER.owner;
    matchedOn.push("owner");
  }

  // ── Description, deliberately last and cheap ──
  const desc = norm(fields.description);
  if (desc && intent.probes.some((p) => norm(p).length >= 3 && hasWord(desc, norm(p)))) {
    score += TIER.description;
    matchedOn.push("description");
  }

  return { score, matchedOn };
}

/** Preference multiplier for an entity type, by its rank in the intent. */
function preferenceFor(intent: QueryIntent, entity: SearchEntity): number {
  const idx = intent.preferredEntities.indexOf(entity);
  if (idx < 0) return NEUTRAL_MULTIPLIER;
  return PREFERENCE_MULTIPLIER[idx] ?? PREFERENCE_MULTIPLIER[PREFERENCE_MULTIPLIER.length - 1];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Retrieval
   ═══════════════════════════════════════════════════════════════════════════ */

const LISTING_FIELDS = [
  "title",
  "description",
  "feature_highlight",
  "category",
  "project_category",
  "product_type",
  "product_category",
  "product_subcategory",
  "material_or_finish",
  "location",
  "location_city",
  "location_country",
  "location_text",
];

const PROFILE_FIELDS = [
  "display_name",
  "username",
  "bio",
  "short_bio",
  "designer_discipline",
  "brand_type",
  "location",
  "location_city",
  "location_country",
];

const LISTING_SELECT =
  "id, type, slug, title, description, feature_highlight, category, project_category, product_type, product_category, product_subcategory, material_or_finish, location, location_city, location_country, location_text, cover_image_url, year, views_count, saves_count, owner_profile_id, taxonomy_node_id";

interface ListingRow {
  id: string;
  type: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  feature_highlight: string | null;
  category: string | null;
  project_category: string | null;
  product_type: string | null;
  product_category: string | null;
  product_subcategory: string | null;
  material_or_finish: string | null;
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  location_text: string | null;
  cover_image_url: string | null;
  year: number | null;
  views_count: number | null;
  saves_count: number | null;
  owner_profile_id: string | null;
  taxonomy_node_id: string | null;
}

interface ProfileRow {
  id: string;
  role: string | null;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  short_bio: string | null;
  designer_discipline: string | null;
  brand_type: string | null;
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
}

type Sup = ReturnType<typeof getSupabaseServiceClient>;

/**
 * Candidate listings of one type.
 *
 * Three retrievals, unioned by id, each one indexed and capped:
 *
 *   A  full text over `search_vector` — stemmed, so "chairs" finds "chair"
 *      and "lighting" finds "light". This is what a plain ilike cannot do.
 *   B  substring over the probe terms across every searchable column, which
 *      is what full text cannot do — partial words, slugs, place names.
 *   C  the taxonomy columns, by exact value. This is the one that finds a
 *      product that never says "chair" anywhere in its text but sits in the
 *      seating category, which is precisely the case the brief describes.
 */
async function fetchListingCandidates(
  sup: Sup,
  type: "project" | "product",
  intent: QueryIntent
): Promise<ListingRow[]> {
  const probes = intent.probes.slice(0, MAX_PROBES);
  const base = () =>
    sup
      .from("listings")
      .select(LISTING_SELECT)
      .eq("type", type)
      .eq("status", "APPROVED")
      .is("deleted_at", null);

  const queries: PromiseLike<{ data: unknown; error: unknown }>[] = [];

  // A — full text
  if (intent.query) {
    queries.push(
      base()
        .textSearch("search_vector", intent.query, { type: "websearch", config: "english" })
        .limit(CANDIDATE_LIMIT)
    );
  }

  // B — substring across searchable columns
  if (probes.length > 0) {
    const or = probes.flatMap((p) => LISTING_FIELDS.map((f) => orClause(f, p))).join(",");
    queries.push(base().or(or).limit(CANDIDATE_LIMIT));
  }

  // C — taxonomy, by value
  const taxIds = intent.taxonomy.map((t) => t.id);
  const productTypes = intent.taxonomy.map((t) => t.legacyProductType).filter(Boolean) as string[];
  const productCats = intent.taxonomy
    .map((t) => t.legacyProductCategory)
    .filter(Boolean) as string[];
  const projectCats = intent.taxonomy
    .map((t) => t.legacyProjectCategory)
    .filter(Boolean) as string[];
  // Slugs too: `product_type`/`product_category` hold taxonomy slugs directly
  // on most rows, and the legacy_* columns are only partly populated.
  const slugs = intent.taxonomy.map((t) => t.slug).filter(Boolean);

  if (taxIds.length > 0) {
    queries.push(base().in("taxonomy_node_id", taxIds.slice(0, 50)).limit(CANDIDATE_LIMIT));
  }
  if (type === "product") {
    const t = [...new Set([...productTypes, ...slugs])].slice(0, 50);
    const c = [...new Set([...productCats, ...slugs])].slice(0, 50);
    if (t.length > 0) queries.push(base().in("product_type", t).limit(CANDIDATE_LIMIT));
    if (c.length > 0) queries.push(base().in("product_category", c).limit(CANDIDATE_LIMIT));
  } else {
    const c = [...new Set([...projectCats, ...intent.taxonomy.map((t) => t.label)])].slice(0, 50);
    if (c.length > 0) {
      queries.push(base().in("category", c).limit(CANDIDATE_LIMIT));
      queries.push(base().in("project_category", c).limit(CANDIDATE_LIMIT));
    }
  }

  const settled = await Promise.all(queries.map((q) => Promise.resolve(q).catch(() => null)));
  const byId = new Map<string, ListingRow>();
  for (const res of settled) {
    if (!res || res.error) continue;
    for (const row of (res.data ?? []) as ListingRow[]) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** Candidate profiles of one role, by the same substring-across-columns rule. */
async function fetchProfileCandidates(
  sup: Sup,
  role: "designer" | "brand",
  intent: QueryIntent
): Promise<ProfileRow[]> {
  const probes = intent.probes.slice(0, MAX_PROBES);
  if (probes.length === 0) return [];

  const or = probes.flatMap((p) => PROFILE_FIELDS.map((f) => orClause(f, p))).join(",");
  const { data, error } = await sup
    .from("profiles")
    .select(
      "id, role, display_name, username, bio, short_bio, designer_discipline, brand_type, location, location_city, location_country, avatar_url, cover_image_url"
    )
    .eq("role", role)
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .or(or)
    .limit(CANDIDATE_LIMIT);

  if (error) return [];
  return (data ?? []) as ProfileRow[];
}

/** Material names per listing, unioning the two disjoint systems. */
async function fetchMaterialsFor(
  sup: Sup,
  projectIds: string[],
  productIds: string[]
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const add = (id: string, name: string | null) => {
    if (!id || !name) return;
    const list = out.get(id) ?? [];
    if (!list.includes(name)) list.push(name);
    out.set(id, list);
  };

  const all = [...projectIds, ...productIds];
  if (all.length === 0) return out;

  /*
   * Two systems, deliberately both. `project_material_links` /
   * `product_material_links` point at the `materials` table; a separate set of
   * rows attaches materials as taxonomy nodes through `listing_taxonomy_node`.
   * They do not overlap, so reading either one alone loses real data.
   */
  const [projLinks, prodLinks, taxLinks] = await Promise.all([
    projectIds.length
      ? sup
          .from("project_material_links")
          .select("project_id, materials(name, slug)")
          .in("project_id", projectIds.slice(0, 300))
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? sup
          .from("product_material_links")
          .select("product_id, materials(name, slug)")
          .in("product_id", productIds.slice(0, 300))
      : Promise.resolve({ data: [], error: null }),
    sup
      .from("listing_taxonomy_node")
      .select("listing_id, taxonomy_nodes:taxonomy_node_id(domain, label, slug)")
      .in("listing_id", all.slice(0, 300)),
  ]);

  type MatRef = { name: string | null; slug: string | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  for (const r of (projLinks.data ?? []) as { project_id: string; materials: MatRef | MatRef[] | null }[]) {
    const m = one(r.materials);
    add(r.project_id, m?.name ?? m?.slug ?? null);
  }
  for (const r of (prodLinks.data ?? []) as { product_id: string; materials: MatRef | MatRef[] | null }[]) {
    const m = one(r.materials);
    add(r.product_id, m?.name ?? m?.slug ?? null);
  }
  for (const r of (taxLinks.data ?? []) as {
    listing_id: string;
    taxonomy_nodes: { domain: string; label: string; slug: string } | { domain: string; label: string; slug: string }[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (n?.domain === "material") add(r.listing_id, n.label ?? n.slug);
  }
  return out;
}

/** Primary category node per listing, for the subtitle and the canonical URL. */
async function fetchTaxonomyFor(
  sup: Sup,
  listingIds: string[]
): Promise<Map<string, { label: string; slugPath: string }>> {
  const out = new Map<string, { label: string; slugPath: string }>();
  if (listingIds.length === 0) return out;

  const { data } = await sup
    .from("listing_taxonomy_node")
    .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, label, slug_path)")
    .in("listing_id", listingIds.slice(0, 300));

  type Node = { domain: string; label: string; slug_path: string };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  for (const r of (data ?? []) as {
    listing_id: string;
    is_primary: boolean | null;
    taxonomy_nodes: Node | Node[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n) continue;
    // Category domains only — a material node is not this listing's category.
    if (n.domain !== "product" && n.domain !== "project") continue;
    if (!out.has(r.listing_id) || r.is_primary) {
      out.set(r.listing_id, { label: n.label, slugPath: n.slug_path });
    }
  }
  return out;
}

/** Display names for owning profiles. */
async function fetchOwners(
  sup: Sup,
  ids: string[]
): Promise<Map<string, { name: string; username: string | null; avatar: string | null }>> {
  const out = new Map<string, { name: string; username: string | null; avatar: string | null }>();
  if (ids.length === 0) return out;
  const { data } = await sup
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", ids.slice(0, 300));
  for (const r of (data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[]) {
    out.set(r.id, {
      name: r.display_name?.trim() || r.username?.trim() || "",
      username: r.username,
      avatar: r.avatar_url,
    });
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SearchOptions {
  /** Restrict the returned page to one entity type. Counts always cover all. */
  entity?: SearchEntity | "all";
  page?: number;
  perPage?: number;
}

export async function searchAll(
  rawQuery: string,
  { entity = "all", page = 1, perPage = DEFAULT_PER_PAGE }: SearchOptions = {}
): Promise<SearchResult & { intent: QueryIntent }> {
  const intent = await resolveQueryIntent(rawQuery);
  const emptyCounts: SearchCounts = { all: 0, project: 0, product: 0, designer: 0, brand: 0 };

  if (!intent.query) {
    return {
      hits: [],
      counts: emptyCounts,
      total: 0,
      page: 1,
      perPage,
      pageCount: 0,
      intent,
    };
  }

  const sup = getSupabaseServiceClient();

  const [projects, products, designers, brands] = await Promise.all([
    fetchListingCandidates(sup, "project", intent),
    fetchListingCandidates(sup, "product", intent),
    fetchProfileCandidates(sup, "designer", intent),
    fetchProfileCandidates(sup, "brand", intent),
  ]);

  const listingIds = [...projects, ...products].map((r) => r.id);
  const ownerIds = [...new Set([...projects, ...products].map((r) => r.owner_profile_id).filter(Boolean))] as string[];

  const [materials, taxonomy, owners] = await Promise.all([
    fetchMaterialsFor(sup, projects.map((p) => p.id), products.map((p) => p.id)),
    fetchTaxonomyFor(sup, listingIds),
    fetchOwners(sup, ownerIds),
  ]);

  const hits: SearchHit[] = [];

  /* ── Listings ── */
  for (const row of [...projects, ...products]) {
    const entityType: SearchEntity = row.type === "product" ? "product" : "project";
    const tax = taxonomy.get(row.id) ?? null;
    const mats = materials.get(row.id) ?? [];
    const owner = row.owner_profile_id ? owners.get(row.owner_profile_id) ?? null : null;

    /*
     * `location_city` is null on 46 of 53 projects, while `location_text`
     * usually carries the full "Los Angeles, California, United States". The
     * obvious city-then-country join therefore collapsed most projects to
     * their country alone — which is not just a worse label, it lost the city
     * a search had asked for: the one Los Angeles project in the corpus
     * displayed as "United States". Prefer the richer field whenever the
     * structured city is missing.
     */
    const locationText =
      (row.location_city?.trim()
        ? [row.location_city.trim(), row.location_country?.trim()].filter(Boolean).join(", ")
        : null) ||
      row.location_text?.trim() ||
      row.location?.trim() ||
      row.location_country?.trim() ||
      null;
    /** Every place string on the row, for matching rather than display. */
    const locationHaystack = [
      locationText,
      row.location,
      row.location_text,
      row.location_city,
      row.location_country,
    ]
      .filter(Boolean)
      .join(" ");

    const categories = [
      row.category,
      row.project_category,
      row.product_type,
      row.product_category,
      row.product_subcategory,
      tax?.label ?? null,
    ]
      .filter(Boolean)
      .map((c) => String(c).replace(/-/g, " "));

    const parts = scoreFields(intent, {
      title: row.title ?? "",
      categories,
      materials: mats,
      location: locationHaystack,
      owner: owner?.name ?? "",
      description: [row.description, row.feature_highlight, row.material_or_finish]
        .filter(Boolean)
        .join(" "),
    });

    if (parts.score <= 0) continue;

    let score = parts.score;
    const matchedOn = [...parts.matchedOn];

    /*
     * The taxonomy the intent named, matched by node rather than by text —
     * and by DESCENDANT, not just by identity. A search for "lighting" names
     * the Lighting root, but every actual lamp is filed under a leaf like
     * "Pendant" several levels below it. Comparing ids alone meant the one
     * query most obviously about a category matched none of that category's
     * products. Paths are prefix-compared with a trailing slash so
     * "lighting" cannot match "lighting-controls".
     */
    const rowPath = tax?.slugPath ?? null;
    const namedThisNode =
      (row.taxonomy_node_id != null &&
        intent.taxonomy.some((t) => t.id === row.taxonomy_node_id)) ||
      (rowPath != null &&
        intent.taxonomy.some(
          (t) => t.slugPath && (rowPath === t.slugPath || rowPath.startsWith(`${t.slugPath}/`))
        ));
    if (namedThisNode) {
      score += TIER.taxonomy;
      if (!matchedOn.includes("taxonomy")) matchedOn.push("taxonomy");
    }

    score = applyIntentModifiers(
      score,
      matchedOn,
      intent,
      entityType,
      locationHaystack,
      categories
    );

    hits.push({
      id: row.id,
      entity: entityType,
      title: row.title?.trim() || "Untitled",
      href: getListingUrl({
        id: row.id,
        type: entityType,
        slug: row.slug,
        taxonomySlugPath: tax?.slugPath ?? null,
      }),
      // Guarded: a URL on a host missing from next.config's remotePatterns
      // makes next/image throw and takes the whole page down with it.
      imageUrl: renderableImageUrl(row.cover_image_url),
      subtitle: tax?.label ?? (categories[0] ? titleCase(categories[0]) : null),
      locationText,
      ownerName: owner?.name || null,
      ownerHref: owner?.username ? `/u/${owner.username}` : null,
      avatarUrl: renderableImageUrl(owner?.avatar),
      year: row.year,
      score,
      matchedOn,
    });
  }

  /* ── Profiles ── */
  for (const row of [...designers, ...brands]) {
    const entityType: SearchEntity = row.role === "brand" ? "brand" : "designer";
    const locationText =
      (row.location_city?.trim()
        ? [row.location_city.trim(), row.location_country?.trim()].filter(Boolean).join(", ")
        : null) ||
      row.location?.trim() ||
      row.location_country?.trim() ||
      null;
    const locationHaystack = [locationText, row.location, row.location_city, row.location_country]
      .filter(Boolean)
      .join(" ");
    const categories = [row.designer_discipline, row.brand_type].filter(Boolean) as string[];
    const name = row.display_name?.trim() || row.username?.trim() || "";

    const parts = scoreFields(intent, {
      title: name,
      categories,
      materials: [],
      location: locationHaystack,
      owner: row.username ?? "",
      description: [row.short_bio, row.bio].filter(Boolean).join(" "),
    });

    if (parts.score <= 0) continue;

    const score = applyIntentModifiers(
      parts.score,
      parts.matchedOn,
      intent,
      entityType,
      locationHaystack,
      categories
    );

    hits.push({
      id: row.id,
      entity: entityType,
      title: name || "Unnamed",
      href: row.username ? `/u/${row.username}` : `/u/${row.id}`,
      imageUrl: renderableImageUrl(row.cover_image_url),
      subtitle: categories[0] ?? (entityType === "brand" ? "Brand" : "Designer"),
      locationText,
      ownerName: null,
      ownerHref: null,
      avatarUrl: renderableImageUrl(row.avatar_url),
      year: null,
      score,
      matchedOn: parts.matchedOn,
    });
  }

  /*
   * Deterministic order: score, then entity (so ties group rather than
   * interleave arbitrarily), then title. The same query always produces the
   * same page — a ranking that reshuffles between two identical searches is
   * indistinguishable from a broken one.
   */
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.entity.localeCompare(b.entity) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id)
  );

  const counts: SearchCounts = {
    all: hits.length,
    project: hits.filter((h) => h.entity === "project").length,
    product: hits.filter((h) => h.entity === "product").length,
    designer: hits.filter((h) => h.entity === "designer").length,
    brand: hits.filter((h) => h.entity === "brand").length,
  };

  const scoped = entity === "all" ? hits : hits.filter((h) => h.entity === entity);
  const total = scoped.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * perPage;

  return {
    hits: scoped.slice(start, start + perPage),
    counts,
    total,
    page: safePage,
    perPage,
    pageCount,
    intent,
  };
}

/**
 * Intent applied on top of field evidence.
 *
 * Deliberately in this order: the place is decided first, because a named
 * place is the strongest constraint a person can put on a search and it should
 * not be outvoted by a category. Then the category bonus, then the entity
 * preference as a multiplier over the whole.
 */
function applyIntentModifiers(
  base: number,
  matchedOn: MatchReason[],
  intent: QueryIntent,
  entity: SearchEntity,
  locationHaystack: string | null,
  categories: string[]
): number {
  let score = base;

  if (intent.location) {
    // Every place string on the row, not the display label. The label is
    // often just the country.
    const loc = norm(locationHaystack);
    const wanted = norm(intent.location);
    const matches = loc.length > 0 && (loc.includes(wanted) || wanted.includes(loc));
    if (matches) {
      score += LOCATION_MATCH_BONUS;
      if (!matchedOn.includes("location")) matchedOn.push("location");
    } else {
      score *= LOCATION_MISMATCH_MULTIPLIER;
    }
  }

  const namedCategories = [
    ...intent.taxonomy.map((t) => t.label),
    ...intent.parsed.categories,
  ].map(norm);
  if (namedCategories.length > 0) {
    const own = categories.map(norm);
    if (own.some((c) => namedCategories.some((n) => c === n || hasWord(c, n) || hasWord(n, c)))) {
      score += CATEGORY_INTENT_BONUS;
      if (!matchedOn.includes("category")) matchedOn.push("category");
    }
  }

  return Math.round(score * preferenceFor(intent, entity));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
