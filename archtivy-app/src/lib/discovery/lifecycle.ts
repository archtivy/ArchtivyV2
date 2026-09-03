/**
 * When an image gets analysed, and when it must not be analysed again.
 *
 * ── THE COST RULE ───────────────────────────────────────────────────────────
 * One vision call per image, ever — unless the image itself changes. Nothing a
 * reader does triggers analysis, nothing a catalogue change triggers analysis,
 * and editing a listing's title triggers analysis of nothing at all. The only
 * things that do are in `reasonToProcess` below, and each of them means the
 * pixels are different or the previous attempt did not produce a usable
 * result.
 *
 * ── HOW WORK IS QUEUED WITHOUT A QUEUE ──────────────────────────────────────
 * There is no jobs table. The set of images needing work is DERIVED — a left
 * join between listing_images and image_ai — which means it cannot drift from
 * reality, cannot leak rows, and automatically covers creation paths nobody
 * remembered to instrument. A path that inserts a listing_images row by any
 * means at all is picked up on the next drain.
 *
 * The drain is a cron. The in-request kick (`kickVisualDiscovery`) only makes
 * it FASTER; it is explicitly best-effort, because on a serverless platform a
 * request that has already responded may be frozen before a detached fetch
 * completes. Nothing is allowed to depend on it, and nothing does.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getBaseUrl } from "@/lib/canonical";

/**
 * Bump when a change to the pipeline makes older rows worth redoing —
 * a different model, a materially different prompt, a new stored field.
 *
 * Version 0 is everything written before this system existed: the alt-text
 * embeddings and the 845-in-1000 synthetic URL-hash vectors. They are marked
 * outdated rather than missing, which keeps them out of the automatic drain
 * and inside a deliberate, costed backfill.
 */
export const PIPELINE_VERSION = 1;

/**
 * Automatic processing covers images uploaded from here on.
 *
 * ── WHY A CUTOFF AND NOT "EVERYTHING UNPROCESSED" ───────────────────────────
 * At the time of writing 224 approved images have never been analysed and
 * another ~794 hold version-0 vectors. Turning the drain loose on all of them
 * would spend roughly six dollars that nobody asked for, on a schedule, which
 * is the worst possible way to spend it. The newest unprocessed image dates
 * from 2026-08-26, so this cutoff separates the historical backlog from
 * everything created afterwards cleanly and without a rolling window that
 * could let an image age out of eligibility while the cron was down.
 *
 * The backlog is not abandoned — it is reachable from Admin → Tools, where a
 * person can see the count and the cost before pressing anything.
 */
export const AUTO_PROCESS_SINCE = "2026-09-02T00:00:00Z";

/** A failing image is retried this many times, then left alone. */
export const MAX_ATTEMPTS = 3;

export type ProcessReason = "never" | "replaced" | "retry" | "outdated";

export interface PendingImage {
  imageId: string;
  imageUrl: string;
  listingId: string;
  listingType: "project" | "product";
  reason: ProcessReason;
}

interface AiState {
  image_id: string;
  source_url: string | null;
  embedding: unknown;
  pipeline_version: number | null;
  status: string | null;
  attempts: number | null;
}

/**
 * Why this image needs work, or null if it is current.
 *
 * `outdated` is deliberately NOT returned for a row that is otherwise fine
 * unless the caller asked for it — see selectPending's `includeOutdated`.
 */
function reasonToProcess(
  image: { id: string; image_url: string },
  ai: AiState | undefined,
  includeOutdated: boolean
): ProcessReason | null {
  if (!ai) return "never";

  // No usable vector, whatever the row claims.
  if (ai.embedding == null) {
    if (ai.status === "failed" && (ai.attempts ?? 0) >= MAX_ATTEMPTS) return null;
    return ai.status === "failed" ? "retry" : "never";
  }

  /*
   * The photograph behind this row was swapped.
   *
   * A null source_url means the row predates this column and its image is
   * unknown — which is not evidence of a change, so it is left to the version
   * check rather than treated as a replacement.
   */
  if (ai.source_url && ai.source_url !== image.image_url) return "replaced";

  if (includeOutdated && (ai.pipeline_version ?? 0) < PIPELINE_VERSION) return "outdated";

  return null;
}

export interface SelectOptions {
  /** "auto" honours AUTO_PROCESS_SINCE; "backlog" ignores it. */
  scope: "auto" | "backlog";
  /** Include rows whose only problem is an old pipeline_version. */
  includeOutdated: boolean;
  limit: number;
  /** Restrict to these listings, for a targeted run. */
  listingIds?: string[];
}

const PAGE = 1000;

/**
 * Read every row of a query, a page at a time.
 *
 * PostgREST caps a response at 1000 rows and listing_images already holds
 * 1197. An unpaged read here would silently ignore everything past the first
 * thousand — the same truncation that once cut 28 categories out of the
 * sitemap.
 */
async function selectAll<T>(
  build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown }> }
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) break;
    const page = (data ?? []) as T[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

/** Images that need Visual Discovery processing, oldest listing first. */
export async function selectPending(options: SelectOptions): Promise<PendingImage[]> {
  const sup = getSupabaseServiceClient();

  let listingQuery = sup
    .from("listings")
    .select("id, type")
    .in("type", ["project", "product"])
    .eq("status", "APPROVED")
    .is("deleted_at", null);
  if (options.listingIds?.length) listingQuery = listingQuery.in("id", options.listingIds);

  const { data: listings } = await listingQuery;
  const typeById = new Map<string, "project" | "product">();
  for (const l of (listings ?? []) as { id: string; type: string }[]) {
    if (l.type === "project" || l.type === "product") typeById.set(l.id, l.type);
  }
  if (typeById.size === 0) return [];

  const images = await selectAll<{
    id: string;
    image_url: string;
    listing_id: string;
    created_at: string;
  }>(() =>
    sup
      .from("listing_images")
      .select("id, image_url, listing_id, created_at")
      .order("created_at", { ascending: true })
  );

  const aiByImage = new Map<string, AiState>();
  for (const row of await selectAll<AiState>(() =>
    sup
      .from("image_ai")
      .select("image_id, source_url, embedding, pipeline_version, status, attempts")
      .order("image_id", { ascending: true })
  )) {
    aiByImage.set(row.image_id, row);
  }

  const out: PendingImage[] = [];
  for (const img of images) {
    const listingType = typeById.get(img.listing_id);
    if (!listingType || !img.image_url) continue;

    // A targeted run is an explicit human decision and ignores the cutoff.
    if (options.scope === "auto" && !options.listingIds?.length) {
      if (img.created_at < AUTO_PROCESS_SINCE) continue;
    }

    const reason = reasonToProcess(img, aiByImage.get(img.id), options.includeOutdated);
    if (!reason) continue;

    out.push({
      imageId: img.id,
      imageUrl: img.image_url,
      listingId: img.listing_id,
      listingType,
      reason,
    });
    if (out.length >= options.limit) break;
  }
  return out;
}

/**
 * Ask the background drain to look at a listing now rather than on its next
 * scheduled pass.
 *
 * ── BEST EFFORT, BY CONSTRUCTION ────────────────────────────────────────────
 * Not awaited, never throws, and its result is never inspected. On a
 * serverless platform the request that called this may be frozen the instant
 * it responds, so this fetch can simply not happen — which is fine, because
 * the cron will find the same work from the derived queue. It exists so that a
 * newly published listing is usually discoverable in seconds instead of within
 * the hour, and for no other reason.
 *
 * This is also why listing creation cannot be broken by Visual Discovery: the
 * only thing creation does is fail to notify something.
 */
export function kickVisualDiscovery(listingId: string): void {
  /* getBaseUrl already knows the production alias, the preview host and the
     localhost fallback, and gets the VERCEL_URL trap right. Re-deriving any of
     that here would be a second answer to a question already settled. */
  const origin = getBaseUrl();
  const secret = process.env.CRON_SECRET?.trim();
  if (!origin || !secret) return;

  const url = `${origin}/api/cron/visual-discovery?mode=new&limit=12&listingId=${encodeURIComponent(listingId)}`;

  try {
    void fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    }).catch(() => {
      /* The cron is the guarantee. This was the shortcut. */
    });
  } catch {
    /* Never allowed to surface into the caller's request. */
  }
}
