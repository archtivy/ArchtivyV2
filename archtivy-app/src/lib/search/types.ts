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
}

export interface SearchCounts {
  all: number;
  project: number;
  product: number;
  designer: number;
  brand: number;
}

export interface SearchResult {
  /** The page of hits requested, already ranked. */
  hits: SearchHit[];
  /** Totals for every tab, independent of the tab being shown. */
  counts: SearchCounts;
  /** Total matching the ACTIVE tab, which is what pagination walks. */
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}
