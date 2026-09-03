import { getCandidatePool } from "./candidates";
import { getInterestProfile } from "./interestProfile";
import { diversify, injectExploration } from "./diversity";
import { PUBLIC_LABEL_KINDS, scoreListing } from "./scoring";
import type { Candidate, InterestProfile, Reason, ScoredListing } from "./types";

/**
 * The personalized home feed: which sections exist, and what goes in them.
 *
 * ── SECTIONS ARE EARNED, NOT DECLARED ───────────────────────────────────────
 * Every section here can decline to exist. "From people you follow" is not
 * rendered empty for someone who follows nobody, and "Near you" is not
 * rendered at all for someone with no city — the brief is explicit, and an
 * empty personalized module is worse than no personalization, because it
 * advertises a feature the reader cannot use.
 *
 * ── ORDER FOLLOWS THE EVIDENCE ──────────────────────────────────────────────
 * A user with many saves and no follows should read "Inspired by your saves"
 * first. Sections therefore carry a weight derived from how much evidence
 * backs them, and are sorted by it, rather than sitting in a fixed order that
 * would put an empty-ish Following block above a rich Saves block.
 */

const MIN_SECTION_ITEMS = 4;
const FOR_YOU_SIZE = 12;
const SECTION_SIZE = 8;

export type SectionKey = "for_you" | "following" | "saves" | "near_you" | "discover_new";

export interface FeedItem {
  listingId: string;
  score: number;
  /** At most one short line the card may show. Null for most items. */
  contextLabel: string | null;
  /** Admin-only. Stripped for normal callers — see toPublicItem. */
  reasons?: Reason[];
}

export interface FeedSection {
  key: SectionKey;
  title: string;
  subtitle: string | null;
  items: FeedItem[];
}

export interface PersonalizedFeed {
  sections: FeedSection[];
  /** 0..0.9. Lets the UI stay quiet for near-cold accounts. */
  confidence: number;
  /** Admin diagnostics only. */
  debug?: {
    poolSize: number;
    strength: InterestProfile["strength"];
    topScores: { listingId: string; score: number; reasons: Reason[] }[];
  };
}

interface Placeable {
  scored: ScoredListing;
  candidate: Candidate;
}

/** The one line a card may carry, or null. Only viewer-owned facts qualify. */
function contextLabelFor(scored: ScoredListing, ownerNames: Map<string, string>): string | null {
  /*
   * ── EXPLANATIONS ARE RARE AND NEVER LEAK ────────────────────────────────
   * Only the single strongest reason is considered, only a few kinds are
   * eligible, and each names something the viewer already knows: a studio they
   * chose to follow, a board they named themselves, their own city. Nothing
   * here can reveal another person's boards, saves or activity, because none
   * of those are inputs to it.
   *
   * The interface stays quiet by design — the brief asks for personalization
   * to be felt through better content, not announced on every card.
   */
  const top = scored.topReason;
  if (!top || !PUBLIC_LABEL_KINDS.has(top.kind)) return null;

  if (top.kind === "follow_owner") {
    const id = top.detail?.replace("follows profile ", "");
    const name = id ? ownerNames.get(id) : null;
    return name ? `Because you follow ${name}` : "From someone you follow";
  }
  return top.label ?? null;
}

/**
 * Sections whose heading already states the reason.
 *
 * "From people and brands you follow" followed by twelve cards each captioned
 * "Because you follow X" says the same thing thirteen times. Labels are for the
 * MIXED sections, where an item's presence is not otherwise obvious — and even
 * there only the minority of items that have a strong reason get one.
 */
const SELF_EXPLANATORY: ReadonlySet<SectionKey> = new Set(["following", "saves", "near_you"]);

/**
 * At most this share of a section's cards may carry a line.
 *
 * Even in a mixed section, captioning three quarters of the grid turns the
 * feed into an algorithm explaining itself. A third is enough for the reader
 * to understand that the row is personal without the page saying so on every
 * tile — and the ones that keep their line are the strongest reasons, so what
 * survives is the most worth reading.
 */
const MAX_LABELLED_SHARE = 1 / 3;

/** Keep the strongest labels, clear the rest. Mutates the given items. */
function capLabels(items: FeedItem[]): FeedItem[] {
  const labelled = items.filter((i) => i.contextLabel);
  const keep = new Set(
    [...labelled].sort((a, b) => b.score - a.score).slice(0, Math.ceil(items.length * MAX_LABELLED_SHARE)).map((i) => i.listingId)
  );
  return items.map((i) => (i.contextLabel && !keep.has(i.listingId) ? { ...i, contextLabel: null } : i));
}

function toPublicItem(
  p: Placeable,
  ownerNames: Map<string, string>,
  includeDebug: boolean,
  section: SectionKey
): FeedItem {
  return {
    listingId: p.candidate.id,
    score: p.scored.score,
    contextLabel: SELF_EXPLANATORY.has(section) ? null : contextLabelFor(p.scored, ownerNames),
    ...(includeDebug ? { reasons: p.scored.reasons } : {}),
  };
}

function hasKind(s: ScoredListing, kind: string): boolean {
  return s.reasons.some((r) => r.kind === kind && r.weight > 0);
}

export interface BuildFeedOptions {
  profileId: string;
  clerkUserId: string;
  /** Admin diagnostics. Never set from a normal request. */
  includeDebug?: boolean;
  /** Listing ids the client has already been shown, to damp repetition. */
  seenListingIds?: string[];
}

export async function buildPersonalizedFeed(options: BuildFeedOptions): Promise<PersonalizedFeed> {
  const [profile, pool] = await Promise.all([
    getInterestProfile(options.profileId, options.clerkUserId),
    getCandidatePool(),
  ]);
  return assembleFeed(profile, pool, options);
}

/**
 * Section assembly, separated from fetching.
 *
 * Split out so the ranking, the diversity rules and the section thresholds can
 * be exercised against a constructed profile without inventing a user in the
 * database. Real personas — a brand-follower, a board-heavy saver, someone
 * with a city and nothing else — are represented as InterestProfile values in
 * a test rather than as rows, which is the only way to cover them on a
 * platform whose live behavioural data is one follower and two savers.
 */
export async function assembleFeed(
  profile: InterestProfile,
  pool: Candidate[],
  options: Omit<BuildFeedOptions, "profileId" | "clerkUserId">
): Promise<PersonalizedFeed> {
  const seen = new Set(options.seenListingIds ?? []);

  const scored: Placeable[] = pool.map((candidate) => ({
    candidate,
    scored: scoreListing(candidate, profile, { includeLabels: true }),
  }));

  /*
   * ── ALREADY SAVED AND ALREADY SEEN ARE DAMPED, NOT BANNED ────────────────
   * The brief is explicit that nothing should be permanently hidden for having
   * been seen or saved before. A saved listing is demoted hard because the
   * reader plainly already has it; a listing shown earlier in this session is
   * demoted gently so the next page differs from the last without the feed
   * running out of inventory on a 180-listing catalogue.
   */
  for (const p of scored) {
    if (profile.savedListingIds.has(p.candidate.id)) p.scored.score *= 0.15;
    else if (seen.has(p.candidate.id)) p.scored.score *= 0.55;
  }

  scored.sort((a, b) => b.scored.score - a.scored.score);

  // Names for the "Because you follow X" line — one query, followed profiles only.
  const ownerNames = await resolveOwnerNames(profile);

  const sections: { section: FeedSection; weight: number }[] = [];
  const used = new Set<string>();

  const take = (items: Placeable[], n: number): Placeable[] => {
    const out: Placeable[] = [];
    for (const p of items) {
      if (used.has(p.candidate.id)) continue;
      out.push(p);
      if (out.length >= n) break;
    }
    return out;
  };
  const commit = (items: Placeable[]) => items.forEach((p) => used.add(p.candidate.id));

  /*
   * ── DIVERSITY HAS TO HAPPEN DURING SELECTION, NOT AFTER IT ────────────────
   * Diversifying the finished list was the first attempt and it does nothing:
   * reordering twelve items that are all furniture still yields twelve pieces
   * of furniture. Measured on a follow-heavy persona, the "For you" row came
   * out with ten of twelve items sharing one root category and six crediting
   * the same studio, with every cap nominally in force.
   *
   * So a generous candidate set — several times the section size — is handed
   * to the diversifier, which walks it in score order applying the caps, and
   * only then is it cut to length. The caps now decide WHICH items are chosen
   * rather than merely what order the chosen ones appear in.
   */
  const OVERSAMPLE = 6;
  const pick = (items: Placeable[], n: number): Placeable[] =>
    diversify(take(items, n * OVERSAMPLE)).slice(0, n);

  // ── From people & brands you follow ───────────────────────────────────────
  const following = pick(scored.filter((p) => hasKind(p.scored, "follow_owner")), SECTION_SIZE);
  if (following.length >= Math.min(MIN_SECTION_ITEMS, 2)) {
    commit(following);
    sections.push({
      weight: 100 + profile.strength.follows * 4,
      section: {
        key: "following",
        title: "From people and brands you follow",
        subtitle: null,
        items: following.map((p) => toPublicItem(p, ownerNames, !!options.includeDebug, "following")),
      },
    });
  }

  // ── Inspired by your saves ────────────────────────────────────────────────
  const savesPool = scored.filter(
    (p) => hasKind(p.scored, "board") || hasKind(p.scored, "saved_taxonomy") || hasKind(p.scored, "saved_owner")
  );
  const saves = pick(savesPool, SECTION_SIZE);
  if (saves.length >= MIN_SECTION_ITEMS && profile.strength.savedItems > 0) {
    commit(saves);
    const board = profile.boards[0];
    sections.push({
      weight: 95 + profile.strength.savedItems * 3 + profile.strength.boards * 5,
      section: {
        key: "saves",
        title: board ? `Inspired by ${board.name}` : "Inspired by your saves",
        subtitle: board ? "Drawn from what you have been collecting." : null,
        items: saves.map((p) => toPublicItem(p, ownerNames, !!options.includeDebug, "saves")),
      },
    });
  }

  // ── Near you ──────────────────────────────────────────────────────────────
  const nearPool = scored.filter((p) => hasKind(p.scored, "location"));
  const near = pick(nearPool, SECTION_SIZE);
  const place = profile.location.city ?? profile.location.country;
  if (near.length >= MIN_SECTION_ITEMS && place) {
    commit(near);
    sections.push({
      weight: 60 + (profile.location.city ? 20 : 0),
      section: {
        key: "near_you",
        title: `Near ${place}`,
        subtitle: null,
        items: near.map((p) => toPublicItem(p, ownerNames, !!options.includeDebug, "near_you")),
      },
    });
  }

  // ── For you: the mixed feed, with discovery folded through it ─────────────
  const personalized = pick(scored, FOR_YOU_SIZE);
  const explorationPool = [...scored]
    .filter((p) => !used.has(p.candidate.id) && !personalized.includes(p))
    /* Deliberately outside the viewer's taste: things their own signals did NOT
       pick. Ordered by quality and freshness so "unfamiliar" never means "bad". */
    .filter((p) => !hasKind(p.scored, "follow_owner") && !hasKind(p.scored, "board"))
    .sort(
      (a, b) =>
        b.candidate.connectionCount - a.candidate.connectionCount ||
        Date.parse(b.candidate.createdAt) - Date.parse(a.candidate.createdAt)
    );

  const forYou = injectExploration(personalized, explorationPool, FOR_YOU_SIZE);
  if (forYou.length >= MIN_SECTION_ITEMS) {
    commit(forYou);
    sections.push({
      weight: 120,
      section: {
        key: "for_you",
        title: "For you",
        subtitle: null,
        items: capLabels(forYou.map((p) => toPublicItem(p, ownerNames, !!options.includeDebug, "for_you"))),
      },
    });
  }

  // ── Discover something new ────────────────────────────────────────────────
  const discover = pick(explorationPool, SECTION_SIZE);
  if (discover.length >= MIN_SECTION_ITEMS) {
    commit(discover);
    sections.push({
      weight: 30,
      section: {
        key: "discover_new",
        title: "Discover something new",
        subtitle: "Outside what you usually look at.",
        items: capLabels(discover.map((p) => toPublicItem(p, ownerNames, !!options.includeDebug, "discover_new"))),
      },
    });
  }

  sections.sort((a, b) => b.weight - a.weight);

  return {
    sections: sections.map((s) => s.section),
    confidence: profile.strength.confidence,
    ...(options.includeDebug
      ? {
          debug: {
            poolSize: pool.length,
            strength: profile.strength,
            topScores: scored.slice(0, 15).map((p) => ({
              listingId: p.candidate.id,
              score: p.scored.score,
              reasons: p.scored.reasons,
            })),
          },
        }
      : {}),
  };
}

/** Display names for followed profiles only — nothing else is ever named. */
async function resolveOwnerNames(profile: InterestProfile): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...profile.followedProfileIds];
  if (ids.length === 0) return out;
  const { getSupabaseServiceClient } = await import("@/lib/supabaseServer");
  const { data } = await getSupabaseServiceClient()
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  for (const p of (data ?? []) as { id: string; display_name: string | null }[]) {
    if (p.display_name) out.set(p.id, p.display_name);
  }
  return out;
}
