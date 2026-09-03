import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processImage } from "@/lib/matches/pipeline";
import { selectPending, type PendingImage } from "@/lib/discovery/lifecycle";

/**
 * Visual-discovery precompute — the batch that makes the lightbox feeds work.
 *
 * For each image it does one vision call and one embedding, and for project
 * photographs it rewrites the clickable object regions and their product
 * candidates. Nothing a reader does ever triggers this.
 *
 * ── TWO CALLERS, ONE BODY ───────────────────────────────────────────────────
 * Vercel's scheduler (bearer CRON_SECRET) and an admin pressing a button in
 * /admin/tools. Both land here; there is no second batch implementation.
 * FAILS CLOSED when CRON_SECRET is unset, matching collections-refresh, so an
 * endpoint that spends money cannot become unauthenticated by omission.
 *
 * ── IT WILL NOT RUN AWAY WITH THE BUDGET ────────────────────────────────────
 * `limit` is capped hard, and the scheduled mode only sees images uploaded
 * after AUTO_PROCESS_SINCE that have never produced a vector. The historical
 * backlog — 224 never-analysed images and ~794 holding version-0 synthetic
 * vectors — is reachable only through ?mode=backlog, which nothing schedules.
 * The expensive thing is never the thing that happens by accident.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** Hard ceiling per invocation, whatever the caller asks for. */
const MAX_LIMIT = 250;
const DEFAULT_LIMIT = 20;

async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return null;

  // Otherwise it must be a signed-in admin.
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await getProfileByClerkIdForAdmin(userId);
  const profile = res.data as { is_admin?: boolean } | null;
  if (res.error || !profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function run(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return denied;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;

  /*
   * ── TWO MODES, AND THE DIFFERENCE IS WHO PAYS ─────────────────────────────
   * "new"     — images uploaded since AUTO_PROCESS_SINCE that have never been
   *             analysed, or whose file was replaced, or whose last attempt
   *             failed and is still worth retrying. This is what the schedule
   *             runs, and on a quiet day it processes nothing at all.
   * "backlog" — everything not current, cutoff ignored, including the
   *             version-0 rows holding the old synthetic vectors. This is a
   *             deliberate, costed backfill and is never scheduled.
   *
   * A `listingId` narrows either mode to one listing and always ignores the
   * cutoff, because naming a listing is itself the decision.
   */
  const mode = params.get("mode") === "backlog" ? "backlog" : "new";
  const listingId = params.get("listingId")?.trim() || null;
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  /* A dry run reports exactly what a real run would touch and spends nothing.
     Always the first thing to reach for before a large pass. */
  const dryRun = params.get("dryRun") === "1";

  const select = {
    scope: (mode === "backlog" ? "backlog" : "auto") as "auto" | "backlog",
    includeOutdated: mode === "backlog" || listingId !== null,
    limit,
    listingIds: listingId ? [listingId] : undefined,
  };

  const images = await selectPending(select);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      mode,
      limit,
      wouldProcess: images.length,
      projects: images.filter((i) => i.listingType === "project").length,
      products: images.filter((i) => i.listingType === "product").length,
      reasons: countReasons(images),
    });
  }

  const started = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let embedded = 0;
  let regions = 0;

  /*
   * ── STOP BEFORE THE PLATFORM DOES ──────────────────────────────────────────
   * maxDuration is 300s and a project photograph takes 6–9s end to end, so a
   * batch of forty cannot finish inside one invocation. A killed invocation is
   * the worst outcome available: the images already paid for are written, but
   * the caller gets no response and no count, so nobody knows where the run
   * stopped. Instead the loop stops itself with time to spare and reports what
   * is left, which makes any `limit` safe to ask for.
   */
  const budgetMs = 240_000;
  let stoppedEarly = false;

  for (const img of images) {
    if (Date.now() - started > budgetMs) {
      stoppedEarly = true;
      break;
    }
    const result = await processImage({
      imageId: img.imageId,
      source: img.listingType,
      imageUrl: img.imageUrl,
      listing_id: img.listingId,
      listing_type: img.listingType,
    });
    processed++;
    if (result.ok) {
      if (result.embedded) embedded++;
      regions += result.regions ?? 0;
    } else if (result.error && errors.length < 20) {
      errors.push(`${img.imageId}: ${result.error}`);
    }
  }

  return NextResponse.json({
    mode,
    processed,
    embedded,
    regions,
    /* Recounted after the run, so it reflects work that actually completed.
       Successful images leave the queue; failures that exhausted their
       attempts leave it too, which is what stops a bad file being retried
       forever. */
    remaining: (await selectPending({ ...select, limit: MAX_LIMIT })).length,
    stoppedEarly,
    seconds: Math.round((Date.now() - started) / 1000),
    errors,
  });
}

function countReasons(images: PendingImage[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of images) out[i.reason] = (out[i.reason] ?? 0) + 1;
  return out;
}

export const GET = run;
export const POST = run;
