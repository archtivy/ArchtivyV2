import type { Candidate, InterestProfile, Reason, ScoredListing } from "./types";

/**
 * How much this viewer is likely to care about this listing, and why.
 *
 * ── THE WEIGHTS ARE THE POLICY ──────────────────────────────────────────────
 * Everything the ranking does is in this table. There is no model, no learned
 * parameter and nothing opaque: a person can read these numbers, disagree with
 * one, change it, and predict what will move. That is a requirement, not a
 * simplification — we have to be able to answer "why was this recommended to
 * this user" from first principles.
 *
 * The brief's intended mix — roughly 35% following, 25% saves/boards, 15%
 * location, 15% discovery, 10% trending — is expressed here as relative
 * weights and in the feed's section quotas, NOT as a literal percentage split
 * of any one list. A percentage of a ranked list is meaningless when a viewer
 * follows nobody.
 */
const W = {
  /* Direct relationship. Deliberately far above everything else: a followed
     studio publishing work is the single most useful thing this feed can say. */
  FOLLOW_OWNER: 120,
  FOLLOW_TAXONOMY: 70,

  /* Board membership character. The most deliberate signal a user produces. */
  BOARD_TAXONOMY: 85,
  BOARD_MATERIAL: 55,

  /* Looser saved affinity. Scaled by accumulated evidence, so one save nudges
     and twelve saves in one category speak clearly. */
  SAVED_TAXONOMY: 60,
  SAVED_MATERIAL: 40,
  SAVED_OWNER: 65,

  VIEWED_TAXONOMY: 18,

  /* Location, on the ladder the data actually supports. See interestProfile. */
  LOCATION_CITY: 45,
  LOCATION_COUNTRY: 16,
  /* Physical proximity, when both sides carry coordinates. Independent of the
     city string, which is unreliable and often absent. */
  LOCATION_NEARBY: 30,

  RECENCY: 30,
  QUALITY: 26,
  TRENDING: 14,
} as const;

/** Beyond this a listing is old news for a feed. */
const RECENCY_HALFLIFE_DAYS = 45;
/** Coordinates within this are treated as the same place. */
const NEARBY_KM = 120;

function daysSince(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 9999;
  return Math.max(0, (Date.now() - t) / 864e5);
}

/** Great-circle distance, km. Matches the approach already in notifications/create.ts. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Affinity 0..100 → multiplier 0..1, saturating so one obsession cannot dominate. */
function saturate(affinity: number): number {
  return 1 - Math.exp(-affinity / 30);
}

/** Best affinity across a listing's taxonomy paths and their ancestors. */
function bestTaxonomyAffinity(
  paths: string[],
  affinity: Map<string, number>
): { value: number; path: string | null } {
  let best = 0;
  let bestPath: string | null = null;
  for (const full of paths) {
    const parts = full.split("/").filter(Boolean);
    for (let d = parts.length; d >= 1; d--) {
      const p = parts.slice(0, d).join("/");
      const v = affinity.get(p) ?? 0;
      if (v > best) {
        best = v;
        bestPath = p;
      }
    }
  }
  return { value: best, path: bestPath };
}

export interface ScoreOptions {
  /** Names the viewer's own boards, for the public "Inspired by <board>" line. */
  includeLabels?: boolean;
}

/**
 * Score one candidate. Pure: same inputs, same output, no I/O.
 */
export function scoreListing(
  candidate: Candidate,
  profile: InterestProfile,
  options: ScoreOptions = {}
): ScoredListing {
  const reasons: Reason[] = [];
  const add = (kind: Reason["kind"], weight: number, label?: string, detail?: string) => {
    if (weight <= 0.5) return; // below this a reason is noise in the explanation
    reasons.push({ kind, weight: Math.round(weight * 10) / 10, label, detail });
  };

  // ── Following ─────────────────────────────────────────────────────────────
  const followedCredit = candidate.creditProfileIds.find((id) => profile.followedProfileIds.has(id));
  if (followedCredit) {
    add("follow_owner", W.FOLLOW_OWNER, undefined, `follows profile ${followedCredit}`);
  }
  if (candidate.taxonomyNodeIds.some((id) => profile.followedTaxonomyIds.has(id))) {
    add("follow_taxonomy", W.FOLLOW_TAXONOMY, undefined, "follows this category or material");
  }

  // ── Boards ────────────────────────────────────────────────────────────────
  // The strongest single board match wins; boards do not stack, or a user with
  // six similar boards would see nothing else.
  let bestBoard: { weight: number; name: string; detail: string } | null = null;
  for (const board of profile.boards) {
    let weight = 0;
    let via = "";
    for (const path of candidate.taxonomyPaths) {
      const parts = path.split("/").filter(Boolean);
      for (let d = parts.length; d >= 1; d--) {
        const p = parts.slice(0, d).join("/");
        const count = board.taxonomyPaths.get(p) ?? 0;
        if (count > 0) {
          const w = W.BOARD_TAXONOMY * saturate(count * 25) * (d / parts.length);
          if (w > weight) {
            weight = w;
            via = p;
          }
        }
      }
    }
    for (const m of candidate.materialIds) {
      const count = board.materialIds.get(m) ?? 0;
      if (count > 0) {
        const w = W.BOARD_MATERIAL * saturate(count * 25);
        if (w > weight) {
          weight = w;
          via = "material";
        }
      }
    }
    if (weight > (bestBoard?.weight ?? 0)) {
      bestBoard = { weight, name: board.name, detail: `board "${board.name}" via ${via}` };
    }
  }
  if (bestBoard) {
    add(
      "board",
      bestBoard.weight,
      options.includeLabels ? `Inspired by ${bestBoard.name}` : undefined,
      bestBoard.detail
    );
  }

  // ── Loose saved affinity ──────────────────────────────────────────────────
  const tax = bestTaxonomyAffinity(candidate.taxonomyPaths, profile.taxonomyAffinity);
  if (tax.value > 0) {
    add("saved_taxonomy", W.SAVED_TAXONOMY * saturate(tax.value), undefined, `affinity for ${tax.path}`);
  }

  let bestMaterial = 0;
  for (const m of candidate.materialIds) {
    bestMaterial = Math.max(bestMaterial, profile.materialAffinity.get(m) ?? 0);
  }
  if (bestMaterial > 0) {
    add("saved_material", W.SAVED_MATERIAL * saturate(bestMaterial), undefined, "material affinity");
  }

  let bestOwner = 0;
  for (const id of candidate.creditProfileIds) {
    bestOwner = Math.max(bestOwner, profile.ownerAffinity.get(id) ?? 0);
  }
  // Only meaningful when they do NOT already follow them — otherwise it is the
  // same fact counted twice, at two different weights.
  if (bestOwner > 0 && !followedCredit) {
    add("saved_owner", W.SAVED_OWNER * saturate(bestOwner), undefined, "saved their work before");
  }

  // ── Viewing ───────────────────────────────────────────────────────────────
  if (tax.value > 0 && profile.strength.views > 0) {
    add("viewed", W.VIEWED_TAXONOMY * saturate(tax.value) * 0.5, undefined, "browses this category");
  }

  // ── Location, City → Country → Global ─────────────────────────────────────
  const loc = profile.location;
  if (loc.city && candidate.city && loc.city.toLowerCase() === candidate.city.toLowerCase()) {
    add("location", W.LOCATION_CITY, options.includeLabels ? `In ${candidate.city}` : undefined);
  } else if (
    loc.lat != null &&
    loc.lng != null &&
    candidate.lat != null &&
    candidate.lng != null &&
    distanceKm(loc.lat, loc.lng, candidate.lat, candidate.lng) <= NEARBY_KM
  ) {
    add("location", W.LOCATION_NEARBY, options.includeLabels ? "Near you" : undefined);
  } else if (
    loc.country &&
    candidate.country &&
    loc.country.toLowerCase() === candidate.country.toLowerCase()
  ) {
    add("location", W.LOCATION_COUNTRY, undefined, "same country");
  }

  // ── Quality, recency, popularity ──────────────────────────────────────────
  // These apply to everyone, including brand-new accounts, which is what makes
  // a cold-start feed coherent rather than empty.
  const age = daysSince(candidate.createdAt);
  add("recency", W.RECENCY * Math.pow(0.5, age / RECENCY_HALFLIFE_DAYS), undefined, `${Math.round(age)}d old`);

  // "Quality" here is how connected a listing is — a project crediting real
  // products and people is a better page than one crediting nothing. It is
  // structural, not a judgement about the architecture.
  if (candidate.connectionCount > 0) {
    add("quality", W.QUALITY * saturate(candidate.connectionCount * 18), undefined, `${candidate.connectionCount} connections`);
  }

  if (candidate.viewsCount > 0) {
    add("trending", W.TRENDING * saturate(candidate.viewsCount * 2), undefined, `${candidate.viewsCount} views`);
  }

  const score = reasons.reduce((sum, r) => sum + r.weight, 0);
  const topReason = reasons.length
    ? reasons.reduce((best, r) => (r.weight > best.weight ? r : best))
    : null;

  return { listingId: candidate.id, score: Math.round(score * 10) / 10, reasons, topReason };
}

/** Reason kinds that count as a direct relationship, for notification gating. */
export const DIRECT_KINDS: ReadonlySet<string> = new Set(["follow_owner", "follow_taxonomy"]);

/** Reason kinds a card may name to the viewer. The rest stay internal. */
export const PUBLIC_LABEL_KINDS: ReadonlySet<string> = new Set(["follow_owner", "board", "location"]);
