import type { EntityType } from "@/lib/explore/parseSearchIntent";

/**
 * The normalized shape every entity collapses to once it has been searched.
 *
 * ── WHY NORMALIZE AT ALL ────────────────────────────────────────────────────
 * A universal result list has to sort a chair against a studio against a city
 * of projects. Those live in two tables with almost nothing in common, so the
 * only way to rank them against each other is to reduce each to the same few
 * fields and one comparable score. Everything the result card needs is here;
 * nothing else survives the boundary.
 *
 * ── AND WHY IT IS THE SEAM FOR SEMANTIC SEARCH ──────────────────────────────
 * `score` and `matchedOn` are the entire contract between how a hit was found
 * and how it is drawn. A vector-similarity retriever can be added as another
 * producer of SearchHit values — a new `matchedOn` reason, a score on the same
 * scale — without the results page, the tabs, the URLs or the cards changing.
 */
export type SearchEntity = EntityType;

/** Which field family produced a hit. Ordered strongest first. */
export type MatchReason =
  | "exact-title"
  | "prefix-title"
  | "title"
  | "category"
  | "taxonomy"
  | "material"
  | "location"
  | "owner"
  | "description";

export interface SearchHit {
  id: string;
  entity: SearchEntity;
  title: string;
  href: string;
  imageUrl: string | null;
  /** Category or discipline line, e.g. "Seating" or "Architect". */
  subtitle: string | null;
  /** "Copenhagen, Denmark" — whichever parts exist. */
  locationText: string | null;
  /** Owning studio or brand, for listings. */
  ownerName: string | null;
  ownerHref: string | null;
  avatarUrl: string | null;
  year: number | null;
  /** Relevance, high to low. Comparable ACROSS entity types by construction. */
  score: number;
  /** Why this hit matched, strongest first. Drives the "matched on" line. */
  matchedOn: MatchReason[];
  /**
   * Whether this hit satisfies the query's HIGH-CONFIDENCE intent — the
   * entity type the query named out loud, and the place it named.
   *
   * Everything is direct when the query stated neither, which is the common
   * case ("chair", "lighting") and the one where a plain ranked list is
   * already the right answer. The distinction only appears when someone asked
   * for something specific and part of it could not be met.
   */
  direct: boolean;
}

/**
 * The high-confidence constraints read off a query, when there were any.
 *
 * Null for a broad query. Present only when the searcher named an entity type
 * or a place, which are the two things it is rude to quietly ignore.
 */
export interface SearchConstraint {
  /** Plural label of the entity the query named, e.g. "brands". Null if none. */
  entityLabel: string | null;
  /** The entity types named, for filtering. */
  entities: SearchEntity[];
  /** The place named, title-cased for display. Null if none. */
  location: string | null;
  /** Direct matches across ALL entity types, independent of the active tab. */
  totalDirect: number;
}

export interface SearchCounts {
  all: number;
  project: number;
  product: number;
  designer: number;
  brand: number;
}

export interface SearchResult {
  /** The page of hits requested, already ranked, direct matches first. */
  hits: SearchHit[];
  /** High-confidence intent, when the query carried any. */
  constraint: SearchConstraint | null;
  /** Direct and related totals for the ACTIVE tab, across all its pages. */
  directTotal: number;
  relatedTotal: number;
  /** Totals for every tab, independent of the tab being shown. */
  counts: SearchCounts;
  /** Total matching the ACTIVE tab, which is what pagination walks. */
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}
