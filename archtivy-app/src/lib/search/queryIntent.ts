import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import {
  parseSearchIntent,
  ALL_ENTITIES,
  type EntityType,
  type SearchIntent,
} from "@/lib/explore/parseSearchIntent";

/**
 * Deterministic query understanding for universal search.
 *
 * ── TWO LAYERS, NEITHER OF THEM A REDIRECT ──────────────────────────────────
 * The linguistic layer is the existing Explore parser, reused rather than
 * reimplemented. It knows the shape of a sentence: that "in Los Angeles" is a
 * place, that "brands" names an entity, that "wood" is a material. It is the
 * same vocabulary the map searches with, so the two surfaces cannot drift.
 *
 * The second layer is this file's own, and it is the important one: the query
 * is matched against the taxonomy TABLE. "seating", "lighting", "surfaces",
 * "residential" are not listed in any dictionary here — they are looked up
 * live in `taxonomy_nodes`, so the day someone adds a category in the admin
 * panel it becomes searchable without a deploy.
 *
 * What comes out is a set of WEIGHTS, never a destination. Nothing in this
 * module can send a query to one entity type or exclude another; it can only
 * say that products look more likely than projects for this phrasing, and let
 * the ranker weigh that against how well each individual row actually matched.
 * "chair" leans products because chairs are products in this data — not
 * because a rule says the word chair means the products page.
 */

/** A taxonomy node the query named, resolved from the database. */
export interface TaxonomyMatch {
  id: string;
  domain: string;
  slug: string;
  slugPath: string;
  label: string;
  depth: number;
  /** Legacy denormalised columns still carried on `listings`. */
  legacyProductType: string | null;
  legacyProductCategory: string | null;
  legacyProjectCategory: string | null;
  /** Whole query equalled the label/slug, rather than merely containing it. */
  exact: boolean;
}

export interface QueryIntent {
  /** The raw query, trimmed. */
  query: string;
  /** Linguistic parse: entity words, location, categories, materials, styles. */
  parsed: SearchIntent;
  /** Taxonomy nodes named by the query, from the live table. */
  taxonomy: TaxonomyMatch[];
  /**
   * Entity types this phrasing leans toward, strongest first. A PREFERENCE
   * applied as a score multiplier — never a filter. An empty array means the
   * query named nothing type-specific and all four compete on merit alone.
   */
  preferredEntities: EntityType[];
  /**
   * The terms actually worth running against the database: the whole query,
   * plus the parts left once entity words and prepositions are removed.
   * "residential projects in Los Angeles" probes "residential" and
   * "los angeles", never the full sentence, which matches no title on earth.
   */
  probes: string[];
  /**
   * Entity types the query named OUT LOUD. Distinct from `preferredEntities`,
   * which includes guesses: "chair" prefers products, but only "products"
   * makes products explicit. Explicit intent is the only kind strong enough
   * to separate direct matches from related ones.
   */
  explicitEntities: EntityType[];
  /** Place named by the query, if any. */
  location: string | null;
  /** Canonical material names the query named. */
  materials: string[];
  /** One line describing what was understood, for the results header. */
  label: string;
}

/** Domains whose nodes describe a PRODUCT rather than a project. */
const PRODUCT_DOMAINS = new Set(["product"]);
/** Domains whose nodes describe a PROJECT. */
const PROJECT_DOMAINS = new Set(["project", "space_type", "intervention_type"]);

const MIN_PROBE_LENGTH = 2;

/** Shortest term allowed to match a taxonomy label by word rather than whole. */
const MIN_PARTIAL_TERM = 4;

/**
 * Words never worth probing: they name an entity or join a sentence, and
 * nothing is titled after them. Probing "projects" would match every listing
 * with the word in its description and flatten the ranking.
 */
const STOP_PROBES = new Set([
  "the", "a", "an", "and", "or", "with", "for", "of", "to", "by", "in", "on",
  "at", "from", "near", "around", "project", "projects", "product", "products",
  "brand", "brands", "designer", "designers", "studio", "studios", "architect",
  "architects", "firm", "firms", "practice", "practices", "company",
  "companies", "manufacturer", "manufacturers", "supplier", "suppliers",
]);

/**
 * Every active taxonomy node, as a flat list.
 *
 * 1,110 rows of short text — about 90KB. Small enough to hold for an hour and
 * match in memory, which turns query understanding into zero database round
 * trips on all but the first search of the hour. Cached as a plain array:
 * `unstable_cache` serialises its value through JSON, so a Map or a Set would
 * arrive at the caller as `{}`.
 */
async function fetchTaxonomyIndex(): Promise<TaxonomyMatch[]> {
  const sup = getSupabaseServiceClient();
  const rows: TaxonomyMatch[] = [];
  // Paged: PostgREST caps a response at 1000 rows and there are more.
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sup
      .from("taxonomy_nodes")
      .select(
        "id, domain, slug, slug_path, label, depth, legacy_product_type, legacy_product_category, legacy_project_category"
      )
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data as Record<string, unknown>[]) {
      rows.push({
        id: String(r.id),
        domain: String(r.domain ?? ""),
        slug: String(r.slug ?? ""),
        slugPath: String(r.slug_path ?? ""),
        label: String(r.label ?? ""),
        depth: Number(r.depth ?? 0),
        legacyProductType: (r.legacy_product_type as string | null) ?? null,
        legacyProductCategory: (r.legacy_product_category as string | null) ?? null,
        legacyProjectCategory: (r.legacy_project_category as string | null) ?? null,
        exact: false,
      });
    }
    if (data.length < PAGE) break;
  }
  return rows;
}

const getCachedTaxonomyIndex = unstable_cache(fetchTaxonomyIndex, ["search-taxonomy-index"], {
  revalidate: 3600,
  tags: ["taxonomy"],
});

/**
 * The index, cached when a cache is available and fetched directly when it is
 * not.
 *
 * `unstable_cache` throws outright when there is no incremental cache in
 * scope — a script, a test harness, some edge contexts. The first version of
 * this fell back to an empty index, which did not fail, it just quietly turned
 * the data-driven half of query understanding off: taxonomy matching returned
 * nothing for every query and the ranking silently got worse. Degrade to
 * slower, never to dumber.
 */
async function getTaxonomyIndex(): Promise<TaxonomyMatch[]> {
  try {
    return await getCachedTaxonomyIndex();
  } catch {
    return fetchTaxonomyIndex();
  }
}

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Naive singular, enough to let "chairs" reach a node labelled "Chair". */
function singular(w: string): string {
  if (w.length > 3 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Whole-word containment, in either spelling of the label's words. */
function containsWord(label: string, term: string): boolean {
  if (!label) return false;
  for (const w of label.split(/[\s-]+/)) {
    if (w === term || singular(w) === term) return true;
  }
  return false;
}

/** Both spellings of a term, deduped. */
function variants(term: string): string[] {
  const n = normalize(term);
  const s = n
    .split(" ")
    .map((w) => singular(w))
    .join(" ");
  return s === n ? [n] : [n, s];
}

export async function resolveQueryIntent(rawQuery: string): Promise<QueryIntent> {
  const query = rawQuery.trim();
  const empty: QueryIntent = {
    query,
    parsed: parseSearchIntent("", { entities: ALL_ENTITIES }),
    taxonomy: [],
    preferredEntities: [],
    explicitEntities: [],
    probes: [],
    location: null,
    materials: [],
    label: "",
  };
  if (!query) return empty;

  const parsed = parseSearchIntent(query, { entities: ALL_ENTITIES });
  const normQuery = normalize(query);


  /* ── Probes ──────────────────────────────────────────────────────────────
     What actually gets run against the database. The full query first, so a
     listing literally called "Wood House" wins outright; then the pieces the
     parser isolated, so a sentence still finds rows that match only part of
     it. Entity words ("projects", "brands") and prepositions are already
     stripped by the parser and deliberately never probed — nothing is titled
     "projects". */
  const probeSet = new Set<string>();
  const addProbe = (t: string | null | undefined) => {
    if (!t) return;
    const n = normalize(t);
    if (n.length >= MIN_PROBE_LENGTH) probeSet.add(n);
  };
  addProbe(query);
  addProbe(parsed.freeText);
  addProbe(parsed.location);
  for (const c of parsed.categories) addProbe(c);
  for (const m of parsed.materials) addProbe(m);
  for (const s of parsed.styles) addProbe(s);
  /*
   * Every word of the query, not just the leftovers.
   *
   * The parser CONSUMES words it recognises: in "wood house" it takes "wood"
   * as a material and "house" as the Residential category, leaving free text
   * empty. Probing only the leftovers meant no row could match "house" in its
   * title, and a project actually called "Forest House" lost to one merely
   * categorised Residential. A recognised word is a stronger signal than an
   * unrecognised one, so it should be probed harder, not dropped.
   */
  for (const w of normQuery.split(" ")) {
    if (!STOP_PROBES.has(w)) addProbe(w);
  }

  /* ── Taxonomy ────────────────────────────────────────────────────────────
     The data-driven half. Matched against label and slug, in both the given
     and singular spellings. */
  const index = await getTaxonomyIndex().catch(() => [] as TaxonomyMatch[]);
  // An empty index here means the fetch itself failed. Search still works on
  // text alone; it just loses the category signal for this request.
  const terms = new Set<string>();
  for (const p of probeSet) for (const v of variants(p)) terms.add(v);

  const taxonomy: TaxonomyMatch[] = [];
  const seenNode = new Set<string>();
  for (const node of index) {
    const label = normalize(node.label);
    const slug = normalize(node.slug.replace(/-/g, " "));
    if (!label && !slug) continue;
    const labelVariants = new Set([label, singular(label), slug, singular(slug)]);

    /*
     * Two strengths of match.
     *
     * WHOLE LABEL — the term IS the category. "lighting" is the Lighting node.
     *
     * WORD WITHIN THE LABEL — the term names part of it. "surface" reaches
     * "Solid Surfaces", "Wall Surfaces", "Concrete surface"; "light" reaches
     * "Path light" and "Recessed light". Whole-label matching alone missed all
     * of these, which is why a search for "surface brands" found no surface
     * category at all. Restricted to terms of four characters or more so short
     * fragments cannot drag in half the tree.
     */
    let hit = false;
    let exact = false;
    for (const t of terms) {
      if (labelVariants.has(t)) {
        hit = true;
        // "Exact" means the WHOLE query was this category, which is what
        // separates a search for "lighting" from one for "lighting in a
        // converted barn".
        if (variants(normQuery).includes(t)) exact = true;
        break;
      }
    }
    if (!hit) {
      for (const t of terms) {
        if (t.length < MIN_PARTIAL_TERM) continue;
        if (containsWord(label, t) || containsWord(slug, t)) {
          hit = true;
          break;
        }
      }
    }
    if (hit && !seenNode.has(node.id)) {
      seenNode.add(node.id);
      taxonomy.push({ ...node, exact });
    }
  }

  /* ── Preference ──────────────────────────────────────────────────────────
     Read off the domains the query landed in, not off a word list. A query
     that hits `product` nodes leans products; one that hits `project` or
     `space_type` nodes leans projects. The parser's own inference comes
     first when it made one, because an explicit "brands" in the query is a
     stronger signal than a category that happens to exist in both trees. */
  const preferred: EntityType[] = [];
  const prefer = (t: EntityType) => {
    if (!preferred.includes(t)) preferred.push(t);
  };
  for (const t of parsed.types) prefer(t);

  const hasProductNode = taxonomy.some((t) => PRODUCT_DOMAINS.has(t.domain));
  const hasProjectNode = taxonomy.some((t) => PROJECT_DOMAINS.has(t.domain));
  if (hasProductNode) {
    prefer("product");
    // Whoever makes the thing is a reasonable second answer to a query that
    // named the thing.
    prefer("brand");
  }
  if (hasProjectNode) prefer("project");
  // A discipline node ("architecture", "interior design") is about people.
  if (taxonomy.some((t) => t.domain === "discipline" || t.domain === "professional_role")) {
    prefer("designer");
  }
  if (taxonomy.some((t) => t.domain === "organization_type")) prefer("brand");

  /*
   * ── NOT EVERYTHING AFTER "IN" IS A PLACE ─────────────────────────────────
   * The parser reads the text following a preposition as a location, which is
   * right for "studios in Tokyo" and wrong for "table in walnut" or "seating
   * in oak". Left unchecked that would set a location constraint no row could
   * satisfy, and every result would be filed as merely related — an apology
   * for a search that worked.
   *
   * The test is the taxonomy, not a list of banned words: if the phrase
   * resolves to a material, style or product node, it names a thing rather
   * than a place. Place names are not in the taxonomy, so real locations pass
   * through untouched.
   */
  const NON_PLACE_DOMAINS = new Set(["material", "style", "product", "mood", "sustainability"]);
  const locationNorm = parsed.location ? normalize(parsed.location) : null;
  const locationIsThing =
    locationNorm != null &&
    index.some(
      (n) =>
        NON_PLACE_DOMAINS.has(n.domain) &&
        variants(locationNorm).some((v) => v === normalize(n.label) || v === normalize(n.slug))
    );

  return {
    query,
    parsed,
    taxonomy,
    preferredEntities: preferred,
    explicitEntities: parsed.explicitTypes,
    probes: [...probeSet],
    location: locationIsThing ? null : locationNorm,
    materials: parsed.materials,
    label: parsed.label,
  };
}
