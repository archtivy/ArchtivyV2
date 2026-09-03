/**
 * The shared personalization vocabulary.
 *
 * ── ONE LAYER, TWO CONSUMERS ────────────────────────────────────────────────
 * The home feed and the notification centre ask the same question — "how much
 * does this person care about this listing, and why" — so they ask it of the
 * same code. `scoreListing` produces both the number and the reasons; the feed
 * ranks by the number, and notifications gate on it. Two scorers would drift
 * within a release, and this codebase has that failure on record repeatedly.
 *
 * ── EVERY SCORE CARRIES ITS REASONS ─────────────────────────────────────────
 * A recommendation that cannot explain itself cannot be debugged, tuned, or
 * defended. Reasons are produced by the scorer, not reconstructed afterwards,
 * so the explanation is the actual arithmetic rather than a plausible story
 * told about it. They are also what the UI's occasional "Because you follow X"
 * line is drawn from — and what admin diagnostics read.
 */

export type SignalKind =
  | "follow_owner"      // follows a designer/brand behind this listing
  | "follow_taxonomy"   // follows the category or material
  | "board"             // matches a board's inferred character
  | "saved_taxonomy"    // category/style resembles what they save
  | "saved_material"
  | "saved_owner"       // saved other work by this designer/brand
  | "viewed"            // looked at this kind of thing repeatedly
  | "location"
  | "recency"
  | "quality"
  | "trending"
  | "exploration";      // deliberately outside known taste

/** One contributing signal. `label` is safe to show a user; `detail` is not. */
export interface Reason {
  kind: SignalKind;
  /** Points this signal contributed. */
  weight: number;
  /**
   * Public phrasing, e.g. "Because you follow Norm Architects".
   *
   * Only ever names things the VIEWER already knows — their own follows, their
   * own board names, their own city. It must never name another user, another
   * user's board, or anything a viewer could not have seen themselves.
   */
  label?: string;
  /** Diagnostic only. Never serialised to a non-admin caller. */
  detail?: string;
}

export interface ScoredListing {
  listingId: string;
  score: number;
  reasons: Reason[];
  /** The strongest reason, used to pick the single line a card may show. */
  topReason: Reason | null;
}

/** How much evidence we actually have. Drives section order and cold-start. */
export interface SignalStrength {
  follows: number;
  savedItems: number;
  boards: number;
  views: number;
  hasLocation: boolean;
  /**
   * 0 → nothing known, personalization is effectively editorial.
   * 1 → plenty of evidence.
   *
   * Used to blend personalization in gradually rather than switching it on at
   * an arbitrary threshold, and to keep the homepage from ever becoming 100%
   * personalized for anyone.
   */
  confidence: number;
}

/** A board's inferred character, used for "Inspired by <board>". */
export interface BoardAffinity {
  id: string;
  name: string;
  itemCount: number;
  /** Taxonomy paths and their counts within this board. */
  taxonomyPaths: Map<string, number>;
  materialIds: Map<string, number>;
  cities: Map<string, number>;
}

export interface InterestProfile {
  profileId: string;
  clerkUserId: string;

  /** Designers and brands the viewer follows, as profile ids. */
  followedProfileIds: Set<string>;
  /** Taxonomy nodes the viewer follows (category / material). */
  followedTaxonomyIds: Set<string>;

  /** Listings already on a board — never re-recommended as "new". */
  savedListingIds: Set<string>;

  /**
   * Accumulated affinity. Keys are taxonomy slug paths at every depth, so
   * "furniture/seating/armchair" also credits "furniture/seating" and
   * "furniture" — a saved armchair is evidence about seating and about
   * furniture, just progressively weaker.
   */
  taxonomyAffinity: Map<string, number>;
  materialAffinity: Map<string, number>;
  ownerAffinity: Map<string, number>;

  boards: BoardAffinity[];

  location: {
    city: string | null;
    /** No region column exists; see the note in interestProfile.ts. */
    country: string | null;
    lat: number | null;
    lng: number | null;
  };

  /** listing ids seen recently, for the "viewed" signal and repetition damping. */
  viewedListingIds: Map<string, number>;

  strength: SignalStrength;
}

/** A listing considered for the feed, with everything scoring needs. */
export interface Candidate {
  id: string;
  type: "project" | "product";
  slug: string | null;
  title: string;
  createdAt: string;
  ownerProfileId: string | null;
  /** Every profile credited on it — studio, designers, brand. */
  creditProfileIds: string[];
  taxonomyPaths: string[];
  taxonomyNodeIds: string[];
  materialIds: string[];
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  viewsCount: number;
  /** project_product_links either way round: how connected this listing is. */
  connectionCount: number;
}
