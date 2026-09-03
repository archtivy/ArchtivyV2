import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { createNotification } from "@/lib/db/notifications";
import { getCandidatePool } from "./candidates";
import { getInterestProfile } from "./interestProfile";
import { scoreListing } from "./scoring";
import { getListingUrl } from "@/lib/canonical";
import type { Candidate, InterestProfile } from "./types";

/**
 * Smart notifications — the same relevance layer, used to decide what is worth
 * interrupting someone for.
 *
 * ── AN EVENT IS NOT A NOTIFICATION ──────────────────────────────────────────
 * The governing rule. Plenty of things happen that are mildly relevant to
 * someone; almost none of them justify a notification. Three tiers, and only
 * the first two ever produce a row:
 *
 *   HIGH    a direct relationship — a followed studio published, a product on
 *           your board turned up inside a new project. Sent individually.
 *   MEDIUM  genuinely relevant but not about anything you follow. Aggregated
 *           into ONE notification standing for several listings.
 *   LOW     everything else. Appears in the feed and nowhere else.
 *
 * There are no engagement notifications here. Nothing says "trending", "don't
 * miss" or "people are looking at" — those are growth mechanics, not
 * discovery, and this platform's notification centre is a working tool.
 *
 * ── WHY THIS RUNS ON READ, NOT ON A SCHEDULE ────────────────────────────────
 * Digests want a periodic job, and this project cannot have one: Vercel Hobby
 * allows two cron jobs and both slots are taken (collections-refresh and the
 * visual-discovery backstop). Rather than displace either, digests are
 * materialised when a viewer opens their notification centre.
 *
 * That turns out to be better than a cron rather than merely cheaper: work is
 * done only for people actually looking, a dormant account generates nothing,
 * and the notification is built from the catalogue as it stands at the moment
 * it is read. The cost is that a digest is dated when it is opened rather than
 * when it was earned, which for a digest is immaterial.
 *
 * Idempotency is `group_key` plus a window, so opening the page ten times in a
 * morning produces one notification, not ten.
 */

/** Minimum score for a listing to be worth aggregating into a digest. */
const DIGEST_SCORE_THRESHOLD = 90;
/** Fewer than this and there is no digest — one match is not news. */
const MIN_DIGEST_ITEMS = 3;
/** How long a given digest group stays satisfied. */
const DIGEST_WINDOW_HOURS = 20;
/** Only listings this new are considered. */
const LOOKBACK_DAYS = 14;
/** Never create more than this many notifications in one pass. */
const MAX_PER_PASS = 4;

interface Existing {
  group_key: string | null;
}

/**
 * Has this group already been delivered inside the window?
 *
 * `createGroupedNotification` in lib/db does the same check against a fixed
 * one-hour window, which is right for burst suppression and far too short for
 * a daily digest — an hour after reading, the same digest would be recreated.
 * The window is the only difference, so this reuses createNotification for the
 * insert rather than reimplementing it.
 */
async function alreadyDelivered(profileId: string, groupKeys: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (groupKeys.length === 0) return out;
  const since = new Date(Date.now() - DIGEST_WINDOW_HOURS * 3600_000).toISOString();
  const { data } = await getSupabaseServiceClient()
    .from("notifications")
    .select("group_key")
    .eq("recipient_profile_id", profileId)
    .in("group_key", groupKeys)
    .gte("created_at", since);
  for (const r of (data ?? []) as Existing[]) if (r.group_key) out.add(r.group_key);
  return out;
}

function isRecent(c: Candidate): boolean {
  return Date.now() - Date.parse(c.createdAt) <= LOOKBACK_DAYS * 864e5;
}

function href(c: Candidate, path: string | null): string {
  return getListingUrl({ id: c.id, type: c.type, slug: c.slug, taxonomySlugPath: path });
}

/**
 * Build and persist any notifications this viewer has earned but not received.
 *
 * Safe to call on every notification-centre open: it is idempotent within the
 * window, does no work when there is nothing to say, and never throws into the
 * caller — a failure here must not stop someone reading their notifications.
 */
export async function materialiseSmartNotifications(
  profileId: string,
  clerkUserId: string
): Promise<{ created: number }> {
  try {
    const [profile, pool] = await Promise.all([
      getInterestProfile(profileId, clerkUserId),
      getCandidatePool(),
    ]);
    return persistPlan(profileId, await planSmartNotifications(profile, pool));
  } catch (e) {
    console.error("[smart-notifications] pass failed:", e);
    return { created: 0 };
  }
}

/**
 * Decide what this viewer has earned, without writing anything.
 *
 * Separated from persistence so the gating rules — the score threshold, the
 * minimum item count, which tier a signal lands in — can be exercised
 * directly. Persisting and deciding are genuinely different jobs, and only one
 * of them is where the product judgement lives.
 */
export async function planSmartNotifications(
  profile: InterestProfile,
  pool: Candidate[]
): Promise<Parameters<typeof createNotification>[0][]> {
  // Nothing known about this person yet — a digest would be a guess.
  if (profile.strength.confidence < 0.15) return [];

  const recent = pool.filter(isRecent);
  if (recent.length === 0) return [];

  const planned: Parameters<typeof createNotification>[0][] = [];

  // ── HIGH: connections into new projects ──────────────────────────────────
  planned.push(...(await planConnectionNotifications(profile, recent)));

  // ── MEDIUM: digests ──────────────────────────────────────────────────────
  planned.push(...planInterestDigest(profile, recent));
  planned.push(...planBoardDigests(profile, recent));
  planned.push(...planLocalDigest(profile, recent));

  return planned;
}

async function persistPlan(
  profileId: string,
  planned: Parameters<typeof createNotification>[0][]
): Promise<{ created: number }> {
  try {
    if (planned.length === 0) return { created: 0 };

    const keys = planned.map((p) => p.group_key).filter(Boolean) as string[];
    const delivered = await alreadyDelivered(profileId, keys);

    let created = 0;
    for (const input of planned) {
      if (created >= MAX_PER_PASS) break;
      if (input.group_key && delivered.has(input.group_key)) continue;
      const res = await createNotification(input);
      if (res.data) {
        created++;
        delivered.add(input.group_key ?? "");
      }
    }
    return { created };
  } catch (e) {
    console.error("[smart-notifications] persist failed:", e);
    return { created: 0 };
  }
}

/**
 * HIGH — a product on one of your boards, or a brand you follow, appears in a
 * new project.
 *
 * This is the notification only Archtivy can send: it is a statement about the
 * connection graph, not about taste. Computed here rather than at publish time
 * so the publish flow is untouched; the cost is that it is noticed when the
 * reader next looks, which is when they would see it regardless.
 */
async function planConnectionNotifications(
  profile: InterestProfile,
  recent: Candidate[]
): Promise<Parameters<typeof createNotification>[0][]> {
  const recentProjects = recent.filter((c) => c.type === "project");
  if (recentProjects.length === 0) return [];
  if (profile.savedListingIds.size === 0 && profile.followedProfileIds.size === 0) return [];

  const sup = getSupabaseServiceClient();
  const { data: links } = await sup
    .from("project_product_links")
    .select("project_id, product_id")
    .in("project_id", recentProjects.map((p) => p.id));

  const byProject = new Map<string, string[]>();
  for (const l of (links ?? []) as { project_id: string; product_id: string }[]) {
    const arr = byProject.get(l.project_id) ?? [];
    arr.push(l.product_id);
    byProject.set(l.project_id, arr);
  }
  if (byProject.size === 0) return [];

  // Which of those products belong to a brand the viewer follows.
  const productIds = [...new Set([...byProject.values()].flat())];
  const { data: prodRows } = await sup
    .from("listings")
    .select("id, title, slug, owner_profile_id")
    .in("id", productIds);
  const products = new Map(
    ((prodRows ?? []) as { id: string; title: string | null; slug: string | null; owner_profile_id: string | null }[]).map(
      (p) => [p.id, p]
    )
  );

  const taxPaths = await taxonomyPathsFor(recentProjects.map((p) => p.id));
  const out: Parameters<typeof createNotification>[0][] = [];

  for (const project of recentProjects) {
    const linked = byProject.get(project.id) ?? [];
    const savedHit = linked.find((id) => profile.savedListingIds.has(id));
    const followedHit = linked.find((id) => {
      const owner = products.get(id)?.owner_profile_id;
      return owner ? profile.followedProfileIds.has(owner) : false;
    });

    const url = href(project, taxPaths.get(project.id) ?? null);

    if (savedHit) {
      const p = products.get(savedHit);
      out.push({
        recipient_profile_id: profile.profileId,
        source: "system",
        event_type: "saved_product_in_project",
        entity_type: "project",
        entity_id: project.id,
        title: project.title,
        body: p?.title
          ? `${p.title}, which you saved, was specified in this project.`
          : "A product you saved was specified in this project.",
        cta_label: "View project",
        cta_url: url,
        priority: "high",
        group_key: `conn:saved:${project.id}:${savedHit}`,
      });
      continue; // one notification per project, not one per matching product
    }

    if (followedHit) {
      const p = products.get(followedHit);
      out.push({
        recipient_profile_id: profile.profileId,
        source: "system",
        event_type: "followed_brand_in_project",
        entity_type: "project",
        entity_id: project.id,
        title: project.title,
        body: p?.title
          ? `${p.title} was specified in this project.`
          : "A brand you follow was specified in this project.",
        cta_label: "View project",
        cta_url: url,
        priority: "high",
        group_key: `conn:brand:${project.id}:${followedHit}`,
      });
    }
  }
  return out;
}

/** MEDIUM — several new listings match inferred interests. One notification. */
function planInterestDigest(
  profile: InterestProfile,
  recent: Candidate[]
): Parameters<typeof createNotification>[0][] {
  const matches = recent
    .filter((c) => !profile.savedListingIds.has(c.id))
    .map((c) => ({ c, s: scoreListing(c, profile) }))
    .filter((x) => x.s.score >= DIGEST_SCORE_THRESHOLD)
    // Anything driven by a follow is already a HIGH notification elsewhere.
    .filter((x) => !x.s.reasons.some((r) => r.kind === "follow_owner"));

  if (matches.length < MIN_DIGEST_ITEMS) return [];

  const day = new Date().toISOString().slice(0, 10);
  return [
    {
      recipient_profile_id: profile.profileId,
      source: "system",
      event_type: "interest_digest",
      entity_type: null,
      entity_id: null,
      title: "New work matching your interests",
      body: `${matches.length} new ${matches.length === 1 ? "listing" : "listings"} match what you have been saving and following.`,
      cta_label: "See them",
      /* Every notification lands somewhere real. This one goes to the feed
         that produced it, which is the honest destination — there is no
         "digest page", and inventing one would be a dead end. */
      cta_url: "/?ref=interest-digest#for-you",
      priority: "normal",
      group_key: `digest:interests:${profile.profileId}:${day}`,
    },
  ];
}

/** MEDIUM — new listings matching one board's character. */
function planBoardDigests(
  profile: InterestProfile,
  recent: Candidate[]
): Parameters<typeof createNotification>[0][] {
  const out: Parameters<typeof createNotification>[0][] = [];
  const day = new Date().toISOString().slice(0, 10);

  // Only the strongest board, so someone with six boards is not notified six
  // times about overlapping content.
  const board = profile.boards.find((b) => b.itemCount >= 3);
  if (!board) return out;

  const matches = recent.filter((c) => {
    if (profile.savedListingIds.has(c.id)) return false;
    const s = scoreListing(c, profile);
    return s.reasons.some((r) => r.kind === "board" && r.weight >= 40);
  });
  if (matches.length < MIN_DIGEST_ITEMS) return out;

  out.push({
    recipient_profile_id: profile.profileId,
    source: "system",
    event_type: "board_digest",
    entity_type: "folder",
    entity_id: board.id,
    title: `Inspired by ${board.name}`,
    body: `${matches.length} new ${matches.length === 1 ? "listing" : "listings"} match this board.`,
    cta_label: "View board",
    cta_url: `/me/saved`,
    priority: "normal",
    group_key: `digest:board:${board.id}:${day}`,
  });
  return out;
}

/** MEDIUM — a meaningful group of new work in the viewer's city. */
function planLocalDigest(
  profile: InterestProfile,
  recent: Candidate[]
): Parameters<typeof createNotification>[0][] {
  const city = profile.location.city;
  if (!city) return [];

  const matches = recent.filter(
    (c) => c.city && c.city.toLowerCase() === city.toLowerCase() && !profile.savedListingIds.has(c.id)
  );
  if (matches.length < MIN_DIGEST_ITEMS) return [];

  const day = new Date().toISOString().slice(0, 10);
  return [
    {
      recipient_profile_id: profile.profileId,
      source: "system",
      event_type: "local_digest",
      entity_type: null,
      entity_id: null,
      title: city,
      body: `${matches.length} new ${matches.length === 1 ? "listing was" : "listings were"} added in ${city}.`,
      cta_label: "Explore",
      // A real filtered destination, not a dead end.
      cta_url: `/projects?city=${encodeURIComponent(city)}`,
      priority: "normal",
      group_key: `digest:local:${city.toLowerCase()}:${day}`,
    },
  ];
}

async function taxonomyPathsFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const { data } = await getSupabaseServiceClient()
    .from("listing_taxonomy_node")
    .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path)")
    .in("listing_id", ids);
  for (const r of (data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: { domain: string; slug_path: string } | { domain: string; slug_path: string }[] | null;
  }[]) {
    const node = Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes;
    if (!node || node.domain !== "project") continue;
    if (r.is_primary || !out.has(r.listing_id)) out.set(r.listing_id, node.slug_path);
  }
  return out;
}
