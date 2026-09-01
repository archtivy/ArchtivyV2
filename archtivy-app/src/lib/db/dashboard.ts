import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { computeListingCompleteness, type ListingCompleteness } from "@/lib/publish/listingCompleteness";
import { getLiveSaveCountsByListingIds } from "@/lib/db/userStats";
import { countProfileFollowers } from "@/lib/db/profileMetrics";

/**
 * Dashboard data for /me/dashboard.
 *
 * ── EVERY NUMBER HERE IS QUERIED, NONE ARE ILLUSTRATIVE ─────────────────────
 * The design mockup carried figures like 24,847 views and 342 projects. The
 * real platform, measured 2026-08-22: views_count sums to 59 across all 129
 * listings (max 11 on any one), document_downloads holds 2 rows, listing_saves
 * is empty. The richest brand on the platform (12 products) has 10 views, 3
 * projects featuring it and 1 download.
 *
 * Sparse is therefore the NORMAL case, not an edge case, and the UI treats it
 * that way. Nothing in this module invents, rounds up, or extrapolates.
 *
 * ── TRENDS ONLY WHERE HISTORY EXISTS ────────────────────────────────────────
 * A stat gets a trend only if its source table has a per-row timestamp:
 *   listings.created_at ................ yes
 *   project_product_links.created_at ... yes
 *   listing_team_members.created_at .... yes
 *   document_downloads.downloaded_at ... yes
 *   listings.views_count ............... NO — a running counter with no
 *                                        history, so it ships as a plain total
 * `trend: null` is the honest answer for views and is rendered as nothing at
 * all, rather than as 0%.
 */

export type DashboardWindow = "7d" | "30d" | "90d" | "all";

export const DASHBOARD_WINDOWS: { id: DashboardWindow; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

/**
 * "All" is the DEFAULT, deliberately.
 *
 * Measured history depth: project_product_links and listing_team_members have
 * zero rows inside 90 days; listings has 2. A dashboard defaulting to 30D would
 * greet almost every user with a wall of zeroes and read as broken. The shorter
 * windows are built and correct — they are simply not the useful default until
 * the platform accumulates activity.
 */
export const DEFAULT_WINDOW: DashboardWindow = "all";

export function windowStartIso(w: DashboardWindow): string | null {
  if (w === "all") return null;
  const days = w === "7d" ? 7 : w === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export interface DashboardStat {
  id: string;
  label: string;
  value: number;
  /**
   * Percent change against the immediately preceding window of equal length,
   * or null when the stat has no history or the prior window was empty.
   * A prior window of 0 makes percentage change undefined, not infinite.
   */
  trend: number | null;
  /** Shown under the value when there is no trend to show. */
  note?: string;
  /** False when the window selector does not apply (running totals). */
  windowed: boolean;
}

export interface DashboardListing {
  id: string;
  type: "project" | "product";
  title: string;
  slug: string | null;
  status: string;
  coverImageUrl: string | null;
  views: number;
  /** Live count from folder_items — see lib/db/userStats. */
  saves: number;
  /**
   * The one line under the title on a card: "Residential · Los Angeles" for a
   * project, "Vibia · Pendant Lights" for a product. Null when the listing
   * carries neither — never a placeholder.
   */
  subtitle: string | null;
  createdAt: string;
  /** Only computed for drafts — it is what the draft card shows. */
  completeness: ListingCompleteness | null;
}

export interface FeedItem {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  ctaUrl: string | null;
  /** True when the event is about this user's own work. */
  isDirect: boolean;
  eventType: string | null;
}

export interface DashboardData {
  role: "designer" | "brand";
  stats: DashboardStat[];
  listings: DashboardListing[];
  drafts: DashboardListing[];
  published: DashboardListing[];
  feed: FeedItem[];
  followerCount: number;
  documentCount: number;
  /** Drives the sparse-vs-rich layout decision in one place. */
  isSparse: boolean;
}

const isProjectType = (t: unknown): "project" | "product" =>
  String(t) === "product" ? "product" : "project";

/** Percent change vs the preceding equal-length window; null when undefined. */
function trendFrom(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Collapses rows to one entry per distinct key, keeping the EARLIEST timestamp.
 *
 * Several of these stats count relationships, not rows. "Projects featuring
 * your products" is a count of projects: a project specifying three of your
 * products is one project, and counting link rows reported 7 where the true
 * answer was 3 on live data. Earliest wins so the entry is dated from when the
 * relationship began, which is what a time window should measure.
 */
function distinctByEarliest<T>(
  rows: T[],
  keyOf: (r: T) => string | null,
  tsOf: (r: T) => string
): { ts: string }[] {
  const earliest = new Map<string, string>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    const ts = tsOf(r);
    const existing = earliest.get(key);
    if (existing == null || new Date(ts).getTime() < new Date(existing).getTime()) {
      earliest.set(key, ts);
    }
  }
  return [...earliest.values()].map((ts) => ({ ts }));
}

/**
 * Counts rows in `current` and `previous` windows for a timestamped table.
 * Returns { value, trend } ready for a DashboardStat.
 */
function windowedCount(
  rows: { ts: string }[],
  w: DashboardWindow
): { value: number; trend: number | null } {
  if (w === "all") return { value: rows.length, trend: null };
  const days = w === "7d" ? 7 : w === "30d" ? 30 : 90;
  const now = Date.now();
  const start = now - days * 86_400_000;
  const prevStart = now - 2 * days * 86_400_000;
  let current = 0;
  let previous = 0;
  for (const r of rows) {
    const t = new Date(r.ts).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= start) current++;
    else if (t >= prevStart) previous++;
  }
  return { value: current, trend: trendFrom(current, previous) };
}

/** Listings owned by a profile, newest first. Includes drafts. */
async function loadOwnedListings(profileId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, type, title, slug, status, cover_image_url, views_count, created_at, description, meta_description, location_city, location_country, category, product_type"
    )
    .eq("owner_profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] listings failed:", error.message);
    return [];
  }
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * Per-listing inputs the completeness checklist needs beyond the listings row:
 * image counts, images carrying real alt text, and relationship counts.
 * Only fetched for drafts — computing it for every published listing would be
 * three extra queries to render a badge nothing displays.
 */
async function loadDraftCompletenessInputs(draftIds: string[]) {
  if (draftIds.length === 0) {
    return { images: {}, alts: {}, team: {}, materials: {}, products: {} } as const;
  }
  const supabase = getSupabaseServiceClient();
  const [imgRes, teamRes, matRes, prodRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id, alt").in("listing_id", draftIds),
    supabase.from("listing_team_members").select("listing_id").in("listing_id", draftIds),
    supabase
      .from("listing_taxonomy_node")
      .select("listing_id, is_primary")
      .in("listing_id", draftIds)
      .eq("is_primary", false),
    supabase.from("project_product_links").select("project_id").in("project_id", draftIds),
  ]);

  const images: Record<string, number> = {};
  const alts: Record<string, number> = {};
  for (const r of (imgRes.data ?? []) as { listing_id: string; alt: string | null }[]) {
    images[r.listing_id] = (images[r.listing_id] ?? 0) + 1;
    // Mirrors the wizard's own rule: alt longer than two characters counts as
    // real, so a filename or a stray "-" does not tick the box.
    if ((r.alt ?? "").trim().length > 2) alts[r.listing_id] = (alts[r.listing_id] ?? 0) + 1;
  }
  const team: Record<string, number> = {};
  for (const r of (teamRes.data ?? []) as { listing_id: string }[]) {
    team[r.listing_id] = (team[r.listing_id] ?? 0) + 1;
  }
  const materials: Record<string, number> = {};
  for (const r of (matRes.data ?? []) as { listing_id: string }[]) {
    materials[r.listing_id] = (materials[r.listing_id] ?? 0) + 1;
  }
  const products: Record<string, number> = {};
  for (const r of (prodRes.data ?? []) as { project_id: string }[]) {
    products[r.project_id] = (products[r.project_id] ?? 0) + 1;
  }
  return { images, alts, team, materials, products } as const;
}

function toDashboardListing(
  row: Record<string, unknown>,
  completeness: ListingCompleteness | null,
  saves: number
): DashboardListing {
  const kind = isProjectType(row.type);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "") || null;

  /*
   * A project is placed, a product is classified — so the same slot carries
   * category + city for one and category + type for the other. Both halves are
   * optional and the separator only appears between two present values, so a
   * listing with just a city reads "Los Angeles" rather than "· Los Angeles".
   *
   * location_city is null on 46 of 53 projects, which is why country is the
   * fallback rather than being appended to it.
   */
  const subtitle = (
    kind === "project"
      ? [str(row.category), str(row.location_city) ?? str(row.location_country)]
      : [str(row.category), str(row.product_type)]
  )
    .filter(Boolean)
    .join(" · ") || null;

  return {
    id: String(row.id),
    type: kind,
    title: (row.title as string | null)?.trim() || "Untitled",
    slug: (row.slug as string | null) ?? null,
    status: String(row.status ?? "APPROVED"),
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    views: typeof row.views_count === "number" ? row.views_count : 0,
    saves,
    subtitle,
    createdAt: String(row.created_at ?? ""),
    completeness,
  };
}

/**
 * Notifications, ranked so the user's own work outranks general platform noise.
 *
 * ── WHAT ACTUALLY EXISTS ────────────────────────────────────────────────────
 * The brief's example ("your product was saved") has no source: listing_saves
 * is empty and no save event type is ever written. The notifications table
 * holds 15 rows platform-wide — 12 new_follower, 3 admin_update. So the ranking
 * function is real and applied, but today it sorts a very short list.
 *
 * `isDirect` marks events about this user rather than about the platform, and
 * the UI leans on that flag rather than on the event type, so new direct event
 * types inherit the priority without a change here.
 */
const DIRECT_EVENT_TYPES = new Set([
  "new_follower",
  "listing_saved",
  "product_saved",
  "listing_specified",
  "product_specified",
  "document_downloaded",
  "credit_added",
  "claim_approved",
]);

async function loadFeed(profileId: string): Promise<FeedItem[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, cta_url, event_type, source, priority")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[dashboard] feed failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as {
    id: string;
    title: string | null;
    body: string | null;
    created_at: string;
    cta_url: string | null;
    event_type: string | null;
  }[];

  return rows
    .map((r) => ({
      id: r.id,
      title: r.title?.trim() || "Update",
      body: r.body?.trim() || null,
      createdAt: r.created_at,
      ctaUrl: r.cta_url,
      eventType: r.event_type,
      isDirect: DIRECT_EVENT_TYPES.has(r.event_type ?? ""),
    }))
    // Direct events first, then newest. A stable two-key sort rather than a
    // weighted score: with this little data a score would be false precision.
    .sort((a, b) => {
      if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 8);
}

/** Shared assembly; the two role entry points differ only in their stats. */
async function buildDashboard(
  profileId: string,
  role: "designer" | "brand",
  w: DashboardWindow
): Promise<DashboardData> {
  const rows = await loadOwnedListings(profileId);
  const listingIds = rows.map((r) => String(r.id));
  const draftRows = rows.filter((r) => String(r.status) === "DRAFT");
  const draftIds = draftRows.map((r) => String(r.id));

  const [inputs, feed, followerCount, saveCounts] = await Promise.all([
    loadDraftCompletenessInputs(draftIds),
    loadFeed(profileId),
    countProfileFollowers(profileId),
    getLiveSaveCountsByListingIds(listingIds),
  ]);

  const all: DashboardListing[] = rows.map((row) => {
    const id = String(row.id);
    const saves = saveCounts[id] ?? 0;
    if (String(row.status) !== "DRAFT") return toDashboardListing(row, null, saves);
    const kind = isProjectType(row.type);
    const completeness = computeListingCompleteness(kind, {
      title: (row.title as string | null) ?? "",
      metaDescription: (row.meta_description as string | null) ?? "",
      slug: (row.slug as string | null) ?? "",
      description: (row.description as string | null) ?? "",
      imageCount: inputs.images[id] ?? 0,
      imagesWithAlt: inputs.alts[id] ?? 0,
      teamCount: inputs.team[id] ?? 0,
      productCount: inputs.products[id] ?? 0,
      materialCount: inputs.materials[id] ?? 0,
      city: (row.location_city as string | null) ?? "",
      country: (row.location_country as string | null) ?? "",
    });
    return toDashboardListing(row, completeness, saves);
  });

  const drafts = all.filter((l) => l.status === "DRAFT");
  const published = all.filter((l) => l.status !== "DRAFT");
  const stats =
    role === "brand"
      ? await brandStats(profileId, listingIds, rows, w)
      : await designerStats(profileId, listingIds, rows, w);

  const documentCount = await countDocuments(listingIds);

  return {
    role,
    stats,
    listings: all,
    drafts,
    published,
    feed,
    followerCount,
    documentCount,
    // Two published listings is the line: below it the rich grid has nothing to
    // fill it with and the page needs to prompt rather than report.
    isSparse: published.length < 3,
  };
}

async function countDocuments(listingIds: string[]): Promise<number> {
  if (listingIds.length === 0) return 0;
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("listing_documents")
    .select("id", { count: "exact", head: true })
    .in("listing_id", listingIds);
  if (error) return 0;
  return count ?? 0;
}

async function brandStats(
  profileId: string,
  listingIds: string[],
  rows: Record<string, unknown>[],
  w: DashboardWindow
): Promise<DashboardStat[]> {
  const supabase = getSupabaseServiceClient();
  const productRows = rows.filter((r) => isProjectType(r.type) === "product");
  const totalViews = productRows.reduce(
    (acc, r) => acc + (typeof r.views_count === "number" ? r.views_count : 0),
    0
  );

  const [featuringRes, downloadsRes] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from("project_product_links")
          .select("project_id, created_at")
          .in("product_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length > 0
      ? supabase
          .from("document_downloads")
          .select("id, downloaded_at")
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Distinct PROJECTS, not link rows — one project specifying three of this
  // brand's products is one project featuring them.
  const featuring = distinctByEarliest(
    (featuringRes.data ?? []) as { project_id: string; created_at: string }[],
    (r) => r.project_id,
    (r) => r.created_at
  );
  // Downloads are genuinely per-event: the same person fetching a spec sheet
  // twice is two downloads, so these are NOT deduped.
  const downloads = ((downloadsRes.data ?? []) as { downloaded_at: string }[]).map((r) => ({
    ts: r.downloaded_at,
  }));
  const publishedProducts = productRows
    .filter((r) => String(r.status) !== "DRAFT")
    .map((r) => ({ ts: String(r.created_at) }));

  const feat = windowedCount(featuring, w);
  const dl = windowedCount(downloads, w);
  const pub = windowedCount(publishedProducts, w);

  return [
    {
      id: "views",
      label: "Product views",
      value: totalViews,
      trend: null,
      // Stated on the card, not hidden: the absence of a trend here is a
      // property of the data, and unexplained it just looks inconsistent.
      note: "All time — views aren’t recorded per day",
      windowed: false,
    },
    {
      id: "featuring",
      label: "Projects featuring your products",
      value: feat.value,
      trend: feat.trend,
      windowed: true,
    },
    {
      id: "downloads",
      label: "Documents downloaded",
      value: dl.value,
      trend: dl.trend,
      windowed: true,
    },
    {
      id: "published",
      label: "Products published",
      value: pub.value,
      trend: pub.trend,
      windowed: true,
    },
  ];
}

async function designerStats(
  profileId: string,
  listingIds: string[],
  rows: Record<string, unknown>[],
  w: DashboardWindow
): Promise<DashboardStat[]> {
  const supabase = getSupabaseServiceClient();
  const projectRows = rows.filter((r) => isProjectType(r.type) === "project");
  const totalViews = projectRows.reduce(
    (acc, r) => acc + (typeof r.views_count === "number" ? r.views_count : 0),
    0
  );

  const [creditsRes, specifiedRes] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from("listing_team_members")
          .select("profile_id, display_name, created_at")
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length > 0
      ? supabase
          .from("project_product_links")
          .select("product_id, created_at")
          .in("project_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const creditRows = (creditsRes.data ?? []) as {
    profile_id: string | null;
    display_name: string | null;
    created_at: string;
  }[];

  // Distinct people, not distinct credit rows: crediting the same collaborator
  // on six projects is one professional relationship, not six.
  //
  // Keyed on profile_id where there is one, display_name otherwise — 237 credit
  // rows exist and many point at unclaimed profiles with profile_id NULL, which
  // would otherwise all collapse into a single "null" bucket.
  const distinctCredits = distinctByEarliest(
    creditRows,
    (r) => {
      const key = r.profile_id ?? `name:${(r.display_name ?? "").trim().toLowerCase()}`;
      return key === "name:" ? null : key;
    },
    (r) => r.created_at
  );

  // Distinct PRODUCTS, not link rows — specifying the same product on four
  // projects is one product in this designer's vocabulary.
  const specified = distinctByEarliest(
    (specifiedRes.data ?? []) as { product_id: string; created_at: string }[],
    (r) => r.product_id,
    (r) => r.created_at
  );
  const publishedProjects = projectRows
    .filter((r) => String(r.status) !== "DRAFT")
    .map((r) => ({ ts: String(r.created_at) }));

  const cred = windowedCount(distinctCredits, w);
  const spec = windowedCount(specified, w);
  const pub = windowedCount(publishedProjects, w);

  return [
    {
      id: "views",
      label: "Project views",
      value: totalViews,
      trend: null,
      note: "All time — views aren’t recorded per day",
      windowed: false,
    },
    {
      id: "credits",
      label: "Profiles you’ve credited",
      value: cred.value,
      trend: cred.trend,
      windowed: true,
    },
    {
      id: "specified",
      label: "Products specified",
      value: spec.value,
      trend: spec.trend,
      windowed: true,
    },
    {
      id: "published",
      label: "Projects published",
      value: pub.value,
      trend: pub.trend,
      windowed: true,
    },
  ];
}

/**
 * Entry point. Returns null for any role that does not publish — reader today,
 * and anything added later. That null is what the route branches on, so the
 * rich dashboard is not merely hidden from a reader but never constructed.
 */
export async function getDashboardData(
  profileId: string,
  role: string | null | undefined,
  w: DashboardWindow = DEFAULT_WINDOW
): Promise<DashboardData | null> {
  if (role === "brand") return buildDashboard(profileId, "brand", w);
  if (role === "designer") return buildDashboard(profileId, "designer", w);
  return null;
}
